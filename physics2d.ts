/**
 * 탑다운(위에서 내려다보는) 2D 물리 — 중력 없음.
 * 물체는 마찰로 서서히 멈추고, 경계(사각/원형)와 서로 충돌(원-원)해 튕긴다.
 * 주사위/윷 공용. 렌더는 각 게임이 body.x/y/angle 을 읽어 처리.
 */

export type Bounds =
  | { kind: "rect"; w: number; h: number }
  | { kind: "circle"; cx: number; cy: number; R: number };

export interface Body2D {
  x: number; // 중심 좌표
  y: number;
  vx: number;
  vy: number;
  angle: number; // 평면 회전(도)
  angVel: number; // 각속도(도/초)
  r: number; // 충돌 반경
}

/**
 * 한 스텝 진행하고, 가장 빠른 물체의 속도(px/s 근사)를 반환.
 */
export function stepBodies(
  bodies: Body2D[],
  dt: number,
  bounds: Bounds,
  restitution = 0.86,
  linDamp = 1.7,
  angDamp = 2.0,
): number {
  const fv = Math.exp(-linDamp * dt);
  const fa = Math.exp(-angDamp * dt);

  // 적분 + 마찰 + 벽 충돌
  for (const b of bodies) {
    b.vx *= fv;
    b.vy *= fv;
    b.angVel *= fa;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.angle += b.angVel * dt;

    if (bounds.kind === "rect") {
      if (b.x < b.r) {
        b.x = b.r;
        b.vx = Math.abs(b.vx) * restitution;
        b.angVel += b.vy * 0.03;
      } else if (b.x > bounds.w - b.r) {
        b.x = bounds.w - b.r;
        b.vx = -Math.abs(b.vx) * restitution;
        b.angVel -= b.vy * 0.03;
      }
      if (b.y < b.r) {
        b.y = b.r;
        b.vy = Math.abs(b.vy) * restitution;
        b.angVel += b.vx * 0.03;
      } else if (b.y > bounds.h - b.r) {
        b.y = bounds.h - b.r;
        b.vy = -Math.abs(b.vy) * restitution;
        b.angVel -= b.vx * 0.03;
      }
    } else {
      const dx = b.x - bounds.cx;
      const dy = b.y - bounds.cy;
      const d = Math.hypot(dx, dy);
      const max = bounds.R - b.r;
      if (d > max && d > 0) {
        const nx = dx / d;
        const ny = dy / d;
        b.x = bounds.cx + nx * max;
        b.y = bounds.cy + ny * max;
        const vn = b.vx * nx + b.vy * ny;
        b.vx -= (1 + restitution) * vn * nx;
        b.vy -= (1 + restitution) * vn * ny;
        b.angVel += (b.vx * ny - b.vy * nx) * 0.02;
      }
    }
  }

  // 물체 간 원-원 충돌
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = a.r + b.r;
      if (d > 0.0001 && d < min) {
        const nx = dx / d;
        const ny = dy / d;
        const overlap = (min - d) / 2;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;
        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const vn = rvx * nx + rvy * ny;
        if (vn < 0) {
          const jimp = -(1 + restitution) * vn * 0.5;
          a.vx -= jimp * nx;
          a.vy -= jimp * ny;
          b.vx += jimp * nx;
          b.vy += jimp * ny;
          const tang = -rvx * ny + rvy * nx; // 접선 상대속도 → 스핀 킥
          a.angVel -= tang * 0.03;
          b.angVel += tang * 0.03;
        }
      } else if (d <= 0.0001) {
        a.x -= 0.5;
        b.x += 0.5; // 완전히 겹치면 결정적으로 벌린다
      }
    }
  }

  let maxSpeed = 0;
  for (const b of bodies) {
    const s = Math.abs(b.vx) + Math.abs(b.vy);
    if (s > maxSpeed) maxSpeed = s;
  }
  return maxSpeed;
}
