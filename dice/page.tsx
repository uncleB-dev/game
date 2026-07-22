import type { Metadata } from "next";
import Link from "next/link";
import DiceGame from "./DiceGame";
import styles from "../game.module.css";
import { GameJsonLd } from "../seo";

export const metadata: Metadata = {
  title: "주사위 던지기 (3D) | UncleB Games",
  description:
    "3D 주사위를 화면 안에서 굴려요. 주사위 개수 선택, 폰을 흔들면 흔들리는 대로! 멈추면 합계를 화려하게 표시합니다.",
  keywords: ["주사위 굴리기", "온라인 주사위", "3D 주사위", "주사위 게임", "주사위 시뮬레이터", "무료 미니게임"],
  openGraph: {
    title: "주사위 던지기 (3D) | UncleB Games",
    description: "3D 주사위를 굴리고 흔들어보세요.",
    url: "https://unclebstudio.com/game/dice",
    images: [{ url: "/logo/logo-full.png", width: 1200, height: 630 }],
  },
  alternates: { canonical: "/game/dice" },
};

export default function DicePage() {
  return (
    <div className={styles.page}>
      <GameJsonLd
        name="주사위 던지기 (3D)"
        description="실제 물리로 굴러가는 3D 주사위. 1~6개 선택, 폰 흔들기 지원."
        path="/game/dice"
        genre="보드 게임 도구"
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
