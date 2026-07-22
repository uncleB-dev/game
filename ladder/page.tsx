import type { Metadata } from "next";
import Link from "next/link";
import LadderGame from "./LadderGame";
import styles from "../game.module.css";
import { GameJsonLd } from "../seo";

export const metadata: Metadata = {
  title: "사다리 게임 | UncleB Games",
  description:
    "최대 10명까지 함께 즐기는 온라인 사다리타기. 당첨 인원도 자유롭게 설정하고, 참가자를 눌러 결과를 확인하세요.",
  keywords: ["사다리게임", "사다리타기", "온라인 사다리", "사다리 내기", "복불복 게임", "벌칙 정하기", "무료 미니게임"],
  openGraph: {
    title: "사다리 게임 | UncleB Games",
    description:
      "최대 10명까지 함께 즐기는 온라인 사다리타기. 당첨 인원도 자유롭게 설정하세요.",
    url: "https://unclebstudio.com/game/ladder",
    images: [{ url: "/logo/logo-full.png", width: 1200, height: 630 }],
  },
  alternates: { canonical: "/game/ladder" },
};

export default function LadderPage() {
  return (
    <div className={styles.page}>
      <GameJsonLd
        name="사다리 게임"
        description="최대 10명이 함께하는 온라인 사다리타기. 당첨 인원 설정, 애니메이션 결과 공개."
        path="/game/ladder"
        genre="파티 게임"
      />
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
          <span className={styles.eyebrow}>MINIGAME · 01</span>
          <h1 className={styles.title}>🪜 사다리 게임</h1>
          <p className={styles.subtitle}>
            최대 10명까지! 당첨 인원을 정하고 운명의 사다리를 타보세요.
          </p>
        </header>

        <LadderGame />
      </div>
    </div>
  );
}
