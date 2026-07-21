import type { Metadata } from "next";
import Link from "next/link";
import DiceGame from "./DiceGame";
import styles from "../game.module.css";

export const metadata: Metadata = {
  title: "주사위 던지기 (3D) | UncleB Games",
  description:
    "3D 주사위를 화면 안에서 굴려요. 주사위 개수 선택, 폰을 흔들면 흔들리는 대로! 멈추면 합계를 화려하게 표시합니다.",
  openGraph: {
    title: "주사위 던지기 (3D) | UncleB Games",
    description: "3D 주사위를 굴리고 흔들어보세요.",
    url: "https://unclebstudio.com/game/dice",
  },
  alternates: { canonical: "/game/dice" },
};

export default function DicePage() {
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
          <span className={styles.eyebrow}>MINIGAME · 03</span>
          <h1 className={styles.title}>🎲 주사위 던지기</h1>
          <p className={styles.subtitle}>
            3D 주사위를 굴려보세요! 개수도 정하고, 폰은 흔들면 흔들리는 대로.
          </p>
        </header>

        <DiceGame />
      </div>
    </div>
  );
}
