import { canvasHeight, canvasWidth, initialZoom, Themes } from './constants';
import type { ColorTheme, MapEntityState } from './types';
import type { RenderParameters, UIObject } from './ui/uiObject';

/** 우승 배너 높이 */
const WINNER_BANNER_HEIGHT = 168;
/** 캔버스 내부 렌더 해상도의 최소 폭 */
const MIN_RENDER_WIDTH = 640;

export class RouletteRenderer {
  private _canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private _theme: ColorTheme = Themes.dark;
  /** CSS 픽셀 -> 캔버스 내부 픽셀 변환 계수 */
  sizeFactor = 1;

  get width(): number {
    return this._canvas.width;
  }

  get height(): number {
    return this._canvas.height;
  }

  get canvas(): HTMLCanvasElement {
    return this._canvas;
  }

  init(container: HTMLElement): void {
    this._canvas = document.createElement('canvas');
    this._canvas.width = canvasWidth;
    this._canvas.height = canvasHeight;
    const ctx = this._canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('2D 캔버스 컨텍스트를 생성할 수 없습니다');
    }
    this.ctx = ctx;
    container.appendChild(this._canvas);

    const resizing = (entries?: ResizeObserverEntry[]) => {
      const realSize = entries ? entries[0].contentRect : this._canvas.getBoundingClientRect();
      if (realSize.width === 0 || realSize.height === 0) return;
      const width = Math.max(realSize.width / 2, MIN_RENDER_WIDTH);
      const height = (width / realSize.width) * realSize.height;
      this._canvas.width = width;
      this._canvas.height = height;
      this.sizeFactor = width / realSize.width;
    };

    new ResizeObserver(resizing).observe(this._canvas);
    resizing();
  }

  render(params: RenderParameters, uiObjects: UIObject[]): void {
    this._theme = params.theme;

    this.ctx.fillStyle = this._theme.background;
    this.ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);

    this.ctx.save();
    this.ctx.scale(initialZoom, initialZoom);
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.font = '0.4pt sans-serif';
    this.ctx.lineWidth = 3 / (params.camera.zoom + initialZoom);
    params.camera.renderScene(this.ctx, () => {
      this.renderEntities(params.entities);
      this.renderEffects(params);
      this.renderMarbles(params);
    });
    this.ctx.restore();

    for (const obj of uiObjects) {
      obj.render(this.ctx, params, this._canvas.width, this._canvas.height);
    }
    params.particleManager.render(this.ctx);
    this.renderWinner(params);
  }

  private renderEntities(entities: MapEntityState[]): void {
    this.ctx.save();
    for (const entity of entities) {
      const transform = this.ctx.getTransform();
      const style = this._theme.entity[entity.shape.type];

      this.ctx.translate(entity.x, entity.y);
      this.ctx.rotate(entity.angle);
      this.ctx.fillStyle = entity.shape.color ?? style.fill;
      this.ctx.strokeStyle = entity.shape.color ?? style.outline;
      this.ctx.shadowBlur = style.bloomRadius;
      this.ctx.shadowColor = entity.shape.bloomColor ?? entity.shape.color ?? style.bloom;

      const shape = entity.shape;
      switch (shape.type) {
        case 'polyline':
          if (shape.points.length > 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(shape.points[0][0], shape.points[0][1]);
            for (let i = 1; i < shape.points.length; i++) {
              this.ctx.lineTo(shape.points[i][0], shape.points[i][1]);
            }
            this.ctx.stroke();
          }
          break;
        case 'box': {
          const w = shape.width * 2;
          const h = shape.height * 2;
          this.ctx.rotate(shape.rotation);
          this.ctx.fillRect(-w / 2, -h / 2, w, h);
          this.ctx.strokeRect(-w / 2, -h / 2, w, h);
          break;
        }
        case 'circle':
          this.ctx.beginPath();
          this.ctx.arc(0, 0, shape.radius, 0, Math.PI * 2);
          this.ctx.stroke();
          break;
      }

      this.ctx.setTransform(transform);
    }
    this.ctx.restore();
  }

  private renderEffects({ effects, camera }: RenderParameters): void {
    for (const effect of effects) {
      effect.render(this.ctx, camera.zoom * initialZoom, this._theme);
    }
  }

  private renderMarbles({ marbles, camera, winnerRank, winners, size }: RenderParameters): void {
    const winnerIndex = winnerRank - winners.length;
    const viewPort = { x: camera.x, y: camera.y, w: size.x, h: size.y, zoom: camera.zoom * initialZoom };

    marbles.forEach((marble, i) => {
      marble.render(this.ctx, camera.zoom * initialZoom, i === winnerIndex, false, viewPort, this._theme);
    });
  }

  private renderWinner({ winner, theme }: RenderParameters): void {
    if (!winner) return;

    const width = this._canvas.width;
    const height = this._canvas.height;
    const marbleSize = 100;
    const marbleCenterX = width - marbleSize / 2 - 20;
    const marbleCenterY = height - WINNER_BANNER_HEIGHT / 2;

    this.ctx.save();
    this.ctx.fillStyle = theme.winnerBackground;
    this.ctx.fillRect(width / 2, height - WINNER_BANNER_HEIGHT, width / 2, WINNER_BANNER_HEIGHT);

    this.ctx.beginPath();
    this.ctx.arc(marbleCenterX, marbleCenterY, marbleSize / 2, 0, Math.PI * 2);
    this.ctx.fillStyle = `hsl(${winner.hue} 100% ${theme.marbleLightness}%)`;
    this.ctx.fill();

    const textRightX = marbleCenterX - marbleSize / 2 - 20;
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'alphabetic';
    this.ctx.lineWidth = 4;
    this.ctx.strokeStyle = theme.winnerOutline;

    this.ctx.font = 'bold 48px sans-serif';
    this.ctx.fillStyle = theme.winnerText;
    if (theme.winnerOutline) this.ctx.strokeText('Winner', textRightX, height - 120);
    this.ctx.fillText('Winner', textRightX, height - 120);

    this.ctx.font = 'bold 72px sans-serif';
    this.ctx.fillStyle = `hsl(${winner.hue} 100% ${theme.marbleLightness}%)`;
    if (theme.winnerOutline) this.ctx.strokeText(winner.name, textRightX, height - 55);
    this.ctx.fillText(winner.name, textRightX, height - 55);

    this.ctx.restore();
  }
}
