import type { Metadata } from "next";
import Link from "next/link";
import PinballGame from "./PinballGame";
import styles from "../game.module.css";
import { GameJsonLd } from "../seo";
import { gameUrl, GAME_OG_IMAGE } from "../site";
import TrackView from "../TrackView";

export const metadata: Metadata = {
  title: "복불복 핀볼 | UncleB Games",
  description:
    "이름을 넣고 구슬을 굴려 당첨자를 뽑는 물리 핀볼 레이스! 6가지 맵, 스킬, 가중치까지 — 벌칙·추첨·내기에 딱.",
  keywords: ["복불복 게임", "구슬 룰렛", "마블 레이스", "핀볼 게임", "당첨자 뽑기", "벌칙 뽑기", "랜덤 추첨", "무료 미니게임"],
  openGraph: {
    title: "복불복 핀볼 | UncleB Games",
    description: "구슬 물리 레이스로 당첨자를 뽑아보세요. 6가지 맵!",
    url: gameUrl("/game/pinball"),
    images: [{ url: GAME_OG_IMAGE, width: 1200, height: 630 }],
  },
  alternates: { canonical: gameUrl("/game/pinball") },
};

export default function PinballPage() {
  return (
    <div
      className={styles.page}
      style={{ ["--gm-neon" as string]: "#FF2D95" } as React.CSSProperties}
    >
      <TrackView slug="pinball" />
      <GameJsonLd
        name="복불복 핀볼"
        description="이름을 넣고 구슬을 굴려 당첨자를 뽑는 물리 핀볼 레이스. 6가지 맵과 스킬."
        path="/game/pinball"
        genre="파티 게임"
      />
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandDot} />
            UncleB Games
          </Link>
          <Link href="/" className={styles.backLink}>
            ← 게임 목록
          </Link>
        </div>

        <header className={styles.hero}>
          <span className={styles.eyebrow}>MINIGAME · 07</span>
          <h1 className={styles.title}>🔮 복불복 핀볼</h1>
          <p className={styles.subtitle}>
            이름을 넣고 구슬을 굴려요! 물리 핀볼 레이스에서 살아남는 자는 누구?
          </p>
        </header>

        <PinballGame />

        <p className={styles.hint} style={{ marginTop: 18, fontSize: 12 }}>
          원작{" "}
          <a
            href="https://lazygyu.github.io/roulette/"
            target="_blank"
            rel="noreferrer"
            style={{ color: "inherit", textDecoration: "underline" }}
          >
            lazygyu/roulette
          </a>
          (MIT)의 맵 데이터와 게임 규칙을 참고했습니다.
        </p>
      </div>
    </div>
  );
}
