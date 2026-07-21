import type { Metadata } from "next";
import Link from "next/link";
import YutGame from "./YutGame";
import styles from "../game.module.css";

export const metadata: Metadata = {
  title: "윷놀이 (3D) | UncleB Games",
  description:
    "윷가락 4개를 화면 안에서 던져요. 폰을 흔들면 흔들리는 대로! 도·개·걸·윷·모·빽도를 화려하게 판정합니다.",
  openGraph: {
    title: "윷놀이 (3D) | UncleB Games",
    description: "윷을 던져 도·개·걸·윷·모·빽도를 맞혀보세요.",
    url: "https://unclebstudio.com/game/yut",
  },
  alternates: { canonical: "/game/yut" },
};

export default function YutPage() {
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
