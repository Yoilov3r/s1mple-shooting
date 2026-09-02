// 场景内容：深色灰砖围墙 + 暗色地面 + 霓虹灯光（Aim Rush 风格）
import * as THREE from 'three';
import { makeBrickTexture, makeGroundTexture, makeBrickNormalTexture } from './textures.js';

function makeWallMaterial(texture, normalMap, repeatX, repeatY, color = 0x2a2e3a) {
  const tex = texture.clone();
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  return new THREE.MeshStandardMaterial({
    map: tex,
    normalMap: normalMap,
    normalScale: new THREE.Vector2(0.8, 0.8),
    color: color,
    roughness: 0.7,
    metalness: 0.1,
  });
}

// 构建场景：四面深色砖墙 + 暗色地面 + 霓虹氛围
export function createRoom(size = 60) {
  const group = new THREE.Group();
  const half = size / 2;
  const wallH = size;

  // 深色砖瓦纹理
  const brickTex = makeBrickTexture({
    width: 1024, height: 1024,
    rows: 14, cols: 8,
    baseColor: '#2a2e3a',
    mortarColor: '#1a1e28',
    darkShift: 15,
    contrast: 1.5,
  });
  const brickNormal = makeBrickNormalTexture({ width: 1024, height: 1024 });

  const geo = new THREE.PlaneGeometry(size, size, 1, 1);

  const matX = makeWallMaterial(brickTex, brickNormal, 4, 3, 0x2a2e3a);
  const matZ = makeWallMaterial(brickTex, brickNormal, 4, 3, 0x262a36);

  // --- 地面：深色水泥纹理 ---
  const groundTex = makeGroundTexture({
    width: 1024, height: 1024,
    baseColor: '#0d0f14',
    crackColor: '#1a1c22',
    stainColor: '#12141a',
  });
  const matGround = new THREE.MeshStandardMaterial({
    map: groundTex,
    color: 0x0d0f14,
    roughness: 0.75,
    metalness: 0.2,
  });

  // --- 天空穹顶：深色渐变 ---
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 1024; skyCanvas.height = 512;
  const ctx = skyCanvas.getContext('2d');
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 512);
  skyGrad.addColorStop(0, '#0a0c14');
  skyGrad.addColorStop(0.4, '#0e121e');
  skyGrad.addColorStop(0.7, '#121828');
  skyGrad.addColorStop(0.9, '#1a1e2e');
  skyGrad.addColorStop(1, '#1e2230');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 1024, 512);
  // 星星
  for (let i = 0; i < 120; i++) {
    const sx = Math.random() * 1024;
    const sy = Math.random() * 256;
    const br = 100 + Math.random() * 155;
    ctx.fillStyle = `rgb(${br},${br},${br})`;
    ctx.fillRect(sx, sy, 1 + Math.random() * 0.5, 1 + Math.random() * 0.5);
  }
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  const skyGeo = new THREE.SphereGeometry(half * 2.5, 32, 16);
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTex,
    side: THREE.BackSide,
    fog: false,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  group.add(sky);

  // --- 四面墙 ---
  const walls = [
    { pos: [ half, wallH / 2, 0], rot: [0,  Math.PI / 2, 0], mat: matX },
    { pos: [-half, wallH / 2, 0], rot: [0, -Math.PI / 2, 0], mat: matX },
    { pos: [0, wallH / 2,  half], rot: [0, 0, 0],            mat: matZ },
    { pos: [0, wallH / 2, -half], rot: [0, Math.PI, 0],      mat: matZ },
  ];

  walls.forEach(w => {
    const mesh = new THREE.Mesh(geo, w.mat);
    mesh.position.set(...w.pos);
    mesh.rotation.set(...w.rot);
    mesh.receiveShadow = true;
    group.add(mesh);
  });

  // --- 地面 ---
  const floor = new THREE.Mesh(geo, matGround);
  floor.rotation.set(-Math.PI / 2, 0, 0);
  floor.position.set(0, 0, 0);
  floor.receiveShadow = true;
  group.add(floor);

  // --- 地面发光网格线（Aim Rush 标志性元素） ---
  const gridMat = new THREE.MeshBasicMaterial({
    color: 0x00d4ff,
    transparent: true,
    opacity: 0.08,
    wireframe: false,
    depthWrite: false,
  });
  const gridGeo = new THREE.PlaneGeometry(size - 4, size - 4, 30, 30);
  const grid = new THREE.Mesh(gridGeo, gridMat);
  grid.rotation.set(-Math.PI / 2, 0, 0);
  grid.position.set(0, 0.02, 0);
  group.add(grid);

  // 网格线条（发光边框线）
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x00d4ff,
    transparent: true,
    opacity: 0.15,
  });
  for (let i = -14; i <= 14; i++) {
    const pts = [new THREE.Vector3(i * 2, 0.01, -28), new THREE.Vector3(i * 2, 0.01, 28)];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
    group.add(new THREE.Line(lineGeo, lineMat));
    const pts2 = [new THREE.Vector3(-28, 0.01, i * 2), new THREE.Vector3(28, 0.01, i * 2)];
    const lineGeo2 = new THREE.BufferGeometry().setFromPoints(pts2);
    group.add(new THREE.Line(lineGeo2, lineMat));
  }

  // --- 墙顶装饰灯带（霓虹光带） ---
  const stripMat = new THREE.MeshBasicMaterial({
    color: 0x00d4ff,
    transparent: true,
    opacity: 0.12,
  });
  const stripGeo = new THREE.BoxGeometry(size, 0.08, 0.3);
  for (const w of walls) {
    const strip = new THREE.Mesh(stripGeo, stripMat);
    strip.position.set(w.pos[0], wallH - 0.1, w.pos[2]);
    group.add(strip);
  }

  // --- 墙角装饰柱（深色，加强建筑感） ---
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x1a1e28, roughness: 0.6, metalness: 0.3,
  });
  const pillarPositions = [
    [ half, 0,  half], [ half, 0, -half],
    [-half, 0,  half], [-half, 0, -half],
  ];
  for (const pp of pillarPositions) {
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, wallH, 0.8), pillarMat
    );
    pillar.position.set(pp[0], wallH / 2, pp[1]);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);
  }

  // --- 地面墙脚踢脚线（发光） ---
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x1a1e28, roughness: 0.5, metalness: 0.3,
  });
  for (const w of walls) {
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(size, 0.3, 0.15), baseMat
    );
    base.position.set(w.pos[0], 0.15, w.pos[2]);
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);
  }

  // --- 围栏 ---
  group.add(createFence(size));

  return group;
}

