// glTF 开源模型加载与摆放
// 模型来源：KhronosGroup/glTF-Sample-Assets（CC0 / CC-BY-4.0，详见 README）
// - fox.glb                狐狸（骨骼动画，废墟场景氛围）
// - cesium-milk-truck.glb  废弃送奶车（废墟场景道具）
// - lamp.glb               带点光源的立灯（霓虹靶场道具，点光源会被移除以免超预算）
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODEL_LIST = [
  ['fox', 'assets/models/fox.glb'],
  ['truck', 'assets/models/cesium-milk-truck.glb'],
  ['lamp', 'assets/models/lamp.glb'],
];

const loader = new GLTFLoader();
const assets = {};        // key -> gltf
const mixers = [];        // 需要每帧更新的 AnimationMixer
let loadPromise = null;
let modelsReady = false;
const readyFns = [];

// 预加载全部模型（失败时静默降级，场景仍可正常游玩）
export function preloadModels() {
  if (loadPromise) return loadPromise;

  loadPromise = Promise.all(MODEL_LIST.map(([key, url]) => new Promise(resolve => {
    loader.load(
      url,
      gltf => { assets[key] = gltf; resolve(); },
      undefined,
      err => { console.warn('[models] 模型加载失败：', url, err); resolve(); }
    );
  }))).then(() => {
    modelsReady = true;
    while (readyFns.length) readyFns.shift()();
  });

  return loadPromise;
}

function onReady(fn) {
  if (modelsReady) fn();
  else {
    readyFns.push(fn);
    preloadModels();
  }
}

// 把模型缩放到指定高度，并让包围盒底部贴地、水平居中
function placeModel(object3d, { height, position, rotationY = 0, castShadow = true }) {
  const wrapper = new THREE.Group();
  wrapper.add(object3d);

  const box = new THREE.Box3().setFromObject(object3d);
  const size = box.getSize(new THREE.Vector3());
  const scale = height / Math.max(size.y, 0.001);
  object3d.scale.setScalar(scale);

  box.setFromObject(object3d);
  object3d.position.x -= (box.min.x + box.max.x) / 2;
  object3d.position.z -= (box.min.z + box.max.z) / 2;
  object3d.position.y -= box.min.y;

  if (castShadow) {
    object3d.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }

  wrapper.position.set(...position);
  wrapper.rotation.y = rotationY;
  return wrapper;
}

// glTF 自带的点光源会显著增加实时光源数量，直接移除（灯罩材质本身已带自发光）
function stripLights(object3d) {
  const lights = [];
  object3d.traverse(o => { if (o.isLight) lights.push(o); });
  lights.forEach(l => l.parent && l.parent.remove(l));
}

function decorateDusk(root) {
  if (!assets.truck && !assets.fox) return;

  if (assets.truck) {
    const truck = placeModel(assets.truck.scene.clone(true), {
      height: 2.9,
      position: [15, 0, 15],
      rotationY: -1.05,
    });
    root.add(truck);
  }

  if (assets.fox) {
    const fox = placeModel(assets.fox.scene, {
      height: 1.0,
      position: [8.5, 0, 8.5],
      rotationY: 2.35,
      castShadow: false,
    });
    root.add(fox);

    const clip = assets.fox.animations && assets.fox.animations[0];
    if (clip) {
      const mixer = new THREE.AnimationMixer(assets.fox.scene);
      mixer.clipAction(clip).play();
      mixers.push(mixer);
    }
  }
}

function decorateNeon(root) {
  if (!assets.lamp) return;

  const spots = [
    { position: [-16, 0, 13], rotationY: 0.95 },
    { position: [16, 0, 13], rotationY: -0.95 },
  ];
  for (const s of spots) {
    const lamp = assets.lamp.scene.clone(true);
    stripLights(lamp);
    root.add(placeModel(lamp, { height: 5.2, position: s.position, rotationY: s.rotationY }));
  }
}

// 场景构建完成后调用；模型若尚未就绪，会在加载完成后自动挂载
export function decorateTheme(key, root) {
  if (key !== 'dusk' && key !== 'neon') return;

  onReady(() => {
    if (key === 'dusk') decorateDusk(root);
    if (key === 'neon') decorateNeon(root);
  });
}

// 每帧更新狐狸等骨骼动画
export function updateModels(dt) {
  for (const m of mixers) m.update(dt);
}
