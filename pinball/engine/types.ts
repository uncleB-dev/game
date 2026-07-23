export interface VectorLike {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type EntityShapeType = 'box' | 'circle' | 'polyline';

interface EntityShapeBase {
  type: EntityShapeType;
  color?: string;
  bloomColor?: string;
}

export interface EntityBoxShape extends EntityShapeBase {
  type: 'box';
  width: number;
  height: number;
  rotation: number;
}

export interface EntityCircleShape extends EntityShapeBase {
  type: 'circle';
  radius: number;
}

export interface EntityPolylineShape extends EntityShapeBase {
  type: 'polyline';
  rotation: number;
  points: [number, number][];
}

export type EntityShape = EntityBoxShape | EntityCircleShape | EntityPolylineShape;

export interface EntityPhysicalProps {
  density: number;
  restitution: number;
  angularVelocity: number;
  /** 접촉하면 사라지는 엔티티(생명력)를 정의한다. -1 이면 영구 엔티티. */
  life?: number;
}

export interface MapEntity {
  position: VectorLike;
  type: 'static' | 'kinematic';
  shape: EntityShape;
  props: EntityPhysicalProps;
}

/** 렌더러에 전달되는 엔티티의 매 프레임 상태 */
export interface MapEntityState {
  x: number;
  y: number;
  angle: number;
  shape: EntityShape;
  life: number;
}

export interface EntityStyle {
  fill: string;
  outline: string;
  bloom: string;
  bloomRadius: number;
}

export interface ColorTheme {
  background: string;
  marbleLightness: number;
  marbleWinningBorder: string;
  skillColor: string;
  coolTimeIndicator: string;
  entity: Record<EntityShapeType, EntityStyle>;
  rankStroke: string;
  minimapBackground: string;
  minimapViewport: string;
  winnerBackground: string;
  winnerOutline: string;
  winnerText: string;
}

export type MouseEventName = 'MouseDown' | 'MouseUp' | 'MouseMove' | 'DblClick';
export type MouseEventHandlerName = `on${MouseEventName}`;
export type MouseEventArgs = { x: number; y: number; button: number };
