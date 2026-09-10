# 琴键陪练 Agent

一个会看数据、有记忆的 AI 钢琴陪练：接上 MIDI 键盘（或用电脑键盘）跟弹练习，实时逐音反馈，练完生成会话报告，AI 教练基于你的历史表现给出复盘和定制练习计划。从零基础到弹奏曲目，学 → 练 → 测 → 进完整闭环。

## 功能特性

### 教学（零基础入门课程）

- **26 课五单元互动课程**：认识钢琴 → 学读谱 → 右手旋律 → 节奏进阶 → 左手与双手
- **学习路径即乐谱**：课程化作五线谱上逐级爬升的音符，已完成的课连成一条金色旋律
- 每课 = 步骤知识卡（配教学插图）+ 页内按键任务（实时验证）+ 小结测验 + 课后练习曲
- 课程页左右分栏：左侧教学内容，右侧常驻练习面板（任务/测验/下一课/AI 答疑）
- 进度持久化（x/26 计数、继续学习横幅、开发者模式可解锁全部课程）

### 练习（双模式 + 全屏沉浸演奏）

- **等待式**：弹对才前进，适合认音入门
- **自由式**：连续播放，考察真实节奏与时值
- 实时判定：音高对错、漏弹、错音、多余按键、时值保持、节奏偏差
- 全屏演奏页：顶部细 HUD、瀑布流占满全屏、拟真琴键贴底（按压下沉/内阴影/目标键呼吸光）
- 谱纸五线谱抽屉（abcjs 生成、时值比例间距、逐拍跨声部对齐、当前音金色高亮、跟随滚动、可切原谱图）
- 命中粒子特效 + 金色闪光环 + 舞台聚光晕影

### 自由弹奏（实时音名 + 和弦识别 + 延音踏板）

- **音名直接显示在琴键上**：正在发声的音（含踏板挂起音）在对应琴键上显示音名与八度
- **和弦实时识别**：任意组合尽力推断，覆盖三和弦/挂留/六和弦/七/九/十一/十三和弦与变化属和弦
  - 严谨省略记谱：不完整和弦标注为 `C(no5)`、`C13(no9,no11)`、`Cmaj7(no5)`
  - 转位自动斜杠标记（`C/E`）、和弦外音标「经过音」、两音组合给音程提示
- **MIDI 延音踏板（CC64）**：踩下后松键不断音，抬踏板统一释放；琴键指示灯与音块视觉同步联动
- **上升音块**：时间映射几何（顶边=开始时刻、底边=结束时刻），同速上升永不互相覆盖；踏板踩下时松键音块保持
- 演奏视频录制（画布 + 音频合成 webm 一键下载）

### 测评（会话报告 + AI 复盘）

- 命中率、节奏偏差仪表（抢拍/拖拍）、时值保持、问题音符 TOP5
- AI 教练（DeepSeek）：练完自动复盘（引用真实数据）、一键生成 10 分钟定制练习计划
- 跨次记忆：基于历史趋势给出针对性建议
- 练习记录持久化 + 跨次错误模式统计

### 乐谱导入（本地 OMR + MIDI）

| 通道 | 引擎 | 适用场景 |
|---|---|---|
| 本地精确识别 | Audiveris OMR（离线） | 印刷五线谱 PDF/图片，准确率高 |
| MIDI 直传 | @tonejs/midi（纯前端） | 100% 精确，多轨道自动取主旋律 |

**识别流水线**：图片预处理（小图 Real-ESRGAN 超分；超 2000 万像素大图等比缩小至引擎上限内）→ OMR 识别 → 结果质量把关（音符过少/音高单一=可疑）→ 超分后自动重试

识别结果进入钢琴卷帘校对编辑器（增删音/拖拽调音/时值调整/试听），校对后存入曲库。

### 桌面应用

- macOS Electron 桌面版（`npm run desktop:build` → .dmg）
- 内置全部引擎（Audiveris+JRE / Real-ESRGAN / 钢琴采样），双击即用无需终端
- 自定义应用图标，密钥存本地配置文件

