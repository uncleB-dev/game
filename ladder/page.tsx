import type { Metadata } from "next";
import Link from "next/link";
import LadderGame from "./LadderGame";
import styles from "../game.module.css";

export const metadata: Metadata = {
  title: "사다리 게임 | UncleB Games",
  description:
    "최대 10명까지 함께 즐기는 온라인 사다리타기. 당첨 인원도 자유롭게 설정하고, 참가자를 눌러 결과를 확인하세요.",
  openGraph: {
    title: "사다리 게임 | UncleB Games",
    description:
      "최대 10명까지 함께 즐기는 온라인 사다리타기. 당첨 인원도 자유롭게 설정하세요.",
    url: "https://unclebstudio.com/game/ladder",
  },
  alternates: { canonical: "/game/ladder" },
};

export default function LadderPage() {
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
