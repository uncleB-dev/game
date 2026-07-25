import type { Metadata } from "next";
import Link from "next/link";
import TouchGame from "./TouchGame";
import styles from "../game.module.css";
import { GameJsonLd } from "../seo";
import { gameUrl, GAME_OG_IMAGE } from "../site";
import TrackView from "../TrackView";

export const metadata: Metadata = {
  title: "스피드 터치 | UncleB Games",
  description:
    "1~4명이 화면을 나눠 동시에 대결! 제한시간(10~60초) 안에 자기 구역을 가장 많이 터치한 사람이 승리합니다.",
  keywords: ["스피드 터치", "반응속도 게임", "터치 게임", "2인 게임", "4인 게임", "친구랑 할만한 게임", "무료 미니게임"],
  openGraph: {
    title: "스피드 터치 | UncleB Games",
    description: "화면을 나눠 동시에! 누가 제일 빨리 터치할까?",
    url: gameUrl("/game/touch"),
    images: [{ url: GAME_OG_IMAGE, width: 1200, height: 630 }],
  },
  alternates: { canonical: gameUrl("/game/touch") },
};

export default function TouchPage() {
  return (
    <div className={styles.page}>
      <TrackView slug="touch" />
      <GameJsonLd
        name="스피드 터치"
        description="1~4명이 화면을 나눠 동시에 터치 대결. 제한시간 내 최다 터치 승리."
        path="/game/touch"
        genre="반응속도 게임"
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
          <span className={styles.eyebrow}>MINIGAME · 05</span>
          <h1 className={styles.title}>⚡ 스피드 터치</h1>
          <p className={styles.subtitle}>
            화면을 나눠 동시에 대결! 제한시간 안에 누가 더 많이 터치할까?
          </p>
        </header>

        <TouchGame />
      </div>
    </div>
  );
}
