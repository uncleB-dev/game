import type { Metadata } from "next";
import Link from "next/link";
import TouchGame from "./TouchGame";
import styles from "../game.module.css";

export const metadata: Metadata = {
  title: "스피드 터치 | UncleB Games",
  description:
    "1~4명이 화면을 나눠 동시에 대결! 제한시간(10~60초) 안에 자기 구역을 가장 많이 터치한 사람이 승리합니다.",
  openGraph: {
    title: "스피드 터치 | UncleB Games",
    description: "화면을 나눠 동시에! 누가 제일 빨리 터치할까?",
    url: "https://unclebstudio.com/game/touch",
  },
  alternates: { canonical: "/game/touch" },
};

export default function TouchPage() {
  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandDot} />
            UncleB Games
          </Link>
          <Link href="/game" className={styles.backLink}>
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
