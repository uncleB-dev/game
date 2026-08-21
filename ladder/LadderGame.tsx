"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "../game.module.css";
import CoupangBanner from "../CoupangBanner";
import { trackPlay } from "../track";
import FullscreenToggle from "../FullscreenToggle";
import { NEON_PALETTE, WIN_COLOR, LOSE_COLOR } from "../palette";

/**
 * 사다리 게임 (Amidakuji)
 * - 참가자 2~10명, 결과(당첨/꽝 또는 직접입력) 최대 10칸까지 설정.
 * - 시작 시 사다리(가로 가로줄)를 무작위 생성하고, 각 참가자의 경로/도착 결과를 계산.
 * - 참가자 클릭 → 경로를 애니메이션으로 그려 도착 결과 공개.
 */

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;
const WIN_LABEL = "🎉 당첨";
const LOSE_LABEL = "꽝";

// 참가자별 고유 색상 — 공용 네온 팔레트 (최대 10명)
const COLORS = NEON_PALETTE;

// ── 사다리 캔버스 좌표 상수 (SVG viewBox 기준) ──
const COL_GAP = 88;
const ROW_GAP = 34;
const PAD_X = 56;
const TOP_Y = 34; // 세로줄 시작 y (참가자 라벨은 이 위)
const LABEL_H = 30; // 상/하단 라벨 칸 높이

// ── 트레이스 애니메이션 속도 (초당 진행률, 0~1) ──
// 기본은 박진감 있게 천천히, 참가자를 "누르고 있는 동안"은 빠르게.
const SLOW_SPEED = 1 / 4.4; // 기본: 약 4.4초에 완주 (기존보다 4배 느림)
const FAST_SPEED = 1 / 1.1; // 꾹 누름: 약 1.1초에 완주 (기존 속도)

/**
 * 사다리 경로를 stroke-dashoffset 으로 "그려지는" 애니메이션.
 * requestAnimationFrame 으로 매 프레임 진행률을 더하므로, 진행 중에도
 * speedRef.current 값을 바꾸면 즉시 속도가 반영된다(꾹 누르면 빨리감기).
 */
function TracePath({
  d,
  color,
  speedRef,
  onDone,
}: {
  d: string;
  color: string;
  speedRef: React.RefObject<number>;
  onDone: () => void;
}) {
  // pathLength={1} 정규화 → 길이 측정 없이 dasharray/offset을 0~1 로 다룬다.
  const [prog, setProg] = useState(0);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let p = 0;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      p = Math.min(1, p + dt * (speedRef.current ?? SLOW_SPEED));
      setProg(p);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        doneRef.current();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // d 가 바뀌면(새 판) 새로 그린다
  }, [d, speedRef]);

  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={5}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - prog}
    />
  );
}

type Point = { x: number; y: number };

type Game = {
  cols: number;
  rows: number;
  rungs: boolean[][]; // [row][col] : col 과 col+1 을 잇는 가로줄 존재 여부
  names: string[]; // length = cols
  results: string[]; // length = cols
  paths: { d: string; endCol: number }[]; // 참가자별(시작 col) 경로
};

const colX = (i: number) => PAD_X + i * COL_GAP;
const rowY = (r: number) => TOP_Y + LABEL_H + (r + 1) * ROW_GAP;

function bottomY(rows: number) {
  return TOP_Y + LABEL_H + (rows + 1) * ROW_GAP;
}

/** 무작위 사다리 생성 + 각 시작점의 경로/도착지 계산 */
function buildGame(cols: number, names: string[], results: string[]): Game {
  const rows = Math.min(24, Math.max(9, cols * 2 + 2));

  // 가로줄 생성: 같은 행에서 인접한 두 가로줄이 붙지 않도록(모호함 방지)
  const rungs: boolean[][] = [];
  for (let r = 0; r < rows; r++) {
    const row = new Array<boolean>(cols - 1).fill(false);
    for (let i = 0; i < cols - 1; i++) {
      if (i > 0 && row[i - 1]) continue; // 왼쪽에 이미 가로줄이 있으면 건너뜀
      if (Math.random() < 0.42) row[i] = true;
    }
    rungs.push(row);
  }

  const paths = names.map((_, start) => {
    let col = start;
    const pts: Point[] = [{ x: colX(col), y: TOP_Y }];
    for (let r = 0; r < rows; r++) {
      const y = rowY(r);
      pts.push({ x: colX(col), y });
      if (col > 0 && rungs[r][col - 1]) {
        col -= 1;
        pts.push({ x: colX(col), y });
      } else if (col < cols - 1 && rungs[r][col]) {
        col += 1;
        pts.push({ x: colX(col), y });
      }
    }
    pts.push({ x: colX(col), y: bottomY(rows) });
    const d =
      `M ${pts[0].x} ${pts[0].y} ` +
      pts.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ");
    return { d, endCol: col };
  });

  return { cols, rows, rungs, names, results, paths };
}

