/**
 * 게임 서비스의 정본 호스트.
 *
 * 게임은 `game.unclebstudio.com` 을 정본 URL로 쓴다.
 * 다만 코드상 라우트는 호스트 앱(`unclebstudio`)의 `app/game/*` 그대로이고,
 * 미들웨어가 `game.` 서브도메인 요청을 `/game/*` 로 내부 rewrite 한다.
 *
 * 따라서 metadata·JSON-LD 에 넣는 절대 URL을 만들 때는 라우트 경로에서
 * `/game` 접두사를 떼고 이 호스트를 붙여야 한다. (`/game/touch` → `https://game.unclebstudio.com/touch`)
 */

export const GAME_SITE = "https://game.unclebstudio.com";

/** 라우트 경로(`/game/...`)를 게임 서브도메인 절대 URL로 변환한다. */
export function gameUrl(routePath: string): string {
  const stripped = routePath.replace(/^\/game/, "");
  return stripped === "" || stripped === "/" ? GAME_SITE : `${GAME_SITE}${stripped}`;
}

/** OG 이미지 등 정적 에셋의 절대 URL (public/ 은 두 호스트가 공유한다). */
export const GAME_OG_IMAGE = `${GAME_SITE}/logo/logo-full.png`;
