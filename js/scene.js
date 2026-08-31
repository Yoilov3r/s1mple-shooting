// 场景内容：灰白砖瓦正方体房间 + 围栏分隔 + 多层光照
import * as THREE from 'three';
import { makeBrickTexture, makeMetalBlastTexture } from './textures.js';

// 构建砖瓦纹理墙面的材质
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

// 构建超大正方体房间（内壁可见，砖瓦纹理）
export function createRoom(size = 60) {
  const group = new THREE.Group();
  const half = size / 2;

  // 生成共享砖瓦纹理（一次生成，多面复用）
  const brickTex = makeBrickTexture({
    width: 1024, height: 1024,
    rows: 14, cols: 8,
    baseColor: '#e5e2dc',
    mortarColor: '#8a8782',
    darkShift: 28,
    contrast: 1.15,
  });

  const geo = new THREE.PlaneGeometry(size, size, 1, 1);

  // 四面墙：砖瓦纹理，repeat 根据房间尺寸调整
  // 左右墙（X 面）
  const matX = makeWallMaterial(brickTex, 4, 3);
  // 前后墙（Z 面）
  const matZ = makeWallMaterial(brickTex, 4, 3, 0xdedcd6);

  // 地板：较深灰，微弱反射
  const floorTex = makeBrickTexture({
    width: 1024, height: 1024,
    rows: 10, cols: 10,
    baseColor: '#c8c6c0',
    mortarColor: '#9a9893',
    darkShift: 20,
    contrast: 0.8,
  });
  const matFloor = makeWallMaterial(floorTex, 6, 6, 0xc4c2bc);
  matFloor.roughness = 0.85;

  // 天花板：最亮，模拟天窗漫射
  const ceilTex = makeBrickTexture({
    width: 1024, height: 1024,
    rows: 12, cols: 12,
    baseColor: '#eeecea',
    mortarColor: '#c0bdb8',
    darkShift: 10,
    contrast: 0.5,
  });
  const matCeil = makeWallMaterial(ceilTex, 5, 5, 0xe8e6e0);

  const faces = [
    { pos: [ half, 0, 0], rot: [0,  Math.PI / 2, 0], mat: matX },
    { pos: [-half, 0, 0], rot: [0, -Math.PI / 2, 0], mat: matX },
    { pos: [0,  half, 0], rot: [-Math.PI / 2, 0, 0], mat: matCeil },
    { pos: [0, -half, 0], rot: [ Math.PI / 2, 0, 0], mat: matFloor },
    { pos: [0, 0,  half], rot: [0, 0, 0],            mat: matZ },
    { pos: [0, 0, -half], rot: [0, Math.PI, 0],      mat: matZ },
  ];

  faces.forEach(f => {
    const mesh = new THREE.Mesh(geo, f.mat);
    mesh.position.set(...f.pos);
    mesh.rotation.set(...f.rot);
    mesh.receiveShadow = true;
    group.add(mesh);
  });

  // === 围栏：在 z=0 处横跨房间，分隔前后两半 ===
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

  const postH = 2.4;       // 立柱高度
  const postR = 0.06;      // 立柱半径
  const railR = 0.035;     // 横杆半径
  const railY1 = 0.9;       // 下横杆高度
  const railY2 = 1.8;      // 上横杆高度

  // 立柱：每隔 5 米一根
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

    // 立柱顶部装饰球
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(postR * 1.4, 12, 8), matPost
    );
    cap.position.set(x, postH, 0);
    fence.add(cap);
  }

  // 横杆：两根，贯穿整个房间宽度
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

  // 竖向装饰杆（立柱之间）
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

// 多层光照：环境光 + 主光 + 暖色补光 + 半球光
export function createLights() {
  const group = new THREE.Group();

  // 环境光略降，让方向光阴影更有层次
  group.add(new THREE.AmbientLight(0xffffff, 0.42));

  // 主光：顶部偏前，模拟天窗
  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(8, 25, 12);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -32;
  key.shadow.camera.right = 32;
  key.shadow.camera.top = 32;
  key.shadow.camera.bottom = -32;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 90;
  key.shadow.bias = -0.0005;
  group.add(key);

  // 暖色补光：从对角方向软化阴影
  const fill = new THREE.DirectionalLight(0xfff1e0, 0.35);
  fill.position.set(-12, 8, -10);
  group.add(fill);

  // 半球光：上下色温过渡，增加体积感
  group.add(new THREE.HemisphereLight(0xffffff, 0xb0aca4, 0.35));

  // 围栏侧聚光：增强 z=0 分隔区域的存在感
  const accent = new THREE.SpotLight(0xfff5e8, 0.5, 40, Math.PI / 6, 0.5, 1.2);
  accent.position.set(0, 15, 0);
  accent.target.position.set(0, 0, 0);
  group.add(accent);
  group.add(accent.target);

  return group;
}
