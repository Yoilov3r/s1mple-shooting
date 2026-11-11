// 枪械：加载 Mega Weapon Pack 手枪（CC0 许可）
// 模型规格：单位米、+Y 向上、枪口朝向 +Z、长度沿 Z 轴
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const GUN_URL = 'assets/models/service-pistol.glb';

// 枪身在世界里的长度（米）。真实手枪约 0.2m，第一人称略微放大更耐看
const GUN_LENGTH = 0.26;

// 第一人称持枪姿态：屏幕右下方，枪口略向左前方汇聚
const POSE_POSITION = new THREE.Vector3(0.185, -0.155, -0.5);
const POSE_ROTATION = new THREE.Euler(-0.1, 0.09, -0.05);

let loadPromise = null;
let envTexture = null;

function loadModel() {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise(resolve => {
    const loader = new GLTFLoader();
    loader.load(
      GUN_URL,
      gltf => resolve(gltf),
      undefined,
      err => {
        console.warn('[gun] 模型加载失败：', err);
        resolve(null);
      }
    );
  });
  return loadPromise;
}

/**
 * 给枪械生成一张简易环境贴图。
 * 原模型 7 个材质都是无贴图金属（gunmetal / polymerBlack 等），
 * 场景里没有 environment 时金属反射为 0，整把枪会糊成一团黑。
 */
function getEnvTexture(renderer) {
  if (envTexture || !renderer) return envTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0.0, '#ffffff');
  grad.addColorStop(0.42, '#e8eef6');
  grad.addColorStop(0.52, '#8e98a6');
  grad.addColorStop(0.72, '#4a525d');
  grad.addColorStop(1.0, '#14181d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 64);

  const equirect = new THREE.CanvasTexture(canvas);
  equirect.mapping = THREE.EquirectangularReflectionMapping;
  equirect.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  envTexture = pmrem.fromEquirectangular(equirect).texture;
  pmrem.dispose();
  equirect.dispose();

  return envTexture;
}

// 提亮过深的底色 + 接入环境反射，让套筒/枪身/握把分层
function enhanceMaterials(root, env) {
  const done = new Set();
  root.traverse(obj => {
    if (!obj.isMesh) return;
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    materials.forEach(mat => {
      if (!mat || done.has(mat.uuid)) return;
      done.add(mat.uuid);

      if (mat.color) {
        const lum = 0.2126 * mat.color.r + 0.7152 * mat.color.g + 0.0722 * mat.color.b;
        if (lum < 0.19) {
          mat.color.multiplyScalar(Math.min(2.6, 0.19 / Math.max(lum, 0.02)));
        }
      }
      if ('metalness' in mat) mat.metalness = Math.min(mat.metalness, 0.82);
      if ('roughness' in mat) mat.roughness = Math.min(Math.max(mat.roughness, 0.3), 0.62);
      if (env) {
        mat.envMap = env;
        mat.envMapIntensity = 1.2;
      }
      mat.needsUpdate = true;
    });
  });
}

// 归一化：长度缩放到 GUN_LENGTH，包围盒中心到原点，枪口朝 -Z
function normalize(root) {
  root.updateMatrixWorld(true);

  let box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  root.scale.multiplyScalar(GUN_LENGTH / Math.max(size.z, 1e-4));

  root.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(root);
  root.position.sub(box.getCenter(new THREE.Vector3()));

  // Mega Weapon Pack 枪口朝 +Z，转到相机的正前方 -Z
  root.rotation.set(0, Math.PI, 0);

  return root;
}

function dispose(root) {
  root.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = false;
      obj.receiveShadow = false;
    }
  });
}

/**
 * 创建一把可用的武器容器（holder），内部已完成归一化。
 * 返回 null 表示模型没加载上，游戏仍可正常运行。
 */
export async function createGun(renderer) {
  const gltf = await loadModel();
  if (!gltf) return null;

  const model = gltf.scene.clone(true);
  dispose(model);
  enhanceMaterials(model, getEnvTexture(renderer));
  normalize(model);

  const holder = new THREE.Group();
  holder.name = 'weapon';
  holder.add(model);

  // 相机近距离补光：给套筒一条清晰的高光边，拉开明暗层次
  const keyLight = new THREE.PointLight(0xffffff, 0.9, 1.5, 2);
  keyLight.position.set(0.14, 0.14, 0.02);
  holder.add(keyLight);

  // 握把侧补光，避免下半部分糊成一块黑
  const fillLight = new THREE.PointLight(0xdce6f2, 0.18, 1.2, 2);
  fillLight.position.set(-0.12, -0.14, 0.28);
  holder.add(fillLight);

  return holder;
}

// 挂到相机右下方，第一人称视角
export async function attachWeapon(camera, renderer) {
  const weapon = await createGun(renderer);
  if (!weapon) return null;

  weapon.position.copy(POSE_POSITION);
  weapon.rotation.copy(POSE_ROTATION);
  camera.add(weapon);
  return weapon;
}
