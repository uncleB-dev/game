"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import * as CANNON from "cannon-es";
import styles from "../game.module.css";
import lt from "./lotto.module.css";
import Confetti from "../Confetti";
import { trackPlay } from "../track";

/**
 * 로또 번호 추첨기 — three.js + cannon-es.
 * 투명 구형 드럼 안에 번호볼(1~N)이 들어있고, 시작하면 바닥 에어젯(상승 기류)이
 * 볼들을 실제 로또처럼 뒤섞는다. 뽑기 버튼을 누를 때마다 볼 1개가 선택되어
 * 드럼 아래 배출구를 지나 트레이로 날아온다. 설정: 최대 번호(10~45)·뽑을 개수(1~10).
 */

const R = 3.2; // 드럼(구) 반지름
const BR = 0.42; // 볼 반지름
const SPHERE_C = new THREE.Vector3(0, 0.9, 0); // 드럼 중심(월드)
const MIN_NUM = 10;
const MAX_NUM = 45;
const MIN_PICK = 1;
const MAX_PICK = 10;

// 한국 로또 볼 색상 (1-10 노랑 / 11-20 파랑 / 21-30 빨강 / 31-40 회색 / 41-45 초록)
const BALL_COLORS = ["#f4c542", "#4f8fdd", "#e25b5b", "#8b8f9a", "#54b87f"];
const colorOf = (n: number) => BALL_COLORS[Math.min(4, Math.floor((n - 1) / 10))];

