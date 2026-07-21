"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../game.module.css";
import t from "./touch.module.css";
import Confetti from "../Confetti";

/**
 * 스피드 터치 — 제한시간 안에 자기 구역을 더 많이 터치한 사람이 승리.
 * 1명 = 전체 화면, 2명 = 상/하 2분할(위쪽은 180° 회전), 3~4명 = 4분할.
 * 게임 중에는 화면 전체를 덮는 고정 오버레이 사용 (전체 화면이 포인트!).
 */

const COLORS = ["#1A5CFF", "#FF6A00", "#00B894", "#E84393"];
const SOFT = ["#eef4ff", "#fff1e6", "#e8fbf5", "#fdeef6"];
const DURATIONS = [10, 15, 20, 30, 45, 60];
const MIN_P = 1;
const MAX_P = 4;

type Phase = "setup" | "count" | "play" | "done";
type Ripple = { id: number; x: number; y: number };
type Zone = { p: number; rot: boolean };

function zonesFor(players: number): Zone[] {
  if (players === 1) return [{ p: 0, rot: false }];
  if (players === 2)
    return [
      { p: 0, rot: true },
      { p: 1, rot: false },
    ];
  const zs: Zone[] = [
    { p: 0, rot: true },
    { p: 1, rot: true },
    { p: 2, rot: false },
    { p: 3, rot: false },
  ];
  if (players === 3) zs[3] = { p: -1, rot: false }; // 빈 구역
  return zs;
}

