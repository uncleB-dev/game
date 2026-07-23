import { Body, Box, Circle, Edge, Vec2, World } from 'planck';
import type { StageDef } from './data/maps';
import type { MapEntity, MapEntityState } from './types';

const MARBLE_RADIUS = 0.25;
/** 임팩트 스킬의 유효 반경(제곱값으로 비교) */
const IMPACT_RANGE_SQ = 100;

interface EntityRecord extends MapEntityState {
  body: Body;
}

/**
 * planck(Box2D 포팅) 기반 물리 세계.
 * 구슬은 dynamic, 맵 엔티티는 static/kinematic 바디로 만든다.
 */
export class Physics {
  private world!: World;
  private marbleMap = new Map<number, Body>();
  private entities: EntityRecord[] = [];
  private deleteCandidates: Body[] = [];

  init(): void {
    this.world = new World(new Vec2(0, 10));
  }

  clear(): void {
    this.clearEntities();
  }

  clearMarbles(): void {
    for (const body of this.marbleMap.values()) {
      this.world.destroyBody(body);
    }
    this.marbleMap.clear();
  }

  createStage(stage: StageDef): void {
    this.createEntities(stage.entities);
  }

  private createEntities(entities?: MapEntity[]): void {
    if (!entities) return;

    for (const entity of entities) {
      const body = this.world.createBody({ type: entity.type });

      switch (entity.shape.type) {
        case 'box':
          body.createFixture(new Box(entity.shape.width, entity.shape.height, new Vec2(0, 0), entity.shape.rotation), {
            density: entity.props.density,
            restitution: entity.props.restitution,
          });
          break;
        case 'polyline':
          for (let i = 0; i < entity.shape.points.length - 1; i++) {
            const [x1, y1] = entity.shape.points[i];
            const [x2, y2] = entity.shape.points[i + 1];
            body.createFixture(new Edge(new Vec2(x1, y1), new Vec2(x2, y2)), 1);
          }
          break;
        case 'circle':
          body.createFixture(new Circle(entity.shape.radius), {
            density: entity.props.density,
            restitution: entity.props.restitution,
          });
          break;
      }

      body.setAngularVelocity(entity.props.angularVelocity);
      body.setTransform(new Vec2(entity.position.x, entity.position.y), 0);

      this.entities.push({
        body,
        x: entity.position.x,
        y: entity.position.y,
        angle: 0,
        shape: entity.shape,
        life: entity.props.life ?? -1,
      });
    }
  }

  private clearEntities(): void {
    for (const entity of this.entities) {
      this.world.destroyBody(entity.body);
    }
    this.entities = [];
  }

  createMarble(id: number, x: number, y: number): void {
    const body = this.world.createBody({
      type: 'dynamic',
      position: new Vec2(x, y),
    });
    body.createFixture(new Circle(MARBLE_RADIUS), 1 + Math.random());
    body.setAwake(false);
    body.setActive(false);
    this.marbleMap.set(id, body);
  }

  /** 끼어버린 구슬에 무작위 충격을 준다. */
  shakeMarble(id: number): void {
    const body = this.marbleMap.get(id);
    if (!body) return;
    body.applyLinearImpulse(new Vec2(Math.random() * 10 - 5, Math.random() * 10 - 5), body.getWorldCenter(), true);
  }

  removeMarble(id: number): void {
    const body = this.marbleMap.get(id);
    if (!body) return;
    this.world.destroyBody(body);
    this.marbleMap.delete(id);
  }

  getMarblePosition(id: number): { x: number; y: number; angle: number } {
    const body = this.marbleMap.get(id);
    if (!body) return { x: 0, y: 0, angle: 0 };
    const pos = body.getPosition();
    return { x: pos.x, y: pos.y, angle: body.getAngle() };
  }

  getEntities(): MapEntityState[] {
    return this.entities.map((entity) => ({
      x: entity.x,
      y: entity.y,
      shape: entity.shape,
      life: entity.life,
      angle: entity.body.getAngle(),
    }));
  }

  /** 주변 구슬을 밀어내는 임팩트 스킬 */
  impact(id: number): void {
    const src = this.marbleMap.get(id);
    if (!src) return;

    const srcPos = src.getPosition();
    for (const body of this.marbleMap.values()) {
      if (body === src) continue;

      const pos = body.getPosition();
      const dist = new Vec2(pos.x - srcPos.x, pos.y - srcPos.y);
      const distSq = dist.lengthSquared();
      if (distSq >= IMPACT_RANGE_SQ) continue;

      const length = Math.sqrt(distSq);
      if (length === 0) continue;
      const power = 1 - length / 10;
      const scale = (power * power * 5) / length;
      body.applyLinearImpulse(new Vec2(dist.x * scale, dist.y * scale), body.getWorldCenter(), true);
    }
  }

  start(): void {
    for (const body of this.marbleMap.values()) {
      body.setAwake(true);
      body.setActive(true);
    }
  }

  step(deltaSeconds: number): void {
    for (const body of this.deleteCandidates) {
      this.world.destroyBody(body);
    }
    this.deleteCandidates = [];

    this.world.step(deltaSeconds, 6, 2);

    // 수명이 있는 엔티티는 무언가와 닿는 순간 사라진다
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const entity = this.entities[i];
      if (entity.life <= 0) continue;
      const edge = entity.body.getContactList();
      if (edge?.contact?.isTouching()) {
        this.deleteCandidates.push(entity.body);
        this.entities.splice(i, 1);
      }
    }
  }
}
