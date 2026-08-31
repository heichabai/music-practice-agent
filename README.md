# 琴键陪练 Agent

一个会看数据、有记忆的 AI 钢琴陪练：接上 MIDI 键盘（或用电脑键盘）跟弹练习，实时逐音反馈，练完生成会话报告，AI 教练基于你的历史表现给出复盘和定制练习计划。

## 功能特性

- **双练习模式**
  - 等待式：弹对才前进，适合认音入门
  - 自由式：连续播放，考察真实节奏与时值
- **实时判定**：音高对错、漏弹、错音、多余按键，逐音反馈
- **会话报告**：命中率、节奏偏差仪表（抢拍/拖拍）、时值保持、问题音符 TOP5
- **AI 教练**（DeepSeek 驱动）
  - 练完自动生成复盘：引用真实数据，指出问题并给可操作的练习方法
  - 一键生成 10 分钟定制练习计划
  - 跨次记忆：知道你上周的表现，能说出"命中率从 82% 提到 89%"这样的趋势
- **双输入**：Web MIDI 真键盘（热插拔检测）+ 电脑键盘兜底
- **体验细节**：命中粒子特效、`prefers-reduced-motion` 降级、移动端适配、键盘焦点环

## 快速开始

环境要求：Node.js 18+、Chrome / Edge 浏览器

```bash
git clone git@github.com:heichabai/music-practice-agent.git
cd music-practice-agent
npm install

# 可选：启用 AI 教练（不配置则练习功能不受影响）
cp .env.example .env
# 编辑 .env，填入你的 DeepSeek API Key

npm run dev
```

打开 http://localhost:5173 即可练习。

没有 MIDI 键盘？用电脑键盘弹：

| 白键 | A | S | D | F | G | H | J | K | L |
|---|---|---|---|---|---|---|---|---|---|
| 黑键 | W | E | T | Y | U | O | P | | |

## 技术栈

React 19 · TypeScript · Vite 6 · Tailwind CSS 4 · Tone.js · Web MIDI API · DeepSeek（OpenAI 兼容接口）

## 架构

表现层与逻辑层严格分离，判定引擎为纯 TypeScript，无 UI 依赖：

```
输入层    Web MIDI / 电脑键盘
   ↓
判定引擎  engine.ts —— 等待式/自由式判定、节奏偏差、时值统计（纯逻辑）
   ↓
报告层    report.ts —— 会话报告与问题音符聚合
   ↓
AI 层     coach.ts —— 复盘话术 + 结构化练习计划（提示词与数据拼接）
   ↓
存储层    sessionStore.ts —— localStorage 持久化、跨次错误模式统计
```

AI 调用通过 Vite dev 代理转发并注入密钥，`DEEPSEEK_API_KEY` 只存在于本地 `.env`，不进入前端代码包。

## 目录结构

```
src/
├── ai/                      # AI 教练层
│   ├── coach.ts             # 复盘与练习计划生成
│   ├── coachPrompts.ts      # 提示词构建
│   └── llmClient.ts         # DeepSeek 客户端（本地代理）
├── components/
│   ├── ui/                  # 通用 UI 组件（Button/Card/StatCard 等）
│   ├── FallingNotes.tsx     # 下落音符画布 + 粒子特效
│   ├── PianoKeyboard.tsx    # 键盘可视化
│   └── ReportScreen.tsx     # 报告页（含 AI 教练面板）
├── game/                    # 判定引擎（纯逻辑）
│   ├── engine.ts
│   ├── keyboard.ts          # 键位几何布局
│   ├── report.ts
│   └── songs.ts             # 内置曲库
├── midi/useMidiInput.ts     # Web MIDI 接入
├── storage/sessionStore.ts  # 练习记录持久化
└── App.tsx
scripts/coach-demo.ts        # AI 教练冒烟测试（真实调用）
docs/ui-design.md            # UI 设计规范
```

## 常用脚本

| 命令 | 说明 |
|---|---|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run demo:coach` | 用模拟报告真实调用一次 AI 教练，验证 Key 与提示词效果 |

## 路线图

- [ ] 选曲页练习历史与进步曲线
- [ ] MIDI 文件上传，自定义曲库
- [ ] 力度（velocity）判定
- [ ] AI 教练多轮对话
