"use client";

import { useEffect } from "react";
import { trackView } from "./track";

/**
 * 게임 페이지 조회 기록. 서버 컴포넌트인 각 게임 page.tsx 에 한 줄로 꽂는다.
 * 화면에 아무것도 그리지 않는다.
 */
export default function TrackView({ slug }: { slug: string }) {
  useEffect(() => {
    trackView(slug);
  }, [slug]);
  return null;
}
