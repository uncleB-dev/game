"use client";

import { useEffect, useRef, useState } from "react";
import cp from "./coupang.module.css";

/**
 * 쿠팡 파트너스 다이나믹 배너 (위젯 id 1020128 / 트래킹 코드 AF7023054).
 *
 * - 위젯은 % 너비를 주면 아무것도 그리지 않으므로 발급 코드 원형(680×140)으로
 *   그린 뒤 컨테이너 폭에 맞춰 transform: scale 로 통째로 축소한다 (auto_sign_b 와 동일 방식).
 * - 위젯 스크립트가 document.write 를 쓰므로 React 트리에 직접 넣지 못한다 → iframe(srcDoc) 격리.
 * - 대가성 고지 문구는 파트너스 운영정책상 필수. 빼지 말 것.
 */

const BANNER_W = 680;
const BANNER_H = 140;

const AD_DOC = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body>
<div style="display:flex;justify-content:center;overflow:hidden;">
  <div id="band" style="width:${BANNER_W}px;flex:0 0 ${BANNER_W}px;">
    <script src="https://ads-partners.coupang.com/g.js"></script>
    <script>new PartnersCoupang.G({"id":1020128,"template":"carousel","trackingCode":"AF7023054","width":"${BANNER_W}","height":"${BANNER_H}","tsource":""});</script>
  </div>
</div>
<script>(function(){var b=document.getElementById("band");function f(){var s=Math.min(1,(window.innerWidth||${BANNER_W})/${BANNER_W});b.style.transform="scale("+s+")";b.style.transformOrigin="top center";}window.addEventListener("resize",f);f();})();</script>
</body></html>`;

export default function CoupangBanner() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [frameH, setFrameH] = useState(BANNER_H);

  // iframe 내부가 scale 로 줄어들면 박스 높이도 같은 비율로 줄여 빈 여백을 없앤다.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => {
      const scale = Math.min(1, el.clientWidth / BANNER_W);
      setFrameH(Math.ceil(BANNER_H * scale));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className={cp.wrap}>
      <iframe
        srcDoc={AD_DOC}
        title="쿠팡 파트너스 광고"
        className={cp.frame}
        style={{ height: frameH }}
        scrolling="no"
        loading="lazy"
      />
      <p className={cp.caption}>
        이 서비스는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
      </p>
    </div>
  );
}
