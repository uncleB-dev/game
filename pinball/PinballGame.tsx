"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../game.module.css";
import pb from "./pinball.module.css";
import Confetti from "../Confetti";
import { Roulette } from "./engine/roulette";
import engineOptions from "./engine/options";
import { stages } from "./engine/data/maps";
import { trackPlay } from "../track";
import FullscreenToggle from "../FullscreenToggle";

/**
 * 복불복 핀볼 — 구슬 물리 레이스로 당첨자를 뽑는 게임.
 * 원작 lazygyu/roulette(MIT)의 규칙·맵을 참고한 marble-roulette 엔진을
 * UncleB Games 디자인으로 포팅했다. 엔진: planck(Box2D) + Canvas 2D.
 *
 * 참가자 문법: "이름*개수" (같은 이름 여러 개), "이름/가중치" (스킬 발동↑)
 */

const MAPS = stages.map((s, index) => ({ index, title: s.title }));
const NAMES_KEY = "ubg_pinball_names";
const DEFAULT_NAMES = "수박*2, 키위*2, 귤*2";

type WinnerType = "first" | "last" | "custom";
type Phase = "setup" | "race" | "done";

function splitNames(value: string): string[] {
  return value
    .trim()
    .split(/[,\r\n]/g)
    .map((v) => v.trim())
    .filter((v) => !!v);
}

