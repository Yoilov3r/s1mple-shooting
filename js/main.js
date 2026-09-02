// 入口：创建渲染器、场景、相机并启动渲染循环
import * as THREE from 'three';
import { state } from './state.js';
import { createRoom, createLights } from './scene.js';
import { initControls, updateControls } from './controls.js';
import { attachWeapon } from './gun.js';
import { updateBalloons } from './balloon.js';
import { initShooting, updateEffects } from './shooting.js';
import { initDustParticles, updateDustParticles } from './particles.js';
import { initGame, updateGame } from './game.js';

function createRenderer() {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  document.body.appendChild(renderer.domElement);
  return renderer;
}

function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa0c4e8);
  scene.fog = new THREE.Fog(0xb8d0e8, 50, 130);
  return scene;
}

function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    72,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 1.7, 8);
  return camera;
}

function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  state.camera.aspect = w / h;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(w, h);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(state.clock.getDelta(), 0.1);
  const elapsed = state.clock.elapsedTime;
  updateControls(dt);
  updateBalloons(elapsed);
  updateDustParticles(dt);
  updateEffects(dt);
  updateGame();
  state.renderer.render(state.scene, state.camera);
}

function bootstrap() {
  state.scene = createScene();
  state.camera = createCamera();
  state.renderer = createRenderer();
  state.clock = new THREE.Clock();

  // 房间 + 光照
  state.scene.add(createRoom(60));
  state.scene.add(createLights());

  // 相机加入场景，才能让挂在相机下的手枪被渲染
  state.scene.add(state.camera);
  attachWeapon(state.camera);

  // 射击系统
  initShooting(state.camera);

  // 控制
  initControls();

  // 环境尘埃粒子
  initDustParticles();

  // 游戏流程（开始 / 暂停 / 结束）
  initGame();

  window.addEventListener('resize', onResize);
  animate();
}

bootstrap();
