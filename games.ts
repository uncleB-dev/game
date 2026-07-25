/**
 * 게임 목록 — **단일 원본(single source of truth)**.
 *
 * 이 배열 하나만 고치면 아래가 전부 따라온다:
 *   - 허브(`page.tsx`)의 카드 목록
 *   - 사이트맵(`/sitemap-game.xml`, 호스트 레포의 라우트가 이 배열을 읽어 생성)
 *   - 허브 JSON-LD 의 ItemList
 *
 * 게임을 추가하면 `releaseDate` 를 반드시 채운다. 출시 후 30일 동안 허브 맨 앞에
 * NEW 로 고정되는 기준이고, 비어 있으면 신규 취급을 받지 못한다.
 */

export type Game = {
  /** 라우트 슬러그. 서비스 URL 은 `game.unclebstudio.com/<slug>` (코드상 라우트는 `/game/<slug>`) */
  slug: string;
  emoji: string;
  title: string;
  /** 허브 카드 문구 */
  desc: string;
  /** 검색·JSON-LD 용 한 줄 설명 */
  genre: string;
  /** 출시일 (YYYY-MM-DD). 오늘로부터 30일 이내면 허브 맨 앞에 NEW 로 고정된다. */
  releaseDate: string;
  /** 네온 강조색 — 카드 호버 시 점등되는 색 */
  neon: string;
};

export const GAMES: Game[] = [
  {
    slug: "ladder",
    emoji: "🪜",
    title: "사다리 게임",
    desc: "최대 10명 참가, 당첨 인원 자유 설정. 커피 내기부터 청소 당번까지!",
    genre: "파티 게임",
    releaseDate: "2026-07-21",
    neon: "#00E5FF",
  },
  {
    slug: "wheel",
    emoji: "🎡",
    title: "빅휠",
    desc: "화려한 네온 룰렛! 항목을 넣고 돌려서 운명의 하나를 뽑아요.",
    genre: "파티 게임",
    releaseDate: "2026-07-21",
    neon: "#FF2D95",
  },
  {
    slug: "dice",
    emoji: "🎲",
    title: "주사위 던지기",
    desc: "3D 주사위를 화면 안에서 굴려요. 개수 선택, 폰 흔들기 지원!",
    genre: "보드 게임 도구",
    releaseDate: "2026-07-22",
    neon: "#A855F7",
  },
  {
    slug: "yut",
    emoji: "🪵",
    title: "윷놀이",
    desc: "윷가락 4개를 던져 도·개·걸·윷·모·빽도! 흔들거나 버튼으로.",
    genre: "전통 놀이",
    releaseDate: "2026-07-22",
    neon: "#FFB020",
  },
  {
    slug: "touch",
    emoji: "⚡",
    title: "스피드 터치",
    desc: "1~4명이 화면을 나눠 동시에! 제한시간 안에 더 많이 터치하면 승리.",
    genre: "반응속도 게임",
    releaseDate: "2026-07-22",
    neon: "#39FF14",
  },
  {
    slug: "lotto",
    emoji: "🎱",
    title: "로또 추첨기",
    desc: "에어젯 바람으로 볼을 섞고 하나씩 추첨! 번호·개수 설정 가능.",
    genre: "추첨 도구",
    releaseDate: "2026-07-23",
    neon: "#00E5FF",
  },
  {
    slug: "pinball",
    emoji: "🔮",
    title: "복불복 핀볼",
    desc: "이름을 넣고 구슬을 굴려 당첨자 추첨! 물리 핀볼 레이스, 6가지 맵.",
    genre: "파티 게임",
    releaseDate: "2026-07-23",
    neon: "#FF2D95",
  },
];

/** 출시 후 이 기간 동안 허브 맨 앞에 NEW 로 고정된다. */
export const NEW_WINDOW_DAYS = 30;

/** 인기순 집계 기간 — "이전 한 달간 많이 하는 게임". */
export const POPULAR_WINDOW_DAYS = 30;

/** 출시 후 NEW_WINDOW_DAYS 이내인가. `now` 를 주입받아 서버/클라이언트 판정을 일치시킨다. */
export function isNew(game: Game, now: number): boolean {
  const released = Date.parse(`${game.releaseDate}T00:00:00+09:00`);
  if (Number.isNaN(released)) return false;
  const age = now - released;
  return age >= 0 && age < NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

export function gameBySlug(slug: string): Game | undefined {
  return GAMES.find((g) => g.slug === slug);
}
