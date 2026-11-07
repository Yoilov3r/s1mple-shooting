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

## 🌄 场景（三套可选）

大厅顶部提供场景选择器，切换即时预览，进入对局后使用所选主题。

| 场景 | 风格 | 取材 |
|------|------|------|
| **灰白训练场** | 明亮灰白砖瓦正方体，六面砖纹 + 墙角砖柱 | 程序化纹理 |
| **黄昏废墟** | 低角度夕阳、暖橙天空、参差断墙、残柱碎石；废车与狐狸作氛围道具 | 程序化纹理 + 开源 glTF |
| **夜景霓虹靶场** | 深蓝夜色、青/品红霓虹灯带与天花板灯网、金属反光地面、霓虹围栏 | 程序化纹理 + 开源 glTF |

三套主题共用规则：中央金属围栏分隔出生区与气球区，气球只在围栏后的 -Z 半区生成，地面有发光引导线。

## 🛠️ 技术栈

- Three.js 0.160 (ES Modules，本地化离线运行)
- 程序化 Canvas 纹理生成 → 不依赖外部图片
- 原生 glTF 2.0（GLTFLoader r160 本地副本）→ 废墟 / 霓虹场景道具
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
├── index.html             # 入口 + HUD + 大厅（场景选择器 / 模式 / 排行榜）
├── css/style.css          # 暗色霓虹风格全页样式
├── js/
│   ├── main.js            # 渲染器/场景/相机 + 主循环
│   ├── state.js           # 全局状态（含所选场景）+ 排行榜 localStorage 存取
│   ├── scene.js           # 三套主题场景工厂：训练场 / 黄昏废墟 / 霓虹靶场
│   ├── models.js          # glTF 模型加载、缩放摆放与狐狸骨骼动画
│   ├── textures.js        # 程序化纹理生成：砖墙 + 地面 + 法线 + 木纹 + 金属拉丝
│   ├── particles.js       # 环境漂浮尘埃粒子
│   ├── controls.js        # PointerLock 视角 + WASD 移动 + 边界 + 围栏阻挡
│   ├── gun.js             # M1911 手枪建模（30+ 零件）+ 第一人称挂载
│   ├── balloon.js         # 气球生成系统（随机大小/位置/颜色+漂浮动画）
│   ├── shooting.js        # 射线检测 + 多层枪口闪光 + 爆炸粒子 + 枪声 + 空枪扣分
│   └── game.js            # 大厅 / 训练 / 挑战 / 暂停 / 结束 状态机 + 场景选择
├── assets/
│   ├── gunshot-indoor.mp3 # M1911 近距离室内枪声
│   ├── gunshot-outdoor.mp3
│   └── models/            # 开源 glTF 道具（废墟废车/狐狸、霓虹立灯）
├── lib/
│   ├── three.module.js    # Three.js 本地副本，离线运行
│   └── addons/            # GLTFLoader + BufferGeometryUtils（r160 本地副本）
├── launcher.py            # pywebview 独立窗口启动器
└── push-updates.ps1       # Git 推送脚本
```

### 开源模型出处与许可

| 文件 | 模型 | 作者 / 许可 | 用途 |
|------|------|------------|------|
| `assets/models/cesium-milk-truck.glb` | Cesium Milk Truck | Cesium · CC-BY-4.0 | 废墟场景的废弃送奶车 |
| `assets/models/fox.glb` | Fox | PixelMannen（模型，CC0）· tomkranis（绑定/动画，CC-BY-4.0）· AsoboStudio/scurest（转 glTF，CC-BY-4.0） | 废墟场景的狐狸（播放骨骼动画） |
| `assets/models/lamp.glb` | Lamp with Punctual Lights | DGG · CC-BY-4.0 | 霓虹靶场两侧立灯（模型自带点光源已移除以控制性能） |

模型来自 [KhronosGroup/glTF-Sample-Assets](https://github.com/KhronosGroup/glTF-Sample-Assets)。GLTFLoader / BufferGeometryUtils 来自 [three.js r160](https://github.com/mrdoob/three.js)。

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
| `style(v6): Aim Rush 风格重构` | 深色霓虹主题 + 地面发光网格 + 重新配色 |
| `feat: 灰白砖瓦正方体场景 + 精细 M1911 + 修复枪口半圆闪烁` | **v1.2 回退到灰白主题，砖瓦质感 + 圆角挤出枪模** |
| `feat(scene): 三套主题场景 + 开源 glTF 道具` | **v1.3 新增黄昏废墟 / 夜景霓虹靶场 + 大厅场景选择器** |

## 🔧 v1.2 场景/枪械优化详解

### 场景：灰白砖瓦超大正方体

- 6 面砖纹墙 + 砖地面 + 砖天花板，统一灰白主题，墙角加砖柱打破空旷
- 中央金属围栏分隔两侧，竖连杆用 `InstancedMesh` 合并为单次 draw call
- 气球只在围栏后的 -Z 目标半区生成，地面加浅色引导线便于定位
- 砖纹理只生成一次，各面 `clone()` 共享 GPU image（不额外占显存）

### 枪械：圆角挤出体建模

- 滑套 / 框架 / 握把改用圆角挤出体（`ExtrudeGeometry` + bevel），替代纯方盒
- 防滑凹槽与握把格纹改用 `InstancedMesh`，draw call 从 36 降到 3
- 新增握把背弧、套筒前端倒角、三角准星、缺口照门、膛孔
- 第一人称枪械不参与阴影投射，节省 shadow pass

### Bug 修复：墙上的"半圆闪烁"

原枪口闪光用 `CircleGeometry` 且对 `camera.position`（世界坐标）调 `lookAt`，在相机局部空间里朝向完全错乱，圆盘被视锥斜切只露半圆。
改用 `Sprite` + `depthTest: false`：永远正对相机，且不被枪体或墙面任何物体切割。

## 🔧 v1.3 双新场景详解

### 场景工厂与切换

- `scene.js` 改为 `activateTheme(scene, key, renderer)` 工厂：主题按需构建并缓存在 Map 中，切换只做场景图增删，回切零重建
- 每套主题自带背景色、雾参数与 ACES 曝光；训练场 1.30 / 废墟 1.15 / 霓虹 1.20
- 大厅场景卡片点击即切换预览；开始对局时按所选场景进入，HUD 顶栏显示「场景 · 模式」

### 黄昏废墟

- 渐变天空穹顶（ShaderMaterial，逆时针背面球体，`renderOrder=-1`）+ 加色混合夕阳辉光 Sprite
- 四面积木墙各切成 4 段、高度参差，制造断壁天际线；墙角残柱 + 倒塌柱段 + 断裂横梁
- 90 块碎石用 `InstancedMesh` + `instanceColor` 合并为 1 次 draw call
- 低角度暖色主光投长影，冷紫补光拉开冷暖对比；围栏改为锈蚀配色
- 开源 glTF：废弃送奶车（静态摆放）、狐狸（播放自带骨骼动画，不参与阴影）

### 夜景霓虹靶场

- 深蓝砖墙 + 金属地面；墙面竖向霓虹灯管用 2 个 `InstancedMesh`（灯芯 + 加色辉光）承载，青/品红/紫三色
- 天花板灯网 10 根横纵灯管（单个 `InstancedMesh`），围栏横杆加霓虹描边
- 目标区两侧青/品红点光源做呼吸动画；方向光负责塑形与阴影
- 开源 glTF：两侧立灯（自带 punctual 光源被移除，避免实时光源超预算）

### 性能与加载

- 所有程序化纹理按样式缓存，跨主题复用、clone 只改 repeat；三套主题共享同一批 image
- 主光阴影贴图统一 2048，方向光数量每套主题 ≤2，点光源仅霓虹 4 个且不投影
- glTF 由本地 `lib/addons` 的 GLTFLoader r160 异步加载，失败仅告警并降级为纯程序化场景
- PyInstaller 的 `--add-data assets;assets` 已覆盖模型目录，exe 内可直接加载

## 📦 版本副本管理

打包产物不入库（见 `.gitignore` 的 `dist/`、`build/`、`backups/`），本地保留历史副本：

```
backups/
├── s1mple-shooting-20260831-121859.exe                    # 初版
├── s1mple-shooting-20261107-152238-brick-scene.exe        # 灰白砖瓦 + 精细枪械
├── s1mple-shooting-desktop-old-20261107-153912.exe        # 桌面旧版快照
└── s1mple-shooting-20261107-170651-scene-themes.exe       # v1.3 三套主题场景
```

需要回退时直接双击对应备份 exe 即可。

## 截图

*(打开 exe 体验实际效果)*

- 大厅：两个大按钮选择模式，排行榜显示最佳和最近五次
- 训练模式：左上角显示模式，下方显示分数，右上角倒计时
- 挑战模式：60 秒倒计时，最后自动结束弹出得分，存入排行榜

## 许可证

MIT — 自由使用修改
