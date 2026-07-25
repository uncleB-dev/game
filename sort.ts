import { GAMES, POPULAR_WINDOW_DAYS, isNew, type Game } from "./games";

/**
 * 허브 정렬 규칙.
 *
 * 공통: **출시 30일 이내(NEW) 게임은 항상 맨 앞에 고정**된다. 신규가 여럿이면
 * 그들끼리 출시일 최신순으로 줄을 선다. 갓 나온 게임이 플레이 수가 없다는 이유로
 * 뒤로 밀려 아무도 못 보는 상황을 막기 위한 규칙이다.
 *
 * - `popular` (기본) — NEW 뒤로는 최근 한 달 플레이 수 내림차순
 * - `new`            — 전부 출시일 최신순
 */
export type SortMode = "popular" | "new";

export const SORT_LABELS: Record<SortMode, string> = {
  popular: "🔥 많이 하는 순",
  new: "✨ 새로 나온 순",
};

export const DEFAULT_SORT: SortMode = "popular";

export function isSortMode(v: string | undefined): v is SortMode {
  return v === "popular" || v === "new";
}

export type PlayCounts = Record<string, number>;

export type RankedGame = Game & {
  plays: number;
  isNew: boolean;
  /** 인기순에서의 순위(1위부터). 플레이 기록이 없으면 null. */
  rank: number | null;
};

function releasedAt(game: Game): number {
  const t = Date.parse(`${game.releaseDate}T00:00:00+09:00`);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * 게임 목록에 플레이 수·신규 여부·인기 순위를 붙이고 정렬한다.
 * `now` 를 인자로 받아 서버 렌더와 클라이언트 재정렬이 같은 기준을 쓰게 한다.
 */
export function rankGames(
  plays: PlayCounts,
  mode: SortMode,
  now: number,
  games: Game[] = GAMES,
): RankedGame[] {
  // 인기 순위는 정렬 모드와 무관하게 플레이 수 기준으로 한 번만 매긴다.
  const byPlays = [...games]
    .filter((g) => (plays[g.slug] ?? 0) > 0)
    .sort((a, b) => (plays[b.slug] ?? 0) - (plays[a.slug] ?? 0));
  const rankOf = new Map(byPlays.map((g, i) => [g.slug, i + 1]));

  const decorated: RankedGame[] = games.map((g) => ({
    ...g,
    plays: plays[g.slug] ?? 0,
    isNew: isNew(g, now),
    rank: rankOf.get(g.slug) ?? null,
  }));

  return decorated.sort((a, b) => {
    // 1) 신규 고정 — 출시 30일 이내는 무조건 앞
    if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
    if (a.isNew && b.isNew) return releasedAt(b) - releasedAt(a);

    // 2) 모드별 정렬
    if (mode === "new") return releasedAt(b) - releasedAt(a);
    if (a.plays !== b.plays) return b.plays - a.plays;

    // 3) 동점이면 최신 출시가 앞 (완전한 결정성 확보)
    return releasedAt(b) - releasedAt(a);
  });
}

export { POPULAR_WINDOW_DAYS };
