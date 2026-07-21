"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "../game.module.css";
import yut from "./yut.module.css";
import Confetti from "../Confetti";
import { useShake } from "../useShake";
import { stepBodies, type Body2D } from "../physics2d";

/**
 * 윷놀이 — 위에서 내려다보는 원형 마당. 윷가락 4개가 무중력 평면에서
 * 서로/벽과 부딪히며 굴러다니다 마찰로 정지. 평평/둥근 면으로 판정.
 */

const STICKS = 4;
const BACKDO = 0; // 빽도(×××) 윷가락 인덱스
const SW = 34;
const SL = 120;
const RAD = 40; // 충돌 반경

type YutOutcome = {
  name: string;
  move: number;
  emoji: string;
  extra: boolean;
  desc: string;
};

function evalYut(flat: boolean[]): YutOutcome {
  const flatCount = flat.filter(Boolean).length;
  if (flatCount === 1 && flat[BACKDO]) {
    return { name: "빽도", move: -1, emoji: "🔙", extra: false, desc: "뒤로 한 칸!" };
  }
  switch (flatCount) {
    case 1:
      return { name: "도", move: 1, emoji: "🐷", extra: false, desc: "한 칸 이동" };
    case 2:
      return { name: "개", move: 2, emoji: "🐶", extra: false, desc: "두 칸 이동" };
    case 3:
      return { name: "걸", move: 3, emoji: "🐑", extra: false, desc: "세 칸 이동" };
    case 4:
      return { name: "윷", move: 4, emoji: "🐮", extra: true, desc: "네 칸 이동" };
    default:
      return { name: "모", move: 5, emoji: "🐴", extra: true, desc: "다섯 칸 이동" };
  }
}

interface StickBody extends Body2D {
  flip: number; // 뒤집힘 각도(도): 0 = 평평 위, 180 = 둥근 위
  aflip: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export default function YutGame() {
  const [throwing, setThrowing] = useState(false);
  const [result, setResult] = useState<{ flat: boolean[]; out: YutOutcome } | null>(
    null,
  );

  const arenaRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stickRefs = useRef<(HTMLDivElement | null)[]>([]);
  const physRef = useRef<StickBody[]>([]);
  const flatRef = useRef<boolean[]>([true, true, true, true]);
  const rafRef = useRef(0);
  const throwingRef = useRef(false);
  const geomRef = useRef({ cx: 0, cy: 0, R: 0 });

  const board = useCallback(() => {
    const arena = arenaRef.current;
    if (!arena) return { cx: 0, cy: 0, R: 0 };
    const w = arena.clientWidth;
    const h = arena.clientHeight;
    const D = Math.min(w, h) - 16;
    const R = D / 2;
    const cx = w / 2;
    const cy = h / 2;
    const el = boardRef.current;
    if (el) {
      el.style.width = `${D}px`;
      el.style.height = `${D}px`;
      el.style.left = `${cx - R}px`;
      el.style.top = `${cy - R}px`;
    }
    geomRef.current = { cx, cy, R };
    return { cx, cy, R };
  }, []);

  const writeStick = useCallback((i: number) => {
    const p = physRef.current[i];
    const slot = slotRefs.current[i];
    const stick = stickRefs.current[i];
    if (!p || !slot || !stick) return;
    slot.style.transform = `translate(${p.x - SW / 2}px, ${p.y - SL / 2}px) rotateZ(${p.angle}deg)`;
    stick.style.transform = `rotateX(${p.flip}deg)`;
  }, []);

  const layout = useCallback(() => {
    const { cx, cy, R } = board();
    if (R === 0) return;
    const gap = 12;
    const totalW = STICKS * SW + (STICKS - 1) * gap;
    const startX = cx - totalW / 2 + SW / 2;
    for (let i = 0; i < STICKS; i++) {
      const slot = slotRefs.current[i];
      const stick = stickRefs.current[i];
      if (!slot || !stick) continue;
      const x = startX + i * (SW + gap);
      slot.style.transition = "transform 0.4s cubic-bezier(0.2,0.9,0.2,1)";
      slot.style.transform = `translate(${x - SW / 2}px, ${cy - SL / 2}px) rotateZ(${(i - 1.5) * 5}deg)`;
      stick.style.transition = "transform 0.5s cubic-bezier(0.2,0.9,0.2,1)";
      stick.style.transform = "rotateX(0deg)";
    }
  }, [board]);

  useEffect(() => {
    layout();
  }, [layout]);

  const settle = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    for (let i = 0; i < STICKS; i++) {
      const p = physRef.current[i];
      const slot = slotRefs.current[i];
      const stick = stickRefs.current[i];
      if (!p || !slot || !stick) continue;
      const flat = flatRef.current[i];
      const targetFlip = flat
        ? Math.round(p.flip / 360) * 360
        : Math.round((p.flip - 180) / 360) * 360 + 180;
      slot.style.transition = "transform 0.35s ease-out";
      slot.style.transform = `translate(${p.x - SW / 2}px, ${p.y - SL / 2}px) rotateZ(${p.angle}deg)`;
      stick.style.transition = "transform 0.45s cubic-bezier(0.2,0.85,0.2,1)";
      stick.style.transform = `rotateX(${targetFlip}deg)`;
    }
    window.setTimeout(() => {
      throwingRef.current = false;
      setThrowing(false);
      const flat = flatRef.current.slice();
      setResult({ flat, out: evalYut(flat) });
    }, 520);
  }, []);

  const doThrow = useCallback(() => {
    if (throwingRef.current) return;
    const { cx, cy, R } = board();
    if (R === 0) return;

    setResult(null);
    throwingRef.current = true;
    setThrowing(true);

    flatRef.current = Array.from({ length: STICKS }, () => Math.random() < 0.5);

    physRef.current = Array.from({ length: STICKS }, () => {
      const ang = rand(0, Math.PI * 2);
      const rr = Math.sqrt(Math.random()) * Math.max(0, R - 60);
      return {
        x: cx + Math.cos(ang) * rr,
        y: cy + Math.sin(ang) * rr,
        vx: rand(-820, 820),
        vy: rand(-820, 820),
        angle: rand(0, 360),
        angVel: rand(-520, 520),
        r: RAD,
        flip: rand(0, 360),
        aflip: rand(-1500, 1500),
      };
    });

    for (let i = 0; i < STICKS; i++) {
      const slot = slotRefs.current[i];
      const stick = stickRefs.current[i];
      if (slot) slot.style.transition = "none";
      if (stick) stick.style.transition = "none";
      writeStick(i);
    }

    const bounds = { kind: "circle" as const, cx, cy, R: R - 6 };
    const start = performance.now();
    let last = start;

    const tick = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      const maxSpeed = stepBodies(physRef.current, dt, bounds, 0.7, 1.9, 2.2);
      const fDamp = Math.exp(-2.1 * dt);
      for (let i = 0; i < STICKS; i++) {
        const p = physRef.current[i];
        p.aflip *= fDamp;
        p.flip += p.aflip * dt;
        writeStick(i);
      }
      const elapsed = now - start;
      if ((elapsed > 550 && maxSpeed < 40) || elapsed > 3200) {
        settle();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [board, writeStick, settle]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const { supported, enabled, enable } = useShake(() => {
    if (!throwingRef.current) doThrow();
  });

  return (
    <div className={styles.panel}>
      <div
        className={yut.arena}
        ref={arenaRef}
        style={{ ["--sw" as string]: `${SW}px`, ["--sl" as string]: `${SL}px` }}
      >
        <div className={yut.board} ref={boardRef} />
        {Array.from({ length: STICKS }, (_, i) => (
          <div
            key={i}
            className={yut.stickSlot}
            ref={(el) => {
              slotRefs.current[i] = el;
            }}
          >
            <div
              className={yut.stick}
              ref={(el) => {
                stickRefs.current[i] = el;
              }}
            >
              <div className={`${yut.stickFace} ${yut.flatFace}`}>
                {i === BACKDO && (
                  <div className={yut.backdoMarks}>
                    <span>×</span>
                    <span>×</span>
                    <span>×</span>
                  </div>
                )}
              </div>
              <div className={`${yut.stickFace} ${yut.roundFace}`} />
            </div>
          </div>
        ))}
      </div>

      <div className={yut.controls}>
        <button className={yut.throwBtn} onClick={doThrow} disabled={throwing}>
          {throwing ? "던지는 중… 🪵" : "🪵 윷 던지기"}
        </button>
        {supported && (
          <button
            className={`${yut.sensorBtn} ${enabled ? yut.sensorOn : ""}`}
            onClick={enabled ? undefined : enable}
            disabled={enabled}
          >
            {enabled ? "📳 흔들기 ON" : "📱 흔들기 켜기"}
          </button>
        )}
      </div>

      <p className={yut.hintRow}>
        {supported
          ? "버튼을 누르거나 폰을 흔들어 윷을 던지세요! 🤳"
          : "버튼을 눌러 윷을 던지세요! (모바일에선 흔들기도 지원)"}
      </p>

      <div className={yut.rules}>
        <p className={yut.rulesTitle}>📖 윷 판정 (평평한 면 개수)</p>
        <div className={yut.rulesGrid}>
          <span className={yut.ruleChip}>🐷 <b>도</b> 1개</span>
          <span className={yut.ruleChip}>🐶 <b>개</b> 2개</span>
          <span className={yut.ruleChip}>🐑 <b>걸</b> 3개</span>
          <span className={yut.ruleChip}>🐮 <b>윷</b> 4개·한번더</span>
          <span className={yut.ruleChip}>🐴 <b>모</b> 0개·한번더</span>
          <span className={yut.ruleChip}>🔙 <b>빽도</b> ××× 가락만</span>
        </div>
      </div>

      {result && (
        <div className={yut.resultOverlay} onClick={() => setResult(null)}>
          {(result.out.name === "윷" || result.out.name === "모") && (
            <Confetti count={80} />
          )}
          <div className={yut.resultCard} onClick={(e) => e.stopPropagation()}>
            <div className={yut.resultSticks}>
              {result.flat.map((f, i) => (
                <span
                  key={i}
                  className={`${yut.miniStick} ${f ? yut.miniFlat : yut.miniRound} ${i === BACKDO && f ? yut.miniBackdo : ""}`}
                />
              ))}
            </div>
            <div className={yut.resultEmoji}>{result.out.emoji}</div>
            <p className={yut.resultName}>{result.out.name}</p>
            <p className={yut.resultMove}>{result.out.desc}</p>
            {result.out.extra && <span className={yut.resultExtra}>🎉 한 번 더!</span>}
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "center",
                flexWrap: "wrap",
                marginTop: 8,
              }}
            >
              <button
                className={styles.btnPrimary}
                style={{ minWidth: 130 }}
                onClick={() => {
                  setResult(null);
                  window.setTimeout(doThrow, 200);
                }}
              >
                다시 던지기 🪵
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
