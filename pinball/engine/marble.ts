import { type Skill, Skills, STUCK_DELAY, Themes } from './constants';
import options from './options';
import type { Physics } from './physics';
import type { ColorTheme, VectorLike } from './types';
import { lenSq, rad, transformGuard } from './utils';

/** 한 줄에 놓이는 구슬 수 */
const MARBLES_PER_LINE = 10;

export interface ViewPort {
  x: number;
  y: number;
  w: number;
  h: number;
  zoom: number;
}

export class Marble {
  readonly id: number;
  readonly name: string;
  readonly hue: number;
  readonly color: string;

  size = 0.5;
  impact = 0;
  weight = 1;
  skill: Skill = Skills.None;
  isActive = false;

  private _skillRate = 0.0005;
  private _coolTime = 5000;
  private _maxCoolTime = 5000;
  private _stuckTime = 0;
  private lastPosition: VectorLike = { x: 0, y: 0 };
  private theme: ColorTheme = Themes.dark;

  private readonly physics: Physics;

  constructor(physics: Physics, order: number, max: number, name?: string, weight = 1) {
    this.physics = physics;
    this.name = name || `M${order}`;
    this.weight = weight;
    this.id = order;

    this._maxCoolTime = 1000 + (1 - this.weight) * 4000;
    this._coolTime = this._maxCoolTime * Math.random();
    this._skillRate = 0.2 * this.weight;

    this.hue = (360 / max) * order;
    this.color = `hsl(${this.hue} 100% 70%)`;

    const maxLine = Math.ceil(max / MARBLES_PER_LINE);
    const line = Math.floor(order / MARBLES_PER_LINE);
    const lineDelta = -Math.max(0, Math.ceil(maxLine - 5));

    physics.createMarble(order, 10.25 + (order % MARBLES_PER_LINE) * 0.6, maxLine - line + lineDelta);
  }

  get position(): { x: number; y: number; angle: number } {
    return this.physics.getMarblePosition(this.id);
  }

  get x(): number {
    return this.position.x;
  }

  get y(): number {
    return this.position.y;
  }

  get angle(): number {
    return this.position.angle;
  }

  update(deltaTime: number): void {
    const position = this.position;

    if (this.isActive && lenSq(this.lastPosition, position) < 0.00001) {
      this._stuckTime += deltaTime;
      if (this._stuckTime > STUCK_DELAY) {
        this.physics.shakeMarble(this.id);
        this._stuckTime = 0;
      }
    } else {
      this._stuckTime = 0;
    }
    this.lastPosition = { x: position.x, y: position.y };

    this.skill = Skills.None;
    if (this.impact) {
      this.impact = Math.max(0, this.impact - deltaTime);
    }

    if (!this.isActive) return;
    if (options.useSkills) {
      this._updateSkillInformation(deltaTime);
    }
  }

  private _updateSkillInformation(deltaTime: number): void {
    if (this._coolTime > 0) {
      this._coolTime -= deltaTime;
    }
    if (this._coolTime <= 0) {
      this.skill = Math.random() < this._skillRate ? Skills.Impact : Skills.None;
      this._coolTime = this._maxCoolTime;
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    zoom: number,
    outline: boolean,
    isMinimap: boolean,
    viewPort: ViewPort,
    theme: ColorTheme
  ): void {
    this.theme = theme;

    if (!isMinimap && !this._isInViewPort(viewPort)) return;

    transformGuard(ctx, () => {
      if (isMinimap) {
        ctx.fillStyle = this.color;
        this._drawBody(ctx, true);
      } else {
        this._renderNormal(ctx, zoom, outline);
      }
    });
  }

  private _isInViewPort(viewPort: ViewPort): boolean {
    const halfW = viewPort.w / viewPort.zoom / 2;
    const halfH = viewPort.h / viewPort.zoom / 2;
    const { x, y } = this.position;
    return (
      x >= viewPort.x - halfW &&
      x <= viewPort.x + halfW &&
      y >= viewPort.y - halfH - this.size / 2 &&
      y <= viewPort.y + halfH
    );
  }

  private _drawBody(ctx: CanvasRenderingContext2D, isMinimap: boolean): void {
    const { x, y } = this.position;
    ctx.beginPath();
    ctx.arc(x, y, isMinimap ? this.size : this.size / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private _renderNormal(ctx: CanvasRenderingContext2D, zoom: number, outline: boolean): void {
    const lightness = this.theme.marbleLightness + 25 * Math.min(1, this.impact / 500);
    ctx.fillStyle = `hsl(${this.hue} 100% ${lightness}%)`;
    this._drawBody(ctx, false);

    ctx.shadowBlur = 0;
    this._drawName(ctx, zoom);

    if (outline) {
      this._drawOutline(ctx, 2 / zoom);
    }
    if (options.useSkills) {
      this._renderCoolTime(ctx, zoom);
    }
  }

  private _drawName(ctx: CanvasRenderingContext2D, zoom: number): void {
    const { x, y } = this.position;
    transformGuard(ctx, () => {
      ctx.font = '12pt sans-serif';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 0;
      ctx.translate(x, y + 0.25);
      ctx.scale(1 / zoom, 1 / zoom);
      ctx.strokeText(this.name, 0, 0);
      ctx.fillText(this.name, 0, 0);
    });
  }

  private _drawOutline(ctx: CanvasRenderingContext2D, lineWidth: number): void {
    const { x, y } = this.position;
    ctx.beginPath();
    ctx.strokeStyle = this.theme.marbleWinningBorder;
    ctx.lineWidth = lineWidth;
    ctx.arc(x, y, this.size / 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  /** 스킬 쿨타임을 구슬 둘레의 호로 표시한다. */
  private _renderCoolTime(ctx: CanvasRenderingContext2D, zoom: number): void {
    const { x, y } = this.position;
    ctx.strokeStyle = this.theme.coolTimeIndicator;
    ctx.lineWidth = 1 / zoom;
    ctx.beginPath();
    ctx.arc(x, y, this.size / 2 + 2 / zoom, rad(270), rad(270 + (360 * this._coolTime) / this._maxCoolTime));
    ctx.stroke();
  }
}
