// 多主题场景工厂：灰白训练场 / 黄昏废墟 / 夜景霓虹靶场
// 三套主题都按需构建并缓存（切换时只做场景图增删，不重建纹理与几何体）
// 纹理按样式缓存后 clone 共享 image，仅 repeat 不同，显存占用可控
import * as THREE from 'three';
import {
  makeBrickTexture,
  makeBrickNormalTexture,
  makeTileTexture,
} from './textures.js';
import { decorateTheme, updateModels } from './models.js';

const ROOM_SIZE = 60;
const CEILING_H = 12;

// 场景定义：UI 用 label / tag，渲染用背景色、雾、曝光
export const SCENES = {
  training: {
    label: '灰白训练场',
    tag: 'TRAINING YARD',
    desc: '明亮灰白砖瓦，适合日常练枪',
    background: 0xd9d6d0,
    fog: { color: 0xd9d6d0, near: 45, far: 110 },
    exposure: 1.3,
  },
  dusk: {
    label: '黄昏废墟',
    tag: 'DUSK RUINS',
    desc: '夕阳余晖下的断壁残垣',
    background: 0x241826,
    fog: { color: 0x8f5f4c, near: 26, far: 118 },
    exposure: 1.15,
  },
  neon: {
    label: '夜景霓虹靶场',
    tag: 'NEON RANGE',
    desc: '深夜霓虹灯下的高对比靶场',
    background: 0x04060d,
    fog: { color: 0x060a15, near: 22, far: 92 },
    exposure: 1.2,
  },
};

// ---------------- 纹理 / 材质缓存 ----------------

const texCache = {};

function cached(key, factory) {
  if (!texCache[key]) texCache[key] = factory();
  return texCache[key];
}

const WALL_CFG = { base: '#dcd9d3', mortar: '#8d8a84', darkShift: 26, contrast: 1.25 };
const WALL_CFG_B = { base: '#e4e1db', mortar: '#96938d', darkShift: 22, contrast: 1.1 };
const CEIL_CFG = { base: '#cfccc6', mortar: '#87847e', darkShift: 24, contrast: 1.15 };

function getBrickMaps(styleKey, cfg, repeatX, repeatY, normalStrength = 0.55) {
  const base = cached('brick-' + styleKey, () => ({
    map: makeBrickTexture({
      width: 1024, height: 1024, rows: 14, cols: 8,
      baseColor: cfg.base,
      mortarColor: cfg.mortar,
      darkShift: cfg.darkShift,
      contrast: cfg.contrast,
    }),
    normal: makeBrickNormalTexture({
      width: 1024, height: 1024, rows: 14, cols: 8, strength: normalStrength,
    }),
  }));

  const map = base.map.clone();
  map.needsUpdate = true;
  map.repeat.set(repeatX, repeatY);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;

  const normal = base.normal.clone();
  normal.needsUpdate = true;
  normal.repeat.set(repeatX, repeatY);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;

  return { map, normal };
}

function makeBrickMaterial(styleKey, cfg, repeatX, repeatY, {
  color = 0xffffff,
  roughness = 0.88,
  metalness = 0.02,
  normalStrength = 0.55,
} = {}) {
  const { map, normal } = getBrickMaps(styleKey, cfg, repeatX, repeatY, normalStrength);
  return new THREE.MeshStandardMaterial({
    map,
    normalMap: normal,
    normalScale: new THREE.Vector2(0.55, 0.55),
    color,
    roughness,
    metalness,
  });
}

