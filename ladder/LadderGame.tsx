"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import styles from "../game.module.css";

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

// 참가자별 고유 색상 팔레트 (최대 10명)
const COLORS = [
  "#1A5CFF",
  "#FF6A00",
  "#00B894",
  "#E84393",
  "#6C5CE7",
  "#0984E3",
  "#E1A700",
  "#00CEC9",
  "#D63031",
  "#5B6470",
];

// ── 사다리 캔버스 좌표 상수 (SVG viewBox 기준) ──
const COL_GAP = 88;
const ROW_GAP = 34;
const PAD_X = 56;
const TOP_Y = 34; // 세로줄 시작 y (참가자 라벨은 이 위)
const LABEL_H = 30; // 상/하단 라벨 칸 높이

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
  const [revealed, setRevealed] = useState<number[]>([]); // 공개된 시작 col (클릭 순)
  const [settled, setSettled] = useState<number[]>([]); // 애니메이션 끝난 시작 col

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
            <motion.path
              key={`path-${s}-${game.paths[s].d.length}`}
              d={game.paths[s].d}
              fill="none"
              stroke={COLORS[s]}
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.1, ease: "easeInOut" }}
              onAnimationComplete={() =>
                setSettled((prev) =>
                  prev.includes(s) ? prev : [...prev, s],
                )
              }
            />
          ))}

          {/* 상단: 참가자 칩 (클릭 가능) */}
          {game.names.map((name, i) => {
            const on = revealed.includes(i);
            return (
              <g
                key={`top-${i}`}
                className={styles.topCell}
                onClick={() => reveal(i)}
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
                        ? "#ff6a00"
                        : "#1a5cff"
                      : isWin
                        ? "#fff1e6"
                        : "#f1f4fb"
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

      {revealed.length === 0 && (
        <p className={styles.hint}>
          위쪽 참가자를 눌러 결과를 확인하세요 👆
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
