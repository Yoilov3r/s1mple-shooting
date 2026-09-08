// 场景：现代训练场风格 — 金属框架 + 预制墙板 + 大尺寸地砖 + 格栅吊顶灯
// 精致几何体：倒角边框 + 精准分段 + PBR 材质 + 真实光影
import * as THREE from 'three';
import { makePanelTexture, makeTileTexture, makeBrickNormalTexture } from './textures.js';

// 墙面：灰色哑光面板 + 金属框架收边
function makeWallMaterials() {
  const panelTex = makePanelTexture({
    width: 1024, height: 1024,
    baseColor: '#1c202e',
    seamColor: '#12161f',
    grainStrength: 0.08,
  });
  const panelNormal = makeBrickNormalTexture({ width: 1024, height: 1024 });

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x0c0e14,
    roughness: 0.25,
    metalness: 0.9,
  });

  const panelMat = new THREE.MeshStandardMaterial({
    map: panelTex,
    normalMap: panelNormal,
    normalScale: new THREE.Vector2(0.7, 0.7),
    color: 0x1c202e,
    roughness: 0.65,
    metalness: 0.05,
  });

  return { frame: frameMat, panel: panelMat };
}

export function createRoom(size = 60) {
  const group = new THREE.Group();
  const half = size / 2;
  const ceilingH = 12; // 现代空间，高度 12 米更合理
  const frameW = 0.15; // 框架宽度

  const materials = makeWallMaterials();

  // --- 天空穹顶：深空渐变 + 星星 ---
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 1024; skyCanvas.height = 512;
  const ctx = skyCanvas.getContext('2d');
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 512);
  skyGrad.addColorStop(0, '#05070f');
  skyGrad.addColorStop(0.3, '#080c16');
  skyGrad.addColorStop(0.6, '#0a1020');
  skyGrad.addColorStop(0.9, '#0e1422');
  skyGrad.addColorStop(1, '#121828');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 1024, 512);
  // 星星
  for (let i = 0; i < 200; i++) {
    const sx = Math.random() * 1024;
    const sy = Math.random() * 256;
    const br = 120 + Math.random() * 135;
    const r = 0.3 + Math.random() * 1.2;
    ctx.fillStyle = `rgba(${br},${br},${br},${0.3 + Math.random() * 0.4})`;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  const skyGeo = new THREE.SphereGeometry(half * 3, 48, 24);
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTex,
    side: THREE.BackSide,
    fog: false,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  group.add(sky);

  // 太阳光晕
  const sunGlow = new THREE.Mesh(
    new THREE.SphereGeometry(3, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff0e0, transparent: true, opacity: 0.25 })
  );
  sunGlow.position.set(20, 35, -20);
  group.add(sunGlow);

  // --- 地面：大尺寸灰色地砖 + 黑色勾缝 ---
  const groundTex = makeTileTexture({
    width: 1024, height: 1024,
    size: 4,
    tileColor: '#141824',
    groutColor: '#080a0f',
  });
  const tileMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    color: 0x141824,
    roughness: 0.7,
    metalness: 0.1,
  });

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size, 1, 1),
    tileMat
  );
  floor.rotation.set(-Math.PI / 2, 0, 0);
  floor.position.set(0, 0, 0);
  floor.receiveShadow = true;
  group.add(floor);

  // 地面发光网格线（Aim Rush 标志性元素）
  const gridMat = new THREE.MeshBasicMaterial({
    color: 0x00d4ff,
    transparent: true,
    opacity: 0.06,
    depthWrite: false,
  });
  const gridGeo = new THREE.PlaneGeometry(size - 4, size - 4, 14, 14);
  const grid = new THREE.Mesh(gridGeo, gridMat);
  grid.rotation.set(-Math.PI / 2, 0, 0);
  grid.position.set(0, 0.01, 0);
  group.add(grid);

  // --- 四周墙体：框架 + 面板 ---
  // 每个墙分为：左右两根竖框 + 上下两根横框 + 中间面板
  function buildWall(xSide, zSide, matFrame, matPanel) {
    const w = xSide !== 0 ? size - frameW * 2 : size;
    const h = ceilingH - frameW * 2;
    const panelGeo = new THREE.PlaneGeometry(w, h, 1, 1);
    const panel = new THREE.Mesh(panelGeo, matPanel);
    panel.receiveShadow = true;
    panel.position.set(
      xSide * (half - 0),
      ceilingH / 2,
      zSide * half
    );
    if (xSide !== 0) panel.rotation.y = xSide * Math.PI / 2;
    group.add(panel);

    // 竖框
    if (xSide === 0) {
      for (const s of [-1, 1]) {
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(frameW, ceilingH, frameW), matFrame
        );
        post.position.set(s * (half - frameW / 2), ceilingH / 2, zSide * half);
        post.castShadow = true;
        post.receiveShadow = true;
        group.add(post);
      }
    } else {
      // 上下横框
      for (const s of [-1, 1]) {
        const beam = new THREE.Mesh(
          new THREE.BoxGeometry(size, frameW, frameW), matFrame
        );
        beam.position.set(0, (s * (ceilingH / 2 - frameW / 2)), zSide * half);
        beam.castShadow = true;
        beam.receiveShadow = true;
        group.add(beam);
      }
    }
  }

  const mf = materials.frame;
  const mp = materials.panel;
  buildWall(-1,  0, mf, mp); // -X
  buildWall( 1,  0, mf, mp); // +X
  buildWall( 0, -1, mf, mp); // -Z
  buildWall( 0,  1, mf, mp); // +Z

  // --- 墙角内角金属倒角收边 ---
  const cornerPostMat = new THREE.MeshStandardMaterial({
    color: 0x0a0e14, roughness: 0.25, metalness: 0.9,
  });
  const corners = [
    [ half, -half], [-half, -half],
    [ half,  half], [-half,  half],
  ];
  for (const [x, z] of corners) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(frameW * 1.2, ceilingH, frameW * 1.2),
      cornerPostMat
    );
    post.position.set(x, ceilingH / 2, z);
    post.castShadow = true;
    post.receiveShadow = true;
    group.add(post);
  }

  // --- 踢脚线 ---
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x0c0e14, roughness: 0.3, metalness: 0.8,
  });
  const baseH = 0.12;
  const baseD = 0.08;
  for (const x of [-half, half]) {
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(baseD, baseH, size - frameW * 2), baseMat
    );
    base.position.set(Math.sign(x) * (half - baseD / 2), baseH / 2, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);
  }
  for (const z of [-half, half]) {
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(size - frameW * 2, baseH, baseD), baseMat
    );
    base.position.set(0, baseH / 2, Math.sign(z) * (half - baseD / 2));
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);
  }

  // --- 天花板：金属格栅灯 ---
  const ceilingTex = makePanelTexture({
    width: 1024, height: 1024,
    baseColor: '#141824',
    seamColor: '#0a0e14',
  });
  const ceilingMat = new THREE.MeshStandardMaterial({
    map: ceilingTex,
    color: 0x141824,
    roughness: 0.4,
    metalness: 0.3,
  });
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(size - frameW * 2, size - frameW * 2, 8, 8),
    ceilingMat
  );
  ceiling.rotation.set(Math.PI / 2, 0, 0);
  ceiling.position.set(0, ceilingH, 0);
  ceiling.castShadow = false;
  ceiling.receiveShadow = true;
  group.add(ceiling);

  // 格栅灯（嵌入式 LED 面板灯）
  const ledMat = new THREE.MeshBasicMaterial({
    color: 0xfff8ee,
    transparent: true,
    opacity: 0.9,
  });
  const ledFrameMat = new THREE.MeshStandardMaterial({
    color: 0x0c0e14,
    roughness: 0.2,
    metalness: 0.9,
  });
  const gridCount = 4;
  const step = (size - frameW * 2) / gridCount;
  const ledSize = step * 0.8;
  const ledY = ceilingH - 0.03;
  for (let ix = 0; ix < gridCount; ix++) {
    for (let iz = 0; iz < gridCount; iz++) {
      const x = (-size / 2 + frameW) + (ix + 0.5) * step;
      const z = (-size / 2 + frameW) + (iz + 0.5) * step;
      // 灯框
      const ledFrame = new THREE.Mesh(
        new THREE.BoxGeometry(ledSize + 0.05, 0.05, ledSize + 0.05),
        ledFrameMat
      );
      ledFrame.position.set(x, ledY, z);
      group.add(ledFrame);
      // 发光面板
      const ledPanel = new THREE.Mesh(
        new THREE.BoxGeometry(ledSize, 0.02, ledSize),
        ledMat
      );
      ledPanel.position.set(x, ledY - 0.02, z);
      group.add(ledPanel);
      // 点光源补光
      const light = new THREE.PointLight(0xfff8ee, 6, 15, 2);
      light.position.set(x, ledY - 0.05, z);
      light.castShadow = false;
      group.add(light);
    }
  }

  // --- 围栏：深色金属，z=0 处 ---
  group.add(createModernFence(size));

  return group;
}

