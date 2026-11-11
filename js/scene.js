// 场景工厂：统一干净工业风训练场
// 三套主题都简化为浅灰工业墙 + 干净地板 + 天花板灯具 + 简洁围栏
// 区别仅在于：训练场=明亮、黄昏=暖色调、霓虹=冷色调
import * as THREE from 'three';
import { decorateTheme, updateModels } from './models.js';

const ROOM_SIZE = 60;
const CEILING_H = 9.5;  // 降低一点，更贴近示例图比例

// 场景定义：背景色、雾、曝光、整体色调
export const SCENES = {
  training: {
    label: '训练场',
    tag: 'TRAINING',
    desc: '明亮工业风训练场',
    background: 0xe8e6e1,
    fog: { color: 0xe8e6e1, near: 35, far: 100 },
    exposure: 1.1,
    tint: 0xffffff,
  },
  dusk: {
    label: '黄昏训练场',
    tag: 'DUSK',
    desc: '暖色调黄昏',
    background: 0xd4c0a8,
    fog: { color: 0xd4c0a8, near: 30, far: 95 },
    exposure: 1.0,
    tint: 0xffe0b8,
  },
  neon: {
    label: '夜间训练场',
    tag: 'NIGHT',
    desc: '冷色调夜间',
    background: 0x2a3240,
    fog: { color: 0x2a3240, near: 22, far: 80 },
    exposure: 1.1,
    tint: 0x8a9ebd,
  },
};

// ---------------- 通用构件 ----------------

// 干净工业墙：纯色 + 极轻微的 Canvas 纹理（仅噪点避免过纯）
function makeWallMaterial(baseColor, roughness = 0.85) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);
  // 加极轻微噪点（几乎不可见，但避免纯平带来的廉价感）
  const img = ctx.getImageData(0, 0, 512, 512);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 8;
    data[i] = Math.max(0, Math.min(255, data[i] + n));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = 4;
  return new THREE.MeshStandardMaterial({
    map: tex,
    color: 0xffffff,
    roughness,
    metalness: 0.02,
  });
}

// 工业厂房地板：大方块瓷砖
function makeFloorMaterial(baseColor, groutColor, repeat = 4) {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const ctx = c.getContext('2d');
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 1024, 1024);
  // 大方块分割
  ctx.strokeStyle = groutColor;
  ctx.lineWidth = 4;
  const grid = 4;
  const step = 1024 / grid;
  for (let i = 0; i <= grid; i++) {
    ctx.beginPath();
    ctx.moveTo(i * step, 0); ctx.lineTo(i * step, 1024); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * step); ctx.lineTo(1024, i * step); ctx.stroke();
  }
  // 瓷砖内部轻微噪点
  const img = ctx.getImageData(0, 0, 1024, 1024);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 6;
    data[i] = Math.max(0, Math.min(255, data[i] + n));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  return new THREE.MeshStandardMaterial({
    map: tex,
    color: 0xffffff,
    roughness: 0.72,
    metalness: 0.04,
  });
}

// 简洁围栏：黑黄条纹立柱 + 双横杆（参考示例图风格）
function createCleanFence() {
  const fence = new THREE.Group();
  const half = ROOM_SIZE / 2;

  const matRail = new THREE.MeshStandardMaterial({
    color: 0x555559, roughness: 0.45, metalness: 0.55,
  });

  const postH = 0.9, postW = 0.12;
  const spacing = 3.2;
  const postCount = Math.floor(ROOM_SIZE / spacing) + 1;
  const startX = -half + (ROOM_SIZE - (postCount - 1) * spacing) / 2;

  const postGeo = new THREE.BoxGeometry(postW, postH, postW);

  for (let i = 0; i < postCount; i++) {
    const x = startX + i * spacing;
    const post = new THREE.Mesh(postGeo, matRail);
    post.position.set(x, postH / 2, 0);
    post.castShadow = true;
    post.receiveShadow = true;
    fence.add(post);

    // 立柱上的黄色警示条
    const yellowStripe = new THREE.Mesh(
      new THREE.BoxGeometry(postW * 1.02, 0.14, postW * 1.02),
      new THREE.MeshStandardMaterial({
        color: 0xffc43a, roughness: 0.5, metalness: 0.3,
      })
    );
    yellowStripe.position.set(x, 0.22, 0);
    fence.add(yellowStripe);
  }

  // 双横杆
  const railLen = ROOM_SIZE - 1.0;
  for (const [y, h] of [[0.25, 0.04], [0.60, 0.04]]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(railLen, h, postW * 0.6), matRail
    );
    rail.position.set(0, y, 0);
    rail.castShadow = true;
    fence.add(rail);
  }

  return fence;
}