/** Fisher-Yates 셔플 (원본 불변) */
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function truncate(text: string, max = 5) {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

type Phase = "setup" | "play";
type ResultMode = "winlose" | "custom";

export default function LadderGame() {
  const [phase, setPhase] = useState<Phase>("setup");

  // 설정 상태
  const [playerCount, setPlayerCount] = useState(4);
  const [names, setNames] = useState<string[]>(() =>
    Array.from({ length: MAX_PLAYERS }, () => ""),
  );
  const [resultMode, setResultMode] = useState<ResultMode>("winlose");
  const [winCount, setWinCount] = useState(1);
  const [customResults, setCustomResults] = useState<string[]>(() =>
    Array.from({ length: MAX_PLAYERS }, () => ""),
  );

  // 게임 상태
  const [game, setGame] = useState<Game | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [revealed, setRevealed] = useState<number[]>([]); // 공개된 시작 col (클릭 순)
  const [settled, setSettled] = useState<number[]>([]); // 애니메이션 끝난 시작 col

  // 트레이스 속도(초당 진행률) — 참가자를 누르고 있는 동안 FAST, 평소 SLOW.
  const speedRef = useRef<number>(SLOW_SPEED);
  const speedUp = () => {
    speedRef.current = FAST_SPEED;
  };
  const speedDown = () => {
    speedRef.current = SLOW_SPEED;
  };

  const setName = (i: number, v: string) =>
    setNames((prev) => prev.map((n, idx) => (idx === i ? v : n)));
  const setCustomResult = (i: number, v: string) =>
    setCustomResults((prev) => prev.map((n, idx) => (idx === i ? v : n)));

  const changeCount = (next: number) => {
    const c = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, next));
    setPlayerCount(c);
    setWinCount((w) => Math.min(w, c));
  };

  // 실제 게임에 쓰일 이름/결과 배열 확정
  const resolveNames = useCallback(
    () =>
      Array.from({ length: playerCount }, (_, i) =>
        (names[i] || "").trim() || `참가자 ${i + 1}`,
      ),
    [names, playerCount],
  );

  const resolveResults = useCallback(() => {
    if (resultMode === "winlose") {
      const arr = Array.from({ length: playerCount }, (_, i) =>
        i < winCount ? WIN_LABEL : LOSE_LABEL,
      );
      return shuffle(arr); // 당첨 위치를 무작위로 섞음
    }
    return Array.from({ length: playerCount }, (_, i) =>
      (customResults[i] || "").trim() || `결과 ${i + 1}`,
    );
  }, [resultMode, playerCount, winCount, customResults]);

  const start = () => {
    trackPlay("ladder");
    setGame(buildGame(playerCount, resolveNames(), resolveResults()));
    setRevealed([]);
    setSettled([]);
    setPhase("play");
  };

  const reshuffle = () => {
    if (!game) return;
    // 이름/결과는 유지, 사다리만 새로 생성 (결과 위치도 다시 섞어 새 판)
    const results =
      resultMode === "winlose" ? shuffle(game.results) : game.results;
    setGame(buildGame(game.cols, game.names, results));
    setRevealed([]);
    setSettled([]);
  };

  const backToSetup = () => setPhase("setup");

  const reveal = (col: number) => {
    setRevealed((prev) => (prev.includes(col) ? prev : [...prev, col]));
  };
  const revealAll = () => {
    if (!game) return;
    setRevealed(game.paths.map((_, i) => i));
  };

  const settledEnds = useMemo(
    () => (game ? settled.map((s) => game.paths[s].endCol) : []),
    [settled, game],
  );

  // ───────────────────────────── SETUP ─────────────────────────────
  if (phase === "setup") {
    return (
      <div className={styles.panel}>
        <p className={styles.sectionLabel}>
          👥 참가 인원 <span>2~10명</span>
        </p>
        <div className={styles.stepper}>
          <button
            className={styles.stepBtn}
            onClick={() => changeCount(playerCount - 1)}
            disabled={playerCount <= MIN_PLAYERS}
            aria-label="인원 줄이기"
          >
            −
          </button>
          <span className={styles.stepValue}>
            {playerCount}
            <small>명</small>
          </span>
          <button
            className={styles.stepBtn}
            onClick={() => changeCount(playerCount + 1)}
            disabled={playerCount >= MAX_PLAYERS}
            aria-label="인원 늘리기"
          >
            +
          </button>
        </div>

        <hr className={styles.divider} />

        <p className={styles.sectionLabel}>
          ✏️ 참가자 이름 <span>비워두면 자동으로 채워져요</span>
        </p>
        <div className={styles.inputList}>
          {Array.from({ length: playerCount }, (_, i) => (
            <div className={styles.inputRow} key={i}>
              <span
                className={styles.inputDot}
                style={{ background: COLORS[i] }}
              >
                {i + 1}
              </span>
              <input
                className={styles.textInput}
                value={names[i]}
                onChange={(e) => setName(i, e.target.value)}
                placeholder={`참가자 ${i + 1}`}
                maxLength={12}
              />
            </div>
          ))}
        </div>

        <hr className={styles.divider} />

        <p className={styles.sectionLabel}>🎯 결과 설정</p>
        <div className={styles.modeToggle}>
          <button
            className={`${styles.modeBtn} ${resultMode === "winlose" ? styles.modeBtnActive : ""}`}
            onClick={() => setResultMode("winlose")}
          >
            당첨 / 꽝
          </button>
          <button
            className={`${styles.modeBtn} ${resultMode === "custom" ? styles.modeBtnActive : ""}`}
            onClick={() => setResultMode("custom")}
          >
            직접 입력
          </button>
        </div>

        {resultMode === "winlose" ? (
          <div style={{ marginTop: 18 }}>
            <div className={styles.winRow}>
              <input
                type="range"
                className={styles.winSlider}
                min={0}
                max={playerCount}
                value={winCount}
                onChange={(e) => setWinCount(Number(e.target.value))}
              />
              <span className={styles.winTag}>
                당첨 {winCount}명 · 꽝 {playerCount - winCount}명
              </span>
            </div>
          </div>
        ) : (
          <div className={styles.inputList} style={{ marginTop: 16 }}>
            {Array.from({ length: playerCount }, (_, i) => (
              <div className={styles.inputRow} key={i}>
                <span
                  className={styles.inputDot}
                  style={{ background: "#8b95a7" }}
                >
                  {i + 1}
                </span>
                <input
                  className={styles.textInput}
                  value={customResults[i]}
                  onChange={(e) => setCustomResult(i, e.target.value)}
                  placeholder={`결과 ${i + 1} (예: 커피, 청소, 당첨…)`}
                  maxLength={12}
                />
              </div>
            ))}
          </div>
        )}

        <hr className={styles.divider} />

        <div className={styles.howto}>
          <p className={styles.howtoTitle}>📖 게임 방법</p>
          <ol className={styles.howtoList}>
            <li>참가 인원(2~10명)과 참가자 이름을 정해요.</li>
            <li>
              결과를 설정해요 — <b>당첨/꽝</b> 모드는 당첨 인원만 정하면 위치가
              무작위로 섞이고, <b>직접 입력</b> 모드는 칸마다 원하는 결과를 적어요.
            </li>
            <li>
              <b>사다리 타기 시작</b>을 누르면 무작위 사다리가 만들어져요.
            </li>
            <li>
              위쪽 <b>참가자를 누르면</b> 사다리를 따라 내려가 도착한 결과가
              공개돼요.
            </li>
            <li>
              💡 참가자를 <b>꾹 누르고 있으면</b> 빠르게, 그냥 누르면 천천히
              내려가요. <b>전체 결과 공개</b>로 한 번에 볼 수도 있어요.
            </li>
          </ol>
        </div>

        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={start}>
            사다리 타기 시작 🪜
          </button>
        </div>
      </div>
    );
  }

  // ───────────────────────────── PLAY ─────────────────────────────
  if (!game) return null;

  const vbW = PAD_X * 2 + (game.cols - 1) * COL_GAP;
  const yBottom = bottomY(game.rows);
  const vbH = yBottom + LABEL_H + 8;
  const allRevealed = revealed.length === game.cols;

  return (
    <div className={styles.panel}>
      <div className={`${styles.boardStage} ${expanded ? styles.boardStageFull : ""}`}>
        <FullscreenToggle
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
          hint={<>참가자가 많을 땐 <b>전체화면</b>이 훨씬 편해요!</>}
        />
        <div className={styles.boardWrap}>
          <svg
            className={styles.board}
            viewBox={`0 0 ${vbW} ${vbH}`}
            width="100%"
            style={{ minWidth: Math.max(300, game.cols * 66), maxWidth: vbW }}
            role="img"
            aria-label="사다리"
          >
            {/* 세로줄 */}
            {game.names.map((_, i) => (
              <line
                key={`pole-${i}`}
                className={styles.pole}
                x1={colX(i)}
                y1={TOP_Y}
                x2={colX(i)}
                y2={yBottom}
              />
            ))}

            {/* 가로줄 */}
            {game.rungs.map((row, r) =>
              row.map((on, i) =>
                on ? (
                  <line
                    key={`rung-${r}-${i}`}
                    className={styles.rung}
                    x1={colX(i)}
                    y1={rowY(r)}
                    x2={colX(i + 1)}
                    y2={rowY(r)}
                  />
                ) : null,
              ),
            )}

            {/* 공개된 경로 (애니메이션) */}
            {revealed.map((s) => (
              <TracePath
                key={`path-${s}-${game.paths[s].d.length}`}
                d={game.paths[s].d}
                color={COLORS[s]}
                speedRef={speedRef}
                onDone={() =>
                  setSettled((prev) =>
                    prev.includes(s) ? prev : [...prev, s],
                  )
                }
              />
            ))}

            {/* 상단: 참가자 칩 — 누르면 공개, 누르고 있는 동안은 빠르게 */}
            {game.names.map((name, i) => {
              const on = revealed.includes(i);
              return (
                <g
                  key={`top-${i}`}
                  className={styles.topCell}
                  onPointerDown={() => {
                    speedUp();
                    reveal(i);
                  }}
                  onPointerUp={speedDown}
                  onPointerLeave={speedDown}
                  onPointerCancel={speedDown}
                >
                  <rect
                    className={styles.chipRect}
                    x={colX(i) - 30}
                    y={TOP_Y - LABEL_H}
                    width={60}
                    height={LABEL_H - 6}
                    rx={9}
                    fill={on ? COLORS[i] : "#eef2fb"}
                  />
                  <text
                    className={styles.cellText}
                    x={colX(i)}
                    y={TOP_Y - LABEL_H + (LABEL_H - 6) / 2}
                    fontSize={14}
                    fill={on ? "#fff" : "#1a1a2e"}
                  >
                    {truncate(name)}
                  </text>
                </g>
              );
            })}

            {/* 하단: 결과 칸 */}
            {game.results.map((res, i) => {
              const hit = settledEnds.includes(i);
              const isWin = res === WIN_LABEL;
              return (
                <g key={`bottom-${i}`}>
                  <rect
                    className={hit ? styles.popped : undefined}
                    x={colX(i) - 34}
                    y={yBottom + 6}
                    width={68}
                    height={LABEL_H}
                    rx={9}
                    fill={
                      hit
                        ? isWin
                          ? WIN_COLOR
                          : LOSE_COLOR
                        : isWin
                          ? "rgba(255,176,32,0.16)"
                          : "rgba(255,255,255,0.07)"
                    }
                    stroke={isWin && !hit ? "#ffd9a8" : "transparent"}
                  />
                  <text
                    className={styles.cellText}
                    x={colX(i)}
                    y={yBottom + 6 + LABEL_H / 2}
                    fontSize={13}
                    fill={hit ? "#fff" : isWin ? "#ff6a00" : "#42506a"}
                  >
                    {truncate(res, 6)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        </div>

      {revealed.length === 0 && (
        <p className={styles.hint}>
          위쪽 참가자를 눌러 결과를 확인하세요 👆
          <br />
          <span className={styles.hintSub}>
            💡 참가자를 <b>꾹 누르고 있으면</b> 사다리를 빠르게 내려가요!
          </span>
        </p>
      )}

      {/* 결과 요약 */}
      {settled.length > 0 && (
        <div className={styles.summary}>
          {revealed
            .filter((s) => settled.includes(s))
            .map((s) => {
              const res = game.results[game.paths[s].endCol];
              const isWin = res === WIN_LABEL;
              return (
                <div
                  key={`sum-${s}`}
                  className={`${styles.summaryRow} ${isWin ? styles.summaryWin : ""}`}
                >
                  <span className={styles.summaryName}>
                    <span
                      className={styles.summarySwatch}
                      style={{ background: COLORS[s] }}
                    />
                    {game.names[s]}
                  </span>
                  <span className={styles.summaryArrow}>→</span>
                  <span className={styles.summaryResult}>{res}</span>
                </div>
              );
            })}
        </div>
      )}

      {/* 결과가 나오기 시작하면 광고 노출 (결과 요약 아래) */}
      {settled.length > 0 && <CoupangBanner />}

      <div className={styles.actions}>
        <button
          className={styles.btnAccent}
          onClick={revealAll}
          disabled={allRevealed}
        >
          전체 결과 공개 ✨
        </button>
        <button className={styles.btnGhost} onClick={reshuffle}>
          🔄 다시 섞기
        </button>
        <button className={styles.btnGhost} onClick={backToSetup}>
          ⚙️ 설정 변경
        </button>
      </div>
    </div>
  );
}
