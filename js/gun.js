// M1911 手枪模型 — 真实质感版
// 亮色枪钢、清晰轮廓：滑套/框架/握把/扳机护圈/击锤/保险/准星/抛壳窗
import * as THREE from 'three';
import { makeMetalBlastTexture, makeWoodTexture } from './textures.js';

export function createM1911() {
  const gun = new THREE.Group();

  // === 纹理 ===
  const steelTex = makeMetalBlastTexture({
    width: 512, height: 256, tint: '#3a3a40', direction: 'horizontal',
  });
  steelTex.wrapS = steelTex.wrapT = THREE.RepeatWrapping;

  const frameTex = makeMetalBlastTexture({
    width: 512, height: 256, tint: '#3a3a40', direction: 'horizontal',
  });
  frameTex.wrapS = frameTex.wrapT = THREE.RepeatWrapping;

  const woodTex = makeWoodTexture({
    width: 256, height: 256, color: '#3a2010',
  });

  // === 材质 — 亮色枪钢，不再是黑影 ===
  const matSteel = new THREE.MeshStandardMaterial({
    color: 0x4a4a52, roughness: 0.35, metalness: 0.92, map: steelTex,
  });
  const matFrame = new THREE.MeshStandardMaterial({
    color: 0x454550, roughness: 0.4, metalness: 0.85, map: frameTex,
  });
  const matGrip = new THREE.MeshStandardMaterial({
    color: 0x1a1612, roughness: 0.75, metalness: 0.1,
  });
  const matWood = new THREE.MeshStandardMaterial({
    color: 0x4a2a14, roughness: 0.6, metalness: 0.08, map: woodTex,
  });
  const matDark = new THREE.MeshStandardMaterial({
    color: 0x2a2a2e, roughness: 0.6, metalness: 0.8,
  });
  const matSight = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a, roughness: 0.5, metalness: 0.6,
  });
  const matDot = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // === 滑套 slide — 前窄后宽，顶部带轻倾斜面 ===
  // 用 BufferGeometry 构建梯形截面滑套
  const slideShape = new THREE.BufferGeometry();
  const sv = new Float32Array([
    // 顶面（前低后高，微倾斜）
    -0.09, 0.038, 0.28,   0.09, 0.038, 0.28,
     0.09, 0.040, -0.27,  -0.09, 0.040, -0.27,
    // 底面
    -0.08, 0.005, 0.28,   0.08, 0.005, 0.28,
     0.08, 0.005, -0.27,  -0.08, 0.005, -0.27,
    // 左侧面
    -0.09, 0.038, 0.28,   -0.09, 0.040, -0.27,
    -0.08, 0.005, -0.27,  -0.08, 0.005, 0.28,
    // 右侧面
     0.09, 0.038, 0.28,    0.09, 0.040, -0.27,
     0.08, 0.005, -0.27,   0.08, 0.005, 0.28,
    // 前端面
    -0.09, 0.038, 0.28,    0.09, 0.038, 0.28,
     0.08, 0.005, 0.28,   -0.08, 0.005, 0.28,
    // 后端面
    -0.09, 0.040, -0.27,   0.09, 0.040, -0.27,
     0.08, 0.005, -0.27,  -0.08, 0.005, -0.27,
  ]);
  slideShape.setAttribute('position', new THREE.BufferAttribute(sv, 3));
  slideShape.computeVertexNormals();
  const slide = new THREE.Mesh(slideShape, matSteel);
  gun.add(slide);

  // 滑套防滑纹 — 前端斜纹（仅3条，减少mesh数）
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(0.182, 0.006, 0.012), matDark);
    g.position.set(0, 0.040, 0.16 + i * 0.014);
    gun.add(g);
  }
  // 后端防滑纹
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(0.182, 0.006, 0.012), matDark);
    g.position.set(0, 0.040, -0.14 - i * 0.014);
    gun.add(g);
  }

  // === 抛壳窗 ejection port（右侧凹槽） ===
  const ejectWindow = new THREE.Mesh(
    new THREE.BoxGeometry(0.005, 0.022, 0.08),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  ejectWindow.position.set(0.091, 0.025, 0.06);
  gun.add(ejectWindow);

  // === 枪管 barrel（前端凸出） ===
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.020, 0.022, 0.06, 16), matSteel
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.020, 0.31);
  gun.add(barrel);

  // 枪口衬套 bushing（圆筒状）
  const bushing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, 0.035, 16), matFrame
  );
  bushing.rotation.x = Math.PI / 2;
  bushing.position.set(0, 0.020, 0.29);
  gun.add(bushing);

  // 枪口孔
  const muzzleHole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.05, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  muzzleHole.rotation.x = Math.PI / 2;
  muzzleHole.position.set(0, 0.020, 0.33);
  gun.add(muzzleHole);

  // === 框架 frame（滑套下方） ===
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.045, 0.48), matFrame);
  frame.position.set(0, -0.020, -0.005);
  gun.add(frame);

  // 框架前导轨
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.07), matSteel);
  rail.position.set(0, -0.035, 0.20);
  gun.add(rail);

  // === 握把 grip — M1911经典角度约18° ===
  // 主体
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.24, 0.13), matGrip);
  grip.position.set(0, -0.16, -0.17);
  grip.rotation.x = -0.32;
  gun.add(grip);

  // 握把两侧胡桃木饰板
  for (const sx of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.21, 0.12), matWood);
    panel.position.set(sx * 0.068, -0.16, -0.17);
    panel.rotation.x = -0.32;
    gun.add(panel);

    // 木饰板菱形格纹（简化为3x2=6个）
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 2; c++) {
        const diamond = new THREE.Mesh(
          new THREE.BoxGeometry(0.002, 0.030, 0.030),
          matWood
        );
        diamond.position.set(
          sx * 0.072,
          -0.10 + r * 0.040,
          -0.12 + c * 0.05
        );
        diamond.rotation.x = -0.32;
        diamond.rotation.z = Math.PI / 4;
        gun.add(diamond);
      }
    }
  }

  // === 扳机护圈 trigger guard ===
  const guard = new THREE.Mesh(
    new THREE.TorusGeometry(0.038, 0.008, 10, 24, Math.PI), matFrame
  );
  guard.position.set(0, -0.060, 0.04);
  guard.rotation.set(Math.PI / 2, 0, 0);
  gun.add(guard);

  // 扳机护圈前连接
  const guardFront = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.022, 0.022), matFrame
  );
  guardFront.position.set(0, -0.030, 0.07);
  gun.add(guardFront);

  // === 扳机 trigger ===
  const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.035, 0.012), matSteel);
  trigger.position.set(0, -0.055, 0.06);
  gun.add(trigger);

  // === 击锤 hammer ===
  const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.028, 0.022), matSteel);
  hammer.position.set(0, 0.018, -0.27);
  gun.add(hammer);

  // 击锤锯齿（2条）
  for (let i = 0; i < 2; i++) {
    const spur = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.004, 0.005), matDark);
    spur.position.set(0, 0.030, -0.27 + (i - 0.5) * 0.008);
    gun.add(spur);
  }

  // === 保险 thumb safety（左侧） ===
  const safety = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.020, 0.06), matSteel);
  safety.position.set(0.080, -0.015, -0.05);
  gun.add(safety);

  const safetyLever = new THREE.Mesh(
    new THREE.BoxGeometry(0.006, 0.015, 0.035), matSteel
  );
  safetyLever.position.set(0.088, -0.005, -0.05);
  safetyLever.rotation.z = 0.3;
  gun.add(safetyLever);

  // === 弹匣释放按钮 ===
  const magRelease = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.020, 0.020), matSteel);
  magRelease.position.set(0.078, -0.090, -0.10);
  gun.add(magRelease);

  // === 弹匣底部 ===
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.035, 0.10), matSteel);
  mag.position.set(0, -0.30, -0.19);
  mag.rotation.x = -0.32;
  gun.add(mag);

  const magBase = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.010, 0.11), matFrame);
  magBase.position.set(0, -0.32, -0.19);
  magBase.rotation.x = -0.32;
  gun.add(magBase);

  // === 前准星 front sight + 白点 ===
  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.016, 0.008), matSight);
  frontSight.position.set(0, 0.050, 0.24);
  gun.add(frontSight);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.003, 10), matDot);
  dot.position.set(0, 0.052, 0.246);
  gun.add(dot);

  // === 后准星 rear sight ===
  for (const sx of [-1, 1]) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.018), matSight);
    leaf.position.set(sx * 0.028, 0.050, -0.23);
    gun.add(leaf);
  }
  const sightBridge = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.005, 0.018), matSight);
  sightBridge.position.set(0, 0.050, -0.23);
  gun.add(sightBridge);

  // 后准星缺口
  const notch = new THREE.Mesh(
    new THREE.BoxGeometry(0.020, 0.004, 0.006),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  notch.position.set(0, 0.054, -0.226);
  gun.add(notch);

  // === 阴影优化：大件castShadow，小装饰件不cast ===
  gun.traverse(o => {
    if (o.isMesh) {
      o.castShadow = (o.geometry.attributes.position.count > 8);
      o.receiveShadow = true;
    }
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
