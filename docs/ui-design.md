# 琴键陪练 Agent · UI 设计规范

> 本文档面向实现 Agent / 设计协作方。目标：在不改动游戏逻辑的前提下，完成整个应用的界面实现与视觉打磨。

---

## 0. 实现范围与边界

**技术栈（已就绪，勿更换）**：React 19 + Vite 6 + TypeScript + Tailwind CSS v4（`@tailwindcss/vite` 插件已配置）。

**允许修改**：
- `src/components/*`（表现层组件，可重写）
- `src/App.tsx` 中的 JSX 结构与 className（**不得改动状态逻辑、rAF 循环、事件绑定**）
- `src/index.css`（可添加 `@theme` 设计令牌与全局样式）
- `index.html`（标题、字体引入）

**禁止修改（纯逻辑层）**：
- `src/game/engine.ts`（判定引擎）
- `src/game/report.ts`（报告生成）
- `src/game/songs.ts`、`src/game/keyboard.ts`（数据与几何布局）
- `src/midi/useMidiInput.ts`（MIDI 输入）

**组件接口约定**：`FallingNotes` / `PianoKeyboard` 的 props 保持不变，内部渲染可重写（如 canvas → DOM）。文案一律中文（zh-CN）。

---

## 1. 设计原则

| 原则 | 说明 |
|---|---|
| 舞台感 | 深色"琴房舞台"氛围，琥珀色作为聚光灯式的品牌强调色 |
| 状态即色彩 | 琥珀=等待目标，绿=命中，红=错音/漏弹，天蓝=正在按下的键；全站只用这一套语义色 |
| 数据可扫读 | 练习 HUD 和报告页以数字为主角，等宽数字、大字号、少装饰 |
| 零学习成本 | 类 Synthesia 的下落音符 + 琴键高亮，用户 3 秒内明白怎么弹 |

**情绪板关键词**：深夜琴房 · 聚光灯 · 霓虹记谱 · 克制的科技感。

---

## 2. 设计系统（Design Tokens）

### 2.1 色彩

| 令牌 | 值 | 用途 |
|---|---|---|
| `bg-base` | `#020617` (slate-950) | 页面背景 |
| `bg-surface` | `#0f172a` (slate-900) | 卡片/面板背景 |
| `bg-raised` | `#1e293b` (slate-800) | 内嵌块、统计卡 |
| `border-subtle` | `#1e293b` (slate-800) | 卡片描边 |
| `border-strong` | `#334155` (slate-700) | 按钮/输入描边 |
| `text-primary` | `#f1f5f9` (slate-100) | 主文字 |
| `text-secondary` | `#94a3b8` (slate-400) | 次要文字 |
| `text-muted` | `#64748b` (slate-500) | 提示/脚注 |
| `accent` | `#f59e0b` (amber-500) | 品牌强调：目标键、进度条、主按钮、判定线（等待时） |
| `accent-strong` | `#fbbf24` (amber-400) | accent hover |
| `hit` | `#22c55e` (emerald-500) | 命中：音符、统计数字 |
| `wrong` | `#ef4444` (red-500) | 错音/漏弹 |
| `info` | `#38bdf8` (sky-400) | 按下的键、节奏仪表 |

背景可在页面顶部叠加一层极淡的琥珀色径向光晕（`radial-gradient`，透明度 ≤ 6%），营造聚光灯感，不得影响文字对比度。

### 2.2 字体

- 中文：`"PingFang SC", "Microsoft YaHei", sans-serif`；数字/英文可用 `"SF Mono", ui-monospace` 做等宽统计
- 字阶：

| 级别 | 规格 | 用途 |
|---|---|---|
| display | 30px / 700 / 1.2 | 选曲页主标题 |
| h2 | 24px / 700 | 报告标题 |
| h3 | 16px / 600 | 区块标题（"练习模式"） |
| body | 14px / 400 | 正文、列表 |
| caption | 12px / 400 | 说明文字 |
| micro | 10–11px / 400 / tabular-nums | 键位名、统计标签 |

### 2.3 间距 / 圆角 / 阴影

- 间距基数 4px：常用 8 / 12 / 16 / 24 / 32
- 圆角：控件 6px、卡片 12px、大面板 16px、胶囊 `9999px`
- 阴影：卡片 `shadow-md`；黑键 `shadow-lg`；主按钮无阴影靠色彩对比

### 2.4 动效

| 场景 | 时长 | 曲线 |
|---|---|---|
| 按钮/悬停 | 150ms | ease-out |
| 琴键按下变色 | ≤ 80ms | linear（即时感） |
| 错音红闪 | 220ms 后消失 | — |
| 页面切换 | 200ms | ease-out（渐入+上移 8px） |
| 报告统计卡入场 | 交错 60ms | ease-out + scale 0.96→1 |
| 目标键脉冲 | 1.2s 循环 | sine |

---

## 3. 全局布局与响应式

- 所有页面：垂直居中列布局，`min-h-screen`，水平 padding 16px，内容最大宽度如下
  - 选曲页：`max-w-2xl`（672px）
  - 练习页：`max-w-4xl`（896px）
  - 报告页：`max-w-2xl`
