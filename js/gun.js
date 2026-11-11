// Desert Eagle 手枪 — 精细几何版
// 特征：粗大枪管、方形滑套、独特击锤造型、黑色合成橡胶握把
// 与 M1911 不同点：枪管粗 ~10mm、滑套更方正、击锤为方形、握把橡胶质感
import * as THREE from 'three';

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

// 圆角挤出体，沿 Z 轴
function roundedExtrude({ w, h, r, depth, bevel = 0.006, curveSeg = 4 }) {
  const geo = new THREE.ExtrudeGeometry(roundedRectShape(w, h, r), {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: curveSeg,
    steps: 1,
  });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

export function createDesertEagle() {
  const gun = new THREE.Group();

  // ================= 材质 =================
  // 枪身主体：哑光银色金属（降低 metalness 避免过亮）
  const matSteel = new THREE.MeshStandardMaterial({
    color: 0x9a9da2, roughness: 0.45, metalness: 0.78,
  });
  // 枪管深色金属
  const matBarrel = new THREE.MeshStandardMaterial({
    color: 0x686b72, roughness: 0.32, metalness: 0.85,
  });
  // 框架（握把上方）深灰
  const matFrame = new THREE.MeshStandardMaterial({
    color: 0x7a7d83, roughness: 0.52, metalness: 0.72,
  });
  // 暗部金属
  const matDark = new THREE.MeshStandardMaterial({
    color: 0x4a4d53, roughness: 0.6, metalness: 0.72,
  });
  // 握把：合成橡胶，微粗糙
  const matGrip = new THREE.MeshStandardMaterial({
    color: 0x1a1a1e, roughness: 0.92, metalness: 0.02,
  });
  // 准星/照门：哑光黑
  const matSight = new THREE.MeshStandardMaterial({
    color: 0x15161a, roughness: 0.55, metalness: 0.5,
  });
  // 膛孔/凹陷
  const matHole = new THREE.MeshBasicMaterial({ color: 0x050507 });
  // 准星白点
  const matDot = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // ================= 枪管 Barrel =================
  // Desert Eagle 枪管明显比普通手枪粗（约 30mm 外径）
  const barrelOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.033, 0.18, 24), matBarrel
  );
  barrelOuter.rotation.x = Math.PI / 2;
  barrelOuter.position.set(0, 0.030, 0.435);
  gun.add(barrelOuter);

  // 枪管衬套（突出的金属环）
  const bushing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.038, 0.022, 24), matSteel
  );
  bushing.rotation.x = Math.PI / 2;
  bushing.position.set(0, 0.030, 0.365);
  gun.add(bushing);

  // 枪口制退器前缘
  const muzzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.036, 0.016, 24), matBarrel
  );
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, 0.030, 0.525);
  gun.add(muzzle);

  // 膛孔
  const bore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0155, 0.0155, 0.08, 18), matHole
  );
  bore.rotation.x = Math.PI / 2;
  bore.position.set(0, 0.030, 0.535);
  gun.add(bore);

  // ================= 滑套 Slide =================
  // Desert Eagle 滑套方正厚实，整体矩形
  const slideGeo = roundedExtrude({ w: 0.205, h: 0.092, r: 0.012, depth: 0.655, bevel: 0.008 });
  const slide = new THREE.Mesh(slideGeo, matSteel);
  slide.position.set(0, 0.015, -0.018);
  gun.add(slide);

  // 滑套顶部收窄平面（真实 DE 滑套顶部有凹陷平面）
  const slideTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.005, 0.63), matSteel
  );
  slideTop.position.set(0, 0.063, -0.018);
  gun.add(slideTop);

  // 滑套前端倒角（视觉上收束到枪管）
  const slideNose = new THREE.Mesh(
    roundedExtrude({ w: 0.190, h: 0.086, r: 0.011, depth: 0.028, bevel: 0.006 }),
    matSteel
  );
  slideNose.position.set(0, 0.017, 0.305);
  gun.add(slideNose);

  // 套筒前后防滑锯齿（InstancedMesh）
  const serrationGeo = new THREE.BoxGeometry(0.215, 0.058, 0.012);
  const serrationCount = 16;
  const serrations = new THREE.InstancedMesh(serrationGeo, matDark, serrationCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < serrationCount; i++) {
    const isFront = i < 7;
    const z = isFront
      ? 0.155 + i * 0.018
      : -0.235 - (i - 7) * 0.018;
    dummy.position.set(0, 0.043, z);
    dummy.updateMatrix();
    serrations.setMatrixAt(i, dummy.matrix);
  }
  serrations.instanceMatrix.needsUpdate = true;
  gun.add(serrations);

  // 抛壳窗（右侧长条形凹陷）
  const ejectPort = new THREE.Mesh(
    new THREE.BoxGeometry(0.004, 0.026, 0.135), matHole
  );
  ejectPort.position.set(0.102, 0.030, 0.078);
  gun.add(ejectPort);

  // 空枪挂机指示器凹陷（滑套尾部上方）
  const holdOpen = new THREE.Mesh(
    new THREE.BoxGeometry(0.020, 0.004, 0.018), matHole
  );
  holdOpen.position.set(0, 0.068, -0.268);
  gun.add(holdOpen);

  // ================= 框架 Frame =================
  const frameGeo = roundedExtrude({ w: 0.178, h: 0.058, r: 0.012, depth: 0.58, bevel: 0.006 });
  const frame = new THREE.Mesh(frameGeo, matFrame);
  frame.position.set(0, -0.024, 0.012);
  gun.add(frame);

  // 框架前段（滑套下方延伸至枪管衬套）
  const frameFront = new THREE.Mesh(
    roundedExtrude({ w: 0.148, h: 0.046, r: 0.009, depth: 0.140, bevel: 0.005 }),
    matFrame
  );
  frameFront.position.set(0, -0.028, 0.285);
  gun.add(frameFront);

  // ================= 握把 Grip =================
  // Desert Eagle 握把有较大倾角（约 22°），厚实方形
  const gripGeo = roundedExtrude({ w: 0.148, h: 0.270, r: 0.038, depth: 0.142, bevel: 0.010 });
  const grip = new THREE.Mesh(gripGeo, matGrip);
  grip.position.set(0, -0.190, -0.200);
  grip.rotation.x = -0.385;
  gun.add(grip);

  // 握把背部弧形隆起（人机工程曲线）
  const backstrapGeo = new THREE.CylinderGeometry(0.068, 0.068, 0.142, 14, 1, false, 0, Math.PI);
  const backstrap = new THREE.Mesh(backstrapGeo, matGrip);
  backstrap.rotation.set(-0.385, 0, Math.PI / 2);
  backstrap.position.set(0, -0.310, -0.245);
  gun.add(backstrap);

  // 握把防滑菱形格纹（InstancedMesh，两侧）
  const diaGeo = new THREE.BoxGeometry(0.003, 0.032, 0.032);
  const diaCount = 36;
  const diamonds = new THREE.InstancedMesh(diaGeo, matGrip, diaCount);
  let di = 0;
  for (const sx of [-1, 1]) {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        dummy.position.set(
          sx * 0.084,
          -0.090 - r * 0.055,
          -0.158 - c * 0.040
        );
        dummy.rotation.set(-0.385, 0, Math.PI / 4);
        dummy.updateMatrix();
        diamonds.setMatrixAt(di++, dummy.matrix);
      }
    }
  }
  diamonds.instanceMatrix.needsUpdate = true;
  gun.add(diamonds);

  // 握把螺丝（两侧上方各一颗）
  const screwGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.004, 12);
  const screwMat = new THREE.MeshStandardMaterial({ color: 0x3a3d43, roughness: 0.45, metalness: 0.65 });
  for (const sx of [-1, 1]) {
    const screw = new THREE.Mesh(screwGeo, screwMat);
    screw.rotation.z = Math.PI / 2;
    screw.position.set(sx * 0.082, -0.075, -0.142);
    gun.add(screw);
  }

  // ================= 扳机护圈 Trigger Guard =================
  const guard = new THREE.Mesh(
    new THREE.TorusGeometry(0.048, 0.010, 10, 30, Math.PI), matFrame
  );
  guard.position.set(0, -0.068, 0.040);
  guard.rotation.set(Math.PI / 2, 0, 0);
  gun.add(guard);

  // 护圈前连接段
  const guardFront = new THREE.Mesh(
    new THREE.BoxGeometry(0.016, 0.028, 0.026), matFrame
  );
  guardFront.position.set(0, -0.032, 0.080);
  gun.add(guardFront);

  // 扳机（长条形，Desert Eagle 扳机较长）
  const trigger = new THREE.Mesh(
    roundedExtrude({ w: 0.014, h: 0.056, r: 0.004, depth: 0.016, bevel: 0.002 }),
    matSteel
  );
  trigger.rotation.x = Math.PI / 2;
  trigger.position.set(0, -0.070, 0.060);
  gun.add(trigger);

  // ================= 击锤 Hammer =================
  // Desert Eagle 方形击锤，有明显的"耳朵"造型
  const hammerGeo = roundedExtrude({ w: 0.058, h: 0.042, r: 0.008, depth: 0.028, bevel: 0.004 });
  const hammer = new THREE.Mesh(hammerGeo, matSteel);
  hammer.position.set(0, 0.024, -0.348);
  gun.add(hammer);

  // 击锤扳起指槽（后部上方凸起）
  const hammerSpur = new THREE.Mesh(
    new THREE.BoxGeometry(0.044, 0.014, 0.018), matDark
  );
  hammerSpur.position.set(0, 0.052, -0.358);
  hammerSpur.rotation.x = 0.20;
  gun.add(hammerSpur);

  // ================= 手动保险 Slide Stop / Safety =================
  const safety = new THREE.Mesh(
    roundedExtrude({ w: 0.072, h: 0.018, r: 0.005, depth: 0.028, bevel: 0.003 }),
    matSteel
  );
  safety.rotation.y = Math.PI / 2;
  safety.position.set(0.092, -0.012, -0.072);
  gun.add(safety);

  // 保险拨杆端头
  const safetyTip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.011, 0.018, 10), matSteel
  );
  safetyTip.rotation.z = Math.PI / 2;
  safetyTip.position.set(0.104, -0.012, -0.072);
  gun.add(safetyTip);

  // ================= 弹匣释放钮 =================
  const magRelease = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.011, 0.014, 12), matSteel
  );
  magRelease.rotation.z = Math.PI / 2;
  magRelease.position.set(0.090, -0.094, -0.145);
  gun.add(magRelease);

  // ================= 弹匣 =================
  const mag = new THREE.Mesh(
    roundedExtrude({ w: 0.112, h: 0.044, r: 0.008, depth: 0.124, bevel: 0.004 }),
    matSteel
  );
  mag.rotation.x = -0.385;
  mag.position.set(0, -0.348, -0.225);
  gun.add(mag);

  // 弹匣底板（黑色塑料）
  const magBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.122, 0.012, 0.136), matGrip
  );
  magBase.rotation.x = -0.385;
  magBase.position.set(0, -0.376, -0.232);
  gun.add(magBase);

  // ================= 前准星 =================
  // 圆形准星柱（Desert Eagle 传统设计）
  const frontSightGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.022, 14);
  const frontSight = new THREE.Mesh(frontSightGeo, matSight);
  frontSight.position.set(0, 0.074, 0.272);
  gun.add(frontSight);

  const frontDot = new THREE.Mesh(new THREE.CircleGeometry(0.0035, 12), matDot);
  frontDot.position.set(0, 0.077, 0.284);
  gun.add(frontDot);

  // ================= 后照门 Rear Sight =================
  // 可调式照门：方形基座 + 缺口 + 两片立叶
  for (const sx of [-1, 1]) {
    const leaf = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, 0.024, 0.024), matSight
    );
    leaf.position.set(sx * 0.032, 0.074, -0.272);
    gun.add(leaf);
  }
  const sightBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.082, 0.008, 0.026), matSight
  );
  sightBase.position.set(0, 0.062, -0.272);
  gun.add(sightBase);

  // 照门缺口
  const notch = new THREE.Mesh(
    new THREE.BoxGeometry(0.024, 0.006, 0.009), matHole
  );
  notch.position.set(0, 0.080, -0.276);
  gun.add(notch);

  // ================= 阴影 =================
  gun.traverse(o => {
    if (o.isMesh || o.isInstancedMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });

  return gun;
}

// 挂载到相机右下方，第一人称视角
export function attachWeapon(camera) {
  const weapon = createDesertEagle();
  // 位置：屏幕右下方，枪管朝前
  // x 正方向 = 屏幕右；y 负 = 屏幕下；z 负 = 屏幕前
  weapon.position.set(0.24, -0.24, -0.50);
  weapon.rotation.set(0.022, 0.035, -0.012);
  weapon.name = 'weapon';
  camera.add(weapon);
  return weapon;
}
