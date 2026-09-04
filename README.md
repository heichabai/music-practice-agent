# 琴键陪练 Agent

一个会看数据、有记忆的 AI 钢琴陪练：接上 MIDI 键盘（或用电脑键盘）跟弹练习，实时逐音反馈，练完生成会话报告，AI 教练基于你的历史表现给出复盘和定制练习计划。从零基础到弹奏曲目，学 → 练 → 测 → 进完整闭环。

## 功能特性

### 教学（零基础入门课程）

- **7 课互动教程**：认识键盘 → 五线谱 → 右手五指 → 节奏 → 双手 → 技法 → 实战曲目
- 每课包含知识卡片（配教学插图）、页内按键任务（实时验证）、课后练习曲（自动衔接练习模式）
- 小结测验 + AI 答疑（结合本课上下文回答学员问题）
- 进度持久化（完成/继续学习徽章、x/7 计数）

### 练习（双模式 + 沉浸视觉）

- **等待式**：弹对才前进，适合认音入门
- **自由式**：连续播放，考察真实节奏与时值
- 实时判定：音高对错、漏弹、错音、多余按键、时值保持、节奏偏差
- 拟真琴键（渐变/按压下沉/内阴影）、命中粒子特效 + 闪光环
- 悬浮五线谱条（abcjs 生成、当前音琥珀高亮、连续滚动跟随、可切原谱图）

### 测评（会话报告 + AI 复盘）

- 命中率、节奏偏差仪表（抢拍/拖拍）、时值保持、问题音符 TOP5
- AI 教练（DeepSeek）：练完自动复盘（引用真实数据）、一键生成 10 分钟定制练习计划
- 跨次记忆：基于历史趋势给出针对性建议
- 练习记录持久化 + 跨次错误模式统计

### 乐谱导入（三通道融合）

| 通道 | 引擎 | 适用场景 |
|---|---|---|
| 本地精确识别 | Audiveris OMR（离线） | 印刷五线谱 PDF/图片，准确率高 |
| AI 视觉识谱 | 通义 qwen3.8（思考模式） | 照片、非标准排版兜底 |
| MIDI 直传 | @tonejs/midi（纯前端） | 100% 精确，多轨道自动取主旋律 |

**融合流水线**：OMR 精确识别 → 结果质量把关（音符过少/音高单一=垃圾）→ Real-ESRGAN AI 超分辨率增强 → OMR 重试 → 仍不行自动降级 AI 视觉通道

识别结果进入钢琴卷帘校对编辑器（增删音/拖拽调音/时值调整/试听），校对后存入曲库。

### 桌面应用

- macOS Electron 桌面版（`npm run desktop:build` → .dmg）
- 内置全部引擎（Audiveris+JRE / Real-ESRGAN / 钢琴采样），双击即用无需终端
- 自定义应用图标，密钥存本地配置文件

### 体验细节

- Salamander 真钢琴采样音色（自托管 wav，低延迟）
- 淡雅粉彩音符色系 + 极光底纹 + 噪点质感 + 玻璃卡 + 渐变主视觉（V2 设计系统）
- Inter 字体（拉丁/数字）+ 苹方（中文）
- `prefers-reduced-motion` 降级、移动端适配、键盘焦点环、全局 ErrorBoundary
- 双输入：Web MIDI 真键盘（热插拔检测）+ 电脑键盘兜底

## 快速开始

### 网页版

```bash
git clone git@github.com:heichabai/music-practice-agent.git
cd music-practice-agent
npm install

# 可选：启用 AI 教练与 AI 识谱（不配置则练习功能不受影响）
cp .env.example .env
# 编辑 .env，填入 DEEPSEEK_API_KEY（AI 教练）等密钥

npm run omr   # 终端 1：本地 OMR 识谱服务（需 ~/bin/Audiveris.app）
npm run dev   # 终端 2：前端开发服务器
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

React 19 · TypeScript · Vite 6 · Tailwind CSS 4 · Tone.js · Web MIDI API · abcjs · Electron · DeepSeek · 通义千问 · Audiveris · Real-ESRGAN

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
识谱管线   omr-server → OMR → 质量把关 → 超分重试 → AI 兜底
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
│   ├── tutorial/                # 教程系统
│   │   ├── TutorialScreen.tsx   # 课程列表
│   │   ├── LessonScreen.tsx     # 课程详情（步骤/任务/测验/答疑）
│   │   ├── TaskKeyboard.tsx     # 页内互动按键验证
│   │   └── Diagrams.tsx         # 教学示意图（SVG + AI 插画）
│   ├── ui/                      # 通用 UI 组件
│   ├── ScorePanel.tsx           # 悬浮五线谱条（abcjs + 光标跟随）
│   ├── PianoRollEditor.tsx      # 钢琴卷帘校对编辑器
│   ├── ImportScreen.tsx         # 三通道乐谱导入
│   ├── FallingNotes.tsx         # 下落音符画布 + 粒子特效
│   ├── PianoKeyboard.tsx        # 拟真琴键可视化
│   └── ReportScreen.tsx         # 报告页（含 AI 教练面板）
├── game/                        # 判定引擎（纯逻辑）
│   ├── engine.ts                # 双模式判定 + 节奏/时值
│   ├── report.ts                # 会话报告生成
│   ├── lessons.ts               # 7 课教程数据
│   ├── abcNotation.ts           # Song → ABC 五线谱转换
│   ├── keyboard.ts              # 键位几何布局
│   ├── songs.ts                 # 内置曲库
│   └── midiImport.ts            # MIDI 文件解析
├── midi/useMidiInput.ts         # Web MIDI 接入
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

- [x] 零基础 7 课互动教程 + AI 答疑
- [x] 双模式练习 + 拟真琴键 + 悬浮五线谱条
- [x] 三通道乐谱导入（OMR / AI / MIDI）+ 融合流水线
- [x] 钢琴卷帘校对编辑器
- [x] AI 教练复盘 + 练习计划 + 跨次记忆
- [x] Salamander 真钢琴采样 + 低延迟优化
- [x] macOS 桌面应用（Electron + 内置引擎）
- [x] V2 设计系统（Inter/极光/噪点/玻璃/渐变）

## 路线图

- [ ] 选曲页练习历史与进步曲线可视化
- [ ] 力度（velocity）判定
- [ ] AI 教练多轮对话
- [ ] Windows 版桌面应用
