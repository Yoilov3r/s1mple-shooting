// PointerLock 鼠标视角 + WSAD 平移 + 边界限制
import * as THREE from 'three';
import { state } from './state.js';

const MOVE_SPEED = 5.0;             // 米/秒
const PITCH_LIMIT = Math.PI / 2 - 0.05;
const ROOM_HALF = 30 - 1;          // 房间边长 60，留 1 米安全距离
const SENSITIVITY = 0.0022;

const keys = { w: false, a: false, s: false, d: false };
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const euler = new THREE.Euler(0, 0, 0, 'YXZ');

let yaw = 0, pitch = 0;
let isLocked = false;

export function initControls() {
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('pointerlockchange', onLockChange);
}

export function requestLock() {
  document.body.requestPointerLock();
}

export function isPointerLocked() {
  return isLocked;
}

export function getYaw() {
  return yaw;
}

// 重置相机旋转和位置到初始状态
export function resetCamera() {
  yaw = 0;
  pitch = 0;
  euler.set(pitch, yaw, 0, 'YXZ');
  state.camera.quaternion.setFromEuler(euler);
  // 初始位置：围栏 +Z 侧 8 米，Y 1.7 米
  state.camera.position.set(0, 1.7, 8);
}

function onKeyDown(e) {
  switch (e.code) {
    case 'KeyW': keys.w = true; break;
    case 'KeyA': keys.a = true; break;
    case 'KeyS': keys.s = true; break;
    case 'KeyD': keys.d = true; break;
  }
}

function onKeyUp(e) {
  switch (e.code) {
    case 'KeyW': keys.w = false; break;
    case 'KeyA': keys.a = false; break;
    case 'KeyS': keys.s = false; break;
    case 'KeyD': keys.d = false; break;
  }
}

function onMouseMove(e) {
  if (!isLocked) return;
  yaw   -= e.movementX * SENSITIVITY;
  pitch -= e.movementY * SENSITIVITY;
  pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));
}

function onLockChange() {
  isLocked = (document.pointerLockElement === document.body);
}

// 每帧更新：相机姿态 + 平移（仅游戏中且锁定时移动）
export function updateControls(dt) {
  // 始终更新朝向，便于开始遮罩外的预览也跟随鼠标
  euler.set(pitch, yaw, 0, 'YXZ');
  state.camera.quaternion.setFromEuler(euler);

  const canMove = isLocked && state.running;
  if (!canMove) return;

  // 仅基于 yaw 的水平前向 / 右向
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  const forwardX = -sin, forwardZ = -cos;
  const rightX   =  cos, rightZ   = -sin;

  direction.set(0, 0, 0);
  if (keys.w) { direction.x += forwardX; direction.z += forwardZ; }
  if (keys.s) { direction.x -= forwardX; direction.z -= forwardZ; }
  if (keys.d) { direction.x += rightX;   direction.z += rightZ; }
  if (keys.a) { direction.x -= rightX;   direction.z -= rightZ; }
  if (direction.lengthSq() > 0) direction.normalize();

  velocity.copy(direction).multiplyScalar(MOVE_SPEED * dt);
  state.camera.position.add(velocity);

  // 边界裁剪
  const p = state.camera.position;
  p.x = Math.max(-ROOM_HALF, Math.min(ROOM_HALF, p.x));
  p.z = Math.max(-ROOM_HALF, Math.min(ROOM_HALF, p.z));
  // 围栏阻挡：玩家不能穿过 z=0 附近的围栏区域
  const FENCE_Z = 0;
  const FENCE_BLOCK = 0.5; // 围栏半厚度
  if (p.z > FENCE_Z - FENCE_BLOCK && p.z < FENCE_Z + FENCE_BLOCK) {
    // 推回到玩家原来的一侧（+Z 侧）
    p.z = FENCE_Z + FENCE_BLOCK;
  }
  // Y 保持站立高度
  p.y = 1.7;
}
