"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import * as CANNON from "cannon-es";
import styles from "../game.module.css";
import yut from "./yut.module.css";
import Confetti from "../Confetti";
import { useShake } from "../useShake";
import { trackPlay } from "../track";

/**
 * 윷놀이 — three.js + cannon-es 실제 3D 물리 (주사위와 동일한 규칙 구조).
 *
 * 윷가락 모델링(참고 이미지 기준):
 *  - D자 단면: 둥근 등(semi-circular top) + 평평한 배(flat bottom)
 *  - ××× 각인은 둥근 등면에 3개 (탄 나무색)
 *  - 빽도: 1번 가락의 "평평한 배면"에 빨간 × 표식 — 그 가락만 배가 위로 오면 빽도
 *
 * 판정(멈춘 뒤 실제 자세를 읽음):
 *  - 배(평평한 면)가 위로 온 가락 수 → 1도 2개 3걸 4윷 0모
 *  - 배가 위로 온 가락이 '빽도 가락 1개뿐'이면 빽도
 */

const STICKS = 4;
const BACKDO = 0;
// 윷가락 치수 (월드 단위) — D자 단면 폭 SW, 높이 SH, 길이 SL
const SW = 0.62;
const SH = 0.42;
const SL = 2.7;

const DEPTH = 7.6;
const CEIL_Y = 10.5;
const SAFE_H = 3.4;
const DROP_MIN = 6.5;
const DROP_MAX = 8.5;

type YutOutcome = {
  name: string;
  emoji: string;
  extra: boolean;
  desc: string;
};

function evalYut(flat: boolean[]): YutOutcome {
  const n = flat.filter(Boolean).length;
  if (n === 1 && flat[BACKDO]) {
    return { name: "빽도", emoji: "🔙", extra: false, desc: "뒤로 한 칸!" };
  }
  switch (n) {
    case 1:
      return { name: "도", emoji: "🐷", extra: false, desc: "한 칸 이동" };
    case 2:
      return { name: "개", emoji: "🐶", extra: false, desc: "두 칸 이동" };
    case 3:
      return { name: "걸", emoji: "🐑", extra: false, desc: "세 칸 이동" };
    case 4:
      return { name: "윷", emoji: "🐮", extra: true, desc: "네 칸 이동" };
    default:
      return { name: "모", emoji: "🐴", extra: true, desc: "다섯 칸 이동" };
  }
}

