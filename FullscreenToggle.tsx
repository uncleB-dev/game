"use client";

import { useEffect, useState, type ReactNode } from "react";
import styles from "./game.module.css";

/**
 * 전체화면 토글 — 여러 게임이 공유한다.
 *
 * 문제: 예전엔 아이콘(⛶)만 있는 정사각 버튼이라 전체화면 기능이 있다는 걸
 * 대부분 알아채지 못했다. aria-label 은 스크린리더에만 들리고 눈에는 안 보인다.
 *
 * 해결 3단:
 *  1) 아이콘 옆에 **글자**를 붙였다 — 이게 가장 큰 차이다.
 *  2) 아직 한 번도 안 써본 사용자에겐 버튼에 네온 링이 퍼진다.
 *  3) 게임 진입 직후 말풍선으로 한 번 알려주고, 한 번 쓰면 다시 안 뜬다.
 *
 * "써봤다"는 기록은 게임별이 아니라 **전역**으로 남긴다. 사다리에서 이미
 * 배운 사람에게 주사위에서 또 안내할 이유가 없다.
 */

const SEEN_KEY = "unclebgames:fs-seen";
const HINT_DELAY_MS = 1200; // 화면이 자리잡은 뒤 떠야 눈에 들어온다
const HINT_AUTO_HIDE_MS = 9000;

type Props = {
  expanded: boolean;
  onToggle: () => void;
  /** 말풍선 문구 — 게임마다 무엇이 좋아지는지 다르게 쓴다. */
  hint?: ReactNode;
};

export default function FullscreenToggle({ expanded, onToggle, hint }: Props) {
  // 서버·첫 렌더에서는 항상 "이미 봤음"으로 시작한다.
  // localStorage 는 클라이언트에만 있으므로 하이드레이션 불일치를 피한다.
  const [seen, setSeen] = useState(true);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    let already = true;
    try {
      already = localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // 시크릿 모드 등 — 안내를 반복하느니 안 띄운다.
    }
    if (already) return;

    setSeen(false);
    const t = window.setTimeout(() => setShowHint(true), HINT_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  // 말풍선은 일정 시간 뒤 스스로 사라진다 (닫기를 강요하지 않는다)
  useEffect(() => {
    if (!showHint) return;
    const t = window.setTimeout(() => setShowHint(false), HINT_AUTO_HIDE_MS);
    return () => window.clearTimeout(t);
  }, [showHint]);

  const markSeen = () => {
    setSeen(true);
    setShowHint(false);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // 저장 못 해도 이번 세션 동안은 안 뜬다.
    }
  };

  const handleToggle = () => {
    markSeen();
    onToggle();
  };

  return (
    <div className={`${styles.fsBar} ${expanded ? styles.fsBarExpanded : ""}`}>
      {showHint && !expanded && (
        <div className={styles.fsHint} role="status">
          <p className={styles.fsHintText}>
            {hint ?? (
              <>
                <b>전체화면</b>으로 하면 훨씬 잘 보여요!
              </>
            )}
          </p>
          <button type="button" className={styles.fsHintClose} onClick={markSeen}>
            알겠어요
          </button>
        </div>
      )}

      <button
        type="button"
        className={`${styles.fsBtn} ${!seen && !expanded ? styles.fsBtnNew : ""}`}
        onClick={handleToggle}
        aria-label={expanded ? "전체화면 끄기" : "전체화면으로 보기"}
      >
        <span className={styles.fsIcon} aria-hidden>
          {expanded ? "✕" : "⛶"}
        </span>
        {expanded ? "닫기" : "전체화면"}
      </button>
    </div>
  );
}