// 现代围栏：方形立柱 + 矩形横杆 + 更重几何感，倒角圆角
function createModernFence(roomSize) {
  const fence = new THREE.Group();
  const half = roomSize / 2;

  const matPost = new THREE.MeshStandardMaterial({
    color: 0x0c0e14, roughness: 0.25, metalness: 0.9,
  });
  const matRail = new THREE.MeshStandardMaterial({
    color: 0x141824, roughness: 0.3, metalness: 0.85,
  });

  const postH = 1.2;
  const postW = 0.08;
  const railW = 0.05;
  const railY1 = 0.5;
  const railY2 = 1.0;

  const postCount = Math.floor(roomSize / 3.5) + 1;
  const startX = -half + (roomSize - (postCount - 1) * 3.5) / 2;

  for (let i = 0; i < postCount; i++) {
    const x = startX + i * 3.5;
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(postW, postH, postW), matPost
    );
    post.position.set(x, postH / 2, 0);
    post.castShadow = true;
    post.receiveShadow = true;
    fence.add(post);
    // 顶部圆角顶盖
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(postW * 1.1, 0.05, postW * 1.1), matPost
    );
    cap.position.set(x, postH - 0.025, 0);
    fence.add(cap);
  }

  for (const y of [railY1, railY2]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(roomSize - 1.6, railW, postW), matRail
    );
    rail.position.set(0, y, 0);
    rail.castShadow = true;
    rail.receiveShadow = true;
    fence.add(rail);
  }

  // 竖向连杆
  const spacing = 0.35;
  const linkMat = new THREE.MeshStandardMaterial({
    color: 0x141824, roughness: 0.3, metalness: 0.8,
  });
  for (let i = 0; i < postCount - 1; i++) {
    const x0 = startX + i * 3.5;
    const x1 = startX + (i + 1) * 3.5;
    const steps = Math.floor((x1 - x0) / spacing);
    const step = (x1 - x0) / steps;
    for (let s = 1; s < steps; s++) {
      const x = x0 + s * step;
      const link = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, railY2 - railY1, 0.03), linkMat
      );
      link.position.set(x, (railY1 + railY2) / 2, 0);
      link.castShadow = true;
      fence.add(link);
    }
  }

  return fence;
}

