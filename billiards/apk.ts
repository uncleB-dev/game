/**
 * 안드로이드 APK 배포 정보 — 새 버전을 올릴 때 이 객체만 고친다.
 *
 * 절차: `07_releases/billiards-android/billiards-<ver>.apk` 를 호스트의 `public/dl/` 로 복사하고
 * (서브모듈엔 정적 파일을 둘 수 없다) url·version·size·date·sha256 을 함께 갱신한다.
 * sha256 은 `sha256sum <apk>` 값. 이전 버전 파일은 지워도 된다.
 */
export const BILLIARDS_APK = {
  url: "/dl/billiards-1.2.0.apk",
  version: "1.2.0",
  size: "88 KB",
  date: "2026-09-23",
  sha256: "eced20eab8cbec57d7eca7b79c8a1ab553263bc972b78f23bc2ac48eae284697",
  minAndroid: "8.0",
} as const;
