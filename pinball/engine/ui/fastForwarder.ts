import type { Rect } from '../types';
import type { RenderParameters, UIObject } from './uiObject';

const FF_SPEED = 2;

/** 화면 중앙을 누르고 있는 동안 2배속으로 진행시킨다. */
export class FastForwarder implements UIObject {
  private bound: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private isEnabled = false;

  get speed(): number {
    return this.isEnabled ? FF_SPEED : 1;
  }

  getBoundingBox(): Rect {
    return this.bound;
  }

  update(): void {
    // 상태 갱신 없음
  }

  onMouseDown = (): void => {
    this.isEnabled = true;
  };

  onMouseUp = (): void => {
    this.isEnabled = false;
  };

  render(ctx: CanvasRenderingContext2D, _params: RenderParameters, width: number, height: number): void {
    this.bound = { x: width / 4, y: height / 4, w: width / 2, h: height / 2 };
    if (!this.isEnabled) return;

    const centerX = this.bound.x + this.bound.w / 2;
    const centerY = this.bound.y + this.bound.h / 2;

    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    for (const offset of [-40, 30]) {
      ctx.moveTo(centerX + offset, centerY - 45);
      ctx.lineTo(centerX + offset + 60, centerY);
      ctx.lineTo(centerX + offset, centerY + 45);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  }
}
