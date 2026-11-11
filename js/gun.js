// Desert Eagle .50 AE —— 精细几何版 v2
// 参考实物图建模：侧视轮廓 Shape 挤出 + 八边形枪管 + 三条凸筋 + 分层材质
// 坐标系：X=屏幕右, Y=屏幕上, Z=屏幕前
import * as THREE from 'three';

// ============================================================
// 小工具
// ============================================================
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

function roundedExtrude({ w, h, r, depth, bevel = 0.004, curveSeg = 6 }) {
  const geo = new THREE.ExtrudeGeometry(roundedRectShape(w, h, r), {
    depth, bevelEnabled: true,
    bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2,
    curveSegments: curveSeg, steps: 1,
  });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

// 根据侧视轮廓构建挤出体
// Shape 以 (sx, sy) 形式绘制——将 XY 平面当作 YZ 平面来画
// 目标映射：世界X = 挤出方向（左右），世界Y = sy（高度），世界Z = sx（前后，sx正=前方）
function sideExtrude(shape, thickness, { bevel = 0.003, bevelSeg = 2, curveSeg = 6 } = {}) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: bevelSeg,
    curveSegments: curveSeg,
    steps: 1,
  });
  // 原顶点：(sx, sy, ez), ez ∈ [0, thickness]
  // 先绕 Y 轴旋转 -π/2：世界X = -ez, 世界Y = sy, 世界Z = sx
  geo.rotateY(-Math.PI / 2);
  // X 方向翻正，让挤出成为世界 +X（右）方向
  geo.scale(-1, 1, 1);
  // 现在世界 X ∈ [0, thickness]，平移让中心对齐到 0
  geo.translate(-thickness / 2, 0, 0);
  geo.computeVertexNormals();
  return geo;
}

// ============================================================
// 材质分层
// ============================================================
function makeMaterials() {
  return {
    // 滑套：哑光硬铬（偏银，中等粗糙度）
    slide: new THREE.MeshStandardMaterial({
      color: 0xa5a9b2, roughness: 0.38, metalness: 0.82,
    }),
    // 枪管：氧化深灰，比滑套更暗更光
    barrel: new THREE.MeshStandardMaterial({
      color: 0x52565e, roughness: 0.25, metalness: 0.90,
    }),
    // 框架（握把上方主体）：烤蓝深灰
    frame: new THREE.MeshStandardMaterial({
      color: 0x6a6e78, roughness: 0.52, metalness: 0.70,
    }),
    // 暗部金属：击锤/保险/扳机等小零件
    dark: new THREE.MeshStandardMaterial({
      color: 0x3a3d45, roughness: 0.58, metalness: 0.70,
    }),
    // 高亮金属：准星/保险拨杆/弹匣释放等小亮点
    bright: new THREE.MeshStandardMaterial({
      color: 0xc8ccd4, roughness: 0.28, metalness: 0.88,
    }),
    // 握把：合成橡胶
    grip: new THREE.MeshStandardMaterial({
      color: 0x141418, roughness: 0.94, metalness: 0.00,
    }),
    // 准星白点（高光）
    dot: new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.45, metalness: 0.00,
      emissive: 0x3a3a3a, emissiveIntensity: 0.3,
    }),
    // 膛孔/凹陷/缝隙
    hole: new THREE.MeshStandardMaterial({
      color: 0x050507, roughness: 0.90, metalness: 0.00,
    }),
    // 护圈：框架同色但略亮
    guard: new THREE.MeshStandardMaterial({
      color: 0x6d727c, roughness: 0.50, metalness: 0.72,
    }),
  };
}

// ============================================================
// Desert Eagle .50 AE 侧视轮廓（单位：米）
// 坐标 (x_yz, y) 其中 x_yz 映射到世界 Z（前为正），y 映射到世界 Y（上为正）
// ============================================================

