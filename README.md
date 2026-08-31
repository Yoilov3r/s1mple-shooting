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
- pywebview 6.x + WebView2（独立窗口壳）
- PyInstaller（单 exe 打包）

## 运行

### 方式 A：独立原生窗口应用（推荐，无需浏览器）

双击 `dist/s1mple-shooting.exe` 即可。基于 pywebview + WebView2 内核，
打开后是独立原生窗口，不依赖浏览器。

如需重新打包：

```powershell
pip install pywebview pyinstaller
.\build.bat
# 或手动执行：
pyinstaller --noconfirm --onefile --windowed --name s1mple-shooting `
  --add-data "index.html;." --add-data "css;css" --add-data "js;js" `
  --collect-all webview --collect-all clr_loader launcher.py
```

### 方式 B：浏览器调试

```powershell
python -m http.server 8765
# 浏览器打开 http://localhost:8765/
```

直接打开 `index.html` 不行（ES Modules 受 CORS 限制，必须走 HTTP）。

## 文件结构

```
s1mple-shooting/
├── index.html             # 入口 + HUD + 遮罩
├── css/style.css          # 准星 / 分数 / 倒计时 / 遮罩样式
├── js/
│   ├── main.js            # 渲染器/场景/相机初始化 + 主循环
│   ├── state.js           # 全局共享状态
│   ├── scene.js           # 灰白超大正方体房间 + 多层光照
│   ├── controls.js        # PointerLock 视角 + WASD 移动 + 边界
│   ├── gun.js             # 精致 M1911 手枪模型 + 第一人称挂载
│   ├── balloon.js         # 气球生成系统（随机大小/位置/颜色+漂浮）
│   ├── shooting.js        # 射线检测 + 枪口闪光 + 爆炸粒子 + 计分
│   └── game.js            # 开始/暂停/结束流程 + 5 秒倒计时 UI
├── launcher.py            # pywebview 独立窗口启动器（内嵌 HTTP 服务）
├── build.bat              # PyInstaller 一键打包脚本
└── requirements.txt       # Python 依赖
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
