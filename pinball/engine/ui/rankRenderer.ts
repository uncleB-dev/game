import type { Marble } from '../marble';
import type { MouseEventArgs, Rect } from '../types';
import type { RenderParameters, UIObject } from './uiObject';

const FONT_HEIGHT = 16;
/** 사용자가 휠로 움직인 뒤 자동 스크롤을 멈추는 시간(ms) */
const USER_SCROLL_HOLD = 2000;

/** 우측 상단 순위표. 더블클릭하면 결과를 TSV로 복사한다. */
export class RankRenderer implements UIObject {
  private _currentY = 0;
  private _targetY = 0;
  private _userMoved = 0;
  private _currentWinner = -1;
  private maxY = 0;

  private winners: Marble[] = [];
  private marbles: Marble[] = [];
  private winnerRank = -1;
  private messageHandler?: (msg: string) => void;

  getBoundingBox(): Rect | null {
    return null;
  }

  onMessage(func: (msg: string) => void): void {
    this.messageHandler = func;
  }

  onWheel = (e: WheelEvent): void => {
    this._targetY = Math.min(this.maxY, this._targetY + e.deltaY);
    this._userMoved = USER_SCROLL_HOLD;
  };

  onDblClick = (e?: MouseEventArgs): void => {
    if (!e || !navigator.clipboard) return;

    const rows = [...this.winners, ...this.marbles].map((marble, index) =>
      [(index + 1).toString(), marble.name, index === this.winnerRank ? '★' : ''].join('\t')
    );
    rows.unshift(['Rank', 'Name', 'Winner'].join('\t'));

    navigator.clipboard.writeText(rows.join('\n')).then(() => {
      this.messageHandler?.('결과가 클립보드에 복사되었습니다');
    });
  };

  update(deltaTime: number): void {
    if (this._currentWinner === -1) return;

    if (this._userMoved > 0) {
      this._userMoved -= deltaTime;
    } else {
      this._targetY = this._currentWinner * FONT_HEIGHT + FONT_HEIGHT;
    }

    if (this._currentY !== this._targetY) {
      this._currentY += (this._targetY - this._currentY) * (deltaTime / 250);
    }
    if (Math.abs(this._currentY - this._targetY) < 1) {
      this._currentY = this._targetY;
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    { winners, marbles, winnerRank, theme }: RenderParameters,
    width: number,
    height: number
  ): void {
    const startX = width - 5;
    const startY = Math.max(-FONT_HEIGHT, this._currentY - height / 2);

    this.maxY = Math.max(0, (marbles.length + winners.length) * FONT_HEIGHT + FONT_HEIGHT);
    this._currentWinner = winners.length;
    this.winners = winners;
    this.marbles = marbles;
    this.winnerRank = winnerRank;

    ctx.save();
    ctx.textAlign = 'right';
    ctx.font = '10pt sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText(`${winners.length} / ${winners.length + marbles.length}`, startX, FONT_HEIGHT);

    ctx.beginPath();
    ctx.rect(width - 150, FONT_HEIGHT + 2, width, this.maxY);
    ctx.clip();
    ctx.translate(0, -startY);

    if (theme.rankStroke) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = theme.rankStroke;
    }

    ctx.font = 'bold 11pt sans-serif';
    winners.forEach((marble, rank) => {
      const y = rank * FONT_HEIGHT;
      if (y < startY || y > startY + height) return;
      const label = `${rank === winnerRank ? '★' : '✔'} ${marble.name} #${rank + 1}`;
      ctx.fillStyle = `hsl(${marble.hue} 100% ${theme.marbleLightness}%)`;
      if (theme.rankStroke) ctx.strokeText(label, startX, 20 + y);
      ctx.fillText(label, startX, 20 + y);
    });

    ctx.font = '10pt sans-serif';
    marbles.forEach((marble, rank) => {
      const y = (rank + winners.length) * FONT_HEIGHT;
      if (y < startY || y > startY + height) return;
      const label = `${marble.name} #${rank + 1 + winners.length}`;
      ctx.fillStyle = `hsl(${marble.hue} 100% ${theme.marbleLightness}%)`;
      if (theme.rankStroke) ctx.strokeText(label, startX, 20 + y);
      ctx.fillText(label, startX, 20 + y);
    });

    ctx.restore();
  }
}
