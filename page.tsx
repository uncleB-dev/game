import type { Metadata } from "next";
import Link from "next/link";
import styles from "./game.module.css";

export const metadata: Metadata = {
  title: "UncleB Games — 미니게임 모음",
  description:
    "엉클비스튜디오가 만든 가볍고 재밌는 미니게임 모음. 사다리 게임부터 시작해 하나씩 늘려갑니다.",
  openGraph: {
    title: "UncleB Games — 미니게임 모음",
    description: "가볍고 재밌는 미니게임 모음. 친구들과 함께 즐겨보세요.",
    url: "https://unclebstudio.com/game",
  },
  alternates: { canonical: "/game" },
};

type GameItem = {
  href: string;
  emoji: string;
  title: string;
  desc: string;
  badge: string;
  ready: boolean;
};

const GAMES: GameItem[] = [
  {
    href: "/game/ladder",
    emoji: "🪜",
    title: "사다리 게임",
    desc: "최대 10명 참가, 당첨 인원 자유 설정. 커피 내기부터 청소 당번까지!",
    badge: "PLAY",
    ready: true,
  },
  {
    href: "/game/wheel",
    emoji: "🎡",
    title: "빅휠",
    desc: "화려한 네온 룰렛! 항목을 넣고 돌려서 운명의 하나를 뽑아요.",
    badge: "PLAY",
    ready: true,
  },
  {
    href: "/game/dice",
    emoji: "🎲",
    title: "주사위 던지기",
    desc: "3D 주사위를 화면 안에서 굴려요. 개수 선택, 폰 흔들기 지원!",
    badge: "PLAY",
    ready: true,
  },
  {
    href: "/game/yut",
    emoji: "🪵",
    title: "윷놀이",
    desc: "윷가락 4개를 던져 도·개·걸·윷·모·빽도! 흔들거나 버튼으로.",
    badge: "PLAY",
    ready: true,
  },
  {
    href: "/game/touch",
    emoji: "⚡",
    title: "스피드 터치",
    desc: "1~4명이 화면을 나눠 동시에! 제한시간 안에 더 많이 터치하면 승리.",
    badge: "PLAY",
    ready: true,
  },
  {
    href: "/game/lotto",
    emoji: "🎱",
    title: "로또 추첨기",
    desc: "에어젯 바람으로 볼을 섞고 하나씩 추첨! 번호·개수 설정 가능.",
    badge: "PLAY",
    ready: true,
  },
];

export default function GameHubPage() {
  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandDot} />
            UncleB Games
          </Link>
          <Link href="/" className={styles.backLink}>
            ← 홈으로
          </Link>
        </div>

        <header className={styles.hero}>
          <span className={styles.eyebrow}>MINIGAMES</span>
          <h1 className={styles.title}>
            심심할 땐,
            <br />
            엉클비 게임 한 판 🎮
          </h1>
          <p className={styles.subtitle}>
            설치도 로그인도 없이 바로 즐기는 가벼운 미니게임 모음.
            <br />
            하나씩 계속 늘어납니다.
          </p>
        </header>

        <div className={styles.grid}>
          {GAMES.map((g) =>
            g.ready ? (
              <Link key={g.href} href={g.href} className={styles.card}>
                <span className={styles.cardEmoji}>{g.emoji}</span>
                <h2 className={styles.cardTitle}>{g.title}</h2>
                <p className={styles.cardDesc}>{g.desc}</p>
                <span className={styles.cardBadge}>{g.badge}</span>
              </Link>
            ) : (
              <div
                key={g.href}
                className={`${styles.card} ${styles.cardDisabled}`}
              >
                <span className={styles.cardEmoji}>{g.emoji}</span>
                <h2 className={styles.cardTitle}>{g.title}</h2>
                <p className={styles.cardDesc}>{g.desc}</p>
                <span className={`${styles.cardBadge} ${styles.cardBadgeSoon}`}>
                  {g.badge}
                </span>
              </div>
            ),
          )}

          {/* 다음 게임 예고 카드 */}
          <div className={`${styles.card} ${styles.cardDisabled}`}>
            <span className={styles.cardEmoji}>🎲</span>
            <h2 className={styles.cardTitle}>다음 게임</h2>
            <p className={styles.cardDesc}>
              새로운 미니게임을 준비하고 있어요. 곧 만나요!
            </p>
            <span className={`${styles.cardBadge} ${styles.cardBadgeSoon}`}>
              준비중
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