function makeFloorMaterial({
  color = 0xffffff,
  roughness = 0.78,
  metalness = 0.04,
  repeat = 3,
} = {}) {
  const tex = cached('floor-tile', () => {
    const t = makeTileTexture({
      width: 1024, height: 1024, size: 8,
      tileColor: '#c9c6c0',
      groutColor: '#8a8781',
    });
    t.repeat.set(3, 3);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }).clone();
  tex.needsUpdate = true;
  tex.repeat.set(repeat, repeat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;

  return new THREE.MeshStandardMaterial({
    map: tex,
    color,
    roughness,
    metalness,
  });
}

function getGlowTexture() {
  return cached('glow', () => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255, 240, 205, 1)');
    grad.addColorStop(0.22, 'rgba(255, 183, 110, 0.75)');
    grad.addColorStop(0.55, 'rgba(255, 120, 70, 0.22)');
    grad.addColorStop(1, 'rgba(255, 90, 60, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

// ---------------- 通用构件 ----------------

// 围栏：立柱 + 双横杆 + 竖连杆（实例化），可配置配色与霓虹描边
function createFence({
  postColor = 0x6f6b65,
  railColor = 0x7d7973,
  roughness = 0.42,
  metalness = 0.85,
  neonEdge = null,
} = {}) {
  const fence = new THREE.Group();
  const half = ROOM_SIZE / 2;

  const matPost = new THREE.MeshStandardMaterial({ color: postColor, roughness, metalness });
  const matRail = new THREE.MeshStandardMaterial({ color: railColor, roughness, metalness });

  const postH = 1.25, postW = 0.085, railW = 0.055;
  const railY1 = 0.52, railY2 = 1.02;

  const spacing = 3.6;
  const postCount = Math.floor(ROOM_SIZE / spacing) + 1;
  const startX = -half + (ROOM_SIZE - (postCount - 1) * spacing) / 2;

  const postGeo = new THREE.BoxGeometry(postW, postH, postW);
  const capGeo = new THREE.BoxGeometry(postW * 1.15, 0.06, postW * 1.15);

  for (let i = 0; i < postCount; i++) {
    const x = startX + i * spacing;
    const post = new THREE.Mesh(postGeo, matPost);
    post.position.set(x, postH / 2, 0);
    post.castShadow = true;
    post.receiveShadow = true;
    fence.add(post);

    const cap = new THREE.Mesh(capGeo, matPost);
    cap.position.set(x, postH - 0.03, 0);
    fence.add(cap);
  }

  const railLen = ROOM_SIZE - 1.4;
  for (const y of [railY1, railY2]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(railLen, railW, postW), matRail
    );
    rail.position.set(0, y, 0);
    rail.castShadow = true;
    fence.add(rail);
  }

  // 竖连杆（实例化，避免几十个独立 Mesh 拖累 draw call）
  const linkH = railY2 - railY1;
  const linkGeo = new THREE.BoxGeometry(0.028, linkH, 0.028);
  const countPerSpan = Math.floor(spacing / 0.34);
  const totalLinks = (postCount - 1) * (countPerSpan - 1);
  const instanced = new THREE.InstancedMesh(linkGeo, matRail, totalLinks);
  instanced.castShadow = false;
  const dummy = new THREE.Object3D();
  let idx = 0;
  for (let i = 0; i < postCount - 1; i++) {
    const x0 = startX + i * spacing;
    for (let s = 1; s < countPerSpan; s++) {
      dummy.position.set(x0 + s * (spacing / countPerSpan), (railY1 + railY2) / 2, 0);
      dummy.updateMatrix();
      instanced.setMatrixAt(idx++, dummy.matrix);
    }
  }
  instanced.count = idx;
  instanced.instanceMatrix.needsUpdate = true;
  fence.add(instanced);

  // 霓虹场景：横杆上加一条发光描边
  if (neonEdge !== null) {
    const edgeMat = new THREE.MeshBasicMaterial({ color: neonEdge, toneMapped: false });
    for (const y of [railY1, railY2]) {
      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(railLen, 0.028, 0.028), edgeMat
      );
      edge.position.set(0, y + railW / 2, 0);
      fence.add(edge);
    }
  }

  return fence;
}

// 目标半区地面标识：浅色勾勒线，帮玩家快速定位射击区
function createTargetZoneMark({
  color = 0x8f8b84,
  opacity = 0.55,
  hintColor = 0x9a968f,
  hintOpacity = 0.28,
} = {}) {
  const g = new THREE.Group();
  const half = ROOM_SIZE / 2;

  const lineMat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, depthWrite: false,
  });

  const zCenter = -(half / 2);
  const zLen = half - 2;
  for (const x of [-(ROOM_SIZE / 2 - 3), ROOM_SIZE / 2 - 3]) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.12, zLen), lineMat);
    line.rotation.set(-Math.PI / 2, 0, 0);
    line.position.set(x, 0.02, zCenter);
    g.add(line);
  }

  const hintMat = new THREE.MeshBasicMaterial({
    color: hintColor, transparent: true, opacity: hintOpacity, depthWrite: false,
  });
  const hint = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_SIZE - 6, 1.4), hintMat);
  hint.rotation.set(-Math.PI / 2, 0, 0);
  hint.position.set(0, 0.02, 2);
  g.add(hint);

  return g;
}