// 围栏：金属立柱 + 横杆（深色，z=0 处横跨 X 轴）
function createFence(roomSize) {
  const fence = new THREE.Group();
  const half = roomSize / 2;

  const matRail = new THREE.MeshStandardMaterial({
    color: 0x3a3e48, roughness: 0.3, metalness: 0.9,
  });
  const matPost = new THREE.MeshStandardMaterial({
    color: 0x2a2e38, roughness: 0.35, metalness: 0.85,
  });

  const postH = 1.2;
  const postR = 0.04;
  const railR = 0.025;
  const railY1 = 0.5;
  const railY2 = 1.0;

  const postCount = Math.floor(roomSize / 5) + 1;
  const startX = -half + (roomSize - (postCount - 1) * 5) / 2;
  for (let i = 0; i < postCount; i++) {
    const x = startX + i * 5;
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(postR, postR, postH, 12), matPost
    );
    post.position.set(x, postH / 2, 0);
    post.castShadow = true;
    post.receiveShadow = true;
    fence.add(post);

    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(postR * 1.4, 12, 8), matPost
    );
    cap.position.set(x, postH, 0);
    fence.add(cap);
  }

  for (const y of [railY1, railY2]) {
    const rail = new THREE.Mesh(
      new THREE.CylinderGeometry(railR, railR, roomSize - 1, 12), matRail
    );
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, y, 0);
    rail.castShadow = true;
    rail.receiveShadow = true;
    fence.add(rail);
  }

  const spacing = 0.5;
  const decoMat = new THREE.MeshStandardMaterial({
    color: 0x3a3e48, roughness: 0.3, metalness: 0.85,
  });
  for (let i = 0; i < postCount - 1; i++) {
    const x0 = startX + i * 5;
    const x1 = startX + (i + 1) * 5;
    for (let x = x0 + spacing; x < x1 - spacing + 0.01; x += spacing) {
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(railR * 0.5, railR * 0.5, railY2 - railY1, 8), decoMat
      );
      bar.position.set(x, (railY1 + railY2) / 2, 0);
      bar.castShadow = true;
      fence.add(bar);
    }
  }

  return fence;
}

// 多层光照：暗色环境 + 冷色主光 + 暖色对比 + 霓虹氛围
export function createLights() {
  const group = new THREE.Group();

  // 环境光（极暗）
  group.add(new THREE.AmbientLight(0x202436, 0.35));

  // 冷色主光（来自上方，偏蓝）
  const key = new THREE.DirectionalLight(0x88bbff, 0.8);
  key.position.set(10, 30, -8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -32;
  key.shadow.camera.right = 32;
  key.shadow.camera.top = 32;
  key.shadow.camera.bottom = -32;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 100;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  group.add(key);

  // 暖色补光（从对角，产生对比感）
  const fill = new THREE.DirectionalLight(0xff8844, 0.3);
  fill.position.set(-8, 6, 10);
  group.add(fill);

  // 半球光（暗冷色）
  group.add(new THREE.HemisphereLight(0x4466aa, 0x222244, 0.35));

  // 围栏区域的霓虹背光
  const accent = new THREE.SpotLight(0x00d4ff, 0.3, 30, Math.PI / 4, 0.5, 1.5);
  accent.position.set(0, 12, 8);
  accent.target.position.set(0, 0, 0);
  group.add(accent);
  group.add(accent.target);

  return group;
}