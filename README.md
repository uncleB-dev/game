# UncleB Games 🎮

엉클비스튜디오의 미니게임 모음 소스. **`game.unclebstudio.com`** 에서 서비스됩니다.

> ⚠️ **정본 URL은 서브도메인입니다.**
> 코드상 라우트는 호스트 앱의 `/game/*` 그대로지만, 호스트의 `middleware.ts` 가
> `game.` 서브도메인 요청을 `/game/*` 로 내부 rewrite 하고,
> `unclebstudio.com/game/*` 는 서브도메인으로 301 리다이렉트됩니다.
> 따라서 metadata·JSON-LD의 절대 URL은 반드시 `site.ts` 의 `gameUrl()` 을 거쳐야 합니다.

## 구조

이 레포는 [`unclebstudio`](https://github.com/uncleB-dev/unclebstudio) Next.js 앱의
**`app/game` 경로에 Git 서브모듈로 마운트**됩니다. 즉 이 레포의 root가 곧 `app/game/` 입니다.

```
page.tsx              → /game          (미니게임 허브)
game.module.css       → 게임 섹션 공용 스타일 (자체 완결형 테마)
ladder/page.tsx       → /game/ladder   (사다리 게임 라우트 + metadata)
ladder/LadderGame.tsx → 사다리 게임 본체 ("use client")
```

- Next.js 14+ App Router / TypeScript(strict) / framer-motion 기반.
- `next`, `react`, `framer-motion` 등 의존성은 호스트(`unclebstudio`)의 `node_modules`에서 해석됩니다.
- 모든 import는 상대경로 또는 패키지명만 사용 (호스트의 `@/` alias에 의존하지 않음).

## 게임 목록

| 게임 | 경로 | 설명 |
|------|------|------|
| 🪜 사다리 게임 | `/game/ladder` | 최대 10명 참가, 당첨 인원 자유 설정 |
| 🎡 빅휠 | `/game/wheel` | 화려한 네온 룰렛, 항목 자유 편집(2~12) |
| 🎲 주사위 던지기 | `/game/dice` | 3D 주사위 물리 굴림(1~6개), 흔들기 센서 |
| 🪵 윷놀이 | `/game/yut` | 윷가락 4개 물리, 도·개·걸·윷·모·빽도 판정 |
| ⚡ 스피드 터치 | `/game/touch` | 1~4명 화면 분할 동시 터치 대결 (10~60초) |
| 🎱 로또 추첨기 | `/game/lotto` | 에어젯 물리로 볼 섞고 추첨 (번호·개수 설정) |
| 🔮 복불복 핀볼 | `/game/pinball` | 구슬 물리 레이스 당첨자 추첨, 6맵 (원작 lazygyu/roulette MIT) |

표의 경로는 **코드상 라우트**입니다. 실제 서비스 URL은 `/game` 접두사를 뗀 `game.unclebstudio.com/ladder` 형태입니다.

### 공용 유틸
- **`games.ts` — 게임 목록 단일 원본.** 허브 카드·사이트맵·JSON-LD 가 전부 이걸 읽는다.
- `sort.ts` — 허브 정렬 규칙 (신규 고정 + 인기순/최신순)
- `track.ts` / `TrackView.tsx` — 조회·플레이 이벤트 기록 (`/api/game/events` 로 전송)
- `site.ts` — 정본 호스트(`game.unclebstudio.com`) + `gameUrl()` 절대 URL 헬퍼
- `sfx.ts` — Web Audio 오실레이터 합성 효과음 (음원 파일 없음)
- `useShake.ts` — 흔들기(DeviceMotion) 감지 훅 (iOS 권한 처리 포함)
- `Confetti.tsx` / `confetti.module.css` — 결과 연출용 컨페티

## 새 게임 추가 방법

1. `app/game/<slug>/page.tsx` 라우트 + 본체 컴포넌트 작성
2. **`games.ts` 의 `GAMES` 배열에 항목 추가** (`releaseDate` 필수 — 출시 후 30일간
   허브 맨 앞에 NEW 로 고정되는 기준이다). 허브 카드·사이트맵·JSON-LD 가 자동으로 따라온다.
3. metadata의 `openGraph.url` / `alternates.canonical` 은 `gameUrl("/game/<slug>")` 사용
   (하드코딩 금지 — 정본이 서브도메인이라 상대 canonical은 잘못된 호스트로 해석됨)
4. 조회 기록: page.tsx 에 `<TrackView slug="<slug>" />` 한 줄
5. 플레이 기록: 게임 시작 핸들러 첫 줄에 `trackPlay("<slug>")`
   (허브의 '많이 하는 순' 정렬 기준. 페이지 로드당 1회만 집계된다)
6. 공용 스타일은 `game.module.css` 재사용 (허브 전용 스타일은 `arcade.module.css`)

> 사이트맵은 더 이상 손으로 관리하지 않는다. 호스트 레포의 `app/sitemap-game.xml/route.ts`
> 가 `GAMES` 를 읽어 생성한다.

## 호스트 연동 (서브모듈)

`unclebstudio` 레포에서:

```bash
git submodule update --remote app/game   # 최신 게임 코드 반영
```

서브모듈 커밋을 갱신한 뒤 `unclebstudio` 를 배포하면 변경사항이 반영됩니다.