### 体验细节（深色演奏厅设计系统）

- 近黑舞台底色 + 琥珀金聚光灯 + 顶部光晕/暗角/噪点质感
- 左侧栏导航（学习/曲库/自由弹奏/导入 + 连续打卡/XP/每日目标）
- 演奏/课程/自由弹奏页全屏沉浸，零像素浪费
- Salamander 真钢琴采样音色（自托管 wav，低延迟）
- Inter 字体（拉丁/数字）+ 苹方（中文）
- `prefers-reduced-motion` 降级、键盘焦点环、全局 ErrorBoundary
- 双输入：Web MIDI 真键盘（热插拔检测 + CC64 延音踏板）+ 电脑键盘兜底（Z/A 双八度）；Electron 版已开启 WebMIDI 特性

## 快速开始

### 网页版

```bash
git clone git@github.com:heichabai/music-practice-agent.git
cd music-practice-agent
npm install

# 可选：启用 AI 教练（不配置则练习功能不受影响）
cp .env.example .env
# 编辑 .env，填入 DEEPSEEK_API_KEY（AI 教练）

npm run dev   # 前端开发服务器（OMR 识谱服务随首次识别自动启动）
```

打开 http://localhost:5173

### 桌面版

```bash
npm run desktop:build   # 打包 .dmg（自动收集引擎资源）
```

产物在 `release/琴键陪练-0.1.0-arm64.dmg`，拖入 Applications 双击即用。

### 没有 MIDI 键盘？

| 白键 | A | S | D | F | G | H | J | K | L |
|---|---|---|---|---|---|---|---|---|---|
| 黑键 | W | E | T | Y | U | O | P | | |

## 技术栈

React 19 · TypeScript · Vite 6 · Tailwind CSS 4 · Tone.js · Web MIDI API · abcjs · Electron · DeepSeek · Audiveris · Real-ESRGAN

## 架构

表现层与逻辑层严格分离，判定引擎为纯 TypeScript，无 UI 依赖：

```
输入层     Web MIDI / 电脑键盘
   ↓
教程系统   lessons.ts → 步骤卡 / 按键任务 / 课后练习 / AI 答疑
   ↓
判定引擎   engine.ts —— 等待式/自由式判定、节奏偏差、时值统计（纯逻辑）
   ↓
报告层     report.ts —— 会话报告与问题音符聚合
   ↓
AI 层      coach.ts / tutorChat.ts —— 复盘 + 练习计划 + 课程答疑
   ↓
识谱管线   omr-server → 预处理（超分/缩图）→ OMR → 质量把关 → 超分重试
   ↓
校对编辑   PianoRollEditor.tsx —— 卷帘式增删改音 / 试听
   ↓
存储层     sessionStore / songStore / tutorialStore —— localStorage 持久化
```

AI 调用通过本地代理转发并注入密钥，API Key 只存在于本地 `.env` / `config.json`，不进入前端代码包。

## 目录结构

