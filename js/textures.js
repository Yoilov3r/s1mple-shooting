/**
 * 程序化纹理生成器：Canvas + CanvasTexture
 * 不依赖外部贴图，快速提升场景/枪械的美术质感
 */
import * as THREE from 'three';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function noise2(x, y, seed = 0) {
  // 简单哈希噪声 [0,1)
  const n = Math.sin((x * 127.1 + y * 311.7 + seed * 74.7)) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const a = noise2(ix, iy, seed);
  const b = noise2(ix + 1, iy, seed);
  const c = noise2(ix, iy + 1, seed);
  const d = noise2(ix + 1, iy + 1, seed);
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  return a * (1 - sx) * (1 - sy) + b * sx * (1 - sy) + c * (1 - sx) * sy + d * sx * sy;
}

// ---------- 砖瓦（墙体）— 深色 Aim Rush 风格 ----------
export function makeBrickTexture({
  width = 1024, height = 1024,
  rows = 16, cols = 10,
  baseColor = '#2a2e3a',
  mortarColor = '#1a1e28',
  darkShift = 15,
  contrast = 1.5,
} = {}) {
  const cv = makeCanvas(width, height);
  const ctx = cv.getContext('2d');

  const c0 = new THREE.Color(baseColor);
  const c1 = new THREE.Color(mortarColor);

  const tileW = width / cols;
  const tileH = height / rows;
  const mortarT = Math.max(1, Math.floor(tileH * 0.08));

  // 先画灰缝底色
  ctx.fillStyle = '#' + c1.getHexString();
  ctx.fillRect(0, 0, width, height);

  for (let r = 0; r < rows; r++) {
    const y = r * tileH;
    const offset = (r & 1) ? tileW * 0.5 : 0;
    for (let c = 0; c < cols + 1; c++) {
      const x = c * tileW + offset;

      // 单块砖的微妙颜色扰动
      const jitter = (noise2(r * 3.1, c * 7.3, 11) - 0.5) * darkShift * 0.01 * contrast;
      const dr = clamp01(c0.r + jitter);
      const dg = clamp01(c0.g + jitter * 0.95 - 0.004 * contrast);
      const db = clamp01(c0.b + jitter * 0.9 - 0.006 * contrast);

      // 砖的四角/中心稍不同（磨损感）
      ctx.fillStyle = rgbHex(dr, dg, db);
      ctx.fillRect(x + mortarT, y + mortarT, tileW - mortarT * 2, tileH - mortarT * 2);

      // 砖身细微噪点
      for (let i = 0; i < 28; i++) {
        const nx = x + mortarT + Math.random() * (tileW - mortarT * 2);
        const ny = y + mortarT + Math.random() * (tileH - mortarT * 2);
        const val = Math.random();
        ctx.fillStyle = val < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)';
        ctx.fillRect(nx, ny, 1.4, 1.4);
      }

      // 砖内渐变：上浅下深
      const grad = ctx.createLinearGradient(0, y, 0, y + tileH);
      grad.addColorStop(0, 'rgba(255,255,255,0.09)');
      grad.addColorStop(1, 'rgba(0,0,0,0.13)');
      ctx.fillStyle = grad;
      ctx.fillRect(x + mortarT, y + mortarT, tileW - mortarT * 2, tileH - mortarT * 2);
    }
  }

  // 整体一层低频噪声（模拟光照不均/污渍）
  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const n = smoothNoise(x * 0.004, y * 0.004, 5) - 0.5;
      const a = Math.abs(n) * 0.22;
      ctx.fillStyle = n > 0 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
      ctx.fillRect(x, y, 4, 4);
    }
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- 砖墙法线贴图（程序化凹凸感） ----------
export function makeBrickNormalTexture({
  width = 1024, height = 1024,
  rows = 14, cols = 8,
  strength = 0.5,
} = {}) {
  const cv = makeCanvas(width, height);
  const ctx = cv.getContext('2d');
  const tileW = width / cols;
  const tileH = height / rows;
  const mortarT = Math.max(1, Math.floor(tileH * 0.08));

  // 填充灰色（法线 128,128,255 = 平坦）
  ctx.fillStyle = 'rgb(128,128,255)';
  ctx.fillRect(0, 0, width, height);

  for (let r = 0; r < rows; r++) {
    const y = r * tileH;
    const offset = (r & 1) ? tileW * 0.5 : 0;
    for (let c = 0; c < cols + 1; c++) {
      const x = c * tileW + offset;
      // 砖块内部：轻微随机法线偏移（表面不平）
      const rn = 128 + (noise2(r * 3.1, c * 7.3, 11) - 0.5) * 40 * strength;
      const gn = 128 + (noise2(r * 5.7, c * 2.3, 17) - 0.5) * 40 * strength;
      ctx.fillStyle = `rgb(${Math.round(rn)},${Math.round(gn)},255)`;
      ctx.fillRect(x + mortarT, y + mortarT, tileW - mortarT * 2, tileH - mortarT * 2);
    }
  }

  // 灰缝区域：法线偏角（凹陷感）
  ctx.fillStyle = 'rgb(100,100,200)';
  for (let r = 0; r < rows; r++) {
    const y = r * tileH;
    const offset = (r & 1) ? tileW * 0.5 : 0;
    for (let c = 0; c < cols + 1; c++) {
      const x = c * tileW + offset;
      ctx.fillRect(x + mortarT, y, tileW - mortarT * 2, mortarT);
      ctx.fillRect(x, y + mortarT, mortarT, tileH - mortarT * 2);
      ctx.fillRect(x + tileW - mortarT, y + mortarT, mortarT, tileH - mortarT * 2);
    }
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

// ---------- 木地板/木质握把 ----------
export function makeWoodTexture({
  width = 512, height = 512,
  color = '#4a3a28',
} = {}) {
  const cv = makeCanvas(width, height);
  const ctx = cv.getContext('2d');
  const c0 = new THREE.Color(color);

  ctx.fillStyle = '#' + c0.getHexString();
  ctx.fillRect(0, 0, width, height);

  // 纵向木纹（高频+低频叠加）
  for (let x = 0; x < width; x++) {
    const noiseLow = smoothNoise(x * 0.01, 0, 3);
    const noiseHi = smoothNoise(x * 0.1, 0, 7) - 0.5;
    const t = 0.5 + noiseLow * 0.45 + noiseHi * 0.2;
    const r = clamp01(c0.r * (0.85 + t * 0.45));
    const g = clamp01(c0.g * (0.85 + t * 0.45));
    const b = clamp01(c0.b * (0.85 + t * 0.45));
    ctx.strokeStyle = rgbHex(r, g, b);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // 横向年轮弧线
  for (let i = 0; i < 24; i++) {
    ctx.strokeStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.08})`;
    ctx.lineWidth = 0.6 + Math.random() * 1.2;
    const y = Math.random() * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= width; x += 16) {
      const off = Math.sin(x * 0.008 + i) * 6 + (Math.random() - 0.5) * 2;
      ctx.lineTo(x, y + off);
    }
    ctx.stroke();
  }

  // 散布节疤
  for (let i = 0; i < 4; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const R = 8 + Math.random() * 18;
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, R);
    g.addColorStop(0, 'rgba(20,10,0,0.45)');
    g.addColorStop(1, 'rgba(20,10,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, R, R * 0.75, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- 金属拉丝（冷加工钢）----------
export function makeMetalBlastTexture({
  width = 512, height = 512,
  tint = '#2e3036',
  direction = 'horizontal',
} = {}) {
  const cv = makeCanvas(width, height);
  const ctx = cv.getContext('2d');

  const isH = direction === 'horizontal';
  const len = isH ? width : height;
  const perp = isH ? height : width;

  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < perp; i++) {
    const noise = smoothNoise(0, i * 0.1, 2) - 0.5;
    const c = Math.round(128 + noise * 70);
    ctx.strokeStyle = isH ? `rgb(${c},${c},${c})` : `rgb(${c},${c},${c})`;
    ctx.beginPath();
    if (isH) { ctx.moveTo(0, i); ctx.lineTo(len, i); }
    else     { ctx.moveTo(i, 0); ctx.lineTo(i, len); }
    ctx.stroke();
  }

  // 随机高频细碎反光
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const v = Math.random();
    ctx.fillStyle = v < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';
    ctx.fillRect(x, y, 1, 1);
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- 地面（深色水泥/沥青 + 裂缝 + 污渍）— Aim Rush 风格 ----------
export function makeGroundTexture({
  width = 1024, height = 1024,
  baseColor = '#0d0f14',
  crackColor = '#1a1c22',
  stainColor = '#12141a',
} = {}) {
  const cv = makeCanvas(width, height);
  const ctx = cv.getContext('2d');
  const c0 = new THREE.Color(baseColor);

  // 底色 + 噪声变化
  ctx.fillStyle = '#' + c0.getHexString();
  ctx.fillRect(0, 0, width, height);

  // 大面积色块变化（低频噪声）
  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const n = smoothNoise(x * 0.006, y * 0.006, 1) - 0.5;
      const a = Math.abs(n) * 0.18;
      ctx.fillStyle = n > 0 ? `rgba(255,250,240,${a})` : `rgba(40,38,35,${a})`;
      ctx.fillRect(x, y, 4, 4);
    }
  }

  // 细碎噪点（砂石感）
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const v = Math.random();
    ctx.fillStyle = v < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)';
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  // 裂缝（随机折线）
  const c1 = new THREE.Color(crackColor);
  ctx.strokeStyle = '#' + c1.getHexString();
  for (let i = 0; i < 12; i++) {
    ctx.lineWidth = 0.8 + Math.random() * 1.5;
    ctx.beginPath();
    let x = Math.random() * width;
    let y = Math.random() * height;
    ctx.moveTo(x, y);
    const segs = 5 + Math.floor(Math.random() * 8);
    for (let s = 0; s < segs; s++) {
      x += (Math.random() - 0.5) * 120;
      y += (Math.random() - 0.5) * 120;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // 污渍/水迹（径向渐变）
  const c2 = new THREE.Color(stainColor);
  for (let i = 0; i < 8; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const R = 30 + Math.random() * 80;
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, R);
    g.addColorStop(0, `rgba(${Math.round(c2.r*255)},${Math.round(c2.g*255)},${Math.round(c2.b*255)},0.25)`);
    g.addColorStop(1, `rgba(${Math.round(c2.r*255)},${Math.round(c2.g*255)},${Math.round(c2.b*255)},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, R, R * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- 天空渐变纹理 ----------
export function makeSkyTexture({
  width = 1024, height = 512,
  topColor = '#4a90d9',
  midColor = '#a8c8e8',
  bottomColor = '#e8f0f8',
} = {}) {
  const cv = makeCanvas(width, height);
  const ctx = cv.getContext('2d');

  // 垂直三段渐变
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, topColor);
  grad.addColorStop(0.35, '#5a9ad9');
  grad.addColorStop(0.55, midColor);
  grad.addColorStop(0.8, '#c8dce8');
  grad.addColorStop(1, bottomColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // 近地平线暖色带
  const horizonGrad = ctx.createLinearGradient(0, height * 0.75, 0, height);
  horizonGrad.addColorStop(0, 'rgba(255,248,240,0)');
  horizonGrad.addColorStop(1, 'rgba(255,240,220,0.3)');
  ctx.fillStyle = horizonGrad;
  ctx.fillRect(0, 0, width, height);

  // 云朵（柔和椭圆）
  for (let i = 0; i < 30; i++) {
    const cx = Math.random() * width;
    // 云主要在中间偏上区域
    const cy = height * 0.1 + Math.random() * height * 0.55;
    const rw = 30 + Math.random() * 140;
    const rh = rw * (0.25 + Math.random() * 0.25);
    // 层云（底部较暗层）
    ctx.fillStyle = `rgba(255,255,255,${0.08 + Math.random() * 0.12})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy + rh * 0.3, rw * 1.2, rh * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // 主云层
    ctx.fillStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.25})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill();
    // 叠加 2-4 个椭圆模拟蓬松云
    const subClouds = 2 + Math.floor(Math.random() * 3);
    for (let j = 0; j < subClouds; j++) {
      const ox = (Math.random() - 0.5) * rw * 0.8;
      const oy = (Math.random() - 0.5) * rh * 0.6;
      const sr = 0.4 + Math.random() * 0.7;
      ctx.fillStyle = `rgba(255,255,255,${0.12 + Math.random() * 0.18})`;
      ctx.beginPath();
      ctx.ellipse(cx + ox, cy + oy, rw * sr, rh * sr, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- 现代墙面面板（深灰色哑光面板 + 浅色接缝）----------
export function makePanelTexture({
  width = 1024, height = 1024,
  baseColor = '#1c202e',
  seamColor = '#12161f',
  grainStrength = 0.08,
} = {}) {
  const cv = makeCanvas(width, height);
  const ctx = cv.getContext('2d');
  const c0 = new THREE.Color(baseColor);

  // 底色
  ctx.fillStyle = '#' + c0.getHexString();
  ctx.fillRect(0, 0, width, height);

  // 面板分割：横向 3 块，纵向 2 块
  const cols = 3;
  const rows = 2;
  const tileW = width / cols;
  const tileH = height / rows;
  const seam = 1.5;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * tileW;
      const y = r * tileH;
      // 面板内细微噪点变化
      const jitter = 128 + (noise2(r * 7, c * 11, 3) - 0.5) * 30;
      ctx.fillStyle = `rgb(${jitter},${jitter+2},${jitter+8})`;
      ctx.fillRect(x + seam, y + seam, tileW - seam * 2, tileH - seam * 2);

      // 面板内细微灰度变化（低频）
      for (let sy = 0; sy < tileH - seam * 2; sy += 8) {
        for (let sx = 0; sx < tileW - seam * 2; sx += 8) {
          const n = smoothNoise((x + sx) * 0.008, (y + sy) * 0.008, 5) - 0.5;
          const a = Math.abs(n) * grainStrength;
          ctx.fillStyle = n > 0
            ? `rgba(255,255,255,${a})`
            : `rgba(0,0,0,${a * 0.5})`;
          ctx.fillRect(x + seam + sx, y + seam + sy, 8, 8);
        }
      }
    }
  }

  // 接缝线
  ctx.strokeStyle = '#' + new THREE.Color(seamColor).getHexString();
  ctx.lineWidth = 2;
  // 水平缝
  for (let r = 1; r < rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * tileH);
    ctx.lineTo(width, r * tileH);
    ctx.stroke();
  }
  // 垂直缝
  for (let c = 1; c < cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * tileW, 0);
    ctx.lineTo(c * tileW, height);
    ctx.stroke();
  }

  // 边缘暗角
  const vg = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.7);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, width, height);

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- 大尺寸地砖纹理（灰色瓷砖 + 细黑勾缝）----------
export function makeTileTexture({
  width = 1024, height = 1024,
  size = 4,
  tileColor = '#141824',
  groutColor = '#080a0f',
} = {}) {
  const cv = makeCanvas(width, height);
  const ctx = cv.getContext('2d');
  const c0 = new THREE.Color(tileColor);

  const tileW = width / size;
  const tileH = height / size;
  const grout = 2;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const x = c * tileW;
      const y = r * tileH;
      // 每块砖有个体颜色扰动
      const jit = (noise2(r * 3, c * 7, 1) - 0.5) * 0.04;
      const tc = THREE.Color.lerpColors(c0, new THREE.Color(groutColor), 0.5 + jit);
      ctx.fillStyle = '#' + tc.getHexString();
      ctx.fillRect(x + grout, y + grout, tileW - grout * 2, tileH - grout * 2);

      // 瓷砖内细微噪点
      for (let i = 0; i < 15; i++) {
        const nx = x + grout + Math.random() * (tileW - grout * 2);
        const ny = y + grout + Math.random() * (tileH - grout * 2);
        ctx.fillStyle = Math.random() < 0.5
          ? 'rgba(255,255,255,0.03)'
          : 'rgba(0,0,0,0.04)';
        ctx.fillRect(nx, ny, 2, 2);
      }
    }
  }

  // 勾缝
  ctx.fillStyle = '#' + new THREE.Color(groutColor).getHexString();
  ctx.fillRect(0, 0, width, 1);
  ctx.fillRect(0, 0, 1, height);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const x = c * tileW;
      const y = r * tileH;
      ctx.fillRect(x + tileW - grout, y + grout, grout, tileH - grout * 2);
      ctx.fillRect(x + grout, y + tileH - grout, tileW - grout * 2, grout);
    }
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- 工具函数 ----------
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function rgbHex(r, g, b) {
  const h = x => Math.round(clamp01(x) * 255).toString(16).padStart(2, '0');
  return '#' + h(r) + h(g) + h(b);
}
