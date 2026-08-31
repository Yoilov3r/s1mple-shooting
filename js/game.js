// 游戏流程：开始 / 暂停 / 结束 — 单遮罩 + 单按钮
import { state } from './state.js';
import { initBalloons } from './balloon.js';
import { requestLock } from './controls.js';

const TIME_LIMIT = 5.0;

let overlayEl, titleEl, subEl, btnEl, scoreEl, timerEl;
let phase = 'idle';   // 'idle' | 'playing' | 'paused' | 'over'

export function initGame() {
  scoreEl   = document.getElementById('score');
  timerEl   = document.getElementById('timer');
  overlayEl = document.getElementById('overlay');
  titleEl   = document.getElementById('overlay-title');
  subEl     = document.getElementById('overlay-subtitle');
  btnEl     = document.getElementById('startBtn');

  btnEl.addEventListener('click', onButtonClick);
  document.addEventListener('score:updated', updateScoreUI);

  // 退出指针锁 = 暂停（仅锁定→解锁时触发）
  let wasLocked = false;
  document.addEventListener('pointerlockchange', () => {
    const nowLocked = document.pointerLockElement === document.body;
    if (phase === 'playing' && wasLocked && !nowLocked) pauseGame();
    wasLocked = nowLocked;
  });
}

// 统一显示遮罩：标题 / 副标题 / 按钮文字 一把设好
function showOverlay(title, sub, btn) {
  titleEl.textContent = title;
  subEl.textContent = sub;
  btnEl.textContent = btn;
  overlayEl.hidden = false;
}

// 单按钮：根据当前阶段决定行为
function onButtonClick() {
  if (phase === 'paused') {
    resumeGame();
  } else {
    startGame();
  }
}

function startGame() {
  state.score = 0;
  state.lastHitTime = performance.now();
  state.running = true;
  phase = 'playing';
  updateScoreUI();
  initBalloons();
  overlayEl.hidden = true;
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
  showOverlay('已暂停', '点击继续按钮恢复游戏', '继续');
}

function gameOver() {
  state.running = false;
  phase = 'over';
  if (document.pointerLockElement === document.body) document.exitPointerLock();
  showOverlay('GAME OVER', `最终分数 ${state.score}`, '重新开始');
}

function updateScoreUI() {
  scoreEl.textContent = `分数 ${state.score}`;
}

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
