// M1911 手枪 — 精细几何版
// 关键升级：圆角挤出体（ExtrudeGeometry）替代纯方盒，滑套/框架/握把均有真实倒角
// 性能：防滑纹与格纹改用 InstancedMesh，draw call 大幅下降
import * as THREE from 'three';
import { makeMetalBlastTexture, makeWoodTexture } from './textures.js';

// 圆角矩形截面（XY 平面）
function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const hw = w / 2, hh = h / 2;
  s.moveTo(-hw + r, -hh);
  s.lineTo(hw - r, -hh);
  s.quadraticCurveTo(hw, -hh, hw, -hh + r);
  s.lineTo(hw, hh - r);
  s.quadraticCurveTo(hw, hh, hw - r, hh);
  s.lineTo(-hw + r, hh);
  s.quadraticCurveTo(-hw, hh, -hw, hh - r);
  s.lineTo(-hw, -hh + r);
  s.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  s.closePath();
  return s;
}

// 带倒角的圆角挤出体，沿 Z 轴，居中于原点
function roundedExtrude({ w, h, r, depth, bevel = 0.008, steps = 1 }) {
  const geo = new THREE.ExtrudeGeometry(roundedRectShape(w, h, r), {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 4,
    steps,
  });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

export function createM1911() {
  const gun = new THREE.Group();

  // ---------- 材质（无环境贴图时控制 metalness，避免发黑） ----------
  const steelTex = makeMetalBlastTexture({
    width: 512, height: 256, tint: '#55555c', direction: 'horizontal',
  });
  steelTex.repeat.set(2, 2);

  const matSteel = new THREE.MeshStandardMaterial({
    color: 0x6f7076, roughness: 0.34, metalness: 0.72, map: steelTex,
  });
  const matFrame = new THREE.MeshStandardMaterial({
    color: 0x5f6066, roughness: 0.4, metalness: 0.65, map: steelTex,
  });
  const matDark = new THREE.MeshStandardMaterial({
    color: 0x33343a, roughness: 0.55, metalness: 0.7,
  });
  const matGrip = new THREE.MeshStandardMaterial({
    color: 0x24201c, roughness: 0.82, metalness: 0.05,
  });
  const matWoodTex = makeWoodTexture({ width: 256, height: 256, color: '#6a4526' });
  const matWood = new THREE.MeshStandardMaterial({
    color: 0x8a5a30, roughness: 0.55, metalness: 0.06, map: matWoodTex,
  });
  const matSight = new THREE.MeshStandardMaterial({
    color: 0x1e1e20, roughness: 0.45, metalness: 0.55,
  });
  const matHole = new THREE.MeshBasicMaterial({ color: 0x08080a });
  const matDot = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // ================= 滑套 Slide =================
  // 圆角挤出，前窄后宽通过非等比缩放近似（顶部微收）
  const slideGeo = roundedExtrude({ w: 0.195, h: 0.078, r: 0.016, depth: 0.565, bevel: 0.007 });
  const slide = new THREE.Mesh(slideGeo, matSteel);
  slide.position.set(0, 0.018, -0.005);
  gun.add(slide);

  // 滑套顶部收窄的平面（真实 M1911 顶部有窄平面）
  const slideTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.006, 0.56), matSteel
  );
  slideTop.position.set(0, 0.058, -0.005);
  gun.add(slideTop);

  // 套筒前后防滑凹槽（InstancedMesh：12 条减为 1 个 draw call）
  const serrationGeo = new THREE.BoxGeometry(0.20, 0.052, 0.011);
  const serrationCount = 14;
  const serrations = new THREE.InstancedMesh(serrationGeo, matDark, serrationCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < serrationCount; i++) {
    // 前 6 条在套筒前段，后 8 条在后段
    const isFront = i < 6;
    const z = isFront
      ? 0.135 + i * 0.017
      : -0.16 - (i - 6) * 0.017;
    dummy.position.set(0, 0.040, z);
    dummy.updateMatrix();
    serrations.setMatrixAt(i, dummy.matrix);
  }
  serrations.instanceMatrix.needsUpdate = true;
  gun.add(serrations);

  // 抛壳窗（右侧凹陷，用深色薄片表现）
  const ejectPort = new THREE.Mesh(
    new THREE.BoxGeometry(0.004, 0.030, 0.105), matHole
  );
  ejectPort.position.set(0.096, 0.030, 0.045);
  gun.add(ejectPort);

  // 套筒前端倒角（视觉上收束）
  const slideNose = new THREE.Mesh(
    roundedExtrude({ w: 0.178, h: 0.070, r: 0.014, depth: 0.022, bevel: 0.005 }),
    matSteel
  );
  slideNose.position.set(0, 0.018, 0.292);
  gun.add(slideNose);

  // ================= 枪管 Barrel =================
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0225, 0.0245, 0.075, 20), matSteel
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.020, 0.318);
  gun.add(barrel);

  // 枪口衬套 Bushing
  const bushing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0295, 0.0295, 0.030, 20), matFrame
  );
  bushing.rotation.x = Math.PI / 2;
  bushing.position.set(0, 0.020, 0.300);
  gun.add(bushing);

  // 膛孔
  const bore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0135, 0.0135, 0.06, 14), matHole
  );
  bore.rotation.x = Math.PI / 2;
  bore.position.set(0, 0.020, 0.335);
  gun.add(bore);

  // ================= 框架 Frame =================
  const frameGeo = roundedExtrude({ w: 0.168, h: 0.052, r: 0.011, depth: 0.50, bevel: 0.006 });
  const frame = new THREE.Mesh(frameGeo, matFrame);
  frame.position.set(0, -0.026, 0.005);
  gun.add(frame);

  // 框架前段（滑套下方延伸至枪口下方）
  const frameFront = new THREE.Mesh(
    roundedExtrude({ w: 0.140, h: 0.044, r: 0.009, depth: 0.115, bevel: 0.005 }),
    matFrame
  );
  frameFront.position.set(0, -0.030, 0.245);
  gun.add(frameFront);

  // ================= 握把 Grip =================
  // 圆角挤出 + 18° 倾斜；截面在 XY，沿 Z 挤出厚度
  const gripGeo = roundedExtrude({ w: 0.132, h: 0.245, r: 0.036, depth: 0.128, bevel: 0.010 });
  const grip = new THREE.Mesh(gripGeo, matGrip);
  grip.position.set(0, -0.168, -0.172);
  grip.rotation.x = -0.32;
  gun.add(grip);

  // 握把背部弧形隆起（人机工程曲线）
  const backstrapGeo = new THREE.CylinderGeometry(0.062, 0.062, 0.128, 12, 1, false, 0, Math.PI);
  const backstrap = new THREE.Mesh(backstrapGeo, matGrip);
  backstrap.rotation.set(-0.32, 0, Math.PI / 2);
  backstrap.position.set(0, -0.278, -0.210);
  gun.add(backstrap);

  // 胡桃木饰板（两侧，圆角薄片）
  const panelGeo = roundedExtrude({ w: 0.200, h: 0.118, r: 0.030, depth: 0.007, bevel: 0.003 });
  for (const sx of [-1, 1]) {
    const panel = new THREE.Mesh(panelGeo, matWood);
    panel.position.set(sx * 0.070, -0.160, -0.172);
    panel.rotation.set(-0.32, Math.PI / 2, 0);
    panel.scale.set(1, 0.92, 1);
    gun.add(panel);
  }

  // 饰板菱形格纹（InstancedMesh，24 个减为 1 个 draw call）
  const diaGeo = new THREE.BoxGeometry(0.0025, 0.026, 0.026);
  const diaCount = 24;
  const diamonds = new THREE.InstancedMesh(diaGeo, matWood, diaCount);
  let di = 0;
  for (const sx of [-1, 1]) {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        dummy.position.set(
          sx * 0.0745,
          -0.075 - r * 0.052,
          -0.132 - c * 0.038
        );
        dummy.rotation.set(-0.32, 0, Math.PI / 4);
        dummy.updateMatrix();
        diamonds.setMatrixAt(di++, dummy.matrix);
      }
    }
  }
  diamonds.instanceMatrix.needsUpdate = true;
  gun.add(diamonds);

  // ================= 扳机护圈 Trigger Guard =================
  const guard = new THREE.Mesh(
    new THREE.TorusGeometry(0.042, 0.0085, 10, 28, Math.PI), matFrame
  );
  guard.position.set(0, -0.062, 0.036);
  guard.rotation.set(Math.PI / 2, 0, 0);
  gun.add(guard);

  // 护圈前连接段
  const guardFront = new THREE.Mesh(
    new THREE.BoxGeometry(0.014, 0.026, 0.024), matFrame
  );
  guardFront.position.set(0, -0.030, 0.074);
  gun.add(guardFront);

  // 扳机
  const trigger = new THREE.Mesh(
    roundedExtrude({ w: 0.013, h: 0.040, r: 0.004, depth: 0.014, bevel: 0.002 }),
    matSteel
  );
  trigger.rotation.x = Math.PI / 2;
  trigger.position.set(0, -0.062, 0.056);
  gun.add(trigger);

  // ================= 击锤 Hammer =================
  const hammer = new THREE.Mesh(
    roundedExtrude({ w: 0.048, h: 0.032, r: 0.010, depth: 0.024, bevel: 0.004 }),
    matSteel
  );
  hammer.position.set(0, 0.030, -0.284);
  gun.add(hammer);

  // 击锤扳起时的指槽
  const hammerSpur = new THREE.Mesh(
    new THREE.BoxGeometry(0.036, 0.006, 0.012), matDark
  );
  hammerSpur.position.set(0, 0.048, -0.292);
  hammerSpur.rotation.x = 0.25;
  gun.add(hammerSpur);

  // ================= 保险 Thumb Safety =================
  const safety = new THREE.Mesh(
    roundedExtrude({ w: 0.060, h: 0.022, r: 0.006, depth: 0.024, bevel: 0.003 }),
    matSteel
  );
  safety.rotation.y = Math.PI / 2;
  safety.position.set(0.084, -0.014, -0.046);
  gun.add(safety);

  // 保险拨杆端头
  const safetyTip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.010, 0.010, 0.016, 10), matSteel
  );
  safetyTip.rotation.z = Math.PI / 2;
  safetyTip.position.set(0.094, -0.014, -0.046);
  gun.add(safetyTip);

  // ================= 弹匣释放钮 =================
  const magRelease = new THREE.Mesh(
    new THREE.CylinderGeometry(0.010, 0.010, 0.012, 10), matSteel
  );
  magRelease.rotation.z = Math.PI / 2;
  magRelease.position.set(0.082, -0.086, -0.128);
  gun.add(magRelease);

  // ================= 弹匣 =================
  const mag = new THREE.Mesh(
    roundedExtrude({ w: 0.100, h: 0.040, r: 0.008, depth: 0.110, bevel: 0.004 }),
    matSteel
  );
  mag.rotation.x = -0.32;
  mag.position.set(0, -0.310, -0.196);
  gun.add(mag);

  // 弹匣底板
  const magBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.108, 0.010, 0.120), matFrame
  );
  magBase.rotation.x = -0.32;
  magBase.position.set(0, -0.334, -0.200);
  gun.add(magBase);

  // ================= 前准星 =================
  // 三角柱造型（真实 M1911 前端小三角）
  const frontSightGeo = new THREE.ConeGeometry(0.010, 0.020, 4);
  const frontSight = new THREE.Mesh(frontSightGeo, matSight);
  frontSight.rotation.set(Math.PI / 2, Math.PI / 4, 0);
  frontSight.position.set(0, 0.066, 0.246);
  gun.add(frontSight);

  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.0032, 10), matDot);
  dot.position.set(0, 0.068, 0.257);
  gun.add(dot);

  // ================= 后照门 Rear Sight =================
  // 缺口式照门：两片立叶 + 底部横梁
  for (const sx of [-1, 1]) {
    const leaf = new THREE.Mesh(
      new THREE.BoxGeometry(0.014, 0.020, 0.022), matSight
    );
    leaf.position.set(sx * 0.028, 0.068, -0.228);
    gun.add(leaf);
  }
  const sightBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.074, 0.007, 0.024), matSight
  );
  sightBase.position.set(0, 0.058, -0.228);
  gun.add(sightBase);

  // 照门缺口（黑）
  const notch = new THREE.Mesh(
    new THREE.BoxGeometry(0.021, 0.005, 0.008), matHole
  );
  notch.position.set(0, 0.074, -0.232);
  gun.add(notch);

  // ================= 阴影策略 =================
  // 仅大件投影，小装饰件跳过，节省阴影 pass
  gun.traverse(o => {
    if (o.isMesh || o.isInstancedMesh) {
      o.castShadow = false;          // 第一人称枪械已在视野内，投影价值低
      o.receiveShadow = false;
    }
  });

  return gun;
}

// 挂载到相机右下方，第一人称视角
export function attachWeapon(camera) {
  const weapon = createM1911();
  weapon.position.set(0.20, -0.20, -0.46);
  weapon.rotation.set(0.020, 0.030, -0.010);
  weapon.name = 'weapon';
  camera.add(weapon);
  return weapon;
}
