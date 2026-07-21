"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

/**
 * 흔들기(shake) 감지 훅 — DeviceMotion 가속도로 흔들림을 감지해 콜백 실행.
 * iOS 13+ 는 사용자 제스처 안에서 DeviceMotionEvent.requestPermission() 호출이 필요하다.
 * 데스크톱 등 미지원 환경에서는 버튼으로만 조작(센서는 자동 비활성).
 */

// iOS 전용 권한 API 타입 (표준 lib.dom 에는 없음)
type DeviceMotionEventiOS = {
  requestPermission?: () => Promise<"granted" | "denied">;
};

export function useShake(
  onShake: () => void,
  opts?: { threshold?: number; cooldownMs?: number },
) {
  const threshold = opts?.threshold ?? 16;
  const cooldownMs = opts?.cooldownMs ?? 900;

  const [enabled, setEnabled] = useState(false);

  // 센서 지원 여부 — SSR(false) / 클라이언트(실측) 를 useSyncExternalStore 로 안전 처리
  const supported = useSyncExternalStore(
    () => () => {},
    () => "DeviceMotionEvent" in window,
    () => false,
  );

  const onShakeRef = useRef(onShake);
  useEffect(() => {
    onShakeRef.current = onShake;
  });

  const lastFire = useRef(0);
  const lastMag = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      const mag = Math.sqrt(
        (acc.x ?? 0) ** 2 + (acc.y ?? 0) ** 2 + (acc.z ?? 0) ** 2,
      );
      const delta = Math.abs(mag - lastMag.current);
      lastMag.current = mag;
      const now = performance.now();
      if (delta > threshold && now - lastFire.current > cooldownMs) {
        lastFire.current = now;
        onShakeRef.current();
      }
    };
    window.addEventListener("devicemotion", handler);
    return () => window.removeEventListener("devicemotion", handler);
  }, [enabled, threshold, cooldownMs]);

  /** 센서 활성화 (필요 시 iOS 권한 요청). 성공하면 true. */
  const enable = useCallback(async () => {
    const DME = (
      typeof window !== "undefined" ? window.DeviceMotionEvent : undefined
    ) as unknown as DeviceMotionEventiOS | undefined;
    if (DME && typeof DME.requestPermission === "function") {
      try {
        const res = await DME.requestPermission();
        const ok = res === "granted";
        setEnabled(ok);
        return ok;
      } catch {
        return false;
      }
    }
    setEnabled(true);
    return true;
  }, []);

  return { enabled, supported, enable };
}
