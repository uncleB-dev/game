import type { Metadata } from "next";
import Link from "next/link";
import LottoGame from "./LottoGame";
import styles from "../game.module.css";
import { GameJsonLd } from "../seo";
import { gameUrl, GAME_OG_IMAGE } from "../site";

export const metadata: Metadata = {
  title: "로또 추첨기 (3D) | UncleB Games",
  description:
    "실제 로또처럼 에어젯 바람으로 번호볼을 섞고 하나씩 뽑아요. 최대 번호(10~45)와 뽑을 개수(1~10) 설정 가능.",
  keywords: ["로또 번호 생성기", "로또 추첨기", "로또 번호 뽑기", "행운 번호", "랜덤 번호 생성", "무료 미니게임"],
  openGraph: {
    title: "로또 추첨기 (3D) | UncleB Games",
    description: "유리 드럼 속 번호볼을 바람으로 섞고 당첨번호를 뽑아보세요.",
    url: gameUrl("/game/lotto"),
    images: [{ url: GAME_OG_IMAGE, width: 1200, height: 630 }],
  },
  alternates: { canonical: gameUrl("/game/lotto") },
};

export default function LottoPage() {
  return (
    <div className={styles.page}>
      <GameJsonLd
        name="로또 번호 추첨기 (3D)"
        description="에어젯 바람으로 번호볼을 섞는 실감나는 3D 로또 추첨기."
        path="/game/lotto"
        genre="추첨 도구"
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
          <span className={styles.eyebrow}>MINIGAME · 06</span>
          <h1 className={styles.title}>🎱 로또 추첨기</h1>
          <p className={styles.subtitle}>
            에어젯 바람으로 볼을 섞고, 버튼으로 하나씩! 오늘의 행운 번호는?
          </p>
        </header>

        <LottoGame />
      </div>
    </div>
  );
}
