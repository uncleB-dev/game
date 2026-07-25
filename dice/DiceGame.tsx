"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import * as CANNON from "cannon-es";
import styles from "../game.module.css";
import dice from "./dice.module.css";
import Confetti from "../Confetti";
import { useShake } from "../useShake";
import { trackPlay } from "../track";

/**
 * 주사위 던지기 — three.js(렌더) + cannon-es(강체 물리) 실제 3D 시뮬레이션.
 * "폰 = 상자" 컨셉: 화면 크기의 3D 상자(바닥+벽4+천장) 안에 주사위가 들어있고,
 * 버튼을 누르거나 폰을 흔들면 상자째 흔든 것처럼 충격을 받아 튕겨다닌다.
 * 결과는 조작 없이, 물리적으로 멈춘 뒤 위를 향한 면을 읽어 판정한다.
 */

const MIN = 1;
const MAX = 6;
const DIE = 1.2; // 주사위 한 변 (월드 단위) — 카메라 상향 보정 포함, 화면상 기존 대비 20% 축소
const DEPTH = 7.6; // 상자 세로(화면 높이 방향) 월드 크기
const CEIL_Y = 10.5; // 천장 높이 (높은 낙하 수용)
const SAFE_H = 3.4; // 이 높이까지는 어떤 주사위도 화면 밖으로 안 나가게 카메라 프러스텀을 맞춤
const DROP_MIN = 6.5; // 낙하 시작 높이 (기존 1.6~3.2 의 약 3배)
const DROP_MAX = 8.5;

// BoxGeometry 머티리얼 그룹 순서(+x,-x,+y,-y,+z,-z)에 대응하는 눈금 (마주보는 면 합=7)
const FACE_VALUES = [1, 6, 2, 5, 3, 4] as const;
const AXIS_OF: Record<number, [number, number, number]> = {
  1: [1, 0, 0],
  6: [-1, 0, 0],
  2: [0, 1, 0],
  5: [0, -1, 0],
  3: [0, 0, 1],
  4: [0, 0, -1],
};

// 결과 카드 미니 주사위용 (3×3 그리드 인덱스)
const PIP_MAP: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function MiniPips({ v }: { v: number }) {
  const on = PIP_MAP[v];
  return (
    <>
      {Array.from({ length: 9 }, (_, c) => (
        <span key={c} className={on.includes(c) ? dice.miniPip : dice.pipEmpty} />
      ))}
    </>
  );
}

/** 면 텍스처 — 아이보리 바탕 + 눈금(1은 빨강) */
function makeFaceTexture(v: number): THREE.CanvasTexture {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, s, s);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(1, "#e8ecf5");
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  const P: Record<number, [number, number][]> = {
    1: [[0.5, 0.5]],
    2: [[0.3, 0.3], [0.7, 0.7]],
    3: [[0.27, 0.27], [0.5, 0.5], [0.73, 0.73]],
    4: [[0.31, 0.31], [0.69, 0.31], [0.31, 0.69], [0.69, 0.69]],
    5: [[0.29, 0.29], [0.71, 0.29], [0.5, 0.5], [0.29, 0.71], [0.71, 0.71]],
    6: [[0.32, 0.27], [0.68, 0.27], [0.32, 0.5], [0.68, 0.5], [0.32, 0.73], [0.68, 0.73]],
  };
  const r = v === 1 ? s * 0.115 : s * 0.072;
  for (const [x, y] of P[v]) {
    const cx = x * s;
    const cy = y * s;
    const rg = g.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.15, cx, cy, r);
    if (v === 1) {
      rg.addColorStop(0, "#ff7b6b");
      rg.addColorStop(1, "#c0392b");
    } else {
      rg.addColorStop(0, "#39415c");
      rg.addColorStop(1, "#10142a");
    }
    g.fillStyle = rg;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** 바닥 텍스처 — 다크 네이비 + 은은한 그리드 */