export default function PinballGame() {
  const [names, setNames] = useState(DEFAULT_NAMES);
  const [mapIndex, setMapIndex] = useState(0);
  const [winnerType, setWinnerType] = useState<WinnerType>("first");
  const [customRank, setCustomRank] = useState(1);
  const [useSkills, setUseSkills] = useState(true);
  const [phase, setPhase] = useState<Phase>("setup");
  const [winner, setWinner] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const mountRef = useRef<HTMLDivElement>(null);
  const rouletteRef = useRef<Roulette | null>(null);
  const phaseRef = useRef<Phase>("setup");
  const toastTimer = useRef(0);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1800);
  };
  const showToastRef = useRef(showToastMsg);
  useEffect(() => {
    showToastRef.current = showToastMsg;
  });

  // ── 엔진 초기화 ──
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const roulette = new Roulette();
    roulette.init(mount);
    rouletteRef.current = roulette;

    const onGoal = (e: Event) => {
      const detail = (e as CustomEvent<{ winner: string }>).detail;
      setWinner(detail.winner);
      phaseRef.current = "done";
      setPhase("done");
      window.setTimeout(() => setShowResult(true), 1800);
    };
    const onMessage = (e: Event) => {
      showToastRef.current((e as CustomEvent<string>).detail);
    };
    roulette.addEventListener("goal", onGoal);
    roulette.addEventListener("message", onMessage);

    const saved = window.localStorage.getItem(NAMES_KEY);
    roulette.setMarbles(splitNames(saved ?? DEFAULT_NAMES));
    if (saved) {
      // 렌더 사이클 밖에서 복원 (effect 본문 직접 setState 회피)
      window.setTimeout(() => setNames(saved), 0);
    }

    return () => {
      roulette.removeEventListener("goal", onGoal);
      roulette.removeEventListener("message", onMessage);
      roulette.destroy();
      rouletteRef.current = null;
      window.clearTimeout(toastTimer.current);
    };
  }, []);

  // 참가자 변경 반영
  const applyNames = (value: string) => {
    setNames(value);
    const list = splitNames(value);
    window.localStorage.setItem(NAMES_KEY, list.join(","));
    rouletteRef.current?.setMarbles(list);
  };

  const selectMap = (index: number) => {
    setMapIndex(index);
    rouletteRef.current?.setMap(index);
  };

  const start = () => {
    trackPlay("pinball");
    const roulette = rouletteRef.current;
    if (!roulette) return;
    const list = splitNames(names);
    if (list.length === 0) {
      showToastMsg("먼저 참가자를 입력해 주세요!");
      return;
    }
    roulette.setMarbles(list);
    const count = roulette.getCount();
    if (count < 2) {
      showToastMsg("구슬이 2개 이상 필요해요!");
      return;
    }
    engineOptions.useSkills = useSkills;
    const rank =
      winnerType === "first"
        ? 0
        : winnerType === "last"
          ? count - 1
          : Math.min(Math.max(customRank - 1, 0), count - 1);
    engineOptions.winningRank = rank;
    roulette.setWinningRank(rank);
    setWinner(null);
    setShowResult(false);
    phaseRef.current = "race";
    setPhase("race");
    roulette.start();
  };

  const backToSetup = () => {
    const roulette = rouletteRef.current;
    setShowResult(false);
    setWinner(null);
    phaseRef.current = "setup";
    setPhase("setup");
    roulette?.setMarbles(splitNames(names));
  };

  const toggleFs = () => setExpanded((v) => !v);
  useEffect(() => {
    document.body.style.overflow = expanded ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [expanded]);

  const racing = phase === "race";

  return (
    <div className={styles.panel}>
      {/* ── 아레나 ── */}
      <div className={`${pb.arenaWrap} ${expanded ? pb.arenaFull : ""}`}>
        <div className={pb.arena} ref={mountRef} />
        <FullscreenToggle
          expanded={expanded}
          onToggle={toggleFs}
          hint={<><b>전체화면</b>으로 보면 구슬 레이스가 박진감 넘쳐요!</>}
        />
        {racing && (
          <div className={pb.raceHint}>화면을 꾹 누르면 2배속 ⏩</div>
        )}
        {expanded && !racing && (
          <div className={pb.fsControls}>
            <button
              className={pb.startBtn}
              style={{ flex: "0 0 auto", minWidth: 170 }}
              onClick={start}
            >
              🚀 레이스 시작
            </button>
          </div>
        )}
        {toast && <div className={pb.toast}>{toast}</div>}
      </div>

      {/* ── 설정 ── */}
      <div className={racing ? pb.settingsDisabled : undefined}>
        <p className={styles.sectionLabel} style={{ marginTop: 20 }}>
          👥 참가자 <span>쉼표/줄바꿈 구분 · 이름*2 = 2개 · 이름/3 = 가중치</span>
        </p>
        <textarea
          className={pb.namesInput}
          value={names}
          onChange={(e) => applyNames(e.target.value)}
          placeholder="수박*2, 키위, 귤/3 …"
          rows={2}
          disabled={racing}
        />

        <p className={styles.sectionLabel} style={{ marginTop: 18 }}>
          🗺 맵 선택
        </p>
        <div className={pb.mapRow}>
          {MAPS.map((m) => (
            <button
              key={m.index}
              className={`${pb.mapChip} ${mapIndex === m.index ? pb.mapChipOn : ""}`}
              onClick={() => selectMap(m.index)}
              disabled={racing}
            >
              {m.title}
            </button>
          ))}
        </div>

        <div className={pb.optionRow}>
          <div>
            <p className={styles.sectionLabel}>🏆 당첨자</p>
            <div className={styles.modeToggle}>
              <button
                className={`${styles.modeBtn} ${winnerType === "first" ? styles.modeBtnActive : ""}`}
                onClick={() => setWinnerType("first")}
                disabled={racing}
              >
                1등
              </button>
              <button
                className={`${styles.modeBtn} ${winnerType === "last" ? styles.modeBtnActive : ""}`}
                onClick={() => setWinnerType("last")}
                disabled={racing}
              >
                꼴등
              </button>
              <button
                className={`${styles.modeBtn} ${winnerType === "custom" ? styles.modeBtnActive : ""}`}
                onClick={() => setWinnerType("custom")}
                disabled={racing}
              >
                직접
              </button>
            </div>
            {winnerType === "custom" && (
              <input
                type="number"
                className={pb.rankInput}
                min={1}
                value={customRank}
                onChange={(e) => setCustomRank(Number.parseInt(e.target.value, 10) || 1)}
                disabled={racing}
              />
            )}
          </div>
          <div>
            <p className={styles.sectionLabel}>💥 스킬 (충격파)</p>
            <button
              className={`${pb.skillToggle} ${useSkills ? pb.skillOn : ""}`}
              onClick={() => setUseSkills((v) => !v)}
              disabled={racing}
            >
              {useSkills ? "켜짐 — 구슬이 서로 밀쳐요!" : "꺼짐 — 순수 물리로만"}
            </button>
          </div>
        </div>

        <div className={styles.actions}>
          {phase === "setup" && (
            <button className={pb.startBtn} onClick={start}>
              🚀 레이스 시작!
            </button>
          )}
          {phase === "race" && (
            <button className={pb.startBtn} disabled>
              레이스 중… 🔮
            </button>
          )}
          {phase === "done" && (
            <button className={pb.startBtn} onClick={backToSetup}>
              🔄 다시 준비하기
            </button>
          )}
        </div>
        <p className={pb.hintRow}>
          구슬이 물리 맵을 통과해 경주해요 — 미니맵으로 시점 이동, 화면 꾹 누르면 2배속!
        </p>
      </div>

      {/* ── 결과 오버레이 ── */}
      {showResult && winner && (
        <div className={pb.resultOverlay} onClick={() => setShowResult(false)}>
          <Confetti count={90} />
          <div className={pb.resultCard} onClick={(e) => e.stopPropagation()}>
            <p className={pb.resultEyebrow}>🎯 당첨 🎯</p>
            <p className={pb.resultName}>{winner}</p>
            <p className={pb.resultSub}>
              {winnerType === "last"
                ? "꼴등으로 골인!"
                : winnerType === "custom"
                  ? `${customRank}등으로 골인!`
                  : "1등으로 골인!"}
            </p>
            <div className={pb.resultBtns}>
              <button
                className={styles.btnPrimary}
                style={{ minWidth: 140 }}
                onClick={backToSetup}
              >
                다시 하기 🔮
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
