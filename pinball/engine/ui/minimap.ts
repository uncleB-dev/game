import { initialZoom } from '../constants';
import type { ColorTheme, MapEntityState, MouseEventArgs, Rect, VectorLike } from '../types';
import type { RenderParameters, UIObject } from './uiObject';

/** 미니맵 확대 배율(월드 1 = 4px) */
const MINIMAP_SCALE = 4;
/** 맵 가로 폭(월드 단위) */
const MAP_WIDTH = 26;

/** 좌측 상단에 전체 맵을 축소해 보여주고, 드래그로 시점을 옮길 수 있다. */
export class Minimap implements UIObject {
  private ctx!: CanvasRenderingContext2D;
  private lastParams: RenderParameters | null = null;
  private boundingBox: Rect = { x: 10, y: 10, w: MAP_WIDTH * MINIMAP_SCALE, h: 0 };
  private _onViewportChangeHandler: ((pos?: VectorLike) => void) | null = null;

  getBoundingBox(): Rect {
    return this.boundingBox;
  }

  onViewportChange(callback: (pos?: VectorLike) => void): void {
    this._onViewportChangeHandler = callback;
  }

  update(): void {
    // 매 프레임 갱신할 상태 없음
  }

  onMouseMove = (e?: MouseEventArgs): void => {
    if (!e) {
      this._onViewportChangeHandler?.();
      return;
    }
    if (!this.lastParams) return;
    this._onViewportChangeHandler?.({ x: e.x / MINIMAP_SCALE, y: e.y / MINIMAP_SCALE });
  };

  render(ctx: CanvasRenderingContext2D, params: RenderParameters): void {
    const { stage } = params;
    if (!stage) return;

    this.boundingBox.h = stage.goalY * MINIMAP_SCALE;
    this.lastParams = params;
    this.ctx = ctx;

    ctx.save();
    ctx.fillStyle = params.theme.minimapBackground;
    ctx.translate(this.boundingBox.x, this.boundingBox.y);
    ctx.scale(MINIMAP_SCALE, MINIMAP_SCALE);
    ctx.fillRect(0, 0, MAP_WIDTH, stage.goalY);
    ctx.lineWidth = 3 / (params.camera.zoom + initialZoom);

    this.drawEntities(params.entities, params.theme);
    this.drawMarbles(params);
    this.drawViewport(params);
    ctx.restore();
  }

  private drawViewport(params: RenderParameters): void {
    const { camera, size } = params;
    const zoom = camera.zoom * initialZoom;
    const w = size.x / zoom;
    const h = size.y / zoom;

    this.ctx.save();
    this.ctx.strokeStyle = params.theme.minimapViewport;
    this.ctx.lineWidth = 1 / zoom;
    this.ctx.strokeRect(camera.x - w / 2, camera.y - h / 2, w, h);
    this.ctx.restore();
  }

  private drawEntities(entities: MapEntityState[], theme: ColorTheme): void {
    for (const entity of entities) {
      this.ctx.save();
      this.ctx.fillStyle = entity.shape.color ?? theme.entity[entity.shape.type].fill;
      this.ctx.strokeStyle = entity.shape.color ?? theme.entity[entity.shape.type].outline;
      this.ctx.translate(entity.x, entity.y);
      this.ctx.rotate(entity.angle);

      const shape = entity.shape;
      switch (shape.type) {
        case 'box': {
          const w = shape.width * 2;
          const h = shape.height * 2;
          this.ctx.rotate(shape.rotation);
          this.ctx.fillRect(-w / 2, -h / 2, w, h);
          break;
        }
        case 'circle':
          this.ctx.beginPath();
          this.ctx.arc(0, 0, shape.radius, 0, Math.PI * 2);
          this.ctx.stroke();
          break;
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
      }
      this.ctx.restore();
    }
  }

  private drawMarbles(params: RenderParameters): void {
    const viewPort = {
      x: params.camera.x,
      y: params.camera.y,
      w: params.size.x,
      h: params.size.y,
      zoom: params.camera.zoom * initialZoom,
    };
    for (const marble of params.marbles) {
      marble.render(this.ctx, 1, false, true, viewPort, params.theme);
    }
  }
}