- 断点：< 640px 为移动布局：HUD 数字可折叠为两行、统计卡 2×2、字号降一档
- 练习区（canvas + 键盘）宽度自适应容器，canvas 高 420px 固定，键盘白键 104px / 黑键 66px

---

## 4. 页面规格

### 4.1 选曲页（screen: select）

```
┌──────────────────────────────────────────┐
│ 琴键陪练 Agent                    [display]│
│ 支持 MIDI 键盘或电脑键盘，练习后生成报告      │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ ● MIDI 已连接 · {设备名}              │ │  ← MidiStatusBadge
│ └──────────────────────────────────────┘ │
│ 练习模式                                   │
│ ┌───────────────┐  ┌───────────────┐     │
│ │ ◉ 等待式       │  │ ○ 自由式       │     │  ← ModeSelector
│ │ 弹对才前进…     │  │ 连续播放，考察…  │     │
│ └───────────────┘  └───────────────┘     │
│ ┌──────────────────────────────────────┐ │
│ │ 热身 · 五指练习            80BPM·9音 │ →│ │  ← SongRow ×3
│ │ 小星星                   96BPM·28音 │ →│ │
│ │ 欢乐颂                  104BPM·30音 │ →│ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

**元素规格**：
- **MidiStatusBadge**：全宽卡片行，左侧 8px 状态圆点。四态：
  - `ok`：绿点 + `MIDI 已连接 · {deviceName}`（文字 hit 色）
  - `no-device`：琥珀点 + 「未检测到 MIDI 设备，可用电脑键盘弹奏（A S D F G H J K 白键 · W E T Y U 黑键）」
  - `unsupported`：琥珀点 + 「当前浏览器不支持 Web MIDI，请用 Chrome / Edge」
  - `init`：灰点 + 「正在检测 MIDI 设备…」
- **ModeSelector**：两列等宽卡片，选中态 `border-accent + bg-accent/10 + 标题 accent-strong`；未选中 `border-subtle + bg-surface`，hover 变亮
- **SongRow**：整行按钮，左侧歌名（body 加粗 16px），右侧 `xx BPM · xx 音`（caption）。hover：`border-accent/60 + bg-raised`，右侧出现 `→`

### 4.2 练习页（screen: play）

```
┌──────────────────────────────────────────────┐
│ [退出] 小星星 ·等待式 ▓▓▓▓░░░░ 命中12 漏弹0 │
│        错音1 正确率92% [伴奏音 开]             │ ← HUD 栏
│ ┌──────────────────────────────────────────┐ │
│ │            （下落音符区 420px）            │ │
│ │        ▢ 待弹(slate)  ▨ 目标(amber脉冲)   │ │
│ │  ▩ 命中(emerald)   ▧ 漏弹(red)            │ │
│ │ ═══════════ 判定线 ═══════════            │ │
│ └──────────────────────────────────────────┘ │
│ │ 白▔▔▔█▔▔黑键覆盖其上▔▔█▔▔▔│ ← 键盘 104px  │
│                                              │
│          弹琥珀色亮起的键（等待式提示）          │ ← HintBar
└──────────────────────────────────────────────┘
```

**HUD 栏**（单行，间距 16px，`text-sm`）：
1. 退出按钮（GhostButton）
2. 曲名 + 模式徽标（caption，text-secondary）
3. 进度条：`h-2 flex-1` 圆角满，底 `bg-raised`，填充 `bg-accent`
4. 统计组：命中 `hit` 色、漏弹 `wrong/orange` 色（仅自由式显示）、错音 `wrong` 色、正确率 `text-primary`；数字用 tabular-nums
5. 伴奏音开关（GhostButton，文案随状态「伴奏音 开/关」）

**下落音符区**（FallingNotes）：
- 背景垂直渐变 `#020617 → #0f172a`；八度分隔线 `rgba(148,163,184,0.12)` 竖线
- 音符方块圆角 5px，与琴键 x 坐标对齐（布局计算见 `keyboard.ts`，勿改）
- 音符四态颜色：pending `rgba(226,232,240,0.9)` / active amber 脉冲（透明度 0.7–1.0 正弦循环）/ hit `rgba(34,197,94,0.85)` / missed `rgba(239,68,68,0.75)`
- 判定线：2px 横线；等待目标时 `accent` 95% 不透明度，平时 `rgba(148,163,184,0.7)`

**琴键状态矩阵**（优先级从低到高：default < target < pressed < wrong）：

| 键 | default | target | pressed | wrong |
|---|---|---|---|---|
| 白键 | `bg-white` 边 slate-300 | `bg-amber-300` + 脉冲 | `bg-sky-300` | `bg-red-500` |
| 黑键 | `bg-slate-800` 边 black | `bg-amber-600` + 脉冲 | `bg-sky-600` | `bg-red-500` |

- C 键左下角标注音名（micro，text-muted）
- **HintBar**：居中 caption。等待式：等待中显示「弹琥珀色亮起的键」，否则「音符下落中…」；自由式固定「跟上节奏，音符到线时弹奏」

