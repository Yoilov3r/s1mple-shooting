// 全局共享状态：避免 main / controls / game 之间的循环依赖
export const state = {
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  score: 0,
  running: false,      // 是否处于游戏进行中
  lastHitTime: 0,      // 最近一次命中气球的时间戳
  // 后续模块（gun / balloon / shooting）会扩展更多字段
};
