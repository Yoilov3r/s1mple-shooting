// 射击：射线检测 + 枪口闪光 + 爆炸粒子 + 计分
import * as THREE from 'three';
import { state } from './state.js';
import { getBalloons, removeBalloon, maintainBalloons } from './balloon.js';

const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);   // 屏幕中心
const particles = [];

let muzzleFlash = null;
let muzzleTimer = 0;
const MUZZLE_DURATION = 0.06;

// 枪口闪光：扁平 sprite 贴在枪口，不会穿透墙面形成半圆
function createMuzzleFlash(camera) {
  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.12, 0.12),
    new THREE.MeshBasicMaterial({
      color: 0xffcc55,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  // 定位在枪管口处（枪整体在 0.20,-0.18,-0.45，枪管口在枪本地 z=0.32）
  flash.position.set(0.20, -0.16, -0.13);
  flash.visible = false;
  camera.add(flash);
  return flash;
}

export function initShooting(camera) {
  muzzleFlash = createMuzzleFlash(camera);
  document.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    if (document.pointerLockElement !== document.body) return;
    fire(camera);
  });
}

// 开火：射线 + 闪光 + 命中处理
export function fire(camera) {
  if (!state.running) return;

  triggerMuzzleFlash();

  raycaster.setFromCamera(center, camera);
  const targets = getBalloons();
  const hits = raycaster.intersectObjects(targets, true);

  if (hits.length === 0) return;

  // 向上找到属于 balloons 数组的根
  let obj = hits[0].object;
  while (obj.parent && !targets.includes(obj)) obj = obj.parent;
  if (targets.includes(obj)) {
    onHitBalloon(obj, hits[0].point);
  }
}

function onHitBalloon(balloon, hitPoint) {
  const u = balloon.userData;
  // 半径越小分数越高（小气球更难命中）
  const points = Math.round(20 + (0.50 - u.radius) * 80);
  state.score += points;
  state.lastHitTime = performance.now();

  spawnExplosion(hitPoint, u.color);

  removeBalloon(balloon);
  maintainBalloons();

  document.dispatchEvent(new CustomEvent('score:updated', { detail: state.score }));
}

function triggerMuzzleFlash() {
  if (!muzzleFlash) return;
  muzzleFlash.visible = true;
  muzzleFlash.material.opacity = 1.0;
  muzzleFlash.scale.setScalar(1);
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
    muzzleFlash.material.opacity = ratio;
    muzzleFlash.scale.setScalar(1 + (1 - ratio) * 0.8);
    // 让闪光始终面向相机
    muzzleFlash.lookAt(state.camera.position);
    if (muzzleTimer <= 0) muzzleFlash.visible = false;
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.age += dt;
    const t = p.age / p.duration;

    for (const b of p.bits) {
      b.mesh.position.x += b.vel.x * dt;
      b.mesh.position.y += b.vel.y * dt;
      b.mesh.position.z += b.vel.z * dt;
      b.vel.y -= 5 * dt;            // 重力
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
