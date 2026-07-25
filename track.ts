"use client";

/**
 * 게임 이벤트 기록 (허브 정렬 · /admin 통계용).
 *
 * 브라우저에서 Supabase 를 직접 건드리지 않고 호스트의 `/api/game/events` 로만 보낸다.
 * 기록은 서버가 service role 로 수행하므로 익명 INSERT 권한을 열어둘 필요가 없다.
 *
 * 실패는 전부 삼킨다 — 통계 때문에 게임이 멈추면 안 된다.
 */

const VISITOR_KEY = "unclebgames:visitor";

/** 순방문자 추정용 익명 UUID. 개인 식별 정보를 담지 않는다. */
function visitorId(): string | null {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    // 시크릿 모드 등에서 localStorage 차단 — 익명 집계는 포기하고 이벤트만 보낸다.
    return null;
  }
}

function send(gameSlug: string, kind: "view" | "play") {
  try {
    const body = JSON.stringify({ gameSlug, kind, visitorId: visitorId() });

    // 페이지를 떠나는 중에도 유실되지 않도록 sendBeacon 우선.
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const ok = navigator.sendBeacon(
        "/api/game/events",
        new Blob([body], { type: "application/json" }),
      );
      if (ok) return;
    }

    void fetch("/api/game/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // 무시 — 통계 실패가 게임을 막지 않는다.
  }
}

/** 게임 페이지 진입. 같은 탭에서 중복 호출돼도 한 번만 보낸다. */
const viewed = new Set<string>();
export function trackView(gameSlug: string) {
  if (viewed.has(gameSlug)) return;
  viewed.add(gameSlug);
  send(gameSlug, "view");
}

/**
 * 실제 플레이 시작 (시작 버튼 클릭). 허브의 '많이 하는 순' 정렬 기준.
 *
 * view 와 마찬가지로 **페이지 로드당 한 번만** 센다. 한 판씩 셀 경우
 * 주사위처럼 연타하는 게임이 사다리처럼 한 번에 끝나는 게임을 압도해
 * '많이 하는 게임'이 '많이 누르는 게임'으로 왜곡되기 때문이다.
 * 덕분에 view 대비 play 비율이 그대로 이탈률이 된다.
 */
const played = new Set<string>();
export function trackPlay(gameSlug: string) {
  if (played.has(gameSlug)) return;
  played.add(gameSlug);
  send(gameSlug, "play");
}