// 滑套侧视轮廓（这是"长方形壳子"问题的核心修复——不再是纯矩形）
// Desert Eagle 滑套真实轮廓：前端有引导斜面、顶面前高后低的弧面、尾部击锤室隆起
function makeSlideShape() {
  const s = new THREE.Shape();
  // 从前端顶部开始（引导子弹入膛处，收尖斜面的上端）
  s.moveTo(0.335, 0.032);
  // 前端收尖斜面（从上到下）
  s.lineTo(0.360, 0.018);    // 最前端上点
  s.lineTo(0.360, 0.006);    // 最前端下点（贴近框架顶部）
  // 前端底部向后
  s.lineTo(0.285, 0.002);    // 滑套主体底部前限
  // 抛壳窗底部（向内凹陷一点）
  s.lineTo(0.205, 0.010);    // 抛壳窗前下角
  s.lineTo(0.050, 0.010);    // 抛壳窗后下角
  // 主体底部（向后延伸）
  s.lineTo(-0.200, 0.000);   // 滑套主体底部后限
  // 尾部向上隆起（击锤室）
  s.lineTo(-0.260, 0.000);   // 击锤室前下角
  s.lineTo(-0.315, 0.010);   // 击锤室上点前
  s.lineTo(-0.345, 0.020);   // 击锤室后上角
  s.lineTo(-0.350, 0.038);   // 击锤室顶部后
  // 顶部弧面：从击锤室顶部向前平滑过渡到前端
  // 注意：Desert Eagle 顶部不是水平的，是从后向前缓慢降低 + 向前下方收尖
  s.quadraticCurveTo(-0.160, 0.088, 0.180, 0.062);  // 主体顶部弧面
  s.lineTo(0.310, 0.040);    // 前端弧面下端
  s.lineTo(0.335, 0.032);    // 回到起点
  s.closePath();
  return s;
}

// 枪管侧视轮廓（八边形 + 衬套 + 制退器）
function makeBarrelShape() {
  const s = new THREE.Shape();
  // Desert Eagle 枪管前半段有制退器（消音器？不，是枪口补偿器）
  // 侧视：主枪管 + 衬套 + 制退器前缘
  s.moveTo(0.370, 0.038);
  s.lineTo(0.370, 0.022);
  s.lineTo(0.555, 0.022);   // 主枪管后缘
  // 枪管衬套（突出的金属环，直径更大）
  s.lineTo(0.575, 0.018);
  s.lineTo(0.595, 0.018);
  s.lineTo(0.605, 0.020);
  s.lineTo(0.605, 0.040);
  s.lineTo(0.595, 0.042);
  s.lineTo(0.575, 0.042);
  s.lineTo(0.555, 0.038);   // 主枪管前缘
  s.lineTo(0.370, 0.038);
  s.closePath();
  return s;
}

// 框架侧视轮廓（握把上方 + 扳机护圈连接 + 枪管衬套下的导杆）
function makeFrameShape() {
  const s = new THREE.Shape();
  // 框架是握把上方的主要金属结构
  // 顶部（与滑套底部接触）
  s.moveTo(0.285, 0.002);    // 前端上方（滑套下方）
  s.lineTo(0.285, -0.028);
  // 枪管导杆下方的框架延伸到衬套
  s.lineTo(0.360, -0.030);
  s.lineTo(0.375, -0.028);
  s.lineTo(0.375, -0.010);
  s.lineTo(0.355, -0.008);  // 导杆上方
  s.lineTo(0.285, -0.005);
  // 导杆底面
  s.lineTo(0.180, -0.030);  // 导杆后端下方
  // 框架主体底部
  s.lineTo(-0.100, -0.035); // 扳机护圈前方
  // 护圈上方开始收窄
  s.lineTo(-0.100, -0.045);
  s.lineTo(-0.160, -0.050); // 护圈顶部后方
  s.lineTo(-0.260, -0.052); // 框架尾部
  // 尾部向上接滑套
  s.lineTo(-0.260, -0.000);
  s.lineTo(0.285, 0.002);
  s.closePath();
  return s;
}

// 握把侧视轮廓（Desert Eagle 特有厚握把 + 28° 倾角 + 弧形收腰）
function makeGripShape() {
  const s = new THREE.Shape();
  // 握把整体倾角 ≈ 28°
  // 上部（接框架）
  s.moveTo(-0.100, -0.045);  // 上前端
  s.lineTo(-0.100, -0.080);
  // 外侧（右边，画面上可见）：从上到下收腰再展开
  s.quadraticCurveTo(-0.115, -0.145, -0.140, -0.230);
  s.quadraticCurveTo(-0.160, -0.290, -0.175, -0.340);
  // 底部（圆角）
  s.quadraticCurveTo(-0.180, -0.352, -0.168, -0.358);
  // 内侧（左边）：从上到下
  s.quadraticCurveTo(-0.155, -0.358, -0.120, -0.352);
  s.quadraticCurveTo(-0.095, -0.280, -0.090, -0.200);
  s.quadraticCurveTo(-0.090, -0.120, -0.095, -0.045);
  s.closePath();
  return s;
}