export default function TouchGame() {
  const [players, setPlayers] = useState(2);
  const [duration, setDuration] = useState(20);
  const [phase, setPhase] = useState<Phase>("setup");
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(20);
  const [scores, setScores] = useState<number[]>([0, 0, 0, 0]);
  const [ripples, setRipples] = useState<Ripple[][]>([[], [], [], []]);
  const rippleId = useRef(0);

  // 카운트다운 3·2·1 → GO
  useEffect(() => {
    if (phase !== "count") return;
    const iv = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          window.clearInterval(iv);
          setPhase("play");
          return 0;
        }
        return c - 1;
      });
    }, 800);
    return () => window.clearInterval(iv);
  }, [phase]);

  // 플레이 타이머
  useEffect(() => {
    if (phase !== "play") return;
    const end = performance.now() + duration * 1000;
    const iv = window.setInterval(() => {
      const left = (end - performance.now()) / 1000;
      if (left <= 0) {
        window.clearInterval(iv);
        setTimeLeft(0);
        setPhase("done");
      } else {
        setTimeLeft(left);
      }
    }, 100);
    return () => window.clearInterval(iv);
  }, [phase, duration]);

  // 게임 중 배경 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = phase === "setup" ? "" : "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [phase]);

  const begin = () => {
    setScores([0, 0, 0, 0]);
    setRipples([[], [], [], []]);
    setTimeLeft(duration);
    setCountdown(3);
    setPhase("count");
    // 전체화면 시도 (지원 브라우저 한정, 실패해도 고정 오버레이로 충분)
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const leaveFs = () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  };

  const exitToSetup = () => {
    leaveFs();
    setPhase("setup");
  };

  const tap = (zone: number, rot: boolean) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== "play" || zone < 0) return;
    e.preventDefault();
    setScores((p) => p.map((s, i) => (i === zone ? s + 1 : s)));
    const rect = e.currentTarget.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    if (rot) {
      x = rect.width - x;
      y = rect.height - y;
    }
    const id = ++rippleId.current;
    setRipples((p) =>
      p.map((arr, i) => (i === zone ? [...arr.slice(-9), { id, x, y }] : arr)),
    );
  };

  const clearRipple = (zone: number, id: number) =>
    setRipples((p) =>
      p.map((arr, i) => (i === zone ? arr.filter((r) => r.id !== id) : arr)),
    );

  const zones = zonesFor(players);
  const gridClass =
    players === 1 ? t.gridOne : players === 2 ? t.gridTwo : t.gridFour;

  // 결과 랭킹
  const active = Array.from({ length: players }, (_, i) => i);
  const maxScore = Math.max(...active.map((i) => scores[i]));
  const ranking = active
    .slice()
    .sort((a, b) => scores[b] - scores[a]);
  const winners = active.filter((i) => scores[i] === maxScore && maxScore > 0);

  return (
    <div className={styles.panel}>
      {/* ── 설정 ── */}
      <p className={styles.sectionLabel}>
        👥 인원 <span>1~4명 · 한 기기에서 함께!</span>
      </p>
      <div className={styles.stepper}>
        <button
          className={styles.stepBtn}
          onClick={() => setPlayers((p) => Math.max(MIN_P, p - 1))}
          disabled={players <= MIN_P}
          aria-label="인원 줄이기"
        >
          −
        </button>
        <span className={styles.stepValue}>
          {players}
          <small>명</small>
        </span>
        <button
          className={styles.stepBtn}
          onClick={() => setPlayers((p) => Math.min(MAX_P, p + 1))}
          disabled={players >= MAX_P}
          aria-label="인원 늘리기"
        >
          +
        </button>
      </div>
      <p className={t.splitInfo}>
        {players === 1
          ? "🖥 화면 전체가 내 구역! 혼자서 최고 기록에 도전"
          : players === 2
            ? "⬆⬇ 화면을 위/아래로 나눠 마주보고 대결"
            : "◧◨ 화면을 4분할해 각자 자기 구역을 터치"}
      </p>

      <hr className={styles.divider} />

      <p className={styles.sectionLabel}>⏱ 제한 시간</p>
      <div className={t.durRow}>
        {DURATIONS.map((d) => (
          <button
            key={d}
            className={`${t.durChip} ${duration === d ? t.durChipOn : ""}`}
            onClick={() => setDuration(d)}
          >
            {d}초
          </button>
        ))}
      </div>

      <hr className={styles.divider} />

      <div className={t.howto}>
        <p className={t.howtoTitle}>📖 게임 방법</p>
        <ol className={t.howtoList}>
          <li>인원과 제한 시간을 정하고 시작을 눌러요.</li>
          <li>3·2·1·GO! 신호와 함께 자기 구역을 미친 듯이 터치!</li>
          <li>여러 손가락 동시 터치도 인정 🖐</li>
          <li>시간 종료 시 가장 많이 터치한 사람이 승리 🏆</li>
        </ol>
      </div>

      <div className={styles.actions}>
        <button className={styles.btnPrimary} onClick={begin}>
          ⚡ 스피드 터치 시작!
        </button>
      </div>

      {/* ── 게임 오버레이 (화면 전체) ── */}
      {phase !== "setup" && (
        <div className={t.overlay}>
          <div className={`${t.grid} ${gridClass}`}>
            {zones.map((z, zi) =>
              z.p < 0 ? (
                <div key={zi} className={`${t.zone} ${t.zoneEmpty}`}>
                  <span className={t.zoneEmptyMark}>—</span>
                </div>
              ) : (
                <div
                  key={zi}
                  className={`${t.zone} ${z.rot ? t.zoneRot : ""}`}
                  style={
                    {
                      background: SOFT[z.p],
                      ["--pc" as string]: COLORS[z.p],
                    } as React.CSSProperties
                  }
                  onPointerDown={tap(z.p, z.rot)}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <span className={t.zoneName} style={{ color: COLORS[z.p] }}>
                    P{z.p + 1}
                  </span>
                  <span
                    key={scores[z.p]}
                    className={t.zoneScore}
                    style={{ color: COLORS[z.p] }}
                  >
                    {scores[z.p]}
                  </span>
                  {ripples[z.p].map((r) => (
                    <span
                      key={r.id}
                      className={t.ripple}
                      style={{ left: r.x, top: r.y, borderColor: COLORS[z.p] }}
                      onAnimationEnd={() => clearRipple(z.p, r.id)}
                    />
                  ))}
                </div>
              ),
            )}
          </div>

          {phase === "play" && (
            <div className={t.timerPill}>{timeLeft.toFixed(1)}</div>
          )}

          {phase === "count" && (
            <div className={t.countLayer}>
              <span key={countdown} className={t.countNum}>
                {countdown === 0 ? "GO!" : countdown}
              </span>
            </div>
          )}

          {phase !== "play" && (
            <button className={t.exitBtn} onClick={exitToSetup} aria-label="나가기">
              ✕
            </button>
          )}

          {phase === "done" && (
            <div className={t.doneLayer}>
              <Confetti count={80} />
              <div className={t.doneCard}>
                <p className={t.doneEyebrow}>🏁 게임 종료</p>
                <p className={t.doneWinner}>
                  {winners.length === players && players > 1
                    ? "무승부!"
                    : winners.length > 1
                      ? `P${winners.map((w) => w + 1).join(" · P")} 공동 우승!`
                      : `P${(winners[0] ?? 0) + 1} 승리!`}
                </p>
                <div className={t.rankList}>
                  {ranking.map((p, idx) => (
                    <div key={p} className={t.rankRow}>
                      <span className={t.rankMedal}>
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "·"}
                      </span>
                      <span className={t.rankName} style={{ color: COLORS[p] }}>
                        P{p + 1}
                      </span>
                      <span className={t.rankScore}>
                        {scores[p]}회
                        {duration > 0 && (
                          <small> ({(scores[p] / duration).toFixed(1)}/초)</small>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                <div className={t.doneBtns}>
                  <button
                    className={styles.btnPrimary}
                    style={{ minWidth: 140 }}
                    onClick={() => {
                      setScores([0, 0, 0, 0]);
                      setRipples([[], [], [], []]);
                      setTimeLeft(duration);
                      setCountdown(3);
                      setPhase("count");
                    }}
                  >
                    한 판 더! ⚡
                  </button>
                  <button className={styles.btnGhost} onClick={exitToSetup}>
                    설정으로
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
