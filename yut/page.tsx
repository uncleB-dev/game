import type { Metadata } from "next";
import Link from "next/link";
import YutGame from "./YutGame";
import styles from "../game.module.css";
import { GameJsonLd } from "../seo";

export const metadata: Metadata = {
  title: "윷놀이 (3D) | UncleB Games",
  description:
    "윷가락 4개를 화면 안에서 던져요. 폰을 흔들면 흔들리는 대로! 도·개·걸·윷·모·빽도를 화려하게 판정합니다.",
  keywords: ["윷놀이", "윷 던지기", "온라인 윷놀이", "도개걸윷모", "빽도", "명절 게임", "무료 미니게임"],
  openGraph: {
    title: "윷놀이 (3D) | UncleB Games",
    description: "윷을 던져 도·개·걸·윷·모·빽도를 맞혀보세요.",
    url: "https://unclebstudio.com/game/yut",
    images: [{ url: "/logo/logo-full.png", width: 1200, height: 630 }],
  },
  alternates: { canonical: "/game/yut" },
};

export default function YutPage() {
  return (
    <div className={styles.page}>
      <GameJsonLd
        name="윷놀이 (3D)"
        description="3D 물리로 던지는 윷가락 4개. 도·개·걸·윷·모·빽도 자동 판정."
        path="/game/yut"
        genre="전통 놀이"
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
          <span className={styles.eyebrow}>MINIGAME · 04</span>
          <h1 className={styles.title}>🪵 윷놀이</h1>
          <p className={styles.subtitle}>
            윷가락 4개를 던져보세요! 폰은 흔들면 흔들리는 대로, 도·개·걸·윷·모!
          </p>
        </header>

        <YutGame />
      </div>
    </div>
  );
}
