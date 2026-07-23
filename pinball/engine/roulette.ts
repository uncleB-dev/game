import { Camera } from './camera';
import { canvasHeight, canvasWidth, initialZoom, Skills, Themes, zoomThreshold } from './constants';
import { type StageDef, stages } from './data/maps';
import { type GameObject, ParticleManager, SkillEffect } from './effects';
import { Marble } from './marble';
import options from './options';
import { Physics } from './physics';
import { VideoRecorder } from './recorder';
import { RouletteRenderer } from './renderer';
import type { ColorTheme, MouseEventHandlerName, MouseEventName } from './types';
import { FastForwarder } from './ui/fastForwarder';
import { Minimap } from './ui/minimap';
import { RankRenderer } from './ui/rankRenderer';
import type { RenderParameters, UIObject } from './ui/uiObject';
import { parseName, shuffle } from './utils';

/** 물리 시뮬레이션 1스텝의 길이(ms) */
const UPDATE_INTERVAL = 10;
/** 누적 시간 상한(ms). 탭 전환 등으로 프레임이 밀려도 폭주하지 않게 한다. */
const MAX_ELAPSED = 100;
const MARBLES_PER_LINE = 10;

export class Roulette extends EventTarget {
  private readonly physics = new Physics();
  private readonly renderer = new RouletteRenderer();
  private readonly camera = new Camera();
  private readonly particleManager = new ParticleManager();

  private marbles: Marble[] = [];
  private winners: Marble[] = [];
  private effects: GameObject[] = [];
  private uiObjects: UIObject[] = [];

  private lastTime = 0;
  private elapsed = 0;
  private timeScale = 1;
  private speed = 1;

  private stage: StageDef | null = null;
  private winnerRank = 0;
  private totalMarbleCount = 0;
  private goalDist = Number.POSITIVE_INFINITY;
  private isRunning = false;
  private winner: Marble | null = null;

  private autoRecording = false;
  private recorder!: VideoRecorder;
  private fastForwarder!: FastForwarder;
  private theme: ColorTheme = Themes.dark;
  private _isReady = false;
  private rafId = 0;
  private destroyed = false;

  get isReady(): boolean {
    return this._isReady;
  }

  init(container: HTMLElement): void {
    this.renderer.init(container);
    this.physics.init();
    this.recorder = new VideoRecorder(this.renderer.canvas);

    const rankRenderer = new RankRenderer();
    this.addUiObject(rankRenderer);

    const minimap = new Minimap();
    minimap.onViewportChange((pos) => {
      if (pos) {
        this.camera.setPosition(pos, false);
        this.camera.lock(true);
      } else {
        this.camera.lock(false);
      }
    });
    this.addUiObject(minimap);

    this.fastForwarder = new FastForwarder();
    this.addUiObject(this.fastForwarder);

    this.attachEvents();
    this.stage = stages[0];
    this.loadMap();

    this._isReady = true;
    this.update();
  }

  private addUiObject(obj: UIObject): void {
    this.uiObjects.push(obj);
    if (obj.onWheel) {
      this.renderer.canvas.addEventListener('wheel', obj.onWheel);
    }
    obj.onMessage?.((msg) => {
      this.dispatchEvent(new CustomEvent('message', { detail: msg }));
    });
  }

  private update = (): void => {
    if (!this.lastTime) this.lastTime = Date.now();
    const currentTime = Date.now();

    this.elapsed += (currentTime - this.lastTime) * this.speed * this.fastForwarder.speed;
    if (this.elapsed > MAX_ELAPSED) {
      this.elapsed %= MAX_ELAPSED;
    }
    this.lastTime = currentTime;

    const interval = (UPDATE_INTERVAL / 1000) * this.timeScale;
    while (this.elapsed >= UPDATE_INTERVAL) {
      this.physics.step(interval);
      this.updateMarbles(UPDATE_INTERVAL);
      this.particleManager.update(UPDATE_INTERVAL);
      this.updateEffects(UPDATE_INTERVAL);
      this.elapsed -= UPDATE_INTERVAL;
      for (const obj of this.uiObjects) {
        obj.update(UPDATE_INTERVAL);
      }
    }

    // y가 큰(=아래쪽) 구슬이 앞선 순위
    if (this.marbles.length > 1) {
      this.marbles.sort((a, b) => b.y - a.y);
    }

    if (this.stage) {
      this.camera.update({
        marbles: this.marbles,
        stage: this.stage,
        needToZoom: this.goalDist < zoomThreshold,
        targetIndex: this.winners.length > 0 ? this.winnerRank - this.winners.length : 0,
      });
    }

    this.render();
    if (!this.destroyed) {
      this.rafId = window.requestAnimationFrame(this.update);
    }
  };

