"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import styles from "../game.module.css";
import wheel from "./wheel.module.css";
import Confetti from "../Confetti";
import { trackPlay } from "../track";
import FullscreenToggle from "../FullscreenToggle";

/**
 * 빅휠 (행운의 룰렛) — 항목을 정하고 돌려서 하나를 뽑는다.
 * 화려하게: 네온 링 + 전구 애니메이션 + 컨페티 + 샤인 결과.
 */

const MIN = 2;
const MAX = 12;
const BULBS = 24;

const PALETTE = [
  "#1A5CFF",
  "#FF6A00",
  "#00B894",
  "#E84393",
  "#6C5CE7",
  "#0984E3",
  "#E1A700",
  "#00CEC9",
  "#D63031",
  "#20BF6B",
  "#8E44AD",
  "#F368E0",
];

const DEFAULT_ENTRIES = ["🍕 피자", "🍗 치킨", "🍔 버거", "🍜 라면", "🍣 초밥", "🥗 샐러드"];

const RAD = Math.PI / 180;
const trunc = (s: string, n = 6) => (s.length > n ? s.slice(0, n) + "…" : s);

export default function BigWheel() {
  const [entries, setEntries] = useState<string[]>(DEFAULT_ENTRIES);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const n = entries.length;
  const seg = 360 / n;

  const labelAt = (i: number) => (entries[i] || "").trim() || `${i + 1}`;

  const setEntry = (i: number, v: string) =>
    setEntries((p) => p.map((e, idx) => (idx === i ? v : e)));
  const addEntry = () =>
    setEntries((p) => (p.length >= MAX ? p : [...p, `항목 ${p.length + 1}`]));
  const removeEntry = (i: number) =>
    setEntries((p) => (p.length <= MIN ? p : p.filter((_, idx) => idx !== i)));

  // 전체화면 동안 뒤 배경이 스크롤되면 몰입이 깨진다
  useEffect(() => {
    document.body.style.overflow = expanded ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [expanded]);

  const toggleFs = () => setExpanded((v) => !v);

  const spin = () => {
    trackPlay("wheel");
    if (spinning || n < MIN) return;
    const idx = Math.floor(Math.random() * n);
    const spins = 5 + Math.floor(Math.random() * 3);
    const targetMod = ((-(idx * seg + seg / 2)) % 360 + 360) % 360;
    const base = rotation + spins * 360;
    const currentMod = ((base % 360) + 360) % 360;
    const add = ((targetMod - currentMod) % 360 + 360) % 360;
    const jitter = (Math.random() - 0.5) * seg * 0.6;
    const next = base + add + jitter;

    setWinner(idx);
    setShowResult(false);
    setSpinning(true);
    setRotation(next);
  };

  // SVG 섹터 path 생성
  const sectors = entries.map((_, i) => {
    const a0 = (-90 + i * seg) * RAD;
    const a1 = (-90 + (i + 1) * seg) * RAD;
    const R = 100;
    const x0 = R * Math.cos(a0);
    const y0 = R * Math.sin(a0);
    const x1 = R * Math.cos(a1);
    const y1 = R * Math.sin(a1);
    const large = seg > 180 ? 1 : 0;
    const d = `M0 0 L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
    const mid = -90 + i * seg + seg / 2;
    const lr = 62;
    const lx = lr * Math.cos(mid * RAD);
    const ly = lr * Math.sin(mid * RAD);
    let rot = mid;
    if (mid > 90 && mid < 270) rot += 180;
    return { d, color: PALETTE[i % PALETTE.length], lx, ly, rot, label: labelAt(i) };
  });

  return (
    <div className={styles.panel}>
      <div className={`${wheel.stage} ${expanded ? wheel.stageFull : ""}`}>
        <FullscreenToggle
          expanded={expanded}
          onToggle={toggleFs}
          hint={<><b>전체화면</b>으로 돌리면 훨씬 시원해요!</>}
        />
        <div className={wheel.wheelWrap}>
          <div className={wheel.pointer} />
          <div className={`${wheel.ring} ${spinning ? wheel.spinningBulbs : ""}`}>
            {Array.from({ length: BULBS }, (_, i) => {
              const a = (i / BULBS) * 360 * RAD;
              return (
                <span
                  key={i}
                  className={wheel.bulb}
                  style={{
                    left: `${50 + 50 * Math.cos(a)}%`,
                    top: `${50 + 50 * Math.sin(a)}%`,
                    animationDelay: `${(i % 2) * 0.14}s`,
                  }}
                />
              );
            })}
          </div>

          <motion.div
            className={wheel.wheelRotor}
            animate={{ rotate: rotation }}
            transition={{ duration: 5.4, ease: [0.12, 0.72, 0.08, 1] }}
            onAnimationComplete={() => {
              if (spinning) {
                setSpinning(false);
                setShowResult(true);
              }
            }}
          >
            <svg className={wheel.wheelSvg} viewBox="-100 -100 200 200">
              {sectors.map((s, i) => (
                <path key={i} d={s.d} fill={s.color} stroke="#ffffff" strokeWidth={1.2} />
              ))}
              {sectors.map((s, i) => (
                <text
                  key={`t-${i}`}
                  className={wheel.sectorText}
                  x={s.lx}
                  y={s.ly}
                  fontSize={Math.max(8, 15 - n * 0.4)}
                  transform={`rotate(${s.rot} ${s.lx} ${s.ly})`}
                >
                  {trunc(s.label)}
                </text>
              ))}
            </svg>
          </motion.div>

          <button
            className={wheel.hub}
            onClick={spin}
            disabled={spinning}
            aria-label="휠 돌리기"
          >
            {spinning ? "…" : "SPIN"}
          </button>
        </div>

        <button className={styles.btnPrimary} onClick={spin} disabled={spinning} style={{ maxWidth: 320 }}>
          {spinning ? "돌리는 중… 🎡" : "🎡 휠 돌리기!"}
        </button>
      </div>

      <hr className={styles.divider} />

      <p className={styles.sectionLabel}>
        🎯 항목 편집 <span>{n}/{MAX} · 최소 {MIN}개</span>
      </p>
      <div className={styles.inputList}>
        {entries.map((e, i) => (
          <div className={styles.inputRow} key={i}>
            <span
              className={wheel.entryDot}
              style={{ background: PALETTE[i % PALETTE.length] }}
            />
            <input
              className={styles.textInput}
              value={e}
              onChange={(ev) => setEntry(i, ev.target.value)}
              placeholder={`항목 ${i + 1}`}
              maxLength={14}
              disabled={spinning}
            />
            <button
              className={wheel.removeBtn}
              onClick={() => removeEntry(i)}
              disabled={spinning || n <= MIN}
              aria-label="삭제"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        className={wheel.addBtn}
        onClick={addEntry}
        disabled={spinning || n >= MAX}
      >
        + 항목 추가
      </button>

      {showResult && winner !== null && (
        <div className={wheel.resultOverlay} onClick={() => setShowResult(false)}>
          <Confetti />
          <div className={wheel.resultCard} onClick={(e) => e.stopPropagation()}>
            <p className={wheel.resultEyebrow}>🎉 당첨 🎉</p>
            <p className={wheel.resultValue}>{labelAt(winner)}</p>
            <div className={wheel.resultBtns}>
              <button
                className={styles.btnPrimary}
                style={{ minWidth: 130 }}
                onClick={() => {
                  setShowResult(false);
                  setTimeout(spin, 250);
                }}
              >
                다시 돌리기 🔄
              </button>
              <button className={styles.btnGhost} onClick={() => setShowResult(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