function makeFloorTexture(): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  g.fillStyle = "#141a33";
  g.fillRect(0, 0, s, s);
  g.strokeStyle = "rgba(124,137,255,0.13)";
  g.lineWidth = 2;
  const step = s / 8;
  for (let i = 0; i <= 8; i++) {
    g.beginPath();
    g.moveTo(i * step, 0);
    g.lineTo(i * step, s);
    g.stroke();
    g.beginPath();
    g.moveTo(0, i * step);
    g.lineTo(s, i * step);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** 멈춘 주사위의 위 방향 면 읽기 */
function topValueOf(q: THREE.Quaternion): { v: number; dot: number } {
  let best = -2;
  let bv = 1;
  const dir = new THREE.Vector3();
  for (const v of [1, 2, 3, 4, 5, 6]) {
    const [x, y, z] = AXIS_OF[v];
    dir.set(x, y, z).applyQuaternion(q);
    if (dir.y > best) {
      best = dir.y;
      bv = v;
    }
  }
  return { v: bv, dot: best };
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

type DiceApi = {
  rebuildDice: (n: number) => void;
  roll: () => void;
  shakeKick: () => void;
};

export default function DiceGame() {
  const [count, setCount] = useState(2);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<number[] | null>(null);
  const [sceneKey, setSceneKey] = useState(0);
  const [expanded, setExpanded] = useState(false); // 전체화면(모바일 몰입) 모드

  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<DiceApi | null>(null);
  const countRef = useRef(count);
  const rollingRef = useRef(false);

  // ── 3D 월드 구축 ──
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const cw = mount.clientWidth || 640;
    const ch = mount.clientHeight || 420;

    const D = DEPTH;
    const W = Math.max(4.6, D * (cw / ch)); // 상자 가로 = 화면 비율

    // 렌더러/씬/카메라
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(cw, ch, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0c1126");

    // 카메라 — SAFE_H 높이의 평면이 화면에 꽉 차게 맞춤:
    // 그 아래(튀는 구간)에서는 원근으로 커져도 절대 화면 밖으로 안 나간다.
    const fov = 40;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(fov / 2));
    const camY = SAFE_H + D / 2 / tanHalf;
    const camera = new THREE.PerspectiveCamera(fov, cw / ch, 0.1, 100);
    camera.position.set(0, camY, camY * 0.1); // 거의 수직 + 살짝 기울여 입체감
    camera.lookAt(0, 0, 0);

    // 조명 — 부드러운 스튜디오 + 브랜드 컬러 액센트
    scene.add(new THREE.HemisphereLight(0xffffff, 0x27304d, 0.85));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(3.2, 9, 2.4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    const shadowR = Math.max(W, D) / 2 + 1.5;
    key.shadow.camera.left = -shadowR;
    key.shadow.camera.right = shadowR;
    key.shadow.camera.top = shadowR;
    key.shadow.camera.bottom = -shadowR;
    scene.add(key);
    const blue = new THREE.PointLight(0x1a5cff, 26, 16);
    blue.position.set(-W / 2, 2.6, -D / 2);
    scene.add(blue);
    const orange = new THREE.PointLight(0xff6a00, 22, 16);
    orange.position.set(W / 2, 2.6, D / 2);
    scene.add(orange);

    // 바닥 — 카메라가 높아 플레이 영역 밖까지 보이므로, 가시 영역 전체를 덮게 확장
    const visD = 2 * camY * tanHalf + 2;
    const visW = visD * (cw / ch) + 2;
    const floorTex = makeFloorTexture();
    floorTex.repeat.set(visW / 2.4, visD / 2.4);
    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(visW, visD),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9, metalness: 0.05 }),
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // 유리벽 — 벽당 단일 요소: 아래는 투명, 위로 갈수록 진해지고 최상단이 발광 라인인
    // 그라데이션 패널. (받침+엣지 이중 프레임으로 보이던 문제 해결)
    const GLASS_H = 2.6;
    const glassTex = (hex: string) => {
      const c = document.createElement("canvas");
      c.width = 32;
      c.height = 256;
      const g = c.getContext("2d")!;
      const grad = g.createLinearGradient(0, 256, 0, 0);
      grad.addColorStop(0, hex + "00");
      grad.addColorStop(0.7, hex + "2e");
      grad.addColorStop(0.95, hex + "55");
      grad.addColorStop(0.955, hex + "ff"); // 최상단 발광 라인
      grad.addColorStop(1, hex + "ff");
      g.fillStyle = grad;
      g.fillRect(0, 0, 32, 256);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    const blueTex = glassTex("#4b7bff");
    const orangeTex = glassTex("#ff8a3d");
    const mkWall = (len: number, x: number, z: number, rotY: number, tex: THREE.CanvasTexture) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(len, GLASS_H),
        new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      m.position.set(x, GLASS_H / 2, z);
      m.rotation.y = rotY;
      scene.add(m);
    };
    mkWall(D, -W / 2, 0, Math.PI / 2, blueTex);
    mkWall(D, W / 2, 0, Math.PI / 2, blueTex);
    mkWall(W, 0, -D / 2, 0, orangeTex);
    mkWall(W, 0, D / 2, 0, orangeTex);

    // ── 물리 월드 ──
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -34, 0) });
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.allowSleep = true;

    // 접촉 재질 — 주사위끼리/벽 반발은 바닥보다 10% 높게
    const matDice = new CANNON.Material("dice");
    const matFloor = new CANNON.Material("floor");
    const matWall = new CANNON.Material("wall");
    world.addContactMaterial(
      new CANNON.ContactMaterial(matDice, matFloor, { restitution: 0.34, friction: 0.24 }),
    );
    world.addContactMaterial(
      new CANNON.ContactMaterial(matDice, matWall, { restitution: 0.374, friction: 0.2 }),
    );
    world.addContactMaterial(
      new CANNON.ContactMaterial(matDice, matDice, { restitution: 0.374, friction: 0.2 }),
    );

    const addStatic = (shape: CANNON.Shape, x: number, y: number, z: number) => {
      const b = new CANNON.Body({ type: CANNON.Body.STATIC, shape, material: matWall });
      b.position.set(x, y, z);
      world.addBody(b);
    };
    // 바닥 — Plane 기본 법선(+z)을 위(+y)로 회전
    const floorBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
      material: matFloor,
    });
    floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(floorBody);
    const wallT = 2.0; // 두꺼운 벽 — 고속 주사위 터널링 방지 (안쪽 면은 ±W/2, ±D/2 그대로)
    addStatic(new CANNON.Box(new CANNON.Vec3(wallT / 2, CEIL_Y, D / 2 + wallT)), -W / 2 - wallT / 2, CEIL_Y / 2, 0);
    addStatic(new CANNON.Box(new CANNON.Vec3(wallT / 2, CEIL_Y, D / 2 + wallT)), W / 2 + wallT / 2, CEIL_Y / 2, 0);
    addStatic(new CANNON.Box(new CANNON.Vec3(W / 2 + wallT, CEIL_Y, wallT / 2)), 0, CEIL_Y / 2, -D / 2 - wallT / 2);
    addStatic(new CANNON.Box(new CANNON.Vec3(W / 2 + wallT, CEIL_Y, wallT / 2)), 0, CEIL_Y / 2, D / 2 + wallT / 2);
    addStatic(new CANNON.Box(new CANNON.Vec3(W / 2 + wallT, wallT / 2, D / 2 + wallT)), 0, CEIL_Y + wallT / 2, 0); // 천장

    // ── 주사위 ──
    const diceGeo = new RoundedBoxGeometry(DIE, DIE, DIE, 4, 0.09);
    const faceMats = FACE_VALUES.map(
      (v) =>
        new THREE.MeshStandardMaterial({
          map: makeFaceTexture(v),
          roughness: 0.32,
          metalness: 0.06,
        }),
    );
    let bodies: CANNON.Body[] = [];
    let meshes: THREE.Mesh[] = [];
    let nudges: number[] = [];
    let values: number[] = [];
    let rollStart = 0;

    const clearDice = () => {
      for (const b of bodies) world.removeBody(b);
      for (const m of meshes) scene.remove(m);
      bodies = [];
      meshes = [];
    };

    const rebuildDice = (n: number) => {
      clearDice();
      nudges = Array.from({ length: n }, () => 0);
      const gap = DIE * 0.5;
      // 좁은 화면에서는 여러 줄로 나눠 배치 (화면 밖 배치 방지)
      const perRow = Math.max(1, Math.min(n, Math.floor((W - DIE) / (DIE + gap)) + 1));
      const rows = Math.ceil(n / perRow);
      for (let i = 0; i < n; i++) {
        const mesh = new THREE.Mesh(diceGeo, faceMats);
        mesh.castShadow = true;
        scene.add(mesh);
        meshes.push(mesh);

        const body = new CANNON.Body({
          mass: 1,
          shape: new CANNON.Box(new CANNON.Vec3(DIE / 2 - 0.02, DIE / 2 - 0.02, DIE / 2 - 0.02)),
          material: matDice,
          linearDamping: 0.12,
          angularDamping: 0.12,
          allowSleep: true,
          sleepSpeedLimit: 0.9,
          sleepTimeLimit: 0.28,
        });
        // 대기 배치: 중앙 정렬 그리드, i번째 눈금이 위를 보게
        const row = Math.floor(i / perRow);
        const inRow = Math.min(perRow, n - row * perRow);
        const rowW = inRow * DIE + (inRow - 1) * gap;
        const col = i % perRow;
        const x = -rowW / 2 + DIE / 2 + col * (DIE + gap);
        const z = D * 0.18 + (row - (rows - 1) / 2) * (DIE + gap);
        body.position.set(x, DIE / 2 + 0.001, z);
        const showV = (i % 6) + 1;
        const [ax, ay, az] = AXIS_OF[showV];
        const q = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(ax, ay, az),
          new THREE.Vector3(0, 1, 0),
        );
        body.quaternion.set(q.x, q.y, q.z, q.w);
        world.addBody(body);
        body.sleep();
        bodies.push(body);
      }
    };

    const wakeAll = () => {
      rollingRef.current = true;
      setRolling(true);
      setResult(null);
      rollStart = performance.now();
      nudges = nudges.map(() => 0);
    };

    // 버튼: 높은 곳(기존 3배)에서 중앙 상공에 흩뿌려 떨어뜨리기.
    // 높이 뜬 동안 원근으로 커져도 화면 안에 있도록 수평 스폰을 중앙부로 제한.
    const roll = () => {
      trackPlay("dice");
      wakeAll();
      const sx = Math.max(0.4, Math.min(W / 2 - DIE, 1.2));
      const sz = Math.max(0.4, Math.min(D / 2 - DIE, 1.2));
      // 낙하 중 확실히 회전하도록 축별 최소 회전속도 보장 (0 근처 랜덤 방지)
      const spin = () => (Math.random() < 0.5 ? -1 : 1) * rand(14, 34);
      for (const b of bodies) {
        b.wakeUp();
        b.position.set(rand(-sx, sx), rand(DROP_MIN, DROP_MAX), rand(-sz, sz));
        b.quaternion.setFromEuler(rand(0, Math.PI * 2), rand(0, Math.PI * 2), rand(0, Math.PI * 2));
        b.velocity.set(rand(-4, 4), rand(-4, -1), rand(-4, 4));
        b.angularVelocity.set(spin(), spin(), spin());
      }
    };

    // 흔들기: 상자째 흔든 것처럼 현재 위치에서 충격
    const shakeKick = () => {
      wakeAll();
      for (const b of bodies) {
        b.wakeUp();
        b.applyImpulse(
          new CANNON.Vec3(rand(-7, 7), rand(4.5, 8.5), rand(-7, 7)),
          new CANNON.Vec3(rand(-0.3, 0.3), rand(-0.3, 0.3), rand(-0.3, 0.3)),
        );
        b.angularVelocity.set(rand(-18, 18), rand(-18, 18), rand(-18, 18));
      }
    };

    apiRef.current = { rebuildDice, roll, shakeKick };
    rebuildDice(countRef.current);

    // ── 루프 ──
    const tmpQ = new THREE.Quaternion();
    let raf = 0;
    let last = performance.now();
    let disposed = false;

    const finalize = () => {
      values = bodies.map((b) => {
        tmpQ.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
        return topValueOf(tmpQ).v;
      });
      rollingRef.current = false;
      setRolling(false);
      setResult(values.slice());
    };

    const tick = (now: number) => {
      if (disposed) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      world.step(1 / 60, dt, 5);

      // 안전망 — 어떤 경우에도 상자 밖으로 못 나가게:
      // 속도 상한(터널링 예방) + 경계 이탈 시 즉시 클램프·반사
      const maxV = 28;
      const margin = DIE * 0.45;
      const bx = W / 2 - margin;
      const bz = D / 2 - margin;
      for (const b of bodies) {
        const v = b.velocity;
        const sp = v.length();
        if (sp > maxV) v.scale(maxV / sp, v);
        if (b.position.x < -bx) { b.position.x = -bx; if (v.x < 0) v.x = -v.x * 0.4; }
        else if (b.position.x > bx) { b.position.x = bx; if (v.x > 0) v.x = -v.x * 0.4; }
        if (b.position.z < -bz) { b.position.z = -bz; if (v.z < 0) v.z = -v.z * 0.4; }
        else if (b.position.z > bz) { b.position.z = bz; if (v.z > 0) v.z = -v.z * 0.4; }
        if (b.position.y > CEIL_Y - margin) { b.position.y = CEIL_Y - margin; if (v.y > 0) v.y = -v.y * 0.4; }
        if (b.position.y < -0.5) { b.position.y = DIE; v.set(0, 0, 0); } // 극단 이탈 복구
      }

      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        const m = meshes[i];
        m.position.set(b.position.x, b.position.y, b.position.z);
        m.quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
      }

      if (rollingRef.current) {
        const allSleeping = bodies.every((b) => b.sleepState === CANNON.Body.SLEEPING);
        const timedOut = now - rollStart > 9000;
        if (allSleeping || timedOut) {
          // 다른 주사위에 걸쳐 기울어진(cocked) 주사위는 살짝 쳐서 재정착
          let nudged = false;
          if (!timedOut) {
            for (let i = 0; i < bodies.length; i++) {
              tmpQ.set(
                bodies[i].quaternion.x,
                bodies[i].quaternion.y,
                bodies[i].quaternion.z,
                bodies[i].quaternion.w,
              );
              if (topValueOf(tmpQ).dot < 0.86 && nudges[i] < 3) {
                nudges[i]++;
                bodies[i].wakeUp();
                bodies[i].applyImpulse(
                  new CANNON.Vec3(rand(-1.5, 1.5), 4.2, rand(-1.5, 1.5)),
                  new CANNON.Vec3(rand(-0.2, 0.2), 0, rand(-0.2, 0.2)),
                );
                nudged = true;
              }
            }
          }
          if (!nudged) finalize();
        }
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // 리사이즈: 크게 변하면 씬 재구축
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
      clearDice();
      diceGeo.dispose();
      for (const m of faceMats) {
        m.map?.dispose();
        m.dispose();
      }
      floorTex.dispose();
      blueTex.dispose();
      orangeTex.dispose();
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

  // 개수 변경 → 주사위만 재생성
  useEffect(() => {
    countRef.current = count;
    if (!rollingRef.current) apiRef.current?.rebuildDice(count);
  }, [count]);

  const { supported, enabled, enable } = useShake(
    () => apiRef.current?.shakeKick(),
    { threshold: 13, cooldownMs: 300 },
  );

  // 전체화면 토글 — 크기가 바뀌므로 씬 재구축, 배경 스크롤 잠금
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

  const changeCount = (next: number) => {
    if (rollingRef.current) return;
    setResult(null);
    setCount(Math.min(MAX, Math.max(MIN, next)));
  };

  const sum = result ? result.reduce((a, b) => a + b, 0) : 0;

  return (
    <div className={styles.panel}>
      <div
        className={styles.actions}
        style={{ marginTop: 0, marginBottom: 18, justifyContent: "center" }}
      >
        <div className={styles.stepper}>
          <button
            className={styles.stepBtn}
            onClick={() => changeCount(count - 1)}
            disabled={count <= MIN || rolling}
            aria-label="주사위 줄이기"
          >
            −
          </button>
          <span className={styles.stepValue}>
            {count}
            <small>개</small>
          </span>
          <button
            className={styles.stepBtn}
            onClick={() => changeCount(count + 1)}
            disabled={count >= MAX || rolling}
            aria-label="주사위 늘리기"
          >
            +
          </button>
        </div>
      </div>

      <div className={`${dice.arenaWrap} ${expanded ? dice.arenaFull : ""}`}>
        <div className={dice.arena} ref={mountRef} />
        <button
          className={dice.fsBtn}
          onClick={toggleFs}
          aria-label={expanded ? "전체화면 닫기" : "전체화면"}
        >
          {expanded ? "✕" : "⛶"}
        </button>
        {expanded && (
          <div className={dice.fsControls}>
            <button
              className={dice.rollBtn}
              style={{ flex: "0 0 auto", minWidth: 170 }}
              onClick={() => apiRef.current?.roll()}
              disabled={rolling}
            >
              {rolling ? "굴리는 중… 🎲" : "🎲 굴리기"}
            </button>
            {supported && !enabled && (
              <button className={dice.sensorBtn} onClick={enable}>
                📱 흔들기
              </button>
            )}
          </div>
        )}
      </div>

      <div className={dice.diceControls}>
        <button
          className={dice.rollBtn}
          onClick={() => apiRef.current?.roll()}
          disabled={rolling}
        >
          {rolling ? "굴리는 중… 🎲" : "🎲 주사위 굴리기"}
        </button>
        {supported && (
          <button
            className={`${dice.sensorBtn} ${enabled ? dice.sensorOn : ""}`}
            onClick={enabled ? undefined : enable}
            disabled={enabled}
          >
            {enabled ? "📳 흔들기 ON" : "📱 흔들기 켜기"}
          </button>
        )}
      </div>

      <p className={dice.hintRow}>
        {supported
          ? "폰을 흔들면 상자 속 주사위처럼 진짜로 튕겨다녀요! 🤳"
          : "버튼을 눌러 주사위를 굴리세요! (모바일에선 흔들기도 지원)"}
      </p>

      {result && (
        <div className={dice.resultOverlay} onClick={() => setResult(null)}>
          <Confetti count={70} />
          <div className={dice.resultCard} onClick={(e) => e.stopPropagation()}>
            <div className={dice.resultDice}>
              {result.map((v, i) => (
                <div
                  key={i}
                  className={dice.miniDie}
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <MiniPips v={v} />
                </div>
              ))}
            </div>
            <p className={dice.resultSumLabel}>
              합계 {count > 1 ? `(${result.join(" + ")})` : ""}
            </p>
            <p className={dice.resultSum}>{sum}</p>
            <div
              style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}
            >
              <button
                className={styles.btnPrimary}
                style={{ minWidth: 130 }}
                onClick={() => {
                  setResult(null);
                  window.setTimeout(() => apiRef.current?.roll(), 180);
                }}
              >
                다시 굴리기 🎲
              </button>
              <button className={styles.btnGhost} onClick={() => setResult(null)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
