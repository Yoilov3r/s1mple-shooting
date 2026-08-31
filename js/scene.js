// 场景内容：灰白超大正方体房间 + 多层光照
import * as THREE from 'three';

// 6 面墙的微妙灰度差异，避免单调廉价感
const WALL_COLORS = {
  posX: 0xd8d6d0, // 右
  negX: 0xd4d2cc, // 左
  posY: 0xe4e2dd, // 顶（最亮，模拟天窗漫射）
  negY: 0xc8c6c0, // 底（最深，地板感）
  posZ: 0xdedcd6, // 前
  negZ: 0xdedcd6, // 后
};

// 构建超大正方体房间（内壁可见）
export function createRoom(size = 60) {
  const group = new THREE.Group();
  const half = size / 2;
  const geo = new THREE.PlaneGeometry(size, size, 1, 1);

  const faces = [
    { pos: [ half, 0, 0], rot: [0,  Math.PI / 2, 0], color: WALL_COLORS.posX },
    { pos: [-half, 0, 0], rot: [0, -Math.PI / 2, 0], color: WALL_COLORS.negX },
    { pos: [0,  half, 0], rot: [-Math.PI / 2, 0, 0], color: WALL_COLORS.posY },
    { pos: [0, -half, 0], rot: [ Math.PI / 2, 0, 0], color: WALL_COLORS.negY },
    { pos: [0, 0,  half], rot: [0, 0, 0],            color: WALL_COLORS.posZ },
    { pos: [0, 0, -half], rot: [0, Math.PI, 0],      color: WALL_COLORS.negZ },
  ];

  faces.forEach(f => {
    const mat = new THREE.MeshStandardMaterial({
      color: f.color,
      roughness: 0.96,
      metalness: 0.0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...f.pos);
    mesh.rotation.set(...f.rot);
    mesh.receiveShadow = true;
    group.add(mesh);
  });

  return group;
}

// 多层光照：环境光 + 主光 + 暖色补光 + 半球光
export function createLights() {
  const group = new THREE.Group();

  group.add(new THREE.AmbientLight(0xffffff, 0.55));

  // 主光：顶部偏前，模拟天窗
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
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
  const fill = new THREE.DirectionalLight(0xfff1e0, 0.32);
  fill.position.set(-12, 8, -10);
  group.add(fill);

  // 半球光：上下色温过渡，增加体积感
  group.add(new THREE.HemisphereLight(0xffffff, 0xb0aca4, 0.4));

  return group;
}
