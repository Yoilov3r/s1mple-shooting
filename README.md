# s1mple shooting · 3D 第一人称气球射击训练

[![Aim Rush Inspired](https://img.shields.io/badge/style-Aim%20Rush-darkcyan.svg)](https://github.com/Yoilov3r/s1mple-shooting)

**Aim Rush 风格 · 深色高对比度 · 纯 WebGL · 可打包单 exe · 训练+挑战两种模式**

## 🎮 游戏模式

| 模式 | 规则 |
|------|------|
| **训练模式** | 每次命中刷新 5 秒倒计时，自由练习瞄准，没有惩罚 |
| **挑战模式** | 总限时 **60 秒**，每枪放空会惩罚 **-10 分**，结束统计得分，数据存入本地排行榜 |

## 🎯 特色

- 第一人称 3D 视角，使用 Pointer Lock API
- WASD 移动 + 鼠标控制视角，左键开火
- 随机大小彩色气球，越小越难打 → 分数越高（20~60 分）
- **Aim Rush 风格视觉**：深色背景 + 冷蓝色霓虹网格 + 高对比度，适合长时间训练
- 程序化纹理生成，不依赖外部贴图，干净整洁
- 环境尘埃粒子，增加体积光氛围感
- 砖墙法线贴图，提升真实感
- 精美 M1911 手枪建模（金属拉丝 + 胡桃木握把防滑格纹）
- 三层同心圆枪口闪光，模拟后坐力枪口膨胀动画
- 命中爆炸粒子 + M1911 真实枪声（从互联网获取）
- 本地存储排行榜，记录最高分 + 最近五次成绩

## 🌄 场景

- 开放式方形射击区域（大小 60x30x60）
- 四面深色砖墙（法线凹凸）
- 深色水泥地面（带裂缝污渍）
- 天空穹顶 + 星星点点，营造训练场氛围
- 地面发光网格线（Aim Rush 标志性元素）
- 矮围栏分隔出生区和气球区，玩家站在围栏后方，气球只在前方生成
- 墙角装饰柱 + 墙脚踢脚线 + 顶部霓虹灯带，立体感十足
- 冷色主光照 + 暖色补光，对比度足够，目标清晰易识别

## 🛠️ 技术栈

- Three.js 0.160 (ES Modules)
- 程序化 Canvas 纹理生成 → 不依赖外部图片
- 原生 Pointer Lock API → 精准瞄准
- WebGL 渲染 → 流畅 60fps
- pywebview 6.x + WebView2 → 原生独立窗口
- PyInstaller → 单 .exe 打包，开箱即用
- 浏览器 localStorage → 排行榜持久化

## ▶️ 运行

### 方式 A：独立原生窗口应用（推荐）

下载最新 [Release](https://github.com/Yoilov3r/s1mple-shooting/releases) 解压，双击 `s1mple-shooting.exe` 即可运行。

### 方式 B：浏览器调试

```powershell
python -m http.server 8765
# 浏览器打开 http://localhost:8765/
```

> 注意：直接双击打开 `index.html` 不行 — ES Modules 需要 CORS，必须走 HTTP 服务器。

### 重新打包

```powershell
pip install pywebview pyinstaller
pyinstaller --noconfirm --onefile --windowed --name s1mple-shooting `
  --add-data "index.html;." `
  --add-data "css;css" `
  --add-data "js;js" `
  --add-data "assets;assets" `
  --add-data "lib;lib" `
  --collect-all webview --collect-all clr_loader launcher.py
```

## 📁 文件结构

```
s1mple-shooting/
├── index.html             # 入口 + HUD + 大厅 + 排行榜
├── css/style.css          # 暗色霓虹风格全页样式
├── js/
│   ├── main.js            # 渲染器/场景/相机 + 主循环
│   ├── state.js           # 全局状态 + 排行榜 localStorage 存取
│   ├── scene.js           # 深色砖墙房间 + 网格 + 霓虹灯带 + 光照
│   ├── textures.js        # 程序化纹理生成：砖墙 + 地面 + 法线 + 木纹 + 金属拉丝
│   ├── particles.js      # 环境漂浮尘埃粒子
│   ├── controls.js        # PointerLock 视角 + WASD 移动 + 边界 + 围栏阻挡
│   ├── gun.js             # M1911 手枪建模（30+ 零件）+ 第一人称挂载
│   ├── balloon.js         # 气球生成系统（随机大小/位置/颜色+漂浮动画）
│   ├── shooting.js        # 射线检测 + 多层枪口闪光 + 爆炸粒子 + M1911 枪声 + 击中 pop 声 + 挑战模式空枪扣分
│   └── game.js            # 大厅 / 训练 / 挑战 / 暂停 / 结束 状态机
├── assets/
│   └── gunshot-indoor.mp3 # M1911 近距离室内枪声
├── lib/
│   └── three.module.js    # Three.js 本地副本，离线运行
├── launcher.py            # pywebview 独立窗口启动器
└── push-updates.ps1       # Git 推送脚本
```

## 📝 开发历史 · 提交总结

| 提交 | 内容 |
|------|------|
| `chore: 项目骨架` | 基础 HTML/CSS/JS 结构 + Three.js 引入 |
| `feat(scene): 灰白砖瓦房间 + 围栏分隔` | 房间搭建 + 围栏 + 光照 |
| `feat(gun): M1911 精模 + 修复枪口闪光半圆 bug` | 第一人称手枪 + 纹理 |
| `feat(game): 启动简化 + 训练模式逻辑` | UI 简化 + 倒计时结束 |
| `scene v2: 天空穹顶 + 水泥地面 + 枪声 + 击中反馈` | 开放空间 + 音效 |
| `feat: 大厅 + 训练/挑战双模式 + 排行榜` | 初始界面 + 排行榜存储 |
| `visual enhancement: ACES 色调映射 + 法线贴图 + 尘埃粒子 + 多色枪口闪光` | 画面表现力提升 |
| `style(v6): Aim Rush 风格重构` | **深色霓虹主题 + 地面发光网格 + 重新配色** |

## 截图

*(打开 exe 体验实际效果)*

- 大厅：两个大按钮选择模式，排行榜显示最佳和最近五次
- 训练模式：左上角显示模式，下方显示分数，右上角倒计时
- 挑战模式：60 秒倒计时，最后自动结束弹出得分，存入排行榜

## 许可证

MIT — 自由使用修改
