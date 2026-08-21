"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import a from "./arcade.module.css";
import CoupangBanner from "./CoupangBanner";
import { POPULAR_WINDOW_DAYS } from "./games";
import {
  DEFAULT_SORT,
  SORT_LABELS,
  rankGames,
  type PlayCounts,
  type SortMode,
} from "./sort";

/**
 * 허브 본체 — 네온 아케이드.
 *
 * 정렬은 클라이언트에서 즉시 바뀌지만 초기 순서는 서버가 계산해 넘겨준 것과
 * 같다(같은 rankGames·같은 now). 그래야 하이드레이션 불일치가 없다.
 */

type Props = {
  plays: PlayCounts;
  /** 서버 렌더 시각. 신규(NEW) 판정 기준을 서버·클라이언트가 공유한다. */
  now: number;
};

export default function ArcadeHub({ plays, now }: Props) {
  const [mode, setMode] = useState<SortMode>(DEFAULT_SORT);
  const shellRef = useRef<HTMLDivElement>(null);

  const games = useMemo(() => rankGames(plays, mode, now), [plays, mode, now]);

  // 마우스를 따라다니는 스포트라이트. 리렌더를 유발하지 않도록 CSS 변수로만 쓴다.
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return;

    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        el.style.setProperty("--mx", `${e.clientX}px`);
        el.style.setProperty("--my", `${e.clientY}px`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className={a.page} ref={shellRef}>
      <div className={a.bgGlow} aria-hidden />
      <div className={a.bgGrid} aria-hidden />
      <div className={a.bgScan} aria-hidden />
      <div className={a.spotlight} aria-hidden />

      <div className={a.shell}>
        <div className={a.topbar}>
          <Link href="/" className={a.brand}>
            <span className={a.brandDot} />
            UncleB Games
          </Link>
          {/* 정본이 서브도메인이라 "/" 는 이 허브 자신이다. 스튜디오 홈은 절대 URL로. */}
          <a href="https://unclebstudio.com" className={a.backLink}>
            ← 엉클비스튜디오
          </a>
        </div>

        <header className={a.hero}>
          <p className={a.marquee}>ARCADE</p>
          <h1 className={a.title}>
            <span className={a.titleNeon}>심심할 땐,</span>
            <br />
            <span className={a.titleNeonAlt}>엉클비 오락실</span>
          </h1>
          <p className={a.subtitle}>
            설치도 로그인도 없이 바로 즐기는 미니게임 {games.length}종.
            <br />
            친구랑, 회식 자리에서, 혼자 심심할 때.
          </p>
          <p className={a.coinSlot}>▸ INSERT COIN — FREE PLAY ◂</p>
        </header>

        <div className={a.toolbar}>
          <span className={a.toolbarLabel}>Sort</span>
          <div className={a.sortRow} role="group" aria-label="게임 정렬">
            {(Object.keys(SORT_LABELS) as SortMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`${a.sortBtn} ${mode === m ? a.sortBtnOn : ""}`}
              >
                {SORT_LABELS[m]}
              </button>
            ))}
          </div>
          <p className={a.sortNote}>
            {mode === "popular"
              ? `최근 ${POPULAR_WINDOW_DAYS}일 플레이 수 기준입니다.`
              : "출시일이 최신인 순서입니다."}{" "}
            새로 나온 게임(출시 30일 이내)은 정렬과 무관하게 맨 앞에 고정돼요.
          </p>
        </div>

        <div className={a.grid}>
          {games.map((g, i) => (
            <Link
              key={g.slug}
              href={`/${g.slug}`}
              className={`${a.card} ${a.rise}`}
              style={
                {
                  ["--neon" as string]: g.neon,
                  animationDelay: `${Math.min(i, 8) * 45}ms`,
                } as React.CSSProperties
              }
            >
              <div className={a.cardTop}>
                {g.icon ? (
                  <Image
                    src={g.icon}
                    alt=""
                    width={76}
                    height={76}
                    className={a.cardIcon}
                    /* 첫 화면 카드들은 우선 로드 — LCP 요소다 */
                    priority={i < 4}
                  />
                ) : (
                  <span className={a.cardEmoji}>{g.emoji}</span>
                )}
                <div className={a.badges}>
                  {g.isNew && <span className={`${a.badge} ${a.badgeNew}`}>NEW</span>}
                  {g.rank === 1 && !g.isNew && (
                    <span className={`${a.badge} ${a.badgeHot}`}>🔥 인기 1위</span>
                  )}
                  {g.rank !== null && g.rank > 1 && g.rank <= 3 && (
                    <span className={`${a.badge} ${a.badgeRank}`}>{g.rank}위</span>
                  )}
                </div>
              </div>

              <h2 className={a.cardTitle}>{g.title}</h2>
              <p className={a.cardDesc}>{g.desc}</p>

              <div className={a.cardFoot}>
                <span className={a.plays}>
                  {g.plays > 0
                    ? `최근 ${POPULAR_WINDOW_DAYS}일 ${g.plays.toLocaleString("ko-KR")}판`
                    : "아직 기록 없음"}
                </span>
                <span className={a.playBtn}>▸ PLAY</span>
              </div>
            </Link>
          ))}

          <div className={`${a.card} ${a.cardSoon}`}>
            <div className={a.cardTop}>
              <span className={a.cardEmoji}>🕹</span>
            </div>
            <h2 className={a.cardTitle}>다음 게임</h2>
            <p className={a.cardDesc}>
              새로운 미니게임을 준비하고 있어요. 곧 이 자리에 불이 들어옵니다.
            </p>
            <div className={a.cardFoot}>
              <span className={a.plays}>COMING SOON</span>
            </div>
          </div>
        </div>

        <CoupangBanner />

        <p className={a.footer}>
          전부 무료 · 설치 없음 · 로그인 없음
          <br />
          made by <a href="https://unclebstudio.com">엉클비스튜디오</a>
        </p>
      </div>
    </div>
  );
}
