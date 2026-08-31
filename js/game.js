// 游戏流程：开始 / 暂停 / 继续 / 结束 + 计分与倒计时 UI
import { state } from './state.js';
import { initBalloons } from './balloon.js';
import { requestLock } from './controls.js';

const TIME_LIMIT = 5.0;

const HINT1_DEFAULT = 'WASD 移动 · 鼠标转动视角 · 左键开火';
const HINT2_DEFAULT = '击落空中气球得分，5 秒未命中即 Game Over';
const HINT1_PAUSE  = '已暂停';
const HINT2_PAUSE  = '5 秒倒计时已重置，点击继续按钮';

let scoreEl, timerEl, overlayEl, overlayTitle, overlayHint1, overlayHint2, startBtn;
let gameoverEl, finalScoreEl, restartBtn;
let phase = 'idle';   // 'idle' | 'playing' | 'paused' | 'over'

export function initGame() {
  scoreEl       = document.getElementById('score');
  timerEl       = document.getElementById('timer');
  overlayEl     = document.getElementById('overlay');
  overlayTitle  = overlayEl.querySelector('h1');
  const ps      = overlayEl.querySelectorAll('p');
  overlayHint1  = ps[0];
  overlayHint2  = ps[1];
  startBtn      = document.getElementById('startBtn');
  gameoverEl    = document.getElementById('gameover');
  finalScoreEl  = document.getElementById('finalScore');
  restartBtn    = document.getElementById('restartBtn');

  startBtn.addEventListener('click', onStartClick);
  restartBtn.addEventListener('click', onStartClick);

  document.addEventListener('score:updated', updateScoreUI);

  // 退出指针锁 = 暂停（仅在游戏中）
  document.addEventListener('pointerlockchange', () => {
    if (state.running && document.pointerLockElement !== document.body) {
      pauseGame();
    }
  });
}

function onStartClick() {
  if (phase === 'paused') resumeGame();
  else startGame();
}

function startGame() {
  state.score = 0;
  state.lastHitTime = performance.now();
  state.running = true;
  phase = 'playing';

  overlayTitle.textContent = 's1mple shooting';
  overlayHint1.textContent = HINT1_DEFAULT;
  overlayHint2.textContent = HINT2_DEFAULT;
  startBtn.textContent = '开始游戏';

  updateScoreUI();
  initBalloons();
  overlayEl.hidden = true;
  gameoverEl.hidden = true;
  requestLock();
}

function resumeGame() {
  state.lastHitTime = performance.now();
  state.running = true;
  phase = 'playing';
  overlayEl.hidden = true;
  requestLock();
}

function pauseGame() {
  state.running = false;
  phase = 'paused';
  overlayTitle.textContent = HINT1_PAUSE;
  overlayHint1.textContent = HINT2_PAUSE;
  overlayHint2.textContent = '';
  startBtn.textContent = '继续';
  overlayEl.hidden = false;
}

function gameOver() {
  state.running = false;
  phase = 'over';
  if (document.pointerLockElement === document.body) {
    document.exitPointerLock();
  }
  finalScoreEl.textContent = state.score;
  gameoverEl.hidden = false;
}

function updateScoreUI() {
  scoreEl.textContent = `分数 ${state.score}`;
}

// 每帧倒计时检查
export function updateGame() {
  if (!state.running) {
    timerEl.classList.remove('danger');
    return;
  }
  const remain = TIME_LIMIT - (performance.now() - state.lastHitTime) / 1000;
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
