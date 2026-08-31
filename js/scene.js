// 场景内容：砖瓦围墙 + 水泥地面 + 天空穹顶 + 围栏 + 多层光照
import * as THREE from 'three';
import { makeBrickTexture, makeGroundTexture, makeSkyTexture } from './textures.js';

function makeWallMaterial(texture, repeatX, repeatY, color = 0xe5e2dc) {
  const tex = texture.clone();
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  return new THREE.MeshStandardMaterial({
    map: tex,
    color: color,
    roughness: 0.92,
    metalness: 0.0,
  });
}

// 构建场景：三面砖墙 + 地面 + 天空穹顶（无顶面）
export function createRoom(size = 60) {
  const group = new THREE.Group();
  const half = size / 2;
  const wallH = size; // 墙高 = 房间尺寸

  // 砖瓦纹理（四面墙共用）
  const brickTex = makeBrickTexture({
    width: 1024, height: 1024,
    rows: 14, cols: 8,
    baseColor: '#e5e2dc',
    mortarColor: '#8a8782',
    darkShift: 28,
    contrast: 1.15,
  });

  const geo = new THREE.PlaneGeometry(size, size, 1, 1);

  // 四面墙材质
  const matX = makeWallMaterial(brickTex, 4, 3);
  const matZ = makeWallMaterial(brickTex, 4, 3, 0xdedcd6);

  // --- 地面：水泥纹理 ---
  const groundTex = makeGroundTexture({
    width: 1024, height: 1024,
    baseColor: '#9a9690',
    crackColor: '#6a6660',
    stainColor: '#7a766e',
  });
  const matGround = makeWallMaterial(groundTex, 8, 8, 0x96928c);
  matGround.roughness = 0.88;

  // --- 天空穹顶：大球体内侧贴天空渐变 ---
  const skyTex = makeSkyTexture({
    width: 2048, height: 1024,
    topColor: '#3a7bc8',
    midColor: '#a0c4e8',
    bottomColor: '#dcecf5',
  });
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

  // --- 墙顶边沿装饰：砖墙顶部一条深色檐线 ---
  const capMat = new THREE.MeshStandardMaterial({
    color: 0x6a6660, roughness: 0.85, metalness: 0.1,
  });
  const capGeo = new THREE.BoxGeometry(size, 0.3, 0.4);
  for (const w of walls) {
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(w.pos[0], wallH, w.pos[2]);
    cap.castShadow = true;
    cap.receiveShadow = true;
    group.add(cap);
  }

  // --- 围栏 ---
  group.add(createFence(size));

  return group;
}

// 围栏：金属立柱 + 横杆，z=0 处横跨 X 轴
function createFence(roomSize) {
  const fence = new THREE.Group();
  const half = roomSize / 2;

  const matRail = new THREE.MeshStandardMaterial({
    color: 0x4a4d52, roughness: 0.35, metalness: 0.85,
  });
  const matPost = new THREE.MeshStandardMaterial({
    color: 0x3a3d42, roughness: 0.4, metalness: 0.8,
  });

  const postH = 2.4;
  const postR = 0.06;
  const railR = 0.035;
  const railY1 = 0.9;
  const railY2 = 1.8;

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
    color: 0x55585e, roughness: 0.35, metalness: 0.8,
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

// 多层光照：天光 + 主光（太阳）+ 暖色补光 + 半球光
export function createLights() {
  const group = new THREE.Group();

  // 环境光
  group.add(new THREE.AmbientLight(0xb8d4f0, 0.5));

  // 主光：太阳，从天空方向斜射
  const key = new THREE.DirectionalLight(0xfff8e8, 1.2);
  key.position.set(15, 40, -10);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -32;
  key.shadow.camera.right = 32;
  key.shadow.camera.top = 32;
  key.shadow.camera.bottom = -32;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 100;
  key.shadow.bias = -0.0005;
  group.add(key);

  // 暖色补光：从对角方向软化阴影
  const fill = new THREE.DirectionalLight(0xfff1e0, 0.3);
  fill.position.set(-12, 8, 10);
  group.add(fill);

  // 半球光：天空蓝 → 地面暖色过渡
  group.add(new THREE.HemisphereLight(0x88bbff, 0x96928c, 0.45));

  // 围栏侧聚光
  const accent = new THREE.SpotLight(0xfff5e8, 0.4, 40, Math.PI / 6, 0.5, 1.2);
  accent.position.set(0, 15, 0);
  accent.target.position.set(0, 0, 0);
  group.add(accent);
  group.add(accent.target);

  return group;
}
