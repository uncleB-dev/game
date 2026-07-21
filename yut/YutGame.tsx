"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "../game.module.css";
import yut from "./yut.module.css";
import Confetti from "../Confetti";
import { useShake } from "../useShake";

/**
 * 윷놀이 — 윷가락 4개가 마당 안에서 물리로 굴러다니다 멈추면
 * 평평면(flat)/둥근면(round) 개수로 도·개·걸·윷·모 판정. 빽도 포함.
 */

const STICKS = 4;
const BACKDO = 0; // 빽도(표식) 윷가락 인덱스
const SW = 30; // 가락 폭
const SL = 116; // 가락 길이

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

type Phys = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ry: number;
  rz: number;
  rx: number;
  avy: number;
  avz: number;
  avx: number;
  scatter: number; // 안착 시 눕는 각도
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export default function YutGame() {
  const [throwing, setThrowing] = useState(false);
  const [result, setResult] = useState<{ flat: boolean[]; out: YutOutcome } | null>(
    null,
  );

  const arenaRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stickRefs = useRef<(HTMLDivElement | null)[]>([]);
  const physRef = useRef<Phys[]>([]);
  const flatRef = useRef<boolean[]>([true, true, true, true]);
  const rafRef = useRef(0);
  const throwingRef = useRef(false);

  const writeStick = useCallback((i: number) => {
    const p = physRef.current[i];
    const slot = slotRefs.current[i];
    const stick = stickRefs.current[i];
    if (!p || !slot || !stick) return;
    slot.style.transform = `translate(${p.x}px, ${p.y}px)`;
    stick.style.transform = `rotateZ(${p.rz}deg) rotateY(${p.ry}deg) rotateX(${p.rx}deg)`;
  }, []);

  const layout = useCallback(() => {
    const arena = arenaRef.current;
    if (!arena) return;
    const w = arena.clientWidth;
    const h = arena.clientHeight;
    const gap = 20;
    const totalW = STICKS * SW + (STICKS - 1) * gap;
    const startX = Math.max(8, (w - totalW) / 2);
    const y = h - SL - 24;
    for (let i = 0; i < STICKS; i++) {
      const slot = slotRefs.current[i];
      const stick = stickRefs.current[i];
      if (!slot || !stick) continue;
      slot.style.transition = "transform 0.4s cubic-bezier(0.2,0.9,0.2,1)";
      slot.style.transform = `translate(${startX + i * (SW + gap)}px, ${y}px)`;
      stick.style.transition = "transform 0.5s cubic-bezier(0.2,0.9,0.2,1)";
      stick.style.transform = `rotateZ(${(i - 1.5) * 5}deg) rotateY(0deg)`;
    }
  }, []);

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
      // 현재 ry 에서 가장 가까운 flat(0)/round(180) 방향으로 스냅
      const targetRy = flat
        ? Math.round(p.ry / 360) * 360
        : Math.round((p.ry - 180) / 360) * 360 + 180;
      slot.style.transition = "transform 0.4s ease-out";
      slot.style.transform = `translate(${p.x}px, ${p.y}px)`;
      stick.style.transition = "transform 0.5s cubic-bezier(0.2,0.85,0.2,1)";
      stick.style.transform = `rotateZ(${p.scatter}deg) rotateY(${targetRy}deg) rotateX(0deg)`;
    }
    window.setTimeout(() => {
      throwingRef.current = false;
      setThrowing(false);
      const flat = flatRef.current.slice();
      setResult({ flat, out: evalYut(flat) });
    }, 560);
  }, []);

  const doThrow = useCallback(() => {
    if (throwingRef.current) return;
    const arena = arenaRef.current;
    if (!arena) return;
    const w = arena.clientWidth;
    const h = arena.clientHeight;
    const maxX = Math.max(0, w - SW);
    const maxY = Math.max(0, h - SL);

    setResult(null);
    throwingRef.current = true;
    setThrowing(true);

    flatRef.current = Array.from({ length: STICKS }, () => Math.random() < 0.5);

    physRef.current = Array.from({ length: STICKS }, () => ({
      x: rand(10, maxX - 10),
      y: rand(8, 50),
      vx: rand(-560, 560),
      vy: rand(120, 320),
      ry: rand(0, 360),
      rz: rand(0, 360),
      rx: rand(-30, 30),
      avy: rand(-1400, 1400),
      avz: rand(-500, 500),
      avx: rand(-300, 300),
      scatter: rand(-55, 55),
    }));

    for (let i = 0; i < STICKS; i++) {
      const slot = slotRefs.current[i];
      const stick = stickRefs.current[i];
      if (slot) slot.style.transition = "none";
      if (stick) stick.style.transition = "none";
      writeStick(i);
    }

    const G = 2200;
    const REST = 0.6;
    const start = performance.now();
    let last = start;

    const tick = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      const vDamp = Math.exp(-1.6 * dt);
      const aDamp = Math.exp(-2.0 * dt);
      let maxSpeed = 0;
      for (let i = 0; i < STICKS; i++) {
        const p = physRef.current[i];
        p.vy += G * dt;
        p.vx *= vDamp;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < 0) { p.x = 0; p.vx = -p.vx * REST; }
        else if (p.x > maxX) { p.x = maxX; p.vx = -p.vx * REST; }
        if (p.y < 0) { p.y = 0; p.vy = -p.vy * REST; }
        else if (p.y > maxY) { p.y = maxY; p.vy = -p.vy * REST; p.vx *= 0.85; }
        p.avy *= aDamp; p.avz *= aDamp; p.avx *= aDamp;
        p.ry += p.avy * dt; p.rz += p.avz * dt; p.rx += p.avx * dt;
        writeStick(i);
        const speed = Math.abs(p.vx) + Math.abs(p.vy);
        if (speed > maxSpeed) maxSpeed = speed;
      }
      const elapsed = now - start;
      const onFloor = physRef.current.every((p) => p.y >= maxY - 2);
      if ((elapsed > 1100 && maxSpeed < 60 && onFloor) || elapsed > 2800) {
        settle();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [writeStick, settle]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const { supported, enabled, enable } = useShake(() => {
    if (!throwingRef.current) doThrow();
  });

  return (
    <div className={styles.panel}>
      <div className={yut.arena} ref={arenaRef} style={{ ["--sw" as string]: `${SW}px`, ["--sl" as string]: `${SL}px` }}>
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
                {i === BACKDO && <span className={yut.backdoMark} />}
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
          <span className={yut.ruleChip}>🔙 <b>빽도</b> 표식만</span>
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
                  className={`${yut.miniStick} ${f ? yut.miniFlat : yut.miniRound} ${i === BACKDO ? yut.miniBackdo : ""}`}
                />
              ))}
            </div>
            <div className={yut.resultEmoji}>{result.out.emoji}</div>
            <p className={yut.resultName}>{result.out.name}</p>
            <p className={yut.resultMove}>{result.out.desc}</p>
            {result.out.extra && <span className={yut.resultExtra}>🎉 한 번 더!</span>}
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
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
