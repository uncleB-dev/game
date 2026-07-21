# UncleB Games 🎮

엉클비스튜디오의 미니게임 모음 소스. `unclebstudio.com/game` 에서 서비스됩니다.

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

### 공용 유틸
- `useShake.ts` — 흔들기(DeviceMotion) 감지 훅 (iOS 권한 처리 포함)
- `Confetti.tsx` / `confetti.module.css` — 결과 연출용 컨페티

## 새 게임 추가 방법

1. `app/game/<game-name>/page.tsx` 라우트 + 본체 컴포넌트 작성
2. `page.tsx`(허브)의 `GAMES` 배열에 카드 추가
3. 공용 스타일은 `game.module.css` 재사용

## 호스트 연동 (서브모듈)

`unclebstudio` 레포에서:

```bash
git submodule update --remote app/game   # 최신 게임 코드 반영
```

서브모듈 커밋을 갱신한 뒤 `unclebstudio` 를 배포하면 변경사항이 반영됩니다.