// 天花板灯具（荧光灯管风格）
function createCeilingLights() {
  const group = new THREE.Group();

  // 灯壳体（白色方盒）
  const housingMat = new THREE.MeshStandardMaterial({
    color: 0xe8e8ea, roughness: 0.6, metalness: 0.15,
  });
  // 灯管（自发光，不参与真实光照）
  const tubeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.3, metalness: 0.0,
    emissive: 0xfffaf0, emissiveIntensity: 1.2,
    toneMapped: true,
  });

  const layout = [
    { x: -18, z: -14 }, { x: 18, z: -14 },
    { x: -18, z: 0 },   { x: 18, z: 0 },
    { x: -18, z: 14 },  { x: 18, z: 14 },
  ];

  for (const { x, z } of layout) {
    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.12, 0.4), housingMat
    );
    housing.position.set(x, CEILING_H - 0.06, z);
    housing.castShadow = false;
    group.add(housing);

    // 两根灯管
    for (const tz of [-0.10, 0.10]) {
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 1.7, 10), tubeMat
      );
      tube.rotation.z = Math.PI / 2;
      tube.position.set(x, CEILING_H - 0.12, z + tz);
      group.add(tube);
    }
  }

  return group;
}

// 墙面窗户（大玻璃窗，参考示例图）
function createWindows() {
  const group = new THREE.Group();
  const half = ROOM_SIZE / 2;

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x4a4d53, roughness: 0.5, metalness: 0.5,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x8ec4d8, roughness: 0.05, metalness: 0.0,
    transparent: true, opacity: 0.35,
    emissive: 0x3a5a6a, emissiveIntensity: 0.15,
  });

  // 后墙（玩家面向的墙）左侧一个大窗
  const winX = -half * 0.55;
  const winW = 9, winH = 3.8;
  const winY = 5.0;

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(winW + 0.16, winH + 0.16, 0.10), frameMat
  );
  frame.position.set(winX, winY, -half + 0.05);
  group.add(frame);

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(winW, winH), glassMat
  );
  glass.position.set(winX, winY, -half + 0.11);
  glass.receiveShadow = true;
  group.add(glass);

  // 窗框十字分割
  const midFrame1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.10, winH, 0.12), frameMat
  );
  midFrame1.position.set(winX, winY, -half + 0.10);
  group.add(midFrame1);

  const midFrame2 = new THREE.Mesh(
    new THREE.BoxGeometry(winW, 0.10, 0.12), frameMat
  );
  midFrame2.position.set(winX, winY, -half + 0.10);
  group.add(midFrame2);

  return group;
}

// 目标区地面标识（简洁版）
function createTargetZoneMark() {
  const g = new THREE.Group();
  const half = ROOM_SIZE / 2;

  const lineMat = new THREE.MeshBasicMaterial({
    color: 0x66666b, transparent: true, opacity: 0.35, depthWrite: false,
  });

  const zCenter = -(half / 2);
  const zLen = half - 2;
  for (const x of [-(ROOM_SIZE / 2 - 3), ROOM_SIZE / 2 - 3]) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.08, zLen), lineMat);
    line.rotation.set(-Math.PI / 2, 0, 0);
    line.position.set(x, 0.015, zCenter);
    g.add(line);
  }

  return g;
}

// ---------------- 房间构建 ----------------

function buildRoom(wallColor, floorColor, groutColor) {
  const root = new THREE.Group();
  const half = ROOM_SIZE / 2;

  const wallMat = makeWallMaterial(wallColor, 0.82);
  const floorMat = makeFloorMaterial(floorColor, groutColor, 4);
  const ceilMat = makeWallMaterial(wallColor, 0.88);

  const sideGeo = new THREE.PlaneGeometry(ROOM_SIZE, CEILING_H);
  const walls = [
    { pos: [0, CEILING_H / 2, -half], rot: [0, 0, 0] },
    { pos: [0, CEILING_H / 2, half], rot: [0, Math.PI, 0] },
    { pos: [-half, CEILING_H / 2, 0], rot: [0, Math.PI / 2, 0] },
    { pos: [half, CEILING_H / 2, 0], rot: [0, -Math.PI / 2, 0] },
  ];
  for (const w of walls) {
    const mesh = new THREE.Mesh(sideGeo, wallMat);
    mesh.position.set(...w.pos);
    mesh.rotation.set(...w.rot);
    mesh.receiveShadow = true;
    root.add(mesh);
  }

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE), floorMat);
  floor.rotation.set(-Math.PI / 2, 0, 0);
  floor.receiveShadow = true;
  root.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE), ceilMat);
  ceiling.rotation.set(Math.PI / 2, 0, 0);
  ceiling.position.set(0, CEILING_H, 0);
  ceiling.receiveShadow = true;
  root.add(ceiling);

  return root;
}

// ---------------- 三套主题 ----------------