function addSquareRoom(group, wallMat, floorMat, ceilMat) {
  const half = ROOM_SIZE / 2;

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
    group.add(mesh);
  }

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE), floorMat);
  floor.rotation.set(-Math.PI / 2, 0, 0);
  floor.receiveShadow = true;
  group.add(floor);

  if (ceilMat) {
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE), ceilMat);
    ceiling.rotation.set(Math.PI / 2, 0, 0);
    ceiling.position.set(0, CEILING_H, 0);
    ceiling.receiveShadow = true;
    group.add(ceiling);
  }
}

// ---------------- 主题 1：灰白训练场 ----------------

function buildTraining() {
  const root = new THREE.Group();

  const wallMat = makeBrickMaterial('wall', WALL_CFG, 4, 1);
  const backMat = makeBrickMaterial('wallB', WALL_CFG_B, 4, 1);
  const ceilMat = makeBrickMaterial('ceil', CEIL_CFG, 4, 4);
  const floorMat = makeFloorMaterial({ repeat: 3 });

  // 四面墙：前后用稍亮的砖，左右用常规砖（与原版观感一致）
  const half = ROOM_SIZE / 2;
  const walls = [
    { pos: [0, CEILING_H / 2, -half], rot: [0, 0, 0], mat: backMat },
    { pos: [0, CEILING_H / 2, half], rot: [0, Math.PI, 0], mat: backMat },
    { pos: [-half, CEILING_H / 2, 0], rot: [0, Math.PI / 2, 0], mat: wallMat },
    { pos: [half, CEILING_H / 2, 0], rot: [0, -Math.PI / 2, 0], mat: wallMat },
  ];
  const sideGeo = new THREE.PlaneGeometry(ROOM_SIZE, CEILING_H);
  for (const w of walls) {
    const mesh = new THREE.Mesh(sideGeo, w.mat);
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

  // 墙角砖柱收边
  const pillarMap = cached('pillar', () => {
    const t = makeBrickTexture({
      width: 512, height: 512, rows: 10, cols: 4,
      baseColor: '#d3cfc9', mortarColor: '#85827c', darkShift: 28, contrast: 1.3,
    });
    t.repeat.set(1, 4);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });
  const pillarMat = new THREE.MeshStandardMaterial({
    map: pillarMap, color: 0xffffff, roughness: 0.9, metalness: 0.02,
  });

  const pillarGeo = new THREE.BoxGeometry(0.9, CEILING_H, 0.9);
  for (const [x, z] of [
    [half - 0.45, -half + 0.45], [-half + 0.45, -half + 0.45],
    [half - 0.45, half - 0.45], [-half + 0.45, half - 0.45],
  ]) {
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(x, CEILING_H / 2, z);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    root.add(pillar);
  }

  // 踢脚线
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x9a968f, roughness: 0.6, metalness: 0.35,
  });
  const baseH = 0.14, baseD = 0.07;
  for (const x of [-half, half]) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(baseD, baseH, ROOM_SIZE), baseMat);
    base.position.set(Math.sign(x) * (half - baseD / 2), baseH / 2, 0);
    base.receiveShadow = true;
    root.add(base);
  }
  for (const z of [-half, half]) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(ROOM_SIZE, baseH, baseD), baseMat);
    base.position.set(0, baseH / 2, Math.sign(z) * (half - baseD / 2));
    base.receiveShadow = true;
    root.add(base);
  }

  root.add(createFence());
  root.add(createTargetZoneMark());
  root.add(buildTrainingLights());

  return { root, animate: null };
}

function buildTrainingLights() {
  const group = new THREE.Group();

  group.add(new THREE.AmbientLight(0xf2f0ea, 0.72));

  const key = new THREE.DirectionalLight(0xfffdf8, 1.35);
  key.position.set(10, 22, -14);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -34;
  key.shadow.camera.right = 34;
  key.shadow.camera.top = 34;
  key.shadow.camera.bottom = -34;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 80;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  group.add(key);

  const fill = new THREE.DirectionalLight(0xffe4bf, 0.42);
  fill.position.set(-14, 9, 12);
  group.add(fill);

  group.add(new THREE.HemisphereLight(0xffffff, 0x8f8b85, 0.45));

  return group;
}

// ---------------- 主题 2：黄昏废墟 ----------------

function buildDuskSky() {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(95, 32, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x150f24) },
        midColor: { value: new THREE.Color(0x87393c) },
        lowColor: { value: new THREE.Color(0xff9a55) },
      },
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 lowColor;
        varying vec3 vPos;
        void main() {
          float h = normalize(vPos).y;
          vec3 col = mix(lowColor, midColor, smoothstep(-0.08, 0.24, h));
          col = mix(col, topColor, smoothstep(0.22, 0.8, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })
  );
  sky.renderOrder = -1;
  sky.frustumCulled = false;
  return sky;
}

function buildSunGlow() {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: getGlowTexture(),
    color: 0xffc98a,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  }));
  sprite.position.set(-42, 27, -72);
  sprite.scale.set(46, 46, 1);
  return sprite;
}

// 残破石墙：每面切成 4 段，用不同的高度制造参差天际线
function addRuinedWalls(root, mat) {
  const half = ROOM_SIZE / 2;
  const segLen = ROOM_SIZE / 4;
  const sides = [
    { rot: [0, 0, 0], heights: [11.5, 9.5, 13, 10.5] },
    { rot: [0, Math.PI, 0], heights: [10, 12.5, 9, 11.5] },
    { rot: [0, Math.PI / 2, 0], heights: [11, 13, 9.5, 12] },
    { rot: [0, -Math.PI / 2, 0], heights: [9.5, 11, 12.5, 10] },
  ];

  sides.forEach((side, sideIndex) => {
    const heights = side.heights;
    for (let i = 0; i < heights.length; i++) {
      const h = heights[i];
      const offset = -half + segLen / 2 + i * segLen;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(segLen - 0.35, h), mat);
      mesh.rotation.set(...side.rot);
      // 0/1 为前后墙（沿 X 排布），2/3 为左右墙（沿 Z 排布）
      if (sideIndex < 2) mesh.position.set(offset, h / 2, sideIndex === 0 ? -half : half);
      else mesh.position.set(sideIndex === 2 ? -half : half, h / 2, offset);
      mesh.receiveShadow = true;
      root.add(mesh);
    }
  });
}

function addRuinedColumns(root, mat) {
  const columns = [
    [-27.6, -24, 8.4], [-27.6, -8, 6.2], [-27.6, 12, 7.3],
    [27.6, -24, 5.5], [27.6, -8, 8.0], [27.6, 12, 6.6],
    [-15, -27.4, 7.0], [11, -27.4, 5.3],
    [-15, 27.4, 6.4], [13, 27.4, 8.1],
  ];
  const geo = new THREE.CylinderGeometry(0.62, 0.74, 1, 8);
  for (const [x, z, h] of columns) {
    const col = new THREE.Mesh(geo, mat);
    col.scale.y = h;
    col.position.set(x, h / 2, z);
    col.rotation.y = Math.random() * Math.PI;
    col.castShadow = true;
    col.receiveShadow = true;
    root.add(col);
  }

  // 倒塌的柱段（围栏后侧，不影响射击区）
  const fallen = new THREE.Mesh(geo, mat);
  fallen.scale.y = 4.6;
  fallen.rotation.set(0, 0, Math.PI / 2.2);
  fallen.rotation.y = 0.4;
  fallen.position.set(18, 0.78, 7.5);
  fallen.castShadow = true;
  fallen.receiveShadow = true;
  root.add(fallen);

  // 断裂横梁
  const beamMat = new THREE.MeshStandardMaterial({
    color: 0x6d5f52, roughness: 0.9, metalness: 0.05,
  });
  for (const [x, z, ry] of [[-10, 9, 0.5], [6, 12, -0.35]]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(7, 0.42, 0.42), beamMat);
    beam.position.set(x, 0.23, z);
    beam.rotation.y = ry;
    beam.castShadow = true;
    beam.receiveShadow = true;
    root.add(beam);
  }
}

function addRubble(root, count = 90) {
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.96, metalness: 0.02, flatShading: true,
  });
  const instanced = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();
  const colorA = new THREE.Color(0x9c8a76);
  const colorB = new THREE.Color(0x6d6152);
  const tmp = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const edge = Math.floor(Math.random() * 4);
    const inset = 1 + Math.random() * 4;
    const span = (Math.random() * 2 - 1) * (ROOM_SIZE / 2 - 1);
    let x, z;
    if (edge === 0) { x = span; z = -ROOM_SIZE / 2 + inset; }
    else if (edge === 1) { x = span; z = ROOM_SIZE / 2 - inset; }
    else if (edge === 2) { x = -ROOM_SIZE / 2 + inset; z = span; }
    else { x = ROOM_SIZE / 2 - inset; z = span; }

    const s = 0.22 + Math.random() * 0.52;
    dummy.position.set(x, s * 0.4, z);
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    dummy.scale.set(
      s * (0.8 + Math.random() * 0.5),
      s * (0.5 + Math.random() * 0.35),
      s * (0.8 + Math.random() * 0.5)
    );
    dummy.updateMatrix();
    instanced.setMatrixAt(i, dummy.matrix);

    tmp.copy(Math.random() < 0.5 ? colorA : colorB).offsetHSL(0, 0, (Math.random() - 0.5) * 0.07);
    instanced.setColorAt(i, tmp);
  }
  instanced.instanceMatrix.needsUpdate = true;
  instanced.castShadow = true;
  instanced.receiveShadow = true;
  root.add(instanced);
}

function buildDusk() {
  const root = new THREE.Group();

  root.add(buildDuskSky());
  root.add(buildSunGlow());

  // 暖灰砂石墙（复用灰白砖纹理，靠材质 color 染色）
  const wallMat = makeBrickMaterial('wall', WALL_CFG, 4, 1, {
    color: 0xc0a68d, roughness: 0.96, metalness: 0.0, normalStrength: 0.75,
  });
  addRuinedWalls(root, wallMat);

  const floorMat = makeFloorMaterial({ color: 0xbca887, roughness: 0.9, metalness: 0.02 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE), floorMat);
  floor.rotation.set(-Math.PI / 2, 0, 0);
  floor.receiveShadow = true;
  root.add(floor);

  const columnMat = new THREE.MeshStandardMaterial({
    color: 0xa2907a, roughness: 0.92, metalness: 0.03, flatShading: true,
  });
  addRuinedColumns(root, columnMat);
  addRubble(root);

  root.add(createFence({
    postColor: 0x5b4535,
    railColor: 0x6b5140,
    roughness: 0.68,
    metalness: 0.55,
  }));
  root.add(createTargetZoneMark({
    color: 0xffd2a1,
    opacity: 0.5,
    hintColor: 0xd9b088,
    hintOpacity: 0.24,
  }));

  root.add(buildDuskLights());
  decorateTheme('dusk', root);

  return { root, animate: null };
}

function buildDuskLights() {
  const group = new THREE.Group();

  group.add(new THREE.AmbientLight(0x7a5a58, 0.4));
  group.add(new THREE.HemisphereLight(0xffb27a, 0x2a1b15, 0.55));

  // 夕阳主光：低角度暖光，投出长影子
  const key = new THREE.DirectionalLight(0xffb370, 2.45);
  key.position.set(-30, 17, -46);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -36;
  key.shadow.camera.right = 36;
  key.shadow.camera.top = 36;
  key.shadow.camera.bottom = -36;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 130;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.03;
  group.add(key);

  // 冷紫补光：拉开冷暖对比
  const fill = new THREE.DirectionalLight(0x6f5cff, 0.5);
  fill.position.set(22, 8, 32);
  group.add(fill);

  return group;
}

// ---------------- 主题 3：夜景霓虹靶场 ----------------

function addNeonBars(root) {
  const half = ROOM_SIZE / 2;
  const cyan = new THREE.Color(0x22e6ff);
  const magenta = new THREE.Color(0xff3fa4);
  const violet = new THREE.Color(0x7a5cff);

  const bars = [];
  let idx = 0;
  for (let x = -24; x <= 24; x += 6) {
    const h = 6.2 + ((x + 24) % 12) / 12 * 2.4;
    bars.push({ pos: [x, 0.25 + h / 2, -half + 0.35], h, color: (idx++ % 2) ? magenta : cyan });
  }
  for (let z = -24; z <= 24; z += 8) {
    for (const sign of [-1, 1]) {
      const h = 5.4 + Math.random() * 3.2;
      bars.push({ pos: [sign * (half - 0.35), 0.25 + h / 2, z], h, color: (idx++ % 3 === 0) ? violet : cyan });
    }
  }

  const coreGeo = new THREE.BoxGeometry(0.09, 1, 0.09);
  const glowGeo = new THREE.BoxGeometry(0.42, 1, 0.42);

  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });

  const core = new THREE.InstancedMesh(coreGeo, coreMat, bars.length);
  const glow = new THREE.InstancedMesh(glowGeo, glowMat, bars.length);
  const dummy = new THREE.Object3D();

  bars.forEach((b, i) => {
    dummy.position.set(...b.pos);
    dummy.scale.set(1, b.h, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    core.setMatrixAt(i, dummy.matrix);
    glow.setMatrixAt(i, dummy.matrix);
    core.setColorAt(i, b.color);
    glow.setColorAt(i, b.color);
  });
  core.instanceMatrix.needsUpdate = true;
  glow.instanceMatrix.needsUpdate = true;

  root.add(core);
  root.add(glow);

  // 天花板灯网
  const lineGeo = new THREE.BoxGeometry(ROOM_SIZE - 6, 0.05, 0.05);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const lines = new THREE.InstancedMesh(lineGeo, lineMat, 10);
  let n = 0;
  const lineColors = [cyan, magenta];
  for (let v = -20; v <= 20; v += 10) {
    dummy.position.set(0, CEILING_H - 0.16, v);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    lines.setMatrixAt(n, dummy.matrix);
    lines.setColorAt(n, lineColors[n % 2]);
    n++;

    dummy.position.set(v, CEILING_H - 0.16, 0);
    dummy.rotation.set(0, Math.PI / 2, 0);
    dummy.updateMatrix();
    lines.setMatrixAt(n, dummy.matrix);
    lines.setColorAt(n, lineColors[n % 2]);
    n++;
  }
  lines.instanceMatrix.needsUpdate = true;
  root.add(lines);

  return { coreMat, glowMat };
}

function buildNeon() {
  const root = new THREE.Group();

  const wallMat = makeBrickMaterial('wall', WALL_CFG, 4, 1, {
    color: 0x2b3a5c, roughness: 0.72, metalness: 0.35,
  });
  const ceilMat = makeBrickMaterial('ceil', CEIL_CFG, 4, 4, {
    color: 0x1a2036, roughness: 0.7, metalness: 0.4,
  });
  const floorMat = makeFloorMaterial({
    color: 0x1b2438, roughness: 0.3, metalness: 0.55,
  });
  addSquareRoom(root, wallMat, floorMat, ceilMat);

  const neon = addNeonBars(root);

  root.add(createFence({
    postColor: 0x2a3245,
    railColor: 0x333d55,
    roughness: 0.32,
    metalness: 0.88,
    neonEdge: 0x22e6ff,
  }));
  root.add(createTargetZoneMark({
    color: 0x4fe8ff,
    opacity: 0.68,
    hintColor: 0x2a4a66,
    hintOpacity: 0.35,
  }));

  const lights = buildNeonLights();
  root.add(lights.group);
  decorateTheme('neon', root);

  // 霓虹呼吸动画：灯带透明度 + 点光源强度轻微起伏
  const animate = (elapsed) => {
    neon.glowMat.opacity = 0.14 + 0.07 * Math.sin(elapsed * 1.8);
    lights.pointA.intensity = 42 + 8 * Math.sin(elapsed * 1.35);
    lights.pointB.intensity = 42 + 8 * Math.sin(elapsed * 1.35 + Math.PI);
  };

  return { root, animate };
}

function buildNeonLights() {
  const group = new THREE.Group();
  group.add(new THREE.AmbientLight(0x243055, 0.55));
  group.add(new THREE.HemisphereLight(0x1b2a4d, 0x04060a, 0.5));

  // 冷色方向光负责整体塑形与影子
  const key = new THREE.DirectionalLight(0x9fb4ff, 0.5);
  key.position.set(8, 24, 18);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -34;
  key.shadow.camera.right = 34;
  key.shadow.camera.top = 34;
  key.shadow.camera.bottom = -34;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 90;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  group.add(key);

  // 霓虹点光：目标区两侧的青 / 品红
  const makePoint = (color, pos, intensity) => {
    const light = new THREE.PointLight(color, intensity, 46, 2);
    light.position.set(...pos);
    light.castShadow = false;
    group.add(light);
    return light;
  };
  const pointA = makePoint(0x22e6ff, [-24, 6, -24], 42);
  const pointB = makePoint(0xff3fa4, [24, 6, -24], 42);
  makePoint(0xff3fa4, [-24, 6, 12], 30);
  makePoint(0x22e6ff, [24, 6, 12], 30);

  return { group, pointA, pointB };
}

// ---------------- 主题缓存 / 激活 ----------------

const themeCache = new Map();
let activeEntry = null;
let activeKey = null;

function buildTheme(key) {
  if (key === 'dusk') return buildDusk();
  if (key === 'neon') return buildNeon();
  return buildTraining();
}

// 切换主题：只操作场景图，主题内容按需构建并缓存
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

// 每帧更新：模型动画 + 当前主题的动态效果
export function updateScene(dt, elapsed) {
  updateModels(dt);
  if (activeEntry && activeEntry.animate) activeEntry.animate(elapsed, dt);
}