// 现代多层光照：面板灯补光 + 主方向光 + 环境光
export function createLights() {
  const group = new THREE.Group();

  // 环境光（深冷色）
  group.add(new THREE.AmbientLight(0x1a2030, 0.3));

  // 主方向光：来自天空，冷白色轻微偏蓝
  const dir = new THREE.DirectionalLight(0xe8f0ff, 1.0);
  dir.position.set(8, 20, -12);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  dir.shadow.camera.left = -32;
  dir.shadow.camera.right = 32;
  dir.shadow.camera.top = 32;
  dir.shadow.camera.bottom = -32;
  dir.shadow.camera.near = 1;
  dir.shadow.camera.far = 80;
  dir.shadow.bias = -0.0003;
  dir.shadow.normalBias = 0.015;
  group.add(dir);

  // 暖色补光：从另一侧进来，增加对比
  const fill = new THREE.DirectionalLight(0xffcc88, 0.25);
  fill.position.set(-10, 8, 8);
  group.add(fill);

  // 半球光（顶部冷色，地面暖灰）
  group.add(new THREE.HemisphereLight(0x4466aa, 0x1a1e28, 0.3));

  // 围栏背光强调轮廓
  const accent = new THREE.SpotLight(0x00d4ff, 0.35, 28, Math.PI / 5, 0.4, 1.2);
  accent.position.set(0, 8, 6);
  accent.target.position.set(0, 0, 0);
  accent.castShadow = false;
  group.add(accent);
  group.add(accent.target);

  return group;
}