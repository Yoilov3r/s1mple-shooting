// 游戏流程：大厅 / 训练 / 挑战 / 暂停 / 结束
import { state, leaderboard } from './state.js';
import { SCENES, activateTheme } from './scene.js';
import { initBalloons, clearBalloons } from './balloon.js';
import { requestLock, resetCamera } from './controls.js';

let overlayEl, titleEl, subEl, btnEl, scoreEl, timerEl, modeEl, hudEl;
let lobbyEl, lbBestEl, lbRecentEl;
let sceneBtns = [];
let phase = 'lobby'; // 'lobby' | 'playing' | 'paused' | 'over'

const TRAINING_HIT_TIMER = 5.0;
const CHALLENGE_DURATION = 60;

export function initGame() {
  scoreEl   = document.getElementById('score');
  timerEl   = document.getElementById('timer');
  modeEl    = document.getElementById('mode-indicator');
  hudEl     = document.getElementById('hud');
  overlayEl = document.getElementById('overlay');
  titleEl   = document.getElementById('overlay-title');
  subEl     = document.getElementById('overlay-subtitle');
  btnEl     = document.getElementById('overlay-btn');
  lobbyEl   = document.getElementById('lobby');
  lbBestEl  = document.getElementById('lb-best');
  lbRecentEl = document.getElementById('lb-recent');

  // 模式按钮
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => startGame(btn.dataset.mode));
  });

  // 场景选择器（大厅内即时预览主题）
  sceneBtns = Array.from(document.querySelectorAll('.scene-btn'));
  for (const btn of sceneBtns) {
    btn.addEventListener('click', () => selectScene(btn.dataset.scene));
  }
  refreshSceneButtons();

  // 暂停/结束 按钮
  btnEl.addEventListener('click', onButtonClick);
  document.addEventListener('score:updated', updateScoreUI);

  // 退出指针锁 = 暂停（仅训练模式）
  let wasLocked = false;
  document.addEventListener('pointerlockchange', () => {
    const nowLocked = document.pointerLockElement === document.body;
    if (phase === 'playing' && wasLocked && !nowLocked) pauseGame();
    wasLocked = nowLocked;
  });

  refreshLeaderboard();
}

// --- 场景选择 ---

function selectScene(key) {
  if (!SCENES[key]) return;
  state.selectedScene = key;
  refreshSceneButtons();
  // 大厅背景半透明，切换后可直接看到主题预览
  activateTheme(state.scene, key, state.renderer);
}

function refreshSceneButtons() {
  for (const btn of sceneBtns) {
    btn.classList.toggle('is-active', btn.dataset.scene === state.selectedScene);
  }
}

// --- 显示控制 ---

function showOverlay(title, sub, btn) {
  titleEl.textContent = title;
  subEl.textContent = sub;
  btnEl.textContent = btn;
  overlayEl.hidden = false;
}

function showLobby() {
  phase = 'lobby';
  overlayEl.hidden = true;
  lobbyEl.hidden = false;
  hudEl.hidden = true;
  refreshLeaderboard();
  clearBalloons();
  modeEl.textContent = '';
  timerEl.textContent = '';
  scoreEl.textContent = '分数 0';
}

// --- 按钮逻辑 ---

function onButtonClick() {
  if (phase === 'paused') resumeGame();
  else if (phase === 'over') showLobby();
}

// --- 开始 / 暂停 / 恢复 ---

function startGame(mode) {
  state.score = 0;
  state.mode = mode;
  state.running = true;
  phase = 'playing';

  // 确保使用玩家最后选中的场景
  activateTheme(state.scene, state.selectedScene, state.renderer);
  const sceneLabel = SCENES[state.selectedScene] ? SCENES[state.selectedScene].label : '';

  // 重置相机到初始位置
  resetCamera();

  if (mode === 'challenge') {
    state.challengeStartTime = performance.now();
    state.challengeTimeLeft = CHALLENGE_DURATION;
    modeEl.textContent = `${sceneLabel} · 挑战模式`;
    modeEl.style.color = '#ff6b35';
    timerEl.textContent = CHALLENGE_DURATION.toFixed(1);
    timerEl.classList.remove('danger');
  } else {
    state.lastHitTime = performance.now();
    modeEl.textContent = `${sceneLabel} · 训练模式`;
    modeEl.style.color = '#4fc3f7';
    timerEl.textContent = TRAINING_HIT_TIMER.toFixed(1);
    timerEl.classList.remove('danger');
  }

  updateScoreUI();
  initBalloons();
  lobbyEl.hidden = true;
  overlayEl.hidden = true;
  hudEl.hidden = false;
  requestLock();
}

function resumeGame() {
  if (state.mode === 'challenge') {
    // 挑战模式暂停恢复：时间继续流逝
  } else {
    state.lastHitTime = performance.now();
  }
  state.running = true;
  phase = 'playing';
  overlayEl.hidden = true;
  requestLock();
}

function pauseGame() {
  state.running = false;
  phase = 'paused';
  showOverlay('已暂停', '点击继续按钮恢复游戏', '继续');
}

function gameOver() {
  state.running = false;
  phase = 'over';
  if (document.pointerLockElement === document.body) document.exitPointerLock();

  if (state.mode === 'challenge') {
    leaderboard.addScore(state.score);
    showOverlay('挑战结束', `最终得分 ${state.score}`, '返回大厅');
  } else {
    showOverlay('训练结束', `最终得分 ${state.score}`, '返回大厅');
  }
}

// --- 分数 / 排行榜 ---

function updateScoreUI() {
  scoreEl.textContent = `分数 ${state.score}`;
}

function refreshLeaderboard() {
  lbBestEl.textContent = leaderboard.best;
  if (leaderboard.recent.length === 0) {
    lbRecentEl.innerHTML = '<span class="lb-empty">暂无记录</span>';
  } else {
    lbRecentEl.innerHTML = leaderboard.recent
      .map(s => `<span class="lb-score-item">${s}</span>`)
      .join('');
  }
}

// --- 每帧更新（倒计时逻辑） ---

export function updateGame() {
  if (!state.running) return;

  const now = performance.now();

  if (state.mode === 'challenge') {
    // 挑战模式：60 秒总倒计时
    const elapsed = (now - state.challengeStartTime) / 1000;
    state.challengeTimeLeft = Math.max(0, CHALLENGE_DURATION - elapsed);
    timerEl.textContent = state.challengeTimeLeft.toFixed(1);
    if (state.challengeTimeLeft <= 10) timerEl.classList.add('danger');
    else timerEl.classList.remove('danger');
    if (state.challengeTimeLeft <= 0) gameOver();
  } else {
    // 训练模式：每次命中后 5 秒倒计时
    const remain = TRAINING_HIT_TIMER - (now - state.lastHitTime) / 1000;
    if (remain <= 0) {
      timerEl.textContent = '0.0';
      timerEl.classList.remove('danger');
      gameOver();
      return;
    }
    timerEl.textContent = remain.toFixed(1);
    if (remain <= 2.0) timerEl.classList.add('danger');
    else timerEl.classList.remove('danger');
  }
}