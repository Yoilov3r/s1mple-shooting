// 入口：创建渲染器、场景、相机并启动渲染循环
import * as THREE from 'three';
import { createRoom, createLights } from './scene.js';

export const state = {
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  score: 0,
  running: false,
};

function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);
  return renderer;
}

function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe8e6e0);
  scene.fog = new THREE.Fog(0xe8e6e0, 35, 90);
  return scene;
}

function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    72,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 1.7, 0);
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
  const dt = state.clock.getDelta();
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

  window.addEventListener('resize', onResize);
  animate();
}

bootstrap();
