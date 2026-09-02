// 环境尘埃粒子系统：漂浮在空气中的微尘，增强体积光感
import * as THREE from 'three';
import { state } from './state.js';

let particleSystem = null;
const PARTICLE_COUNT = 400;

export function initDustParticles() {
  if (particleSystem) return;

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const sizes = new Float32Array(PARTICLE_COUNT);

  const half = 30; // 房间半宽
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * half * 2;
    positions[i * 3 + 1] = Math.random() * 30; // 高度 0~30
    positions[i * 3 + 2] = (Math.random() - 0.5) * half * 2;
    sizes[i] = 0.04 + Math.random() * 0.08;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    color: 0xd0d8e0,
    size: 0.06,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  particleSystem = new THREE.Points(geometry, material);
  particleSystem.userData.velocities = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particleSystem.userData.velocities[i * 3]     = (Math.random() - 0.5) * 0.15;
    particleSystem.userData.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.04;
    particleSystem.userData.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
  }

  state.scene.add(particleSystem);
}

export function updateDustParticles(dt) {
  if (!particleSystem) return;

  const pos = particleSystem.geometry.attributes.position.array;
  const vel = particleSystem.userData.velocities;
  const half = 30;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    pos[i3]     += vel[i3] * dt;
    pos[i3 + 1] += vel[i3 + 1] * dt;
    pos[i3 + 2] += vel[i3 + 2] * dt;

    // 边界反弹
    if (pos[i3] > half || pos[i3] < -half) vel[i3] *= -1;
    if (pos[i3 + 1] > 28 || pos[i3 + 1] < 0.5) vel[i3 + 1] *= -1;
    if (pos[i3 + 2] > half || pos[i3 + 2] < -half) vel[i3 + 2] *= -1;

    // 限位夹紧
    pos[i3]     = Math.max(-half, Math.min(half, pos[i3]));
    pos[i3 + 1] = Math.max(0.5, Math.min(28, pos[i3 + 1]));
    pos[i3 + 2] = Math.max(-half, Math.min(half, pos[i3 + 2]));
  }

  particleSystem.geometry.attributes.position.needsUpdate = true;
}

export function removeDustParticles() {
  if (particleSystem) {
    state.scene.remove(particleSystem);
    particleSystem.geometry.dispose();
    particleSystem.material.dispose();
    particleSystem = null;
  }
}