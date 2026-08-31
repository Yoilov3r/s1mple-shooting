# s1mple shooting

全屏 3D 第一人称气球射击游戏。基于 Three.js。

## 玩法

- WASD 在灰白色超大正方体房间内移动
- 鼠标滑动转动视角（Pointer Lock）
- 左键开火，击落空中漂浮的气球
- 气球半径越小分数越高（20–60 分）
- 5 秒未命中任何气球 → Game Over
- 按 ESC 退出指针锁自动暂停（5 秒倒计时重置）

## 技术栈

- Three.js 0.160（ES Modules + importmap）
- 原生 Pointer Lock API
- 浏览器 WebGL

## 运行

直接用浏览器打开 `index.html`（需联网加载 Three.js CDN）。
若要离线运行，可下载 `three.module.js` 到本地并修改 importmap 路径。

## 文件结构

```
s1mple-shooting/
├── index.html             # 入口 + HUD + 遮罩
├── css/style.css          # 准星 / 分数 / 倒计时 / 遮罩样式
└── js/
    ├── main.js            # 渲染器/场景/相机初始化 + 主循环
    ├── state.js           # 全局共享状态
    ├── scene.js           # 灰白超大正方体房间 + 多层光照
    ├── controls.js        # PointerLock 视角 + WASD 移动 + 边界
    ├── gun.js             # 精致 M1911 手枪模型 + 第一人称挂载
    ├── balloon.js         # 气球生成系统（随机大小/位置/颜色+漂浮）
    ├── shooting.js        # 射线检测 + 枪口闪光 + 爆炸粒子 + 计分
    └── game.js            # 开始/暂停/结束流程 + 5 秒倒计时 UI
```

## 开发过程

按以下顺序逐步构建（对应 7 次提交）：

1. `chore: 项目骨架（HTML/CSS/Three.js 初始化）`
2. `feat(scene): 灰白超大正方体房间 + 多层光照`
3. `feat(controls): PointerLock 鼠标视角 + WSAD 平移 + 边界限制`
4. `feat(gun): 精致 M1911 手枪模型并挂载到第一人称视角`
5. `feat(balloon): 气球生成系统（随机大小/位置/颜色+漂浮）`
6. `feat(shooting): 射线检测 + 枪口闪光 + 爆炸粒子 + 计分`
7. `feat(game): 5秒倒计时 Game Over + 开始/暂停/结束流程与 UI`

## 设计取舍

- 房间用 6 块 `PlaneGeometry` 而非 `BoxGeometry`：可给每面微妙的灰度差异，避免单调廉价感
- 手枪由约 15 个几何体组合：滑套 / 框架 / 握把 / 扳机护圈 / 击锤 / 保险 / 弹匣释放 / 前后准星 + 白点
- 气球维持 4 个在场，命中后立即补一个，保证玩家始终有目标
- 倒计时仅在游戏中跑动；按 ESC 自动暂停并重置 5 秒，避免误触死亡