// 弹匣侧视轮廓（在握把下方露出）
function makeMagShape() {
  const s = new THREE.Shape();
  // 弹匣从握把底部伸出，约 2/3 在外面
  s.moveTo(-0.118, -0.355);
  s.lineTo(-0.165, -0.355);
  s.lineTo(-0.170, -0.460);   // 弹匣底前（露出最多）
  s.lineTo(-0.155, -0.478);   // 底前角
  s.lineTo(-0.120, -0.478);   // 底后角
  s.lineTo(-0.112, -0.460);   // 底后
  s.lineTo(-0.112, -0.355);   // 回到顶部
  s.closePath();
  return s;
}

// ============================================================
// 主建模函数
// ============================================================
export function createDesertEagle() {
  const gun = new THREE.Group();
  const M = makeMaterials();

  // -------- 1. 枪管（八边形外廓 + 衬套 + 制退器 + 膛孔）--------
  // 真实 Desert Eagle 枪管外廓是八边形，用 CylinderGeometry(8 segments) 近似
  const barrelLen = 0.185;
  const barrelEight = new THREE.Mesh(
    new THREE.CylinderGeometry(0.031, 0.032, barrelLen, 8),
    M.barrel
  );
  barrelEight.rotation.x = Math.PI / 2;
  barrelEight.position.set(0, 0.024, 0.482);
  barrelEight.rotation.z = Math.PI / 8;  // 八边形旋转，让上下两个面水平
  gun.add(barrelEight);

  // 枪管衬套（突出金属环，圆柱 24 segments 更圆）
  const bushing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.040, 0.040, 0.024, 24),
    M.bright
  );
  bushing.rotation.x = Math.PI / 2;
  bushing.position.set(0, 0.024, 0.380);
  gun.add(bushing);

  // 制退器前缘（略大于枪管的圆环）
  const muzzleRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.038, 0.012, 24),
    M.bright
  );
  muzzleRing.rotation.x = Math.PI / 2;
  muzzleRing.position.set(0, 0.024, 0.585);
  gun.add(muzzleRing);

  // 膛孔（枪口黑色圆孔）
  const bore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, 0.06, 16),
    M.hole
  );
  bore.rotation.x = Math.PI / 2;
  bore.position.set(0, 0.024, 0.590);
  gun.add(bore);

  // 枪管上方导轨（两条小金属条，连接滑套前端）
  for (const xoff of [-0.009, 0.009]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.004, 0.004, barrelLen),
      M.dark
    );
    rail.position.set(xoff, 0.040, 0.482);
    gun.add(rail);
  }

  // -------- 2. 滑套（侧视轮廓 Shape 挤出 + 三条凸筋 + 防滑锯齿）--------
  const slideGeo = sideExtrude(makeSlideShape(), 0.215, { bevel: 0.004, curveSeg: 8 });
  const slide = new THREE.Mesh(slideGeo, M.slide);
  gun.add(slide);

  // 三条纵向凸筋（Desert Eagle 最标志性特征！）
  // 滑套 shape 的 x 范围 ≈ -0.350 ~ 0.360，中心 Z ≈ 0.005
  // 三条凸筋从前端 0.290 延伸到 -0.190（避开击锤室），中心 Z ≈ 0.050
  // slide shape 的 y 范围 ≈ 0.000 ~ 0.088，中心 Y ≈ 0.044
  // 三条凸筋从上到下分布在 slide 侧视范围内
  for (const ry of [0.059, 0.044, 0.029]) {
    const rib = new THREE.Mesh(
      new THREE.BoxGeometry(0.218, 0.010, 0.48),
      M.bright
    );
    rib.position.set(0, ry, 0.050);
    gun.add(rib);
  }

  // 滑套前后防滑锯齿（齿状，不是简单 Box 凸起）
  // 前端锯齿（7 条，靠前）
  const frontSerrCount = 7;
  const serrGeo = new THREE.BoxGeometry(0.218, 0.012, 0.008);
  for (let i = 0; i < frontSerrCount; i++) {
    const z = 0.275 - i * 0.022;
    const serr = new THREE.Mesh(serrGeo, M.dark);
    serr.position.set(0, 0.086, z);
    gun.add(serr);
  }
  // 后端锯齿（9 条，靠后）
  const backSerrCount = 9;
  for (let i = 0; i < backSerrCount; i++) {
    const z = -0.200 - i * 0.018;
    const serr = new THREE.Mesh(serrGeo, M.dark);
    serr.position.set(0, 0.086, z);
    gun.add(serr);
  }

  // 抛壳窗（右侧，长方体凹陷，在三条凸筋后方）
  const ejectPort = new THREE.Mesh(
    new THREE.BoxGeometry(0.216, 0.016, 0.140),
    M.hole
  );
  ejectPort.position.set(0, 0.055, 0.128);  // 对应 shape 中的 0.205~0.050 段
  gun.add(ejectPort);

  // -------- 3. 框架（握把上方的金属主体）--------
  const frameGeo = sideExtrude(makeFrameShape(), 0.200, { bevel: 0.003, curveSeg: 6 });
  const frame = new THREE.Mesh(frameGeo, M.frame);
  gun.add(frame);

  // 枪管下方导杆（单独零件，连接框架前端和枪管衬套）
  const guideRod = new THREE.Mesh(
    roundedExtrude({ w: 0.140, h: 0.012, r: 0.003, depth: 0.080, bevel: 0.002 }),
    M.dark
  );
  guideRod.position.set(0, -0.015, 0.360);
  gun.add(guideRod);

  // 空枪挂机杆（右侧，框架上的小拨杆）
  const holdOpen = new THREE.Mesh(
    roundedExtrude({ w: 0.030, h: 0.016, r: 0.003, depth: 0.018, bevel: 0.002 }),
    M.bright
  );
  holdOpen.rotation.y = Math.PI / 2;
  holdOpen.position.set(0.104, -0.002, -0.155);
  gun.add(holdOpen);

  // -------- 4. 握把（黑色合成橡胶 + 防滑菱形纹）--------
  const gripGeo = sideExtrude(makeGripShape(), 0.148, { bevel: 0.003, curveSeg: 6 });
  const grip = new THREE.Mesh(gripGeo, M.grip);
  gun.add(grip);

  // 握把外侧防滑菱形格纹（InstancedMesh，从侧视角度可见）
  const diaGeo = new THREE.BoxGeometry(0.146, 0.006, 0.022);  // 一个菱形格片，沿握把厚度方向
  const diaCount = 40;  // 两侧各 20
  const diamonds = new THREE.InstancedMesh(diaGeo, M.grip, diaCount);
  const dummy = new THREE.Object3D();
  let di = 0;
  for (const sx of [-1, 1]) {
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 4; col++) {
        // 按侧视 grip shape 的大致范围分布
        const z = -0.092 - col * 0.022;
        const y = -0.082 - row * 0.055;
        dummy.position.set(sx * 0.074, y, z);
        dummy.rotation.x = -0.385;  // 约 22° 倾角，匹配握把
        dummy.scale.set(1, 1, 0.5);
        dummy.updateMatrix();
        diamonds.setMatrixAt(di++, dummy.matrix);
      }
    }
  }
  diamonds.instanceMatrix.needsUpdate = true;
  gun.add(diamonds);

  // 握把两颗固定螺丝（两侧上方）
  const screwGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.002, 12);
  const screwMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a30, roughness: 0.40, metalness: 0.65,
  });
  for (const sx of [-1, 1]) {
    const screw = new THREE.Mesh(screwGeo, screwMat);
    screw.rotation.z = Math.PI / 2;
    screw.position.set(sx * 0.074, -0.052, -0.072);
    gun.add(screw);
  }

  // -------- 5. 扳机护圈 --------
  // TorusGeometry(innerR, tubeR, radialSeg, tubularSeg, thetaLength)
  const guard = new THREE.Mesh(
    new THREE.TorusGeometry(0.050, 0.011, 10, 36, Math.PI),
    M.guard
  );
  guard.position.set(0, -0.070, 0.055);
  guard.rotation.set(Math.PI / 2, 0, 0);  // 让半圆朝下
  gun.add(guard);

  // 护圈与框架的连接段（填补 Torus 和框架之间的缝隙）
  const guardLink = new THREE.Mesh(
    new THREE.BoxGeometry(0.020, 0.032, 0.016),
    M.guard
  );
  guardLink.position.set(0, -0.033, 0.080);
  gun.add(guardLink);

  // -------- 6. 扳机 --------
  const trigger = new THREE.Mesh(
    roundedExtrude({ w: 0.014, h: 0.058, r: 0.005, depth: 0.018, bevel: 0.002 }),
    M.bright
  );
  trigger.rotation.x = Math.PI / 2;
  trigger.position.set(0, -0.072, 0.060);
  gun.add(trigger);

  // -------- 7. 击锤（滑套尾部上方）--------
  const hammer = new THREE.Mesh(
    roundedExtrude({ w: 0.062, h: 0.046, r: 0.008, depth: 0.028, bevel: 0.004 }),
    M.bright
  );
  hammer.position.set(0, 0.040, -0.315);
  gun.add(hammer);

  // 击锤扳起指槽（上方凸起，帮助上膛）
  const hammerSpur = new THREE.Mesh(
    roundedExtrude({ w: 0.050, h: 0.014, r: 0.004, depth: 0.022, bevel: 0.002 }),
    M.dark
  );
  hammerSpur.position.set(0, 0.075, -0.320);
  hammerSpur.rotation.x = 0.15;
  gun.add(hammerSpur);

  // -------- 8. 手动保险（左侧拨杆，位于滑套尾部）--------
  const safety = new THREE.Mesh(
    roundedExtrude({ w: 0.040, h: 0.018, r: 0.004, depth: 0.016, bevel: 0.002 }),
    M.bright
  );
  safety.rotation.y = Math.PI / 2;
  safety.position.set(-0.108, 0.008, -0.280);
  gun.add(safety);

  // -------- 9. 弹匣释放钮 --------
  const magRelease = new THREE.Mesh(
    new THREE.CylinderGeometry(0.010, 0.010, 0.014, 12),
    M.dark
  );
  magRelease.rotation.z = Math.PI / 2;
  magRelease.position.set(0.102, -0.105, -0.058);
  gun.add(magRelease);

  // -------- 10. 弹匣（握把下方露出部分）--------
  const magGeo = sideExtrude(makeMagShape(), 0.144, { bevel: 0.002, curveSeg: 6 });
  const mag = new THREE.Mesh(magGeo, M.slide);  // 弹匣金属外壳，用滑套同色
  gun.add(mag);

  // 弹匣底板（黑色塑料）
  const magBase = new THREE.Mesh(
    roundedExtrude({ w: 0.150, h: 0.010, r: 0.004, depth: 0.030, bevel: 0.002 }),
    M.grip
  );
  magBase.position.set(0, -0.472, -0.140);  // 对应 mag shape 的底部位置
  gun.add(magBase);

  // -------- 11. 前准星（圆形柱 + 白点，Desert Eagle 传统设计）--------
  const frontSight = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.022, 14),
    M.dark
  );
  frontSight.position.set(0, 0.094, 0.265);
  gun.add(frontSight);

  const frontDot = new THREE.Mesh(
    new THREE.CircleGeometry(0.0032, 14),
    M.dot
  );
  frontDot.position.set(0, 0.096, 0.277);
  gun.add(frontDot);

  // -------- 12. 后照门（可调式：基座 + 缺口 + 两片立叶）--------
  // 基座
  const sightBase = new THREE.Mesh(
    roundedExtrude({ w: 0.084, h: 0.012, r: 0.002, depth: 0.026, bevel: 0.002 }),
    M.dark
  );
  sightBase.position.set(0, 0.082, -0.268);
  gun.add(sightBase);

  // 两片立叶（缺口在中间）
  for (const sx of [-1, 1]) {
    const leaf = new THREE.Mesh(
      new THREE.BoxGeometry(0.014, 0.018, 0.020),
      M.dark
    );
    leaf.position.set(sx * 0.014, 0.097, -0.268);
    gun.add(leaf);
  }

  // 照门缺口（黑色凹陷）
  const notch = new THREE.Mesh(
    new THREE.BoxGeometry(0.022, 0.006, 0.008),
    M.hole
  );
  notch.position.set(0, 0.095, -0.276);
  gun.add(notch);

  // -------- 禁用阴影（FPS 第一人称武器不需要阴影）--------
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
  // 位置：屏幕右下方，枪管朝前（Z 负）
  // x 正 = 屏幕右；y 负 = 屏幕下；z 负 = 屏幕前
  // 放大整体尺寸 + 拉近位置，让细节可见
  weapon.position.set(0.28, -0.26, -0.55);
  weapon.rotation.set(0.025, 0.038, -0.010);
  // 稍微放大，否则在第一人称视角下细节太小看不清
  weapon.scale.setScalar(1.15);
  weapon.name = 'weapon';
  camera.add(weapon);
  return weapon;
}