function buildTraining() {
  const root = new THREE.Group();

  const room = buildRoom('#e4e1dc', '#d4d1cc', '#b8b5af');
  root.add(room);

  root.add(createCeilingLights());
  root.add(createWindows());
  root.add(createCleanFence());
  root.add(createTargetZoneMark());
  root.add(buildLights.training());

  return { root, animate: null };
}

function buildDusk() {
  const root = new THREE.Group();

  const room = buildRoom('#d8c8b5', '#c8b8a5', '#a89680');
  root.add(room);

  root.add(createCeilingLights());
  root.add(createCleanFence());
  root.add(createTargetZoneMark());
  root.add(buildLights.dusk());

  return { root, animate: null };
}

function buildNeon() {
  const root = new THREE.Group();

  const room = buildRoom('#3a4250', '#2e3644', '#1e2430');
  root.add(room);

  root.add(createCeilingLights());
  root.add(createCleanFence());
  root.add(createTargetZoneMark());
  root.add(buildLights.neon());

  return { root, animate: null };
}

// ---------------- 光照 ----------------
// 统一柔和均匀风格，降低高光，避免强对比和体积光效果
const buildLights = {
  training() {
    const g = new THREE.Group();
    // 柔和环境光（主要照明，无强对比）
    g.add(new THREE.AmbientLight(0xf5f3ef, 0.68));
    // 半球光（柔和天光/地板反射）
    g.add(new THREE.HemisphereLight(0xfff8ee, 0xbab7b0, 0.55));

    // 主方向光：柔和漫射，低阴影对比度
    const key = new THREE.DirectionalLight(0xfffdf6, 0.85);
    key.position.set(8, 20, -12);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -32;
    key.shadow.camera.right = 32;
    key.shadow.camera.top = 32;
    key.shadow.camera.bottom = -32;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 80;
    key.shadow.bias = -0.0008;
    key.shadow.normalBias = 0.04;
    // 低阴影暗度，避免强对比
    key.shadow.darkness = 0.35;
    g.add(key);

    // 补光（柔化暗部）
    const fill = new THREE.DirectionalLight(0xfff8ee, 0.30);
    fill.position.set(-12, 12, 10);
    g.add(fill);

    return g;
  },

  dusk() {
    const g = new THREE.Group();
    g.add(new THREE.AmbientLight(0x8a6f5a, 0.52));
    g.add(new THREE.HemisphereLight(0xffc48a, 0x4a3a2c, 0.48));

    const key = new THREE.DirectionalLight(0xffb472, 1.0);
    key.position.set(-22, 12, -30);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -32;
    key.shadow.camera.right = 32;
    key.shadow.camera.top = 32;
    key.shadow.camera.bottom = -32;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 90;
    key.shadow.bias = -0.0008;
    key.shadow.normalBias = 0.04;
    key.shadow.darkness = 0.45;
    g.add(key);

    return g;
  },

  neon() {
    const g = new THREE.Group();
    g.add(new THREE.AmbientLight(0x485262, 0.55));
    g.add(new THREE.HemisphereLight(0x4a5a72, 0x1a2030, 0.5));

    const key = new THREE.DirectionalLight(0x8ca0c0, 0.55);
    key.position.set(10, 22, 18);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -32;
    key.shadow.camera.right = 32;
    key.shadow.camera.top = 32;
    key.shadow.camera.bottom = -32;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 80;
    key.shadow.bias = -0.0008;
    key.shadow.normalBias = 0.04;
    key.shadow.darkness = 0.4;
    g.add(key);

    return g;
  },
};

// ---------------- 主题缓存 / 激活 ----------------

const themeCache = new Map();
let activeEntry = null;
let activeKey = null;

function buildTheme(key) {
  if (key === 'dusk') return buildDusk();
  if (key === 'neon') return buildNeon();
  return buildTraining();
}

export function activateTheme(scene, key = 'training', renderer = null) {
  const safeKey = SCENES[key] ? key : 'training';
  if (activeKey === safeKey) return;

  if (activeEntry) scene.remove(activeEntry.root);

  let entry = themeCache.get(safeKey);
  if (!entry) {
    entry = buildTheme(safeKey);
    themeCache.set(safeKey, entry);
  }

  const def = SCENES[safeKey];
  scene.background = new THREE.Color(def.background);
  scene.fog = new THREE.Fog(def.fog.color, def.fog.near, def.fog.far);
  if (renderer) renderer.toneMappingExposure = def.exposure;

  scene.add(entry.root);
  activeEntry = entry;
  activeKey = safeKey;
}

export function getActiveSceneKey() {
  return activeKey;
}

export function updateScene(dt, elapsed) {
  updateModels(dt);
  if (activeEntry && activeEntry.animate) activeEntry.animate(elapsed, dt);
}