/** 볼 텍스처 — 데케이드 색 바탕 + 흰 원 안에 번호 (양쪽 반구) */
function makeBallTexture(n: number): THREE.CanvasTexture {
  const w = 256;
  const h = 128;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = colorOf(n);
  g.fillRect(0, 0, w, h);
  // 은은한 패턴 줄무늬
  g.strokeStyle = "rgba(0,0,0,0.10)";
  g.lineWidth = 5;
  for (let x = 0; x <= w; x += 32) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x - 14, h);
    g.stroke();
  }
  for (const cx of [w * 0.25, w * 0.75]) {
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.ellipse(cx, h / 2, 30, 30, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#161a2c";
    g.font = "900 34px system-ui, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(String(n), cx, h / 2 + 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

type Phase = "idle" | "mix" | "done";
type LottoApi = {
  startMix: () => void;
  pick: () => void;
  setAuto: (on: boolean) => void;
};

export default function LottoGame() {
  const [maxNum, setMaxNum] = useState(45);
  const [pickCount, setPickCount] = useState(6);
  const [phase, setPhase] = useState<Phase>("idle");
  const [picked, setPicked] = useState<number[]>([]);
  const [auto, setAutoState] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [sceneKey, setSceneKey] = useState(0);

  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<LottoApi | null>(null);
  const maxNumRef = useRef(maxNum);
  const pickCountRef = useRef(pickCount);
  const phaseRef = useRef<Phase>("idle");

  // 엔진 → 컴포넌트 콜백 (최신 참조 유지)
  const onPickRef = useRef<(n: number, done: boolean) => void>(() => {});
  useEffect(() => {
    onPickRef.current = (n: number, done: boolean) => {
      setPicked((p) => [...p, n]);
      if (done) {
        phaseRef.current = "done";
        setPhase("done");
        setAutoState(false);
        window.setTimeout(() => setShowResult(true), 650);
      }
    };
  });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const cw = mount.clientWidth || 640;
    const ch = mount.clientHeight || 460;
    const aspect = cw / ch;
    const N = maxNumRef.current;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(cw, ch, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0e1330");

    // 카메라 — 정면에서 드럼 + 아래 트레이가 모두 보이게 거리 계산
    const fov = 45;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(fov / 2));
    const camZ = Math.max(
      (R * 1.35 + 0.5) / (tanHalf * aspect),
      (R + 2.45) / tanHalf,
    ) + R;
    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100);
    camera.position.set(0, SPHERE_C.y - 0.4, camZ);
    camera.lookAt(0, SPHERE_C.y - 1.1, 0);

    // 조명
    scene.add(new THREE.HemisphereLight(0xffffff, 0x2a3055, 1.0));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(4, 8, 6);
    scene.add(key);
    const fill = new THREE.PointLight(0x9fd0ff, 20, 30);
    fill.position.set(-5, 2, 6);
    scene.add(fill);

    // 유리 드럼 (뒷면 + 앞면 셸) & 금속 림
    const glassGeo = new THREE.SphereGeometry(R, 48, 32);
    const glassBack = new THREE.Mesh(
      glassGeo,
      new THREE.MeshPhysicalMaterial({
        color: 0x8fb4e8,
        transparent: true,
        opacity: 0.08,
        roughness: 0.1,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    );
    glassBack.position.copy(SPHERE_C);
    scene.add(glassBack);
    const glassFront = new THREE.Mesh(
      glassGeo,
      new THREE.MeshPhysicalMaterial({
        color: 0xbfd6ff,
        transparent: true,
        opacity: 0.13,
        roughness: 0.05,
        metalness: 0,
        side: THREE.FrontSide,
        depthWrite: false,
      }),
    );
    glassFront.position.copy(SPHERE_C);
    glassFront.renderOrder = 5; // 볼 위에 유리 하이라이트
    scene.add(glassFront);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(R + 0.06, 0.1, 16, 72),
      new THREE.MeshStandardMaterial({ color: 0xcdd7e8, metalness: 0.8, roughness: 0.3 }),
    );
    rim.position.copy(SPHERE_C);
    scene.add(rim);

    // 에어젯 시각 효과 (섞는 동안만 표시)
    const jetMat = new THREE.MeshBasicMaterial({
      color: 0x9fd0ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const jet = new THREE.Mesh(new THREE.ConeGeometry(1.0, 2.0, 24, 1, true), jetMat);
    jet.position.set(SPHERE_C.x, SPHERE_C.y - R + 1.0, SPHERE_C.z);
    scene.add(jet);

    // ── 물리 ──
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -13, 0) });
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.defaultContactMaterial.restitution = 0.72;
    world.defaultContactMaterial.friction = 0.12;

    // ── 볼 생성 ──
    const ballGeo = new THREE.SphereGeometry(BR, 24, 18);
    const textures: THREE.CanvasTexture[] = [];
    const meshes: THREE.Mesh[] = [];
    const bodies: CANNON.Body[] = [];
    const active: boolean[] = [];
    for (let i = 0; i < N; i++) {
      const tex = makeBallTexture(i + 1);
      textures.push(tex);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.32,
        metalness: 0.04,
      });
      const mesh = new THREE.Mesh(ballGeo, mat);
      scene.add(mesh);
      meshes.push(mesh);

      const body = new CANNON.Body({
        mass: 0.25,
        shape: new CANNON.Sphere(BR),
        linearDamping: 0.12,
        angularDamping: 0.2,
        allowSleep: false,
      });
      // 드럼 바닥에 쌓아 배치
      const a = (i / N) * Math.PI * 2;
      const rr = Math.sqrt(Math.random()) * (R - BR - 0.3) * 0.75;
      body.position.set(
        SPHERE_C.x + Math.cos(a) * rr,
        SPHERE_C.y - rand(0.4, R - BR - 0.2),
        SPHERE_C.z + Math.sin(a) * rr * 0.8,
      );
      world.addBody(body);
      bodies.push(body);
      active.push(true);
    }

    // ── 엔진 상태 ──
    let mixing = false;
    let autoOn = false;
    let lastPickAt = 0;
    let pickedCount = 0;
    let pickTarget = 6;
    let pickAnim: {
      idx: number;
      from: THREE.Vector3;
      mid: THREE.Vector3;
      to: THREE.Vector3;
      fromQ: THREE.Quaternion;
      toQ: THREE.Quaternion;
      t: number;
    } | null = null;
    const lookHelper = new THREE.Object3D();

    const traySlot = (i: number) => {
      const gap = Math.min(1.05, (2 * R + 1.2) / Math.max(pickTarget, 1));
      const x = (i - (pickTarget - 1) / 2) * gap;
      return new THREE.Vector3(x, SPHERE_C.y - R - 0.95, 1.6);
    };

    const doPick = () => {
      if (!mixing || pickAnim || pickedCount >= pickTarget) return;
      const remain: number[] = [];
      for (let i = 0; i < N; i++) if (active[i]) remain.push(i);
      if (remain.length === 0) return;
      const idx = remain[Math.floor(Math.random() * remain.length)];
      active[idx] = false;
      world.removeBody(bodies[idx]);
      const from = meshes[idx].position.clone();
      const to = traySlot(pickedCount);
      // 트레이에서 번호(텍스처 u=0.25, 로컬 +z)가 카메라를 정확히 향하도록 목표 회전 계산
      lookHelper.position.copy(to);
      lookHelper.lookAt(camera.position);
      pickAnim = {
        idx,
        from,
        mid: new THREE.Vector3(SPHERE_C.x, SPHERE_C.y - R + 0.3, 1.0),
        to,
        fromQ: meshes[idx].quaternion.clone(),
        toQ: lookHelper.quaternion.clone(),
        t: 0,
      };
      const mat = meshes[idx].material as THREE.MeshStandardMaterial;
      mat.emissive = new THREE.Color(0xffffff);
      mat.emissiveIntensity = 0.35;
      lastPickAt = performance.now();
    };

    const startMix = () => {
      if (mixing) return;
      pickTarget = pickCountRef.current;
      mixing = true;
      // 첫 점화 — 볼들을 위로 확 띄운다
      for (let i = 0; i < N; i++) {
        if (!active[i]) continue;
        bodies[i].velocity.set(rand(-5, 5), rand(7, 13), rand(-5, 5));
        bodies[i].angularVelocity.set(rand(-16, 16), rand(-16, 16), rand(-16, 16));
      }
    };

    apiRef.current = {
      startMix,
      pick: doPick,
      setAuto: (on: boolean) => {
        autoOn = on;
      },
    };

    // ── 루프 ──
    const tmpV = new THREE.Vector3();
    let raf = 0;
    let last = performance.now();
    let disposed = false;

    const tick = (now: number) => {
      if (disposed) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // 에어젯 — 바닥 중앙 상승 기류 + 난류 (실제 로또 방식)
      if (mixing) {
        for (let i = 0; i < N; i++) {
          if (!active[i]) continue;
          const b = bodies[i];
          const lx = b.position.x - SPHERE_C.x;
          const ly = b.position.y - SPHERE_C.y;
          const lz = b.position.z - SPHERE_C.z;
          const horiz = Math.hypot(lx, lz);
          if (ly < 0.4 && horiz < R * 0.5) {
            // 중앙 기류: 강한 상승 + 약간의 소용돌이
            b.applyForce(
              new CANNON.Vec3(rand(-4, 4) - lz * 2.0, rand(15, 21), rand(-4, 4) + lx * 2.0),
              b.position,
            );
          } else {
            // 전역 난류
            b.applyForce(new CANNON.Vec3(rand(-2.2, 2.2), rand(-0.5, 1.8), rand(-2.2, 2.2)), b.position);
          }
        }
        jetMat.opacity = 0.1 + 0.07 * Math.sin(now * 0.02);
      } else {
        jetMat.opacity = Math.max(0, jetMat.opacity - dt * 0.5);
      }

      world.step(1 / 60, dt, 5);

      // 구면 벽 충돌 (드럼 안쪽) + 속도 상한
      const maxV = 17;
      const lim = R - BR - 0.02;
      for (let i = 0; i < N; i++) {
        if (!active[i]) continue;
        const b = bodies[i];
        const v = b.velocity;
        const sp = v.length();
        if (sp > maxV) v.scale(maxV / sp, v);
        const dx = b.position.x - SPHERE_C.x;
        const dy = b.position.y - SPHERE_C.y;
        const dz = b.position.z - SPHERE_C.z;
        const d = Math.hypot(dx, dy, dz);
        if (d > lim && d > 0.0001) {
          const nx = dx / d;
          const ny = dy / d;
          const nz = dz / d;
          b.position.set(
            SPHERE_C.x + nx * lim,
            SPHERE_C.y + ny * lim,
            SPHERE_C.z + nz * lim,
          );
          const vn = v.x * nx + v.y * ny + v.z * nz;
          if (vn > 0) {
            const e = 1.55; // (1 + 반발)
            v.x -= e * vn * nx;
            v.y -= e * vn * ny;
            v.z -= e * vn * nz;
          }
        }
      }

      // 메시 동기화
      for (let i = 0; i < N; i++) {
        if (!active[i]) continue;
        const b = bodies[i];
        meshes[i].position.set(b.position.x, b.position.y, b.position.z);
        meshes[i].quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
      }

      // 뽑기 애니메이션 — 배출구(드럼 하단)를 지나 트레이로
      if (pickAnim) {
        pickAnim.t = Math.min(1, pickAnim.t + dt / 0.8);
        const t = pickAnim.t;
        const e = 1 - Math.pow(1 - t, 3); // easeOutCubic
        const m = meshes[pickAnim.idx];
        // 2차 베지어 (from → mid(배출구) → to(트레이))
        const a1 = tmpV.copy(pickAnim.from).lerp(pickAnim.mid, e);
        const a2 = pickAnim.mid.clone().lerp(pickAnim.to, e);
        m.position.copy(a1.lerp(a2, e));
        // 날아가며 숫자면이 카메라를 향하도록 회전 보간
        m.quaternion.slerpQuaternions(pickAnim.fromQ, pickAnim.toQ, e);
        const s = 1 + 0.2 * e;
        m.scale.set(s, s, s);
        if (t >= 1) {
          m.position.copy(pickAnim.to);
          m.quaternion.copy(pickAnim.toQ);
          // 선택 하이라이트 발광 해제 — 트레이에선 원래 볼 색으로
          (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
          const num = pickAnim.idx + 1;
          pickedCount++;
          const done = pickedCount >= pickTarget;
          if (done) mixing = false;
          pickAnim = null;
          onPickRef.current(num, done);
        }
      }

      // 자동 뽑기
      if (autoOn && mixing && !pickAnim && now - lastPickAt > 1050) {
        doPick();
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    let lastW = cw;
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const nw = mount.clientWidth || cw;
        if (Math.abs(nw - lastW) > 48) {
          lastW = nw;
          setSceneKey((k) => k + 1);
        }
      }, 300);
    };
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      apiRef.current = null;
      ballGeo.dispose();
      glassGeo.dispose();
      for (const t of textures) t.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry?.dispose();
          if (Array.isArray(o.material)) o.material.forEach((mm) => mm.dispose());
          else o.material?.dispose();
        }
      });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [sceneKey]);

  // 설정 변경(개수/최대번호)·리셋은 씬 재구축으로 처리
  const resetAll = () => {
    phaseRef.current = "idle";
    setPhase("idle");
    setPicked([]);
    setAutoState(false);
    setShowResult(false);
    setSceneKey((k) => k + 1);
  };

  const changeMax = (next: number) => {
    if (phase !== "idle") return;
    const v = Math.min(MAX_NUM, Math.max(MIN_NUM, next));
    maxNumRef.current = v;
    setMaxNum(v);
    setPickCount((p) => {
      const np = Math.min(p, v);
      pickCountRef.current = np;
      return np;
    });
    setSceneKey((k) => k + 1);
  };

  const changePick = (next: number) => {
    if (phase !== "idle") return;
    const v = Math.min(Math.min(MAX_PICK, maxNum), Math.max(MIN_PICK, next));
    pickCountRef.current = v;
    setPickCount(v);
  };

  const begin = () => {
    trackPlay("lotto");
    phaseRef.current = "mix";
    setPhase("mix");
    setPicked([]);
    setShowResult(false);
    apiRef.current?.startMix();
  };

  const toggleAuto = () => {
    const next = !auto;
    setAutoState(next);
    apiRef.current?.setAuto(next);
  };

  const toggleFs = () => {
    setExpanded((v) => !v);
    setSceneKey((k) => k + 1);
  };
  useEffect(() => {
    document.body.style.overflow = expanded ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [expanded]);

  const sorted = picked.slice().sort((a, b) => a - b);

  return (
    <div className={styles.panel}>
      {/* 설정 */}
      <div className={lt.settingRow}>
        <div>
          <p className={styles.sectionLabel}>
            🎱 최대 번호 <span>1~{maxNum}</span>
          </p>
          <div className={styles.stepper}>
            <button
              className={styles.stepBtn}
              onClick={() => changeMax(maxNum - 5)}
              disabled={maxNum <= MIN_NUM || phase !== "idle"}
              aria-label="최대 번호 줄이기"
            >
              −
            </button>
            <span className={styles.stepValue}>{maxNum}</span>
            <button
              className={styles.stepBtn}
              onClick={() => changeMax(maxNum + 5)}
              disabled={maxNum >= MAX_NUM || phase !== "idle"}
              aria-label="최대 번호 늘리기"
            >
              +
            </button>
          </div>
        </div>
        <div>
          <p className={styles.sectionLabel}>
            🎯 뽑을 개수 <span>{pickCount}개</span>
          </p>
          <div className={styles.stepper}>
            <button
              className={styles.stepBtn}
              onClick={() => changePick(pickCount - 1)}
              disabled={pickCount <= MIN_PICK || phase !== "idle"}
              aria-label="뽑을 개수 줄이기"
            >
              −
            </button>
            <span className={styles.stepValue}>{pickCount}</span>
            <button
              className={styles.stepBtn}
              onClick={() => changePick(pickCount + 1)}
              disabled={pickCount >= Math.min(MAX_PICK, maxNum) || phase !== "idle"}
              aria-label="뽑을 개수 늘리기"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* 드럼 */}
      <div className={`${lt.arenaWrap} ${expanded ? lt.arenaFull : ""}`}>
        <div className={lt.arena} ref={mountRef} />
        <button
          className={lt.fsBtn}
          onClick={toggleFs}
          aria-label={expanded ? "전체화면 닫기" : "전체화면"}
        >
          {expanded ? "✕" : "⛶"}
        </button>
        {expanded && (
          <div className={lt.fsControls}>
            {phase === "idle" && (
              <button className={lt.mixBtn} style={{ flex: "0 0 auto", minWidth: 170 }} onClick={begin}>
                🌀 섞기 시작
              </button>
            )}
            {phase === "mix" && (
              <>
                <button className={lt.pickBtn} style={{ flex: "0 0 auto", minWidth: 150 }} onClick={() => apiRef.current?.pick()}>
                  🎱 뽑기 ({picked.length}/{pickCount})
                </button>
                <button
                  className={`${lt.autoBtn} ${auto ? lt.autoOn : ""}`}
                  onClick={toggleAuto}
                >
                  {auto ? "⏸ 자동 중" : "⏩ 자동"}
                </button>
              </>
            )}
            {phase === "done" && (
              <button className={lt.mixBtn} style={{ flex: "0 0 auto", minWidth: 170 }} onClick={resetAll}>
                🔄 다시 뽑기
              </button>
            )}
          </div>
        )}
      </div>

      {/* 뽑힌 번호 (추첨 순) */}
      {picked.length > 0 && (
        <div className={lt.drawRow}>
          {picked.map((n, i) => (
            <span
              key={i}
              className={lt.ballChip}
              style={{ ["--bc" as string]: colorOf(n) }}
            >
              {n}
            </span>
          ))}
          {Array.from({ length: pickCount - picked.length }, (_, i) => (
            <span key={`e-${i}`} className={`${lt.ballChip} ${lt.ballChipEmpty}`}>
              ?
            </span>
          ))}
        </div>
      )}

      {/* 컨트롤 */}
      <div className={lt.controls}>
        {phase === "idle" && (
          <button className={lt.mixBtn} onClick={begin}>
            🌀 섞기 시작!
          </button>
        )}
        {phase === "mix" && (
          <>
            <button className={lt.pickBtn} onClick={() => apiRef.current?.pick()}>
              🎱 볼 뽑기 ({picked.length}/{pickCount})
            </button>
            <button className={`${lt.autoBtn} ${auto ? lt.autoOn : ""}`} onClick={toggleAuto}>
              {auto ? "⏸ 자동 중…" : "⏩ 자동 뽑기"}
            </button>
          </>
        )}
        {phase === "done" && (
          <button className={lt.mixBtn} onClick={resetAll}>
            🔄 다시 뽑기
          </button>
        )}
      </div>

      <p className={lt.hintRow}>
        {phase === "idle"
          ? "섞기를 시작하면 에어젯 바람으로 볼들이 뒤섞여요 🌀"
          : phase === "mix"
            ? "뽑기 버튼을 누를 때마다 볼이 1개씩 선택돼요!"
            : "추첨 완료! 결과를 확인하세요 🎉"}
      </p>

      {/* 결과 오버레이 */}
      {showResult && (
        <div className={lt.resultOverlay} onClick={() => setShowResult(false)}>
          <Confetti count={90} />
          <div className={lt.resultCard} onClick={(e) => e.stopPropagation()}>
            <p className={lt.resultEyebrow}>🎉 당첨 번호 🎉</p>
            <div className={lt.resultBalls}>
              {sorted.map((n, i) => (
                <span
                  key={n}
                  className={lt.resultBall}
                  style={{ ["--bc" as string]: colorOf(n), animationDelay: `${i * 0.1}s` }}
                >
                  {n}
                </span>
              ))}
            </div>
            <p className={lt.resultOrder}>추첨순: {picked.join(" → ")}</p>
            <div className={lt.resultBtns}>
              <button
                className={styles.btnPrimary}
                style={{ minWidth: 140 }}
                onClick={resetAll}
              >
                다시 뽑기 🎱
              </button>
              <button className={styles.btnGhost} onClick={() => setShowResult(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
