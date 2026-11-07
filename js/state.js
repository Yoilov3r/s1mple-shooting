// 全局共享状态：避免 main / controls / game 之间的循环依赖
export const state = {
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  score: 0,
  running: false,      // 是否处于游戏进行中
  lastHitTime: 0,      // 最近一次命中气球的时间戳
  mode: null,          // 'training' | 'challenge'
  challengeTimeLeft: 60, // 挑战模式剩余时间
};

// 排行榜 — 本地存储
export const leaderboard = {
  best: 0,
  recent: [], // 最多存 5 个最近成绩

  load() {
    try {
      const data = localStorage.getItem('s1mple-leaderboard');
      if (!data) return;
      const parsed = JSON.parse(data);
      this.best = parsed.best || 0;
      this.recent = parsed.recent || [];
    } catch (e) {}
  },

  save() {
    localStorage.setItem('s1mple-leaderboard', JSON.stringify({
      best: this.best,
      recent: this.recent,
    }));
  },

  addScore(score) {
    if (score > this.best) this.best = score;
    this.recent.unshift(score);
    if (this.recent.length > 5) this.recent.pop();
    this.save();
  },
};

leaderboard.load();
