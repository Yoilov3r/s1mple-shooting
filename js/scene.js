// 场景：灰白砖瓦质感超大正方体
// 6 面砖墙 + 砖地面 + 砖天花板 + z=0 金属围栏分隔两侧
// 性能要点：纹理只生成一次并 clone 复用（clone 共享 GPU image，仅参数不同）
import * as THREE from 'three';
import {
  makeBrickTexture,
  makeBrickNormalTexture,
  makeTileTexture,
} from './textures.js';

const ROOM_SIZE = 60;
const CEILING_H = 12;

// 砖瓦颜色主题：灰白为主，灰缝深灰制造对比
const THEME = {
  brickWall:   { base: '#dcd9d3', mortar: '#8d8a84', darkShift: 26, contrast: 1.25 },
  brickUpper:  { base: '#e4e1db', mortar: '#96938d', darkShift: 22, contrast: 1.1 },
  brickCeil:   { base: '#cfccc6', mortar: '#87847e', darkShift: 24, contrast: 1.15 },
  floorTile:   { tile: '#c9c6c0', grout: '#8a8781' },
};

// 全局纹理缓存：只生成一次，各面 clone 调整 repeat
const texCache = {};

function getBrickMaps(key, cfg, repeatX, repeatY) {
  if (!texCache[key]) {
    const map = makeBrickTexture({
      width: 1024, height: 1024,
      rows: 14, cols: 8,
      baseColor: cfg.base,
      mortarColor: cfg.mortar,
      darkShift: cfg.darkShift,
      contrast: cfg.contrast,
    });
    const normal = makeBrickNormalTexture({
      width: 1024, height: 1024, rows: 14, cols: 8, strength: 0.55,
    });
    texCache[key] = { map, normal };
  }

  // clone 共享 image 数据，仅修改 repeat —— 不额外占用显存
  const map = texCache[key].map.clone();
  map.needsUpdate = true;
  map.repeat.set(repeatX, repeatY);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;

  const normal = texCache[key].normal.clone();
  normal.needsUpdate = true;
  normal.repeat.set(repeatX, repeatY);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;

  return { map, normal };
}

function makeBrickMaterial(key, cfg, repeatX, repeatY) {
  const { map, normal } = getBrickMaps(key, cfg, repeatX, repeatY);
  return new THREE.MeshStandardMaterial({
    map,
    normalMap: normal,
    normalScale: new THREE.Vector2(0.55, 0.55),
    color: 0xffffff,
    roughness: 0.88,
    metalness: 0.02,
  });
}

export function createRoom(size = ROOM_SIZE) {
  const group = new THREE.Group();
  const half = size / 2;

  // ---------- 四面砖墙（内壁可见） ----------
  // 每面 60x12 米，砖纹按 4x1 重复（砖块比例接近真实）
  const sideMat = makeBrickMaterial('wall', THEME.brickWall, 4, 1);
  const backMat = makeBrickMaterial('wallB', THEME.brickUpper, 4, 1);

  const sideGeo = new THREE.PlaneGeometry(size, CEILING_H);

  const walls = [
    { pos: [0, CEILING_H / 2, -half], rot: [0, 0, 0],            mat: backMat }, // 正前方（玩家初始面向）
    { pos: [0, CEILING_H / 2,  half], rot: [0, Math.PI, 0],      mat: backMat }, // 背后
    { pos: [-half, CEILING_H / 2, 0], rot: [0, Math.PI / 2, 0],  mat: sideMat }, // 左
    { pos: [ half, CEILING_H / 2, 0], rot: [0, -Math.PI / 2, 0], mat: sideMat }, // 右
  ];
  for (const w of walls) {
    const mesh = new THREE.Mesh(sideGeo, w.mat);
    mesh.position.set(...w.pos);
    mesh.rotation.set(...w.rot);
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // ---------- 砖地面 ----------
  const floorTex = makeTileTexture({
    width: 1024, height: 1024, size: 8,
    tileColor: THEME.floorTile.tile,
    groutColor: THEME.floorTile.grout,
  });
  floorTex.repeat.set(3, 3);
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshStandardMaterial({
      map: floorTex,
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.04,
    })
  );
  floor.rotation.set(-Math.PI / 2, 0, 0);
  floor.receiveShadow = true;
  group.add(floor);

  // ---------- 砖天花板 ----------
  const ceilMat = makeBrickMaterial('ceil', THEME.brickCeil, 4, 4);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(size, size), ceilMat);
  ceiling.rotation.set(Math.PI / 2, 0, 0);
  ceiling.position.set(0, CEILING_H, 0);
  ceiling.receiveShadow = true;
  group.add(ceiling);

  // ---------- 墙角砖柱收边（打破空旷感） ----------
  const pillarMap = makeBrickTexture({
    width: 512, height: 512, rows: 10, cols: 4,
    baseColor: '#d3cfc9', mortarColor: '#85827c', darkShift: 28, contrast: 1.3,
  });
  pillarMap.repeat.set(1, 4);
  pillarMap.wrapS = pillarMap.wrapT = THREE.RepeatWrapping;
  const pillarMat = new THREE.MeshStandardMaterial({
    map: pillarMap, color: 0xffffff, roughness: 0.9, metalness: 0.02,
  });

  const pillarGeo = new THREE.BoxGeometry(0.9, CEILING_H, 0.9);
  for (const [x, z] of [
    [ half - 0.45, -half + 0.45], [-half + 0.45, -half + 0.45],
    [ half - 0.45,  half - 0.45], [-half + 0.45,  half - 0.45],
  ]) {
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(x, CEILING_H / 2, z);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);
  }

  // ---------- 踢脚线 ----------
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x9a968f, roughness: 0.6, metalness: 0.35,
  });
  const baseH = 0.14, baseD = 0.07;
  for (const x of [-half, half]) {
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(baseD, baseH, size), baseMat
    );
    base.position.set(Math.sign(x) * (half - baseD / 2), baseH / 2, 0);
    base.receiveShadow = true;
    group.add(base);
  }
  for (const z of [-half, half]) {
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(size, baseH, baseD), baseMat
    );
    base.position.set(0, baseH / 2, Math.sign(z) * (half - baseD / 2));
    base.receiveShadow = true;
    group.add(base);
  }

  // ---------- 中央围栏（z=0 分隔两侧） ----------
  group.add(createFence(size));

  // ---------- 目标半区地面标识（-Z 侧，强化"射击区"的视觉引导） ----------
  group.add(createTargetZoneMark(size));

  return group;
}

