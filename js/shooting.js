// 射击：射线检测 + 枪口闪光 + 爆炸粒子 + 计分 + 音效
import * as THREE from 'three';
import { state } from './state.js';
import { getBalloons, removeBalloon, maintainBalloons } from './balloon.js';

const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);
const particles = [];

let muzzleFlash = null;
let muzzleTimer = 0;
const MUZZLE_DURATION = 0.08;

// === 音效系统 ===
let audioCtx = null;
let gunshotBuffer = null;

// 初始化音频（必须在用户交互后调用）
function initAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) { return; }

  // 加载 M1911 枪声 mp3
  fetch('assets/gunshot-indoor.mp3')
    .then(r => r.arrayBuffer())
    .then(buf => audioCtx.decodeAudioData(buf))
    .then(decoded => { gunshotBuffer = decoded; })
    .catch(() => {});
}

// 播放枪声
function playGunshot() {
  if (!audioCtx || !gunshotBuffer) return;
  const src = audioCtx.createBufferSource();
  src.buffer = gunshotBuffer;
  src.playbackRate.value = 0.95 + Math.random() * 0.1;  // 轻微变调
  const gain = audioCtx.createGain();
  gain.gain.value = 0.55;
  src.connect(gain).connect(audioCtx.destination);
  src.start();
}

// 合成气球破裂 pop 声
function playPop() {
  if (!audioCtx) return;
  const dur = 0.08;
  const sr = audioCtx.sampleRate;
  const buffer = audioCtx.createBuffer(1, Math.floor(sr * dur), sr);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3);
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 900 + Math.random() * 400;
  filter.Q.value = 2.5;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.4;
  src.connect(filter).connect(gain).connect(audioCtx.destination);
  src.start();
}

// 枪口闪光：多同心圆大小渐变+颜色渐变，更真实
function createMuzzleFlash(camera) {
  const group = new THREE.Group();
  group.position.set(0.20, -0.16, -0.13);
  group.visible = false;

  const outer = new THREE.Mesh(
    new THREE.CircleGeometry(0.10, 16),
    new THREE.MeshBasicMaterial({
      color: 0xffeeaa,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  const mid = new THREE.Mesh(
    new THREE.CircleGeometry(0.07, 16),
    new THREE.MeshBasicMaterial({
      color: 0xffffcc,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  const inner = new THREE.Mesh(
    new THREE.CircleGeometry(0.04, 12),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );

  group.add(outer);
  group.add(mid);
  group.add(inner);
  camera.add(group);
  return { group, outer, mid, inner };
}

export function initShooting(camera) {
  muzzleFlash = createMuzzleFlash(camera);

  document.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    if (document.pointerLockElement !== document.body) return;
    if (!audioCtx) initAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    fire(camera);
  });
}

// 开火：枪声 + 射线 + 闪光 + 命中处理
export function fire(camera) {
  if (!state.running) return;

  playGunshot();
  triggerMuzzleFlash();

  raycaster.setFromCamera(center, camera);
  const targets = getBalloons();
  const hits = raycaster.intersectObjects(targets, true);

  let hitBalloon = false;
  if (hits.length > 0) {
    let obj = hits[0].object;
    while (obj.parent && !targets.includes(obj)) obj = obj.parent;
    if (targets.includes(obj)) {
      onHitBalloon(obj, hits[0].point);
      hitBalloon = true;
    }
  }

  // 挑战模式：空枪扣 10 分
  if (!hitBalloon && state.mode === 'challenge') {
    state.score = Math.max(0, state.score - 10);
    document.dispatchEvent(new CustomEvent('score:updated', { detail: state.score }));
  }
}

function onHitBalloon(balloon, hitPoint) {
  const u = balloon.userData;
  const points = Math.round(20 + (0.50 - u.radius) * 80);
  state.score += points;
  state.lastHitTime = performance.now();

  playPop();
  spawnExplosion(hitPoint, u.color);

  removeBalloon(balloon);
  maintainBalloons();

  document.dispatchEvent(new CustomEvent('score:updated', { detail: state.score }));
}

function triggerMuzzleFlash() {
  if (!muzzleFlash) return;
  muzzleFlash.group.visible = true;
  muzzleFlash.outer.material.opacity = 0.8;
  muzzleFlash.mid.material.opacity = 0.9;
  muzzleFlash.inner.material.opacity = 1.0;
  muzzleFlash.outer.scale.setScalar(1);
  muzzleFlash.mid.scale.setScalar(1);
  muzzleFlash.inner.scale.setScalar(1);
  muzzleTimer = MUZZLE_DURATION;
}

// 爆炸：中心闪光球 + N 个径向飞溅碎片
function spawnExplosion(center, colorHex) {
  const group = new THREE.Group();
  group.position.copy(center);

  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 })
  );
  group.add(flash);

  const bits = [];
  const N = 14;
  for (let i = 0; i < N; i++) {
    const bit = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.04, 0.04),
      new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 1 })
    );
    const dir = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    ).normalize().multiplyScalar(2 + Math.random() * 2.5);
    bits.push({ mesh: bit, vel: dir, spin: (Math.random() - 0.5) * 8 });
    group.add(bit);
  }

  state.scene.add(group);
  particles.push({ group, flash, bits, age: 0, duration: 0.6 });
}

// 每帧更新：枪口衰减 + 粒子飞溅与消失
export function updateEffects(dt) {
  if (muzzleFlash && muzzleTimer > 0) {
    muzzleTimer -= dt;
    const ratio = Math.max(0, muzzleTimer / MUZZLE_DURATION);
    const expand = (1 - ratio) * 1.2;

    muzzleFlash.outer.material.opacity = 0.8 * ratio;
    muzzleFlash.mid.material.opacity = 0.9 * ratio;
    muzzleFlash.inner.material.opacity = 1.0 * ratio;
    muzzleFlash.outer.scale.setScalar(1 + expand * 0.8);
    muzzleFlash.mid.scale.setScalar(1 + expand * 0.5);
    muzzleFlash.inner.scale.setScalar(1 + expand * 0.2);
    muzzleFlash.group.lookAt(state.camera.position);
    if (muzzleTimer <= 0) muzzleFlash.group.visible = false;
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.age += dt;
    const t = p.age / p.duration;

    for (const b of p.bits) {
      b.mesh.position.x += b.vel.x * dt;
      b.mesh.position.y += b.vel.y * dt;
      b.mesh.position.z += b.vel.z * dt;
      b.vel.y -= 5 * dt;
      b.mesh.rotation.x += b.spin * dt;
      b.mesh.rotation.y += b.spin * dt;
      b.mesh.material.opacity = 1 - t;
    }

    const s = 1 + t * 4;
    p.flash.scale.set(s, s, s);
    p.flash.material.opacity = 1 - t;

    if (p.age >= p.duration) {
      state.scene.remove(p.group);
      p.group.traverse(o => {
        if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); }
      });
      particles.splice(i, 1);
    }
  }
}
