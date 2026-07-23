import type { ColorTheme, VectorLike } from './types';
import { rad } from './utils';

export interface GameObject {
  isDestroy: boolean;
  update(deltaTime: number): void;
  render(ctx: CanvasRenderingContext2D, zoom: number, theme: ColorTheme): void;
}

const PARTICLE_LIFETIME = 3000;
const SKILL_EFFECT_LIFETIME = 500;
const PARTICLE_COUNT = 200;

/** 우승 시 터지는 색종이 조각 */
class Particle {
  position: VectorLike;
  force: VectorLike;
  color: string;
  isDestroy = false;
  private _elapsed = 0;

  constructor(x: number, y: number) {
    this.position = { x, y };

    const force = Math.random() * 250;
    const ang = rad(90 * Math.random() - 180);
    this.force = { x: Math.cos(ang) * force, y: Math.sin(ang) * force };
    this.color = `hsl(${Math.random() * 360} 50% 50%)`;
  }

  update(deltaTime: number): void {
    this._elapsed += deltaTime;
    this.position = {
      x: this.position.x + (this.force.x * deltaTime) / 100,
      y: this.position.y + (this.force.y * deltaTime) / 100,
    };
    this.force = { x: this.force.x, y: this.force.y + (10 * deltaTime) / 100 };
    if (this._elapsed > PARTICLE_LIFETIME) {
      this.isDestroy = true;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - (this._elapsed / PARTICLE_LIFETIME) ** 2);
    ctx.fillStyle = this.color;
    ctx.fillRect(this.position.x, this.position.y, 20, 20);
    ctx.restore();
  }
}

export class ParticleManager {
  private _particles: Particle[] = [];

  update(deltaTime: number): void {
    for (const particle of this._particles) {
      particle.update(deltaTime);
    }
    this._particles = this._particles.filter((particle) => !particle.isDestroy);
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const particle of this._particles) {
      particle.render(ctx);
    }
  }

  shot(x: number, y: number): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this._particles.push(new Particle(x, y));
    }
  }

  clear(): void {
    this._particles = [];
  }
}

/** 임팩트 스킬 발동 시 퍼지는 원형 파동 */
export class SkillEffect implements GameObject {
  readonly position: VectorLike;
  isDestroy = false;
  private _size = 0;
  private _elapsed = 0;

  constructor(x: number, y: number) {
    this.position = { x, y };
  }

  update(deltaTime: number): void {
    this._elapsed += deltaTime;
    this._size = (this._elapsed / SKILL_EFFECT_LIFETIME) * 10;
    if (this._elapsed > SKILL_EFFECT_LIFETIME) {
      this.isDestroy = true;
    }
  }

  render(ctx: CanvasRenderingContext2D, zoom: number, theme: ColorTheme): void {
    const rate = this._elapsed / SKILL_EFFECT_LIFETIME;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - rate * rate);
    ctx.strokeStyle = theme.skillColor;
    ctx.lineWidth = 1 / zoom;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this._size, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