/** 밝은 나무 텍스처 (세로 결) */
function makeWoodTexture(): THREE.CanvasTexture {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  const base = g.createLinearGradient(0, 0, s, 0);
  base.addColorStop(0, "#eed9ab");
  base.addColorStop(0.5, "#e6c98f");
  base.addColorStop(1, "#dfbe80");
  g.fillStyle = base;
  g.fillRect(0, 0, s, s);
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * s;
    g.strokeStyle = `rgba(150, 105, 45, ${0.05 + Math.random() * 0.1})`;
    g.lineWidth = 1 + Math.random() * 1.6;
    g.beginPath();
    g.moveTo(x, 0);
    g.bezierCurveTo(
      x + (Math.random() - 0.5) * 14,
      s * 0.33,
      x + (Math.random() - 0.5) * 14,
      s * 0.66,
      x + (Math.random() - 0.5) * 10,
      s,
    );
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** × 각인 텍스처 (투명 배경) */
function makeXTexture(color: string): THREE.CanvasTexture {
  const s = 128;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  g.strokeStyle = color;
  g.lineWidth = 15;
  g.lineCap = "round";
  const m = 34;
  g.beginPath();
  g.moveTo(m, m);
  g.lineTo(s - m, s - m);
  g.moveTo(s - m, m);
  g.lineTo(m, s - m);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 멍석(짚 돗자리) 바닥 텍스처 */
function makeMatTexture(): THREE.CanvasTexture {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  g.fillStyle = "#caa96b";
  g.fillRect(0, 0, s, s);
  const step = s / 16;
  for (let i = 0; i <= 16; i++) {
    g.strokeStyle = "rgba(120, 85, 35, 0.28)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(i * step, 0);
    g.lineTo(i * step, s);
    g.stroke();
    g.strokeStyle = "rgba(160, 125, 60, 0.35)";
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

/** D자 단면 윷가락 지오메트리 — 평평한 배가 -y, 둥근 등이 +y, 길이는 z축 */
function makeStickGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const hw = SW / 2;
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.bezierCurveTo(hw, SH * 0.85, hw * 0.45, SH, 0, SH);
  shape.bezierCurveTo(-hw * 0.45, SH, -hw, SH * 0.85, -hw, 0);
  const depth = SL - 0.16;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.05,
    bevelSegments: 3,
    curveSegments: 12,
  });
  geo.translate(0, -SH / 2, -depth / 2);
  return geo;
}

/**
 * D자 단면 컨벡스 프리즘 충돌체 — 시각 모델과 같은 단면.
 * 평평한 '옆면'이 아예 없어서 옆으로 서지 못하고, 등이 둥글어
 * 기울면 스스로 배(평) 또는 등(둥근) 쪽으로 굴러 내려온다.
 */
function makeStickShape(): CANNON.ConvexPolyhedron {
  const hw = SW / 2;
  const hh = SH / 2;
  const hl = (SL - 0.1) / 2;
  // 단면 폴리곤 (+z에서 볼 때 CCW): 평평한 배(아래) 2점 + 둥근 등(위) 아치 5점
  const pts: [number, number][] = [
    [-hw, -hh],
    [hw, -hh],
    [hw * 0.87, -hh + SH * 0.5],
    [hw * 0.52, -hh + SH * 0.87],
    [0, hh],
    [-hw * 0.52, -hh + SH * 0.87],
    [-hw * 0.87, -hh + SH * 0.5],
  ];
  const n = pts.length;
  const vertices: CANNON.Vec3[] = [
    ...pts.map(([x, y]) => new CANNON.Vec3(x, y, hl)),
    ...pts.map(([x, y]) => new CANNON.Vec3(x, y, -hl)),
  ];
  const faces: number[][] = [
    Array.from({ length: n }, (_, i) => i), // 앞 단면 (+z)
    Array.from({ length: n }, (_, i) => 2 * n - 1 - i), // 뒤 단면 (-z)
  ];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push([i, i + n, j + n, j]); // 옆 둘레 사각형들
  }
  return new CANNON.ConvexPolyhedron({ vertices, faces });
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

type YutApi = { throwSticks: () => void; shakeKick: () => void };

export default function YutGame() {
  const [throwing, setThrowing] = useState(false);
  const [result, setResult] = useState<{ flat: boolean[]; out: YutOutcome } | null>(
    null,
  );
  const [sceneKey, setSceneKey] = useState(0);
  const [expanded, setExpanded] = useState(false); // 전체화면(모바일 몰입) 모드

  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<YutApi | null>(null);
  const throwingRef = useRef(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const cw = mount.clientWidth || 640;
    const ch = mount.clientHeight || 420;

    const D = DEPTH;
    const W = Math.max(4.6, D * (cw / ch));

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(cw, ch, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#241a0e");

    const fov = 40;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(fov / 2));
    const camY = SAFE_H + D / 2 / tanHalf;
    const camera = new THREE.PerspectiveCamera(fov, cw / ch, 0.1, 100);
    camera.position.set(0, camY, camY * 0.1);
    camera.lookAt(0, 0, 0);

    // 조명 — 따뜻한 실내 + 브랜드 액센트
    scene.add(new THREE.HemisphereLight(0xfff6e6, 0x4a3620, 0.9));
    const key = new THREE.DirectionalLight(0xfff2dd, 1.7);
    key.position.set(3.2, 9, 2.4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    const shadowR = Math.max(W, D) / 2 + 1.5;
    key.shadow.camera.left = -shadowR;
    key.shadow.camera.right = shadowR;
    key.shadow.camera.top = shadowR;
    key.shadow.camera.bottom = -shadowR;
    scene.add(key);
    const warm = new THREE.PointLight(0xffb86b, 18, 16);
    warm.position.set(W / 2, 2.6, D / 2);
    scene.add(warm);

    // 바닥 (멍석)
    const visD = 2 * camY * tanHalf + 2;
    const visW = visD * (cw / ch) + 2;
    const matTex = makeMatTexture();
    matTex.repeat.set(visW / 2.6, visD / 2.6);
    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(visW, visD),
      new THREE.MeshStandardMaterial({ map: matTex, roughness: 0.95, metalness: 0 }),
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // 유리벽 — 단일 그라데이션 패널 (주사위와 동일 방식)
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
      grad.addColorStop(0.955, hex + "ff");
      grad.addColorStop(1, hex + "ff");
      g.fillStyle = grad;
      g.fillRect(0, 0, 32, 256);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    const sideTex = glassTex("#e0a24a");
    const endTex = glassTex("#b0762e");
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
    mkWall(D, -W / 2, 0, Math.PI / 2, sideTex);
    mkWall(D, W / 2, 0, Math.PI / 2, sideTex);
    mkWall(W, 0, -D / 2, 0, endTex);
    mkWall(W, 0, D / 2, 0, endTex);

    // ── 물리 월드 ──
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -34, 0) });
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.allowSleep = true;

    const matStick = new CANNON.Material("stick");
    const matFloor = new CANNON.Material("floor");
    const matWall = new CANNON.Material("wall");
    // 마찰을 낮춰 벽/다른 가락에 '기대어 버티는' 상황 자체를 줄인다
    world.addContactMaterial(
      new CANNON.ContactMaterial(matStick, matFloor, { restitution: 0.3, friction: 0.3 }),
    );
    world.addContactMaterial(
      new CANNON.ContactMaterial(matStick, matWall, { restitution: 0.35, friction: 0.16 }),
    );
    world.addContactMaterial(
      new CANNON.ContactMaterial(matStick, matStick, { restitution: 0.33, friction: 0.2 }),
    );

    const addStatic = (shape: CANNON.Shape, x: number, y: number, z: number) => {
      const b = new CANNON.Body({ type: CANNON.Body.STATIC, shape, material: matWall });
      b.position.set(x, y, z);
      world.addBody(b);
    };
    const floorBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
      material: matFloor,
    });
    floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(floorBody);
    const wallT = 2.0;
    addStatic(new CANNON.Box(new CANNON.Vec3(wallT / 2, CEIL_Y, D / 2 + wallT)), -W / 2 - wallT / 2, CEIL_Y / 2, 0);
    addStatic(new CANNON.Box(new CANNON.Vec3(wallT / 2, CEIL_Y, D / 2 + wallT)), W / 2 + wallT / 2, CEIL_Y / 2, 0);
    addStatic(new CANNON.Box(new CANNON.Vec3(W / 2 + wallT, CEIL_Y, wallT / 2)), 0, CEIL_Y / 2, -D / 2 - wallT / 2);
    addStatic(new CANNON.Box(new CANNON.Vec3(W / 2 + wallT, CEIL_Y, wallT / 2)), 0, CEIL_Y / 2, D / 2 + wallT / 2);
    addStatic(new CANNON.Box(new CANNON.Vec3(W / 2 + wallT, wallT / 2, D / 2 + wallT)), 0, CEIL_Y + wallT / 2, 0);

    // ── 윷가락 4개 ──
    const stickGeo = makeStickGeometry();
    const woodTex = makeWoodTexture();
    const woodMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.65,
      metalness: 0.02,
    });
    const burnXTex = makeXTexture("#5a3212");
    const redXTex = makeXTexture("#c0392b");
    const markMatBurn = new THREE.MeshBasicMaterial({
      map: burnXTex,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const markMatRed = new THREE.MeshBasicMaterial({
      map: redXTex,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const markGeo = new THREE.PlaneGeometry(SW * 0.78, SW * 0.78);
    const BEVEL = 0.05; // makeStickGeometry 의 bevelSize — 표면 밖으로 마크를 띄우는 기준

    const groups: THREE.Group[] = [];
    const bodies: CANNON.Body[] = [];
    const nudges: number[] = [0, 0, 0, 0];
    let rollStart = 0;

    for (let i = 0; i < STICKS; i++) {
      const grp = new THREE.Group();
      const mesh = new THREE.Mesh(stickGeo, woodMat);
      mesh.castShadow = true;
      grp.add(mesh);
      // ××× 각인 — 둥근 등면 위 (참고 이미지처럼 3개, 베벨 표면 바깥에 배치)
      for (const zi of [-SL * 0.27, 0, SL * 0.27]) {
        const mark = new THREE.Mesh(markGeo, markMatBurn);
        mark.position.set(0, SH / 2 + BEVEL + 0.015, zi);
        mark.rotation.x = -Math.PI / 2;
        grp.add(mark);
      }
      // 빽도 표식 — 1번 가락의 평평한 배면에 빨간 ×
      if (i === BACKDO) {
        const mark = new THREE.Mesh(markGeo, markMatRed);
        mark.position.set(0, -SH / 2 - BEVEL - 0.015, 0);
        mark.rotation.x = Math.PI / 2;
        grp.add(mark);
      }
      scene.add(grp);
      groups.push(grp);

      const body = new CANNON.Body({
        mass: 0.9,
        shape: makeStickShape(),
        material: matStick,
        linearDamping: 0.14,
        angularDamping: 0.3, // 둥근 등 흔들림(rocking)을 빨리 감쇠
        allowSleep: true,
        sleepSpeedLimit: 1.1,
        sleepTimeLimit: 0.22,
      });
      world.addBody(body);
      bodies.push(body);
    }

    // 대기 배치 — 중앙에 4개 나란히, 등(×××)이 위로 보이게
    const layoutIdle = () => {
      const gap = 0.55;
      const totalW = STICKS * SW + (STICKS - 1) * gap;
      for (let i = 0; i < STICKS; i++) {
        const b = bodies[i];
        b.position.set(-totalW / 2 + SW / 2 + i * (SW + gap), SH / 2 + 0.001, 0);
        b.quaternion.set(0, 0, 0, 1); // 등이 +y (××× 위)
        b.velocity.set(0, 0, 0);
        b.angularVelocity.set(0, 0, 0);
        b.sleep();
      }
    };
    layoutIdle();

    const wakeAll = () => {
      throwingRef.current = true;
      setThrowing(true);
      setResult(null);
      rollStart = performance.now();
      for (let i = 0; i < STICKS; i++) nudges[i] = 0;
    };

    // 높은 곳에서 회전하며 낙하
    const throwSticks = () => {
      trackPlay("yut");
      wakeAll();
      const sx = Math.max(0.4, Math.min(W / 2 - SL / 2, 1.2));
      const sz = Math.max(0.4, Math.min(D / 2 - SL / 2, 1.2));
      const spin = () => (Math.random() < 0.5 ? -1 : 1) * rand(10, 26);
      for (const b of bodies) {
        b.wakeUp();
        b.position.set(rand(-sx, sx), rand(DROP_MIN, DROP_MAX), rand(-sz, sz));
        b.quaternion.setFromEuler(rand(0, Math.PI * 2), rand(0, Math.PI * 2), rand(0, Math.PI * 2));
        b.velocity.set(rand(-3.5, 3.5), rand(-4, -1), rand(-3.5, 3.5));
        b.angularVelocity.set(spin(), spin() * 0.5, spin());
      }
    };

    // 흔들기 = 상자째 흔들기
    const shakeKick = () => {
      wakeAll();
      for (const b of bodies) {
        b.wakeUp();
        b.applyImpulse(
          new CANNON.Vec3(rand(-6, 6), rand(4, 7.5), rand(-6, 6)),
          new CANNON.Vec3(rand(-0.3, 0.3), rand(-0.2, 0.2), rand(-0.5, 0.5)),
        );
        b.angularVelocity.set(rand(-14, 14), rand(-8, 8), rand(-14, 14));
      }
    };

    apiRef.current = { throwSticks, shakeKick };

    // ── 루프 ──
    const tmpQ = new THREE.Quaternion();
    const upVec = new THREE.Vector3();
    const axisVec = new THREE.Vector3();
    const lastFix = [0, 0, 0, 0];
    let raf = 0;
    let last = performance.now();
    let disposed = false;

    // 등(+y)이 아래를 보면 = 배가 위 (잦혀짐, 카운트)
    const backUpDot = (b: CANNON.Body) => {
      tmpQ.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
      upVec.set(0, 1, 0).applyQuaternion(tmpQ);
      return upVec.y;
    };

    // 어중간하게 기운 가락을 길이축 중심으로 '스르륵 굴려' 눕힌다 (팝 없는 자연 보정)
    const rollOver = (i: number, now: number) => {
      lastFix[i] = now;
      nudges[i]++;
      const b = bodies[i];
      b.wakeUp();
      tmpQ.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
      axisVec.set(0, 0, 1).applyQuaternion(tmpQ); // 가락 길이축(월드)
      const s = Math.random() < 0.5 ? -1 : 1;
      b.angularVelocity.set(axisVec.x * s * 7.5, axisVec.y * s * 7.5, axisVec.z * s * 7.5);
      b.velocity.y += 1.0; // 굴림이 먹히도록 아주 살짝만 띄움
    };

    const finalize = () => {
      const flat = bodies.map((b) => backUpDot(b) < 0);
      throwingRef.current = false;
      setThrowing(false);
      setResult({ flat, out: evalYut(flat) });
    };

    const tick = (now: number) => {
      if (disposed) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      world.step(1 / 60, dt, 5);

      // 안전망 — 속도 상한 + 경계 클램프
      const maxV = 26;
      const margin = SW;
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
        if (b.position.y < -0.5) { b.position.y = SH; v.set(0, 0, 0); }
      }

      for (let i = 0; i < STICKS; i++) {
        const b = bodies[i];
        const g = groups[i];
        g.position.set(b.position.x, b.position.y, b.position.z);
        g.quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
      }

      if (throwingRef.current) {
        // 완전히 잠들기 '전'에, 거의 멈춘 가락이 어중간하게 기울어 있으면 미리 굴려 눕힌다
        // — 움직임이 남아있을 때 보정하므로 눈에 띄지 않고 자연스럽다
        for (let i = 0; i < STICKS; i++) {
          const b = bodies[i];
          const speed = b.velocity.length() + b.angularVelocity.length() * 0.25;
          if (
            speed < 1.6 &&
            Math.abs(backUpDot(b)) < 0.6 &&
            now - lastFix[i] > 380 &&
            nudges[i] < 6
          ) {
            rollOver(i, now);
          }
        }

        const allSleeping = bodies.every((b) => b.sleepState === CANNON.Body.SLEEPING);
        const timedOut = now - rollStart > 9000;
        if (allSleeping || timedOut) {
          let pending = false;
          if (!timedOut) {
            for (let i = 0; i < STICKS; i++) {
              if (Math.abs(backUpDot(bodies[i])) < 0.6 && nudges[i] < 6) {
                rollOver(i, now);
                pending = true;
              }
            }
          }
          if (!pending) finalize();
        }
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
      stickGeo.dispose();
      markGeo.dispose();
      woodTex.dispose();
      burnXTex.dispose();
      redXTex.dispose();
      matTex.dispose();
      sideTex.dispose();
      endTex.dispose();
      woodMat.dispose();
      markMatBurn.dispose();
      markMatRed.dispose();
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

  return (
    <div className={styles.panel}>
      <div className={`${yut.arenaWrap} ${expanded ? yut.arenaFull : ""}`}>
        <div className={yut.arena} ref={mountRef} />
        <button
          className={yut.fsBtn}
          onClick={toggleFs}
          aria-label={expanded ? "전체화면 닫기" : "전체화면"}
        >
          {expanded ? "✕" : "⛶"}
        </button>
        {expanded && (
          <div className={yut.fsControls}>
            <button
              className={yut.throwBtn}
              style={{ flex: "0 0 auto", minWidth: 170 }}
              onClick={() => apiRef.current?.throwSticks()}
              disabled={throwing}
            >
              {throwing ? "던지는 중… 🪵" : "🪵 던지기"}
            </button>
            {supported && !enabled && (
              <button className={yut.sensorBtn} onClick={enable}>
                📱 흔들기
              </button>
            )}
          </div>
        )}
      </div>

      <div className={yut.controls}>
        <button
          className={yut.throwBtn}
          onClick={() => apiRef.current?.throwSticks()}
          disabled={throwing}
        >
          {throwing ? "던지는 중… 🪵" : "🪵 윷 던지기"}
        </button>
        {supported && (
          <button
            className={`${yut.sensorBtn} ${enabled ? yut.sensorOn : ""}`}
            onClick={enabled ? undefined : enable}
            disabled={enabled}
          >
            {enabled ? "📳 흔들기 ON" : "📱 흔들기 켜기"}
          </button>
        )}
      </div>

      <p className={yut.hintRow}>
        {supported
          ? "폰을 흔들면 상자 속 윷가락이 진짜로 튕겨다녀요! 🤳"
          : "버튼을 눌러 윷을 던지세요! (모바일에선 흔들기도 지원)"}
      </p>

      <div className={yut.rules}>
        <p className={yut.rulesTitle}>📖 윷 판정 (배가 위로 온 가락 수)</p>
        <div className={yut.rulesGrid}>
          <span className={yut.ruleChip}>🐷 <b>도</b> 1개</span>
          <span className={yut.ruleChip}>🐶 <b>개</b> 2개</span>
          <span className={yut.ruleChip}>🐑 <b>걸</b> 3개</span>
          <span className={yut.ruleChip}>🐮 <b>윷</b> 4개·한번더</span>
          <span className={yut.ruleChip}>🐴 <b>모</b> 0개·한번더</span>
          <span className={yut.ruleChip}>🔙 <b>빽도</b> 빨간 × 가락만</span>
        </div>
      </div>

      {result && (
        <div className={yut.resultOverlay} onClick={() => setResult(null)}>
          {(result.out.name === "윷" || result.out.name === "모") && (
            <Confetti count={80} />
          )}
          <div className={yut.resultCard} onClick={(e) => e.stopPropagation()}>
            <div className={yut.resultSticks}>
              {result.flat.map((f, i) => (
                <span
                  key={i}
                  className={`${yut.miniStick} ${f ? yut.miniFlat : yut.miniRound} ${i === BACKDO && f ? yut.miniBackdo : ""}`}
                />
              ))}
            </div>
            <div className={yut.resultEmoji}>{result.out.emoji}</div>
            <p className={yut.resultName}>{result.out.name}</p>
            <p className={yut.resultMove}>{result.out.desc}</p>
            {result.out.extra && <span className={yut.resultExtra}>🎉 한 번 더!</span>}
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "center",
                flexWrap: "wrap",
                marginTop: 8,
              }}
            >
              <button
                className={styles.btnPrimary}
                style={{ minWidth: 130 }}
                onClick={() => {
                  setResult(null);
                  window.setTimeout(() => apiRef.current?.throwSticks(), 180);
                }}
              >
                다시 던지기 🪵
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
