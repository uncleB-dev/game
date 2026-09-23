import type { Metadata } from "next";
import Link from "next/link";
import BilliardsPage from "./BilliardsPage";
import styles from "../game.module.css";
import CoupangBanner from "../CoupangBanner";
import { GameJsonLd } from "../seo";
import { gameUrl, GAME_OG_IMAGE } from "../site";
import TrackView from "../TrackView";
import { BILLIARDS_APK } from "./apk";

export const metadata: Metadata = {
  title: "엉클비 당구 — 4구·3구 안드로이드 게임 (APK) | UncleB Games",
  description:
    "광고 없이 혼자 계속 치는 캐롬 당구. 실제 물리(미끄럼·구름·스핀·스로우·쿠션 마찰), 당점·힘·두께·확대경, 4구와 3구 규칙, 테이블·공·큐 디자인 조합. 안드로이드 APK 무료 설치.",
  keywords: ["당구 게임", "4구 게임", "3구 게임", "당구 앱", "캐롬 당구", "안드로이드 당구", "광고 없는 게임", "APK", "무료 게임"],
  openGraph: {
    title: "엉클비 당구 — 4구·3구 안드로이드 게임 | UncleB Games",
    description: "광고 없이, 혼자서, 실제 물리로. 4구와 3구를 폰에서.",
    url: gameUrl("/game/billiards"),
    images: [{ url: GAME_OG_IMAGE, width: 1200, height: 630 }],
  },
  alternates: { canonical: gameUrl("/game/billiards") },
};

export default function BilliardsRoute() {
  return (
    <div
      className={styles.page}
      style={{ ["--gm-neon" as string]: "#39FF14" } as React.CSSProperties}
    >
      <TrackView slug="billiards" />
      <GameJsonLd
        name="엉클비 당구 — 4구·3구"
        description="광고 없는 안드로이드 캐롬 당구. 실제 물리, 당점·힘·두께 조절, 4구·3구 규칙, 디자인 조합."
        path="/game/billiards"
        genre="스포츠 · 당구"
        platform="android"
        downloadUrl={gameUrl(BILLIARDS_APK.url)}
        version={BILLIARDS_APK.version}
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
          <span className={styles.eyebrow}>ANDROID · 08</span>
          <h1 className={styles.title}>🎱 엉클비 당구</h1>
          <p className={styles.subtitle}>
            광고 없이, 혼자서, 실제 물리로. 4구와 3구를 폰에서.
          </p>
        </header>

        <BilliardsPage />

        <CoupangBanner />
      </div>
    </div>
  );
}
