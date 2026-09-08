// 环境尘埃粒子系统：漂浮在空气中的微尘，增强体积光感
import * as THREE from 'three';
import { state } from './state.js';

let particleSystem = null;
const PARTICLE_COUNT = 600;

export function initDustParticles() {
  if (particleSystem) return;

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const sizes = new Float32Array(PARTICLE_COUNT);

  const half = 30;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const cx = (Math.random() - 0.5) * half * 2;
    const cz = (Math.random() - 0.5) * half * 2;
    // 集中在围栏附近和灯光区域（视觉中心）
    const dist = Math.sqrt(cx * cx + cz * cz);
    const weight = dist < 12 ? 1.0 : 0.6;
    positions[i * 3]     = cx;
    positions[i * 3 + 1] = (2 + Math.random() * 8) * weight * 1.5;
    positions[i * 3 + 2] = cz;
    sizes[i] = 0.03 + Math.random() * 0.06;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    color: 0xc8d4e8,
    size: 0.05,
    transparent: true,
    opacity: 0.15,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  particleSystem = new THREE.Points(geometry, material);
  particleSystem.userData.velocities = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particleSystem.userData.velocities[i * 3]     = (Math.random() - 0.5) * 0.12;
    particleSystem.userData.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.03;
    particleSystem.userData.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.12;
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

    if (pos[i3] > half || pos[i3] < -half) vel[i3] *= -1;
    if (pos[i3 + 1] > 10 || pos[i3 + 1] < 0.5) vel[i3 + 1] *= -1;
    if (pos[i3 + 2] > half || pos[i3 + 2] < -half) vel[i3 + 2] *= -1;

    pos[i3]     = Math.max(-half, Math.min(half, pos[i3]));
    pos[i3 + 1] = Math.max(0.5, Math.min(10, pos[i3 + 1]));
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