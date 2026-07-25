/**
 * 검색엔진 최적화용 구조화 데이터(JSON-LD).
 * 각 게임 페이지(VideoGame)와 허브(CollectionPage+ItemList)에 삽입한다.
 */

import { GAME_SITE, gameUrl } from "./site";

const SITE = GAME_SITE;

export function GameJsonLd({
  name,
  description,
  path,
  genre,
}: {
  name: string;
  description: string;
  path: string;
  genre: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name,
    description,
    url: gameUrl(path),
    inLanguage: "ko",
    gamePlatform: ["Web Browser", "Mobile Web"],
    applicationCategory: "GameApplication",
    operatingSystem: "Any",
    isAccessibleForFree: true,
    genre,
    author: {
      "@type": "Organization",
      name: "UncleB Studio",
      url: "https://unclebstudio.com",
    },
    offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function GamesHubJsonLd({
  games,
}: {
  games: { name: string; path: string; description: string }[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "UncleB Games — 미니게임 모음",
    description:
      "설치·로그인 없이 브라우저에서 바로 즐기는 무료 미니게임 모음. 사다리타기, 룰렛, 3D 주사위, 윷놀이, 스피드 터치, 로또 추첨기.",
    url: SITE,
    inLanguage: "ko",
    isPartOf: { "@type": "WebSite", name: "UncleB Games", url: SITE },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: games.map((g, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: g.name,
        description: g.description,
        url: gameUrl(g.path),
      })),
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