  /** React 언마운트 등에서 게임 루프를 완전히 정지시킨다. */
  destroy(): void {
    this.destroyed = true;
    window.cancelAnimationFrame(this.rafId);
    this.renderer.canvas.remove();
  }

  private updateMarbles(deltaTime: number): void {
    const stage = this.stage;
    if (!stage) return;

    for (let i = 0; i < this.marbles.length; i++) {
      const marble = this.marbles[i];
      marble.update(deltaTime);

      if (marble.skill === Skills.Impact) {
        this.effects.push(new SkillEffect(marble.x, marble.y));
        this.physics.impact(marble.id);
      }

      if (marble.y <= stage.goalY) continue;

      this.winners.push(marble);

      if (this.isRunning && this.winners.length === this.winnerRank + 1) {
        this.declareWinner(marble);
      } else if (
        this.isRunning &&
        this.winnerRank === this.winners.length &&
        this.winnerRank === this.totalMarbleCount - 1 &&
        this.marbles[i + 1]
      ) {
        // 꼴찌를 뽑는 경우: 남은 마지막 한 명이 당첨자
        this.declareWinner(this.marbles[i + 1]);
      }

      const marbleId = marble.id;
      setTimeout(() => this.physics.removeMarble(marbleId), 500);
    }

    const targetIndex = this.winnerRank - this.winners.length;
    const topY = this.marbles[targetIndex] ? this.marbles[targetIndex].y : 0;
    this.goalDist = Math.abs(stage.zoomY - topY);
    this.timeScale = this.calcTimeScale();

    this.marbles = this.marbles.filter((marble) => marble.y <= stage.goalY);
  }

  private declareWinner(marble: Marble): void {
    this.dispatchEvent(new CustomEvent('goal', { detail: { winner: marble.name } }));
    this.winner = marble;
    this.isRunning = false;
    this.particleManager.shot(this.renderer.width, this.renderer.height);
    setTimeout(() => this.recorder.stop(), 1000);
  }

  /** 결승선 부근에서 슬로우 모션을 적용한다. */
  private calcTimeScale(): number {
    const stage = this.stage;
    if (!stage) return 1;

    const targetIndex = this.winnerRank - this.winners.length;
    const target = this.marbles[targetIndex];
    if (!target) return 1;

    if (this.winners.length < this.winnerRank + 1 && this.goalDist < zoomThreshold) {
      const hasRival = this.marbles[targetIndex - 1] || this.marbles[targetIndex + 1];
      if (target.y > stage.zoomY - zoomThreshold * 1.2 && hasRival) {
        return Math.max(0.2, this.goalDist / zoomThreshold);
      }
    }
    return 1;
  }

  private updateEffects(deltaTime: number): void {
    for (const effect of this.effects) {
      effect.update(deltaTime);
    }
    this.effects = this.effects.filter((effect) => !effect.isDestroy);
  }

  private render(): void {
    if (!this.stage) return;

    const params: RenderParameters = {
      camera: this.camera,
      stage: this.stage,
      entities: this.physics.getEntities(),
      marbles: this.marbles,
      winners: this.winners,
      particleManager: this.particleManager,
      effects: this.effects,
      winnerRank: this.winnerRank,
      winner: this.winner,
      size: { x: this.renderer.width, y: this.renderer.height },
      theme: this.theme,
    };
    this.renderer.render(params, this.uiObjects);
  }

  private handleMouse = (eventName: MouseEventName, e: MouseEvent): void => {
    const handlerName = `on${eventName}` as MouseEventHandlerName;
    const sizeFactor = this.renderer.sizeFactor;
    const pos = { x: e.offsetX * sizeFactor, y: e.offsetY * sizeFactor };

    for (const obj of this.uiObjects) {
      const handler = obj[handlerName];
      if (!handler) continue;

      const bounds = obj.getBoundingBox();
      if (!bounds) {
        handler({ ...pos, button: e.button });
      } else if (
        pos.x >= bounds.x &&
        pos.y >= bounds.y &&
        pos.x <= bounds.x + bounds.w &&
        pos.y <= bounds.y + bounds.h
      ) {
        handler({ x: pos.x - bounds.x, y: pos.y - bounds.y, button: e.button });
      } else {
        handler(undefined);
      }
    }
  };

