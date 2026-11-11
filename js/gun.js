// 枪械：加载 Mega Weapon Pack 手枪（CC0 许可）
// 模型特点：单位米、+Y 向上、枪口朝向 +Z、原点在 footprint center（y=0）
// 来源：3dassets.dev Mega Weapon Pack —— Service Pistol / Long Slide Pistol / Magnum Revolver
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const GUN_URL = 'assets/models/service-pistol.glb';

let cachedGltf = null;
let loadPromise = null;

function loadModel() {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise(resolve => {
    const loader = new GLTFLoader();
    loader.load(
      GUN_URL,
      gltf => {
        cachedGltf = gltf;
        resolve(gltf);
      },
      undefined,
      err => {
        console.warn('[gun] 枪械模型加载失败：', err);
        resolve(null);
      }
    );
  });
  return loadPromise;
}

// 把模型缩放到合适大小，让 bounding box 中心对齐原点，枪口朝 -Z
function prepareModel(root) {
  // Mega Weapon Pack 模型原本枪口朝 +Z，我们需要朝 -Z
  root.rotation.set(0, Math.PI, 0);  // Y 轴旋转 π

  // 模型尺寸大约 0.2m，在第一人称视角下需要放大
  const desiredLength = 0.28;  // 枪管朝前 ~0.28m
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  // 用 Z 方向（枪管长度）作为基准缩放
  const scale = desiredLength / Math.max(size.z, 0.001);
  root.scale.setScalar(scale);

  // 重新计算包围盒，让原点对齐到"握把位置"附近，方便挂到相机下
  const box2 = new THREE.Box3().setFromObject(root);
  const center = box2.getCenter(new THREE.Vector3());
  root.position.sub(center);  // 中心移到原点

  return root;
}

export async function createGun() {
  const gltf = await loadModel();
  if (!gltf) return null;

  const model = gltf.scene.clone(true);
  prepareModel(model);

  // 禁用阴影（第一人称武器通常不需要）
  model.traverse(o => {
    if (o.isMesh || o.isInstancedMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });

  // 如果有滑套/击锤/弹匣动画，停止默认播放（第一人称视角自己控制开火反馈）
  if (gltf.animations && gltf.animations.length) {
    // 让动画静默——我们不自动播放
    // 后面可以接入开火时滑套后坐的动画逻辑
  }

  return model;
}

// 直接返回预加载好的武器（同步），适合在已加载完后使用
export function createGunSync() {
  if (!cachedGltf) {
    loadModel();  // 触发加载
    return null;
  }
  const model = cachedGltf.scene.clone(true);
  prepareModel(model);
  model.traverse(o => {
    if (o.isMesh || o.isInstancedMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });
  return model;
}

// 挂载到相机右下方，第一人称视角
export async function attachWeapon(camera) {
  const weapon = await createGun();
  if (!weapon) return null;

  // 位置：屏幕右下方，枪管朝前（-Z）
  weapon.position.set(0.22, -0.22, -0.55);
  weapon.rotation.set(0.03, 0.04, -0.015);
  weapon.name = 'weapon';
  camera.add(weapon);
  return weapon;
}

// 同步挂载（适合已经预加载完的场景，比如重新开始对局时）
export function attachWeaponSync(camera) {
  const weapon = createGunSync();
  if (!weapon) return null;
  weapon.position.set(0.22, -0.22, -0.55);
  weapon.rotation.set(0.03, 0.04, -0.015);
  weapon.name = 'weapon';
  camera.add(weapon);
  return weapon;
}