// 围栏：立柱 + 双横杆 + 竖连杆，哑光金属
function createFence(roomSize) {
  const fence = new THREE.Group();
  const half = roomSize / 2;

  const matPost = new THREE.MeshStandardMaterial({
    color: 0x6f6b65, roughness: 0.42, metalness: 0.85,
  });
  const matRail = new THREE.MeshStandardMaterial({
    color: 0x7d7973, roughness: 0.38, metalness: 0.8,
  });

  const postH = 1.25, postW = 0.085, railW = 0.055;
  const railY1 = 0.52, railY2 = 1.02;

  const spacing = 3.6;
  const postCount = Math.floor(roomSize / spacing) + 1;
  const startX = -half + (roomSize - (postCount - 1) * spacing) / 2;

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

  const railLen = roomSize - 1.4;
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

  return fence;
}

// 前方射击区地面标识：浅色带状勾勒，帮玩家快速定位目标区
function createTargetZoneMark(roomSize) {
  const g = new THREE.Group();
  const half = roomSize / 2;

  const lineMat = new THREE.MeshBasicMaterial({
    color: 0x8f8b84, transparent: true, opacity: 0.55, depthWrite: false,
  });

  // 左右两条竖向边界线（位于 -Z 半区两侧）
  const zCenter = -(half / 2);
  const zLen = half - 2;
  for (const x of [-(roomSize / 2 - 3), roomSize / 2 - 3]) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.12, zLen), lineMat);
    line.rotation.set(-Math.PI / 2, 0, 0);
    line.position.set(x, 0.02, zCenter);
    g.add(line);
  }

  // 围栏另一侧（+Z）铺一条较暗的提示带
  const hintMat = new THREE.MeshBasicMaterial({
    color: 0x9a968f, transparent: true, opacity: 0.28, depthWrite: false,
  });
  const hint = new THREE.Mesh(new THREE.PlaneGeometry(roomSize - 6, 1.4), hintMat);
  hint.rotation.set(-Math.PI / 2, 0, 0);
  hint.position.set(0, 0.02, 2);
  g.add(hint);

  return g;
}

// 光照：明亮中性 + 顶部主光 + 冷暖补光，保证灰白场景有层次
export function createLights() {
  const group = new THREE.Group();

  group.add(new THREE.AmbientLight(0xf2f0ea, 0.72));

  // 主光：顶部偏后，投射清晰阴影
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

  // 暖色补光：削弱灰白发死的观感
  const fill = new THREE.DirectionalLight(0xffe4bf, 0.42);
  fill.position.set(-14, 9, 12);
  group.add(fill);

  // 半球光：天顶偏白，地面偏灰
  group.add(new THREE.HemisphereLight(0xffffff, 0x8f8b85, 0.45));

  return group;
}
