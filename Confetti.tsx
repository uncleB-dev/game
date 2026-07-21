"use client";

import { useMemo } from "react";
import styles from "./confetti.module.css";

/**
 * 결과 연출용 컨페티. show=true 인 동안만 마운트해서 뿌린다.
 * 각 조각은 무작위 위치/색/지연/회전으로 떨어진다(순수 CSS 애니메이션).
 */
const CONFETTI_COLORS = [
  "#1A5CFF",
  "#FF6A00",
  "#00B894",
  "#E84393",
  "#6C5CE7",
  "#FDCB6E",
  "#00CEC9",
  "#FF3D71",
];

// 인덱스 기반 순수 의사난수(0~1) — 렌더 중 호출 가능(결정적).
const frac = (x: number) => x - Math.floor(x);
const rnd = (seed: number) => frac(Math.sin(seed) * 43758.5453);

export default function Confetti({ count = 90 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: rnd(i * 12.9898) * 100,
        delay: rnd(i * 78.233) * 0.5,
        duration: 2.2 + rnd(i * 39.42) * 1.8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 7 + rnd(i * 93.11) * 8,
        rotate: rnd(i * 27.61) * 360,
        drift: (rnd(i * 51.07) - 0.5) * 240,
        round: rnd(i * 63.3) > 0.6,
      })),
    [count],
  );

  return (
    <div className={styles.layer} aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className={styles.piece}
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.round ? p.size : p.size * 0.5,
              background: p.color,
              borderRadius: p.round ? "50%" : "2px",
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              // CSS 변수로 개별 낙하 파라미터 전달
              ["--drift" as string]: `${p.drift}px`,
              ["--spin" as string]: `${p.rotate}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
