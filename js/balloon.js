// 气球生成系统：随机大小 / 位置 / 颜色 + 漂浮动画
import * as THREE from 'three';
import { state } from './state.js';

const COLORS = [
  0xff1744, // 红（亮）
  0xff9100, // 橙（亮）
  0xffea00, // 黄（亮）
  0xf50057, // 粉（亮）
  0x2979ff, // 蓝（亮）
  0x00e676, // 绿（亮）
  0xd500f9, // 紫（亮）
];

const MIN_RADIUS = 0.22;
const MAX_RADIUS = 0.50;
const SPAWN_X = 26;      // X 范围 ±26（房间半 30 留余量）
const SPAWN_Z_MIN = -26; // 气球只在 -Z 半区生成（玩家初始面向）
const SPAWN_Z_MAX = -3;  // 靠近围栏留 3 米缓冲
const MIN_Y = 2.2;
const MAX_Y = 7.5;
const TARGET_COUNT = 4;

const balloons = [];

export function getBalloons() {
  return balloons;
}

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function randomRadius() {
  return MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS);
}

function randomPosition() {
  return new THREE.Vector3(
    (Math.random() * 2 - 1) * SPAWN_X,
    MIN_Y + Math.random() * (MAX_Y - MIN_Y),
    SPAWN_Z_MIN + Math.random() * (SPAWN_Z_MAX - SPAWN_Z_MIN)
  );
}

// 构建单个气球：球体 + 底部嘴 + 细线
function buildBalloonMesh(radius, colorHex) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 24, 18),
    new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.25,
      metalness: 0.0,
      emissive: colorHex,
      emissiveIntensity: 0.55,
    })
  );
  body.castShadow = true;
  group.add(body);

  // 气球嘴部（尖朝下的小锥）
  const knot = new THREE.Mesh(
    new THREE.ConeGeometry(radius * 0.18, radius * 0.30, 8),
    new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.5 })
  );
  knot.position.y = -radius - radius * 0.13;
  knot.rotation.x = Math.PI;
  group.add(knot);

  // 细线
  const string = new THREE.Mesh(
    new THREE.CylinderGeometry(0.003, 0.003, radius * 3, 6),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  string.position.y = -radius - radius * 1.6;
  group.add(string);

  return group;
}

export function spawnBalloon() {
  const radius = randomRadius();
  const colorHex = randomColor();
  const mesh = buildBalloonMesh(radius, colorHex);
  const pos = randomPosition();
  mesh.position.copy(pos);

  mesh.userData = {
    radius,
    color: colorHex,
    baseY: pos.y,
    bobPhase: Math.random() * Math.PI * 2,
    bobSpeed: 0.5 + Math.random() * 0.5,
    bobAmp: 0.15 + Math.random() * 0.15,
    swayPhase: Math.random() * Math.PI * 2,
    swaySpeed: 0.6 + Math.random() * 0.6,
  };

  state.scene.add(mesh);
  balloons.push(mesh);
  return mesh;
}

export function removeBalloon(mesh) {
  state.scene.remove(mesh);
  mesh.traverse(o => {
    if (o.isMesh) {
      o.geometry.dispose();
      if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
      else o.material.dispose();
    }
  });
  const idx = balloons.indexOf(mesh);
  if (idx >= 0) balloons.splice(idx, 1);
}

// 清空所有气球（用于重新开始）
export function clearBalloons() {
  while (balloons.length > 0) removeBalloon(balloons[0]);
}

export function initBalloons() {
  clearBalloons();
  for (let i = 0; i < TARGET_COUNT; i++) spawnBalloon();
}

// 维持目标数量（命中后补一个）
export function maintainBalloons() {
  while (balloons.length < TARGET_COUNT) spawnBalloon();
}

// 每帧漂浮动画
export function updateBalloons(elapsed) {
  for (const b of balloons) {
    const u = b.userData;
    b.position.y = u.baseY + Math.sin(elapsed * u.bobSpeed + u.bobPhase) * u.bobAmp;
    b.rotation.z = Math.sin(elapsed * u.swaySpeed + u.swayPhase) * 0.15;
    b.rotation.x = Math.cos(elapsed * u.swaySpeed * 0.7 + u.swayPhase) * 0.10;
  }
}
