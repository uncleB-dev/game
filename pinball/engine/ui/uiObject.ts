import type { Camera } from '../camera';
import type { StageDef } from '../data/maps';
import type { GameObject, ParticleManager } from '../effects';
import type { Marble } from '../marble';
import type { ColorTheme, MapEntityState, MouseEventArgs, Rect, VectorLike } from '../types';

export interface RenderParameters {
  camera: Camera;
  stage: StageDef;
  entities: MapEntityState[];
  marbles: Marble[];
  winners: Marble[];
  particleManager: ParticleManager;
  effects: GameObject[];
  winnerRank: number;
  winner: Marble | null;
  size: VectorLike;
  theme: ColorTheme;
}

/** 씬 위에 그려지는 화면 좌표계 UI 요소 */
export interface UIObject {
  update(deltaTime: number): void;
  render(ctx: CanvasRenderingContext2D, params: RenderParameters, width: number, height: number): void;
  /** null 이면 캔버스 전체를 대상으로 마우스 이벤트를 받는다 */
  getBoundingBox(): Rect | null;
  onWheel?(e: WheelEvent): void;
  onMouseMove?(e?: MouseEventArgs): void;
  onMouseDown?(e?: MouseEventArgs): void;
  onMouseUp?(e?: MouseEventArgs): void;
  onDblClick?(e?: MouseEventArgs): void;
  onMessage?(func: (msg: string) => void): void;
}
