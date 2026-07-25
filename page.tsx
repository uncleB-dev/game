import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import ArcadeHub from "./ArcadeHub";
import { GamesHubJsonLd } from "./seo";
import { gameUrl, GAME_OG_IMAGE } from "./site";
import { GAMES, POPULAR_WINDOW_DAYS } from "./games";
import type { PlayCounts } from "./sort";

export const metadata: Metadata = {
  title: "UncleB Games — 미니게임 모음",
  description:
    "설치·로그인 없이 브라우저에서 바로 즐기는 무료 미니게임 오락실. 사다리타기, 룰렛, 3D 주사위, 윷놀이, 스피드 터치, 로또 추첨기, 복불복 핀볼.",
  keywords: ["미니게임","무료 게임","온라인 게임","브라우저 게임","사다리타기","룰렛","주사위","윷놀이","스피드 터치","로또 번호 생성기","엉클비 게임즈","UncleB Games"],
  openGraph: {
    title: "UncleB Games — 미니게임 모음",
    description: "가볍고 재밌는 미니게임 오락실. 친구들과 함께 즐겨보세요.",
    url: gameUrl("/game"),
    images: [{ url: GAME_OG_IMAGE, width: 1200, height: 630 }],
  },
  alternates: { canonical: gameUrl("/game") },
};

// 플레이 집계는 자주 바뀌지 않는다. 5분 캐시로 DB 부하와 신선도를 맞춘다.
export const revalidate = 300;

/**
 * 최근 POPULAR_WINDOW_DAYS 일간 게임별 플레이 수.
 *
 * 원시 이벤트는 운영자만 읽을 수 있고(RLS), 순위만 돌려주는 SECURITY DEFINER
 * 함수에 anon 실행 권한을 줘서 허브가 집계 결과만 가져간다.
 * 집계가 실패해도 허브는 떠야 하므로 빈 결과로 폴백한다(= 출시일순 표시).
 */
async function fetchPlayCounts(): Promise<PlayCounts> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return {};

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.rpc("game_play_ranking", {
      days: POPULAR_WINDOW_DAYS,
    });
    if (error || !data) return {};

    const counts: PlayCounts = {};
    for (const row of data as { game_slug: string; plays: number }[]) {
      counts[row.game_slug] = Number(row.plays) || 0;
    }
    return counts;
  } catch {
    return {};
  }
}

export default async function GameHubPage() {
  const plays = await fetchPlayCounts();

  return (
    <>
      <GamesHubJsonLd
        games={GAMES.map((g) => ({
          name: g.title,
          path: `/game/${g.slug}`,
          description: g.desc,
        }))}
      />
      <ArcadeHub plays={plays} now={Date.now()} />
    </>
  );
}
