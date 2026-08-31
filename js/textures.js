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

// ---------- 砖瓦（墙体） ----------
// lightTint 控制整体灰调，contrast 控制灰缝 vs 砖面色差
export function makeBrickTexture({
  width = 1024, height = 1024,
  rows = 16, cols = 10,
  baseColor = '#e5e2dc',
  mortarColor = '#7a7772',
  darkShift = 22,
  contrast = 1.0,
} = {}) {
  const cv = makeCanvas(width, height);
  const ctx = cv.getContext('2d');

  const c0 = new THREE.Color(baseColor);
  const c1 = new THREE.Color(mortorColor(mortarColor));

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

// 处理拼错的 mortor 别名
function mortorColor(c) { return c; }

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

// ---------- 工具函数 ----------
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function rgbHex(r, g, b) {
  const h = x => Math.round(clamp01(x) * 255).toString(16).padStart(2, '0');
  return '#' + h(r) + h(g) + h(b);
}
