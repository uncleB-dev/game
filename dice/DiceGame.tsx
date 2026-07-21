"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "../game.module.css";
import dice from "./dice.module.css";
import Confetti from "../Confetti";
import { useShake } from "../useShake";
import { stepBodies, type Body2D } from "../physics2d";

/**
 * 주사위 던지기 — 위에서 내려다보는(탑다운) 판에서 3D 큐브가 굴러다닌다.
 * 중력 없음: 마찰로 자연 정지하고, 주사위끼리·벽과 부딪히면 튕긴다.
 * 멈추면 각 면이 결과값을 보이도록 회전을 스냅. 흔들기(센서)/버튼으로 굴린다.
 */

const MIN = 1;
const MAX = 6;
const DIE = 60;
const H = DIE / 2;
const R = 30; // 충돌 반경

const FACE_ROT: Record<number, string> = {
  1: "rotateY(0deg)",
  2: "rotateX(-90deg)",
  3: "rotateY(90deg)",
  4: "rotateY(-90deg)",
  5: "rotateX(90deg)",
  6: "rotateY(180deg)",
};
const SHOW_ROT: Record<number, string> = {
  1: "rotateX(0deg) rotateY(0deg)",
  2: "rotateX(90deg)",
  3: "rotateY(-90deg)",
  4: "rotateY(90deg)",
  5: "rotateX(-90deg)",
  6: "rotateY(180deg)",
};
const PIP_MAP: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Pips({
  v,
  pipClass,
  emptyClass,
}: {
  v: number;
  pipClass: string;
  emptyClass: string;
}) {
  const on = PIP_MAP[v];
  return (
    <>
      {Array.from({ length: 9 }, (_, c) => (
        <span key={c} className={on.includes(c) ? pipClass : emptyClass} />
      ))}
    </>
  );
}

// 3D 큐브 텀블 정보를 붙인 물리 바디
interface DieBody extends Body2D {
  rx: number;
  ry: number;
  rz: number;
  arx: number;
  ary: number;
  arz: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export default function DiceGame() {
  const [count, setCount] = useState(2);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<number[] | null>(null);

  const arenaRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cubeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const physRef = useRef<DieBody[]>([]);
  const valuesRef = useRef<number[]>([1, 2, 3, 4, 5, 6]);
  const rafRef = useRef(0);
  const rollingRef = useRef(false);
  const countRef = useRef(count);

  const writeDie = useCallback((i: number) => {
    const p = physRef.current[i];
    const slot = slotRefs.current[i];
    const cube = cubeRefs.current[i];
    if (!p || !slot || !cube) return;
    slot.style.transform = `translate(${p.x - H}px, ${p.y - H}px)`;
    cube.style.transform = `rotateX(${p.rx}deg) rotateY(${p.ry}deg) rotateZ(${p.rz}deg)`;
  }, []);

  // 대기 상태 — 판 중앙에 한 줄로 세우고 현재 값을 보여준다.
  const layout = useCallback(() => {
    const arena = arenaRef.current;
    if (!arena) return;
    const w = arena.clientWidth;
    const h = arena.clientHeight;
    const c = countRef.current;
    const gap = 16;
    const totalW = c * DIE + (c - 1) * gap;
    const startX = Math.max(H + 6, (w - totalW) / 2 + H);
    const cy = h / 2;
    for (let i = 0; i < c; i++) {
      const v = valuesRef.current[i] ?? 1;
      const slot = slotRefs.current[i];
      const cube = cubeRefs.current[i];
      if (!slot || !cube) continue;
      const cx = startX + i * (DIE + gap);
      slot.style.transition = "transform 0.4s cubic-bezier(0.2,0.9,0.2,1)";
      slot.style.transform = `translate(${cx - H}px, ${cy - H}px)`;
      cube.style.transition = "transform 0.5s cubic-bezier(0.2,0.9,0.2,1)";
      cube.style.transform = `${SHOW_ROT[v]} rotateZ(${i % 2 ? 6 : -6}deg)`;
    }
  }, []);

  useEffect(() => {
    countRef.current = count;
    layout();
  }, [count, layout]);

  const settle = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const c = countRef.current;
    for (let i = 0; i < c; i++) {
      const p = physRef.current[i];
      const slot = slotRefs.current[i];
      const cube = cubeRefs.current[i];
      const v = valuesRef.current[i];
      if (!p || !slot || !cube) continue;
      slot.style.transition = "transform 0.3s ease-out";
      slot.style.transform = `translate(${p.x - H}px, ${p.y - H}px)`;
      cube.style.transition = "transform 0.45s cubic-bezier(0.2,0.85,0.2,1)";
      cube.style.transform = `${SHOW_ROT[v]} rotateZ(${i % 2 ? 8 : -8}deg)`;
    }
    window.setTimeout(() => {
      rollingRef.current = false;
      setRolling(false);
      setResult(valuesRef.current.slice(0, c));
    }, 480);
  }, []);

  const roll = useCallback(() => {
    if (rollingRef.current) return;
    const arena = arenaRef.current;
    if (!arena) return;
    const w = arena.clientWidth;
    const h = arena.clientHeight;
    const c = countRef.current;

    setResult(null);
    rollingRef.current = true;
    setRolling(true);

    // 판 전체에 흩뿌리고 무작위 방향 속도 부여 (중력 없음)
    physRef.current = Array.from({ length: c }, () => ({
      x: rand(R + 4, w - R - 4),
      y: rand(R + 4, h - R - 4),
      vx: rand(-780, 780),
      vy: rand(-780, 780),
      angle: 0,
      angVel: 0,
      r: R,
      rx: rand(0, 360),
      ry: rand(0, 360),
      rz: rand(0, 360),
      arx: rand(-1200, 1200),
      ary: rand(-1200, 1200),
      arz: rand(-800, 800),
    }));
    valuesRef.current = Array.from(
      { length: c },
      () => 1 + Math.floor(Math.random() * 6),
    );

    for (let i = 0; i < c; i++) {
      const slot = slotRefs.current[i];
      const cube = cubeRefs.current[i];
      if (slot) slot.style.transition = "none";
      if (cube) cube.style.transition = "none";
      writeDie(i);
    }

    const bounds = { kind: "rect" as const, w, h };
    const start = performance.now();
    let last = start;

    const tick = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      const maxSpeed = stepBodies(physRef.current, dt, bounds, 0.82, 1.7, 2.0);
      const aDamp = Math.exp(-1.9 * dt);
      for (let i = 0; i < c; i++) {
        const p = physRef.current[i];
        p.arx *= aDamp;
        p.ary *= aDamp;
        p.arz *= aDamp;
        p.rx += p.arx * dt;
        p.ry += p.ary * dt;
        p.rz += p.arz * dt;
        writeDie(i);
      }
      const elapsed = now - start;
      if ((elapsed > 550 && maxSpeed < 46) || elapsed > 3200) {
        settle();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [writeDie, settle]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const { supported, enabled, enable } = useShake(() => {
    if (!rollingRef.current) roll();
  });

  const changeCount = (next: number) => {
    if (rollingRef.current) return;
    setResult(null);
    setCount(Math.min(MAX, Math.max(MIN, next)));
  };

  const sum = result ? result.reduce((a, b) => a + b, 0) : 0;

  return (
    <div className={styles.panel}>
      <div
        className={styles.actions}
        style={{ marginTop: 0, marginBottom: 18, justifyContent: "center" }}
      >
        <div className={styles.stepper}>
          <button
            className={styles.stepBtn}
            onClick={() => changeCount(count - 1)}
            disabled={count <= MIN || rolling}
            aria-label="주사위 줄이기"
          >
            −
          </button>
          <span className={styles.stepValue}>
            {count}
            <small>개</small>
          </span>
          <button
            className={styles.stepBtn}
            onClick={() => changeCount(count + 1)}
            disabled={count >= MAX || rolling}
            aria-label="주사위 늘리기"
          >
            +
          </button>
        </div>
      </div>

      <div
        className={dice.arena}
        ref={arenaRef}
        style={{ ["--die" as string]: `${DIE}px` }}
      >
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className={dice.dieSlot}
            ref={(el) => {
              slotRefs.current[i] = el;
            }}
          >
            <div
              className={dice.cube}
              ref={(el) => {
                cubeRefs.current[i] = el;
              }}
            >
              {[1, 2, 3, 4, 5, 6].map((v) => (
                <div
                  key={v}
                  className={dice.face}
                  style={{ transform: `${FACE_ROT[v]} translateZ(${H}px)` }}
                >
                  <Pips v={v} pipClass={dice.pip} emptyClass={dice.pipEmpty} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={dice.diceControls}>
        <button className={dice.rollBtn} onClick={roll} disabled={rolling}>
          {rolling ? "굴리는 중… 🎲" : "🎲 주사위 굴리기"}
        </button>
        {supported && (
          <button
            className={`${dice.sensorBtn} ${enabled ? dice.sensorOn : ""}`}
            onClick={enabled ? undefined : enable}
            disabled={enabled}
          >
            {enabled ? "📳 흔들기 ON" : "📱 흔들기 켜기"}
          </button>
        )}
      </div>

      <p className={dice.hintRow}>
        {supported
          ? "버튼을 누르거나 폰을 흔들어 주사위를 굴리세요! 🤳"
          : "버튼을 눌러 주사위를 굴리세요! (모바일에선 흔들기도 지원)"}
      </p>

      {result && (
        <div className={dice.resultOverlay} onClick={() => setResult(null)}>
          <Confetti count={70} />
          <div className={dice.resultCard} onClick={(e) => e.stopPropagation()}>
            <div className={dice.resultDice}>
              {result.map((v, i) => (
                <div
                  key={i}
                  className={dice.miniDie}
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <Pips v={v} pipClass={dice.miniPip} emptyClass={dice.pipEmpty} />
                </div>
              ))}
            </div>
            <p className={dice.resultSumLabel}>
              합계 {count > 1 ? `(${result.join(" + ")})` : ""}
            </p>
            <p className={dice.resultSum}>{sum}</p>
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                className={styles.btnPrimary}
                style={{ minWidth: 130 }}
                onClick={() => {
                  setResult(null);
                  window.setTimeout(roll, 200);
                }}
              >
                다시 굴리기 🎲
              </button>
              <button className={styles.btnGhost} onClick={() => setResult(null)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
