import type { Metadata } from "next";
import Link from "next/link";
import BigWheel from "./BigWheel";
import styles from "../game.module.css";

export const metadata: Metadata = {
  title: "빅휠 (행운의 룰렛) | UncleB Games",
  description:
    "화려한 네온 룰렛! 항목을 자유롭게 넣고 돌려서 하나를 뽑아요. 벌칙 정하기, 메뉴 정하기, 추첨까지.",
  openGraph: {
    title: "빅휠 (행운의 룰렛) | UncleB Games",
    description: "화려한 네온 룰렛으로 하나를 뽑아보세요.",
    url: "https://unclebstudio.com/game/wheel",
  },
  alternates: { canonical: "/game/wheel" },
};

export default function WheelPage() {
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
          <span className={styles.eyebrow}>MINIGAME · 02</span>
          <h1 className={styles.title}>🎡 빅휠</h1>
          <p className={styles.subtitle}>
            화려한 행운의 룰렛! 항목을 넣고 돌려서 운명의 하나를 뽑아보세요.
          </p>
        </header>

        <BigWheel />
      </div>
    </div>
  );
}