### 4.3 报告页（screen: report）

```
┌────────────────────────────────────────┐
│              练习报告                    │
│     小星星 · 自由式 · 30 音              │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│ │ 92%  │ │偏抢拍 │ │ 78% │ │  3   │   │  ← 4 张 StatCard
│ │命中率 │ │节奏仪表│ │时值 │ │漏/错 │   │
│ └──────┘ └──────┘ └──────┘ └──────┘   │
│ 需要重点练习的音                          │
│ (G4·抢拍×2 时值不足×1) (E4·漏弹×1) …    │  ← ProblemChips
│        [再练一次]  [换一首]              │
└────────────────────────────────────────┘
```

- **StatCard**：`bg-raised` 圆角 12px，大数字 24px/700（语义色），下方 caption 标签（text-secondary）
- **节奏仪表**（TimingGauge）：横条 `bg-slate-700`，中心刻度线，marker 为 16px `info` 色圆点；位置 = 50% + clamp(平均偏差, ±0.4拍)/0.4 × 50%；两端标注「抢拍 / 拖拍」；等待式数据显示「—」+ 「等待式无节奏数据，试试自由式」
- **ProblemChips**：胶囊 `border-accent/40 + bg-accent/10`，内容「音名(amber-300 加粗) + 问题×次数」；无问题时整区块隐藏
- 主按钮「再练一次」+ GhostButton「换一首」

---

## 5. 组件清单与状态

| 组件 | 变体/状态 | 备注 |
|---|---|---|
| PrimaryButton | default / hover(`accent-strong`) / active(scale 0.98) | 实底 accent，文字 `#0f172a` |
| GhostButton | default / hover(`bg-raised`) | 描边 `border-strong` |
| Card | — | `bg-surface + border-subtle` + 圆角 12px |
| StatCard | 数值 + 标签 + 可选副文案 | 入场交错动画 |
| ModeSelector | 选中 / 未选中 / hover | 两列 |
| SongRow | default / hover | 右侧元信息 |
| PianoKeyboard | 见状态矩阵 | 黑键 z-index 高于白键 |
| FallingNotes | 音符四态 | canvas 实现，props 不变 |
| MidiStatusBadge | ok / no-device / unsupported / init | 见 4.1 |
| TimingGauge | 有数据 / 无数据 | 见 4.3 |
| ProblemChip | — | 胶囊 |

---

## 6. 交互反馈清单

1. 命中：目标键短暂保持 amber → 变绿随下方滑出；音符块变 emerald 继续下落
2. 错音：按键红闪 220ms；HUD 错音计数 +1（数字跳动动画可选）
3. 漏弹（自由式）：音符变红掉落出屏；HUD 漏弹 +1
4. 按住琴键：对应键持续 `pressed` 色，松开恢复
5. 曲目完成：延迟 600ms 后切报告页，统计卡交错入场
6. 页面切换：200ms 渐入上移
7. 焦点可见性：所有可交互元素 `focus-visible` 时显示 `accent` 外描边（2px offset 2px）

---

## 7. 无障碍与可用性

- 文字对比度 ≥ 4.5:1（amber-500 在深底上仅用于大号文字/图形，正文勿用）
- 按钮最小点击区 40×40px；琴键除外（本身即操作区）
- `prefers-reduced-motion: reduce` 时关闭脉冲/交错动画，仅保留即时状态变色
- 页面 `<title>` 与 h1 语义正确；统计数字使用 `tabular-nums` 防抖动

---

## 8. 实现与验收

**建议文件结构**（新增放 `src/components/`）：
- `ui/Button.tsx`（Primary + Ghost）
- `ui/Card.tsx`、`ui/StatCard.tsx`
- `ui/MidiStatusBadge.tsx`、`ui/TimingGauge.tsx`、`ui/ProblemChip.tsx`
- 现有 `FallingNotes.tsx` / `PianoKeyboard.tsx` / `ReportScreen.tsx` 按本规范重写样式

**Tailwind v4 令牌**：可在 `index.css` 用 `@theme { --color-accent: #f59e0b; ... }` 定义后以 `bg-accent` 等使用；亦可直接用内置 slate/amber/emerald 色板对应值。

**验收清单**：
- [ ] 三页视觉与线框一致，深色主题统一，无白闪
- [ ] 琴键四态颜色与优先级正确（wrong 覆盖一切）
- [ ] 下落音符与琴键纵向对齐（含黑键）
- [ ] HUD 数字等宽；自由式显示漏弹、等待式不显示
- [ ] 报告四卡 + 仪表 + 问题胶囊渲染正确，等待式节奏卡显示占位
- [ ] hover / focus-visible / active 三态齐全；reduced-motion 生效
- [ ] < 640px 无横向滚动，统计卡 2×2
- [ ] `npm run build`（含 tsc）通过；游戏逻辑文件零改动（`git diff --stat` 核对）

**未来预留（本期不实现）**：报告页下方将新增「AI 教练对话面板」（W3），设计时请为报告页底部预留 240px 高度区域的概念空间，勿做死布局。
