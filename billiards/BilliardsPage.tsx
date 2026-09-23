"use client";

import Image from "next/image";
import g from "../game.module.css";
import s from "./billiards.module.css";
import { trackPlay } from "../track";
import { BILLIARDS_APK } from "./apk";

/**
 * 엉클비 당구 소개 + APK 내려받기.
 *
 * 다른 게임과 달리 브라우저에서 돌지 않는 안드로이드 전용 앱이라 이 페이지는
 * "설치 안내"가 본체다. 내려받기 클릭을 플레이로 센다(허브 인기순 기준).
 */

const FEATURES: [string, string][] = [
  ["실제 물리", "미끄럼→구름 전환, 사이드 스핀, 공끼리의 스로우, 쿠션 마찰로 스핀에 따라 반사각이 변합니다. 세게 친 공은 실제처럼 쿠션에서 되돌아옵니다."],
  ["당점 · 힘 · 두께", "당점(상하좌우 스핀)과 힘을 조절하고, 첫 목적구를 어느 쪽 얼마 두께로 맞히는지 숫자와 ×3 확대경으로 봅니다."],
  ["4구와 3구", "4구는 중대(2540×1270), 3구는 대대(2844×1422). 이닝·연속 득점·애버리지가 게임을 멈추지 않고 상단에 흐릅니다."],
  ["디자인 조합", "천 6색, 레일 6종, 공 5종(줄무늬는 굴러갈 때 실제로 돕니다), 큐 6종을 골라 조합합니다."],
  ["광고 · 권한 0", "인터넷 권한조차 없습니다. 광고도, 추적도, 로그인도 없이 혼자 계속 칩니다. 설치 파일 88 KB."],
  ["폴드 대응", "정사각에 가까운 화면(폴드 내부)에서는 조작부가 테이블 아래로 내려가고, 접으면 가로 배치로 바뀝니다."],
];

const SHOTS = [
  { src: "/game-shots/billiards-1.webp", w: 1400, h: 646, cap: "3구 · 조준선 · 두께 · 확대경 · 미세 조준 눈금" },
  { src: "/game-shots/billiards-2.webp", w: 1400, h: 600, cap: "토너먼트 블루 천 · 흑단 레일 · 줄무늬 공 · 스네이크우드 큐" },
  { src: "/game-shots/billiards-3.webp", w: 1400, h: 600, cap: "설정 > 디자인 탭 — 천·레일·공·큐 견본" },
];

export default function BilliardsPage() {
  return (
    <>
      <section className={`${g.panel} ${s.download}`} id="download">
        <div>
          <p className={s.dlTitle}>안드로이드 설치 파일 (APK)</p>
          <p className={s.dlMeta}>
            v{BILLIARDS_APK.version} · {BILLIARDS_APK.size} · {BILLIARDS_APK.date} · Android {BILLIARDS_APK.minAndroid} 이상
          </p>
          <p className={s.dlNote}>구글 플레이 등록 전이라 설치 파일로 배포합니다. 아이폰은 지원하지 않습니다.</p>
        </div>
        <a
          href={BILLIARDS_APK.url}
          download
          className={g.btnPrimary}
          onClick={() => trackPlay("billiards")}
        >
          ▸ APK 내려받기
        </a>
      </section>

      <div className={g.howto}>
        <p className={g.howtoTitle}>설치 순서</p>
        <ol className={g.howtoList}>
          <li>폰 브라우저에서 <b>APK 내려받기</b> → 알림이나 파일 앱에서 파일 열기</li>
          <li>&quot;출처를 알 수 없는 앱&quot; 허용 (이 브라우저에 한 번만 묻습니다)</li>
          <li>설치 → <b>엉클비 당구</b> 실행. 가로 화면으로 켜집니다</li>
        </ol>
        <p className={s.sha}>SHA-256 {BILLIARDS_APK.sha256}</p>
      </div>

      <hr className={g.divider} />

      <p className={g.sectionLabel}><span>어떻게 치나</span></p>
      <ul className={s.controls}>
        <li><b>조준</b> 테이블을 끌면 큐가 돕니다. 천천히 끌수록 정밀하고, 공을 짧게 탭하면 그 공 정면을 바로 조준합니다.</li>
        <li><b>미세 조준</b> 눈금 띠를 끌면 1dp당 0.02°, 양 끝 버튼은 0.05°씩. 두께가 정면·3/4·1/2·1/4·끝으로 표시됩니다.</li>
        <li><b>당점</b> 왼쪽 흰 원의 위치가 상하좌우 스핀입니다. 끌어치기·밀어치기·옆돌리기가 그대로 됩니다.</li>
        <li><b>발사</b> 오른쪽 바를 아래로 끌었다 놓으면 나갑니다. 위로 되돌리고 놓으면 취소.</li>
        <li><b>연습 배치</b> 공을 길게 누르면 원하는 자리로 옮길 수 있고, 무르기로 한 샷을 되돌립니다.</li>
      </ul>

      <hr className={g.divider} />

      <p className={g.sectionLabel}><span>들어 있는 것</span></p>
      <ul className={s.features}>
        {FEATURES.map(([t, d]) => (
          <li key={t}>
            <b>{t}</b>
            <span>{d}</span>
          </li>
        ))}
      </ul>

      <hr className={g.divider} />

      <div className={s.shots}>
        {SHOTS.map((sh) => (
          <figure key={sh.src}>
            <Image src={sh.src} width={sh.w} height={sh.h} alt={sh.cap} sizes="(min-width: 900px) 860px, 100vw" />
            <figcaption>{sh.cap}</figcaption>
          </figure>
        ))}
      </div>

      <p className={g.hint}>
        공과 테이블은 실제 비율(공 61.5 mm)입니다. 위에서 내려다보면 공이 작아 보이는 게 맞고, 두께는 확대경으로 봅니다.
      </p>
    </>
  );
}
