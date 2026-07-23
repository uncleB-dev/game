import { initialZoom, zoomThreshold } from './constants';
import type { StageDef } from './data/maps';
import type { Marble } from './marble';
import type { VectorLike } from './types';

interface CameraUpdateParams {
  marbles: Marble[];
  stage: StageDef;
  needToZoom: boolean;
  targetIndex: number;
}

/** 선두 구슬을 부드럽게 따라가며 골 근처에서 줌인하는 카메라 */
export class Camera {
  private _position: VectorLike = { x: 0, y: 0 };
  private _targetPosition: VectorLike = { x: 0, y: 0 };
  private _zoom = 1;
  private _targetZoom = 1;
  private _locked = false;
  private _shouldFollowMarbles = false;

  get zoom(): number {
    return this._zoom;
  }

  set zoom(v: number) {
    this._targetZoom = v;
  }

  get x(): number {
    return this._position.x;
  }

  get y(): number {
    return this._position.y;
  }

  get position(): VectorLike {
    return this._position;
  }

  setPosition(v: VectorLike, force = false): void {
    if (force) {
      this._position = { x: v.x, y: v.y };
    }
    this._targetPosition = { x: v.x, y: v.y };
  }

  lock(v: boolean): void {
    this._locked = v;
  }

  startFollowingMarbles(): void {
    this._shouldFollowMarbles = true;
  }

  initializePosition(center?: VectorLike, zoom?: number): void {
    const x = center?.x ?? 12.95;
    const y = center?.y ?? 2;
    const z = zoom ?? 1;

    this._position = { x, y };
    this._targetPosition = { x, y };
    this._zoom = z;
    this._targetZoom = z;
    this._shouldFollowMarbles = false;
  }

  update({ marbles, stage, needToZoom, targetIndex }: CameraUpdateParams): void {
    if (!this._locked) {
      this._calcTargetPositionAndZoom(marbles, stage, needToZoom, targetIndex);
    }

    this._position.x = this._interpolate(this._position.x, this._targetPosition.x);
    this._position.y = this._interpolate(this._position.y, this._targetPosition.y);
    this._zoom = this._interpolate(this._zoom, this._targetZoom);
  }

  private _calcTargetPositionAndZoom(
    marbles: Marble[],
    stage: StageDef,
    needToZoom: boolean,
    targetIndex: number
  ): void {
    if (!this._shouldFollowMarbles) return;

    if (marbles.length === 0) {
      this.zoom = 1;
      return;
    }

    const targetMarble = marbles[targetIndex] ?? marbles[0];
    this.setPosition(targetMarble.position);

    if (needToZoom) {
      const goalDist = Math.abs(stage.zoomY - this._position.y);
      this.zoom = Math.max(1, (1 - goalDist / zoomThreshold) * 4);
    } else {
      this.zoom = 1;
    }
  }

  private _interpolate(current: number, target: number): number {
    const d = target - current;
    if (Math.abs(d) < 1 / initialZoom) return target;
    return current + d / 10;
  }

  /** 카메라 변환을 적용한 상태에서 씬을 그린다. */
  renderScene(ctx: CanvasRenderingContext2D, callback: (ctx: CanvasRenderingContext2D) => void): void {
    const zoomFactor = initialZoom * 2 * this._zoom;
    ctx.save();
    ctx.translate(-this.x * this._zoom, -this.y * this._zoom);
    ctx.scale(this._zoom, this._zoom);
    ctx.translate(ctx.canvas.width / zoomFactor, ctx.canvas.height / zoomFactor);
    callback(ctx);
    ctx.restore();
  }
}