  private attachEvents(): void {
    const canvas = this.renderer.canvas;

    const onPointerRelease = (e: Event) => {
      this.handleMouse('MouseUp', e as MouseEvent);
      window.removeEventListener('pointerup', onPointerRelease);
      window.removeEventListener('pointercancel', onPointerRelease);
    };

    canvas.addEventListener('pointerdown', (e) => {
      this.handleMouse('MouseDown', e);
      window.addEventListener('pointerup', onPointerRelease);
      window.addEventListener('pointercancel', onPointerRelease);
    });
    canvas.addEventListener('pointermove', (e) => this.handleMouse('MouseMove', e));
    canvas.addEventListener('dblclick', (e) => this.handleMouse('DblClick', e));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private loadMap(): void {
    if (!this.stage) throw new Error('선택된 맵이 없습니다');
    this.physics.createStage(this.stage);
    this.camera.initializePosition();
  }

  private clearMarbles(): void {
    this.physics.clearMarbles();
    this.winner = null;
    this.winners = [];
    this.marbles = [];
  }

  reset(): void {
    this.clearMarbles();
    this.physics.clear();
    this.effects = [];
    this.particleManager.clear();
    this.loadMap();
    this.goalDist = Number.POSITIVE_INFINITY;
    this.isRunning = false;
  }

  setMarbles(names: string[]): void {
    this.reset();

    let maxWeight = Number.NEGATIVE_INFINITY;
    let minWeight = Number.POSITIVE_INFINITY;

    const members = names
      .map((nameString) => parseName(nameString))
      .filter((member): member is NonNullable<typeof member> => !!member)
      .map((member) => {
        maxWeight = Math.max(maxWeight, member.weight);
        minWeight = Math.min(minWeight, member.weight);
        return member;
      });

    const gap = maxWeight - minWeight;
    const totalCount = members.reduce((sum, member) => sum + member.count, 0);

    // 출발 순서를 무작위로 섞는다
    const orders = shuffle(Array.from({ length: totalCount }, (_, i) => i));

    for (const member of members) {
      const weight = 0.1 + (gap ? (member.weight - minWeight) / gap : 0);
      for (let j = 0; j < member.count; j++) {
        const order = orders.pop() ?? 0;
        this.marbles.push(new Marble(this.physics, order, totalCount, member.name, weight));
      }
    }
    this.totalMarbleCount = totalCount;

    if (totalCount > 0) {
      this.focusOnSpawnArea(totalCount);
    }
  }

  /** 구슬이 생성된 영역이 화면에 가득 차도록 카메라를 맞춘다. */
  private focusOnSpawnArea(totalCount: number): void {
    const cols = Math.min(totalCount, MARBLES_PER_LINE);
    const rows = Math.ceil(totalCount / MARBLES_PER_LINE);
    const lineDelta = -Math.max(0, Math.ceil(rows - 5));
    const center = { x: 10.25 + (cols - 1) * 0.3, y: (1 + rows) / 2 + lineDelta };

    const spawnWidth = Math.max((cols - 1) * 0.6, 1);
    const spawnHeight = Math.max(rows - 1, 1);
    const margin = 3;
    const viewW = canvasWidth / initialZoom;
    const viewH = canvasHeight / initialZoom;
    const zoom = Math.max(
      1.5,
      Math.min(viewW / (spawnWidth + margin * 2), viewH / (spawnHeight + margin * 2), 3)
    );

    this.camera.initializePosition(center, zoom);
  }

  start(): void {
    if (this.marbles.length === 0) return;

    this.isRunning = true;
    this.winnerRank = options.winningRank;
    if (this.winnerRank >= this.marbles.length) {
      this.winnerRank = this.marbles.length - 1;
    }
    this.camera.startFollowingMarbles();

    if (this.autoRecording) {
      try {
        this.recorder.start();
      } catch (error: unknown) {
        this.dispatchEvent(
          new CustomEvent('message', {
            detail: error instanceof Error ? error.message : '녹화를 시작하지 못했습니다',
          })
        );
      }
    }

    this.physics.start();
    for (const marble of this.marbles) {
      marble.isActive = true;
    }
  }

  setSpeed(value: number): void {
    if (value <= 0) throw new Error('속도 배율은 0보다 커야 합니다');
    this.speed = value;
  }

  getSpeed(): number {
    return this.speed;
  }

  setTheme(themeName: keyof typeof Themes): void {
    this.theme = Themes[themeName];
  }

  setWinningRank(rank: number): void {
    this.winnerRank = rank;
  }

  setAutoRecording(value: boolean): void {
    this.autoRecording = value;
  }

  getCount(): number {
    return this.marbles.length;
  }

  getMaps(): { index: number; title: string }[] {
    return stages.map((stage, index) => ({ index, title: stage.title }));
  }

  setMap(index: number): void {
    if (index < 0 || index > stages.length - 1) {
      throw new Error('존재하지 않는 맵 번호입니다');
    }
    const names = this.marbles.map((marble) => marble.name);
    this.stage = stages[index];
    this.setMarbles(names);
  }
}