```
src/
├── ai/                          # AI 层
│   ├── coach.ts                 # 复盘与练习计划生成
│   ├── coachPrompts.ts          # 提示词构建
│   ├── tutorChat.ts             # 教程 AI 答疑
│   ├── visionClient.ts          # 视觉识谱客户端（多供应商）
│   ├── sheetPrompts.ts          # 识谱提示词与响应校验
│   ├── llmClient.ts             # DeepSeek 客户端
│   └── pdfPages.ts              # PDF 渲染（pdfjs 按需加载）
├── audio/piano.ts               # Salamander 钢琴采样（懒加载单例）
├── components/
│   ├── tutorial/                # 课程系统
│   │   ├── LessonScreen.tsx     # 课程详情（左教学栏 + 右 sticky 练习面板）
│   │   ├── TaskKeyboard.tsx     # 页内互动按键验证（宽度自适应）
│   │   └── Diagrams.tsx         # 教学示意图（SVG 线性风格）
│   ├── ui/                      # 通用 UI 组件
│   ├── Sidebar.tsx              # 左侧栏导航 + 游戏化状态
│   ├── LearningPath.tsx         # 五线谱学习路径（课程=音符，完成连成旋律）
│   ├── ScorePanel.tsx           # 谱纸五线谱抽屉（abcjs + 逐拍对齐 + 光标跟随）
│   ├── PianoRollEditor.tsx      # 钢琴卷帘校对编辑器
│   ├── ImportScreen.tsx         # 乐谱导入（本地 OMR / MIDI）
│   ├── FallingNotes.tsx         # 下落音符画布 + 粒子特效（动态高度）
│   ├── FreePlayCanvas.tsx       # 自由弹奏画布（时间映射音块 + 踏板联动 + 粒子）
│   ├── FreePlayInfoBar.tsx      # 自由弹奏信息条（右侧和弦推断显示）
│   ├── PianoKeyboard.tsx        # 拟真琴键可视化（发声键直接显示音名）
│   └── ReportScreen.tsx         # 报告页（含 AI 教练面板）
├── game/                        # 判定引擎（纯逻辑）
│   ├── engine.ts                # 双模式判定 + 节奏/时值
│   ├── report.ts                # 会话报告生成
│   ├── lessons.ts               # 26 课五单元课程数据
│   ├── chords.ts                # 和弦识别（含省略音严谨记谱）
│   ├── abcNotation.ts           # Song → ABC 五线谱转换
│   ├── keyboard.ts              # 键位几何布局
│   ├── songs.ts                 # 内置曲库
│   └── midiImport.ts            # MIDI 文件解析
├── midi/useMidiInput.ts         # Web MIDI 接入（音符 + CC64 延音踏板）
├── storage/                     # 持久化
│   ├── sessionStore.ts          # 练习记录 + 跨次统计
│   ├── songStore.ts             # 自定义曲库（含原谱图）
│   └── tutorialStore.ts         # 教程进度
└── App.tsx
electron/                        # 桌面应用主进程
├── main.mjs                     # 静态服务 + OMR + AI 代理三合一
└── config.mjs                   # 密钥配置（dev: .env / pkg: config.json）
scripts/                         # 开发工具
├── omr-server.mjs               # OMR sidecar（网页版用）
├── musicxml.mjs                 # MusicXML → Song 解析器
├── gen-tutorial-images.mjs      # AI 生图（教学配图）
├── tutorial-e2e.mjs             # 教程端到端测试
├── score-e2e.mjs                # 乐谱条端到端测试
└── upload-e2e.mjs               # OMR 上传端到端测试
docs/ui-design.md                # UI 设计规范
```

## 常用脚本

| 命令 | 说明 |
|---|---|
| `npm run dev` | 网页开发服务器 |
| `npm run omr` | 本地 OMR 识谱服务 |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run desktop:dev` | 桌面版开发运行 |
| `npm run desktop:build` | 打包 macOS .dmg |
| `npm run demo:coach` | AI 教练冒烟测试（真实调用） |

## 已实现

- [x] 零基础 26 课五单元互动课程 + 五线谱学习路径 + AI 答疑
- [x] 双模式练习 + 全屏沉浸演奏页 + 谱纸五线谱抽屉
- [x] 自由弹奏：琴键音名显示 + 和弦实时识别（严谨省略记谱）+ 延音踏板联动
- [x] 本地 OMR + MIDI 双通道乐谱导入（超分/缩图预处理 + 质量把关）
- [x] 钢琴卷帘校对编辑器
- [x] AI 教练复盘 + 练习计划 + 跨次记忆
- [x] Salamander 真钢琴采样 + 低延迟优化
- [x] macOS 桌面应用（Electron + 内置引擎 + Web MIDI 已启用）
- [x] 深色演奏厅设计系统（近黑舞台/琥珀金/左侧栏/全屏布局）

## 路线图

- [ ] 选曲页练习历史与进步曲线可视化
- [ ] 力度（velocity）判定
- [ ] AI 教练多轮对话
- [ ] Windows 版桌面应用
