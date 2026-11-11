// 入口：创建渲染器、场景、相机并启动渲染循环
import * as THREE from 'three';
import { state } from './state.js';
import { activateTheme, updateScene } from './scene.js';
import { preloadModels } from './models.js';
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
    stencil: false,
    depth: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;  // 柔和阴影边缘
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // ACES Filmic 略过强高光压缩，让画面更干净
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.sortObjects = false;
  document.body.appendChild(renderer.domElement);
  return renderer;
}

function createScene() {
  const scene = new THREE.Scene();
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
  updateScene(dt, elapsed);
  updateGame();
  state.renderer.render(state.scene, state.camera);
}

async function bootstrap() {
  state.scene = createScene();
  state.camera = createCamera();
  state.renderer = createRenderer();
  state.clock = new THREE.Clock();

  // 场景主题 + 光照（背景与雾由 activateTheme 统一设置）
  activateTheme(state.scene, state.selectedScene, state.renderer);

  // 后台预加载 glTF 开源模型（废墟 / 霓虹场景道具）
  preloadModels();

  // 相机加入场景，才能让挂在相机下的手枪被渲染
  state.scene.add(state.camera);
  await attachWeapon(state.camera);

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

bootstrap().catch(err => console.error('[bootstrap] 启动失败', err));
