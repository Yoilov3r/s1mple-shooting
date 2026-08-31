// 精致 M1911 手枪模型：滑套 + 框架 + 握把 + 扳机护圈 + 击锤 + 保险 + 准星 等
import * as THREE from 'three';

export function createM1911() {
  const gun = new THREE.Group();

  const matSteel = new THREE.MeshStandardMaterial({
    color: 0x2b2b30, roughness: 0.42, metalness: 0.88,
  });
  const matFrame = new THREE.MeshStandardMaterial({
    color: 0x3a3a40, roughness: 0.48, metalness: 0.78,
  });
  const matGrip = new THREE.MeshStandardMaterial({
    color: 0x1c1410, roughness: 0.72, metalness: 0.15,
  });
  const matWood = new THREE.MeshStandardMaterial({
    color: 0x4a3a28, roughness: 0.7, metalness: 0.1,
  });
  const matSight = new THREE.MeshStandardMaterial({
    color: 0x111111, roughness: 0.6, metalness: 0.4,
  });
  const matDot = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // === 滑套 slide（主体长方体） ===
  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.55), matSteel);
  gun.add(slide);

  // 滑套顶部前后斜纹（cosmetic serrations）
  const matSerr = new THREE.MeshStandardMaterial({
    color: 0x141414, roughness: 0.8, metalness: 0.6,
  });
  for (let i = 0; i < 5; i++) {
    const g1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.005, 0.012), matSerr);
    g1.position.set(0, 0.036, 0.18 + i * 0.018);
    gun.add(g1);
    const g2 = g1.clone();
    g2.position.z = -0.18 - i * 0.018;
    gun.add(g2);
  }

  // === 枪管 barrel ===
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.025, 0.08, 16), matSteel
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0, 0.32);
  gun.add(barrel);

  // 枪口衬套 bushing
  const bushing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, 0.04, 16), matFrame
  );
  bushing.rotation.x = Math.PI / 2;
  bushing.position.set(0, 0, 0.30);
  gun.add(bushing);

  // === 框架 frame（滑套下方主体） ===
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.5), matFrame);
  frame.position.set(0, -0.06, -0.01);
  gun.add(frame);

  // === 握把 grip（向后倾斜约 18°） ===
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.14), matGrip);
  grip.position.set(0, -0.18, -0.18);
  grip.rotation.x = -0.32;
  gun.add(grip);

  // 握把两侧胡桃木饰板
  for (const sx of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.18, 0.12), matWood);
    panel.position.set(sx * 0.073, -0.18, -0.18);
    panel.rotation.x = -0.32;
    gun.add(panel);
  }

  // === 扳机护圈 trigger guard（半圆） ===
  const guard = new THREE.Mesh(
    new THREE.TorusGeometry(0.04, 0.008, 8, 24, Math.PI), matFrame
  );
  guard.position.set(0, -0.105, 0.05);
  guard.rotation.set(Math.PI / 2, 0, 0);
  gun.add(guard);

  // === 扳机 trigger ===
  const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.04, 0.015), matSteel);
  trigger.position.set(0, -0.095, 0.07);
  gun.add(trigger);

  // === 击锤 hammer ===
  const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.025), matSteel);
  hammer.position.set(0, 0.02, -0.30);
  gun.add(hammer);

  // === 保险 thumb safety（左侧突起） ===
  const safety = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.022, 0.07), matSteel);
  safety.position.set(0.085, -0.02, -0.05);
  gun.add(safety);

  // === 弹匣释放按钮 ===
  const magRelease = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.022, 0.025), matSteel);
  magRelease.position.set(0.082, -0.10, -0.10);
  gun.add(magRelease);

  // === 弹匣底部凸出 ===
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.04, 0.12), matSteel);
  mag.position.set(0, -0.32, -0.20);
  mag.rotation.x = -0.32;
  gun.add(mag);

  // === 前准星 front sight + 白点 ===
  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.018, 0.010), matSight);
  frontSight.position.set(0, 0.044, 0.26);
  gun.add(frontSight);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.0035, 12), matDot);
  dot.position.set(0, 0.046, 0.266);
  gun.add(dot);

  // === 后准星 rear sight（两片叶 + 横梁） ===
  for (const sx of [-1, 1]) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.020), matSight);
    leaf.position.set(sx * 0.03, 0.044, -0.24);
    gun.add(leaf);
  }
  const sightBridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.006, 0.02), matSight);
  sightBridge.position.set(0, 0.044, -0.24);
  gun.add(sightBridge);

  // 全部启用阴影
  gun.traverse(o => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });

  return gun;
}

// 把手枪挂载到相机右下方（第一人称视角）
export function attachWeapon(camera) {
  const weapon = createM1911();
  weapon.position.set(0.20, -0.18, -0.45);
  weapon.rotation.set(0.02, 0.02, 0);
  weapon.name = 'weapon';
  camera.add(weapon);
  return weapon;
}
