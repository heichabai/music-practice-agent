import type { Song } from '../types'

export interface LessonStep {
  heading: string
  body: string
  diagram?: 'keyboard' | 'staff' | 'fingers' | 'posture' | 'handshape' | 'strike' | 'bothhands'
}

export interface LessonTask {
  prompt: string
  /** 可接受的 midi 音（any：任一；all：全部同时；sequence：按顺序） */
  targets: number[]
  mode: 'any' | 'all' | 'sequence'
  hint?: string
}

export interface LessonQuiz {
  question: string
  options: string[]
  answer: number
  explain: string
}

export interface Lesson {
  id: string
  order: number
  title: string
  subtitle: string
  hue: number
  steps: LessonStep[]
  task?: LessonTask
  quiz?: LessonQuiz
  /** 课后练习：内置曲库曲目 id */
  practiceSongId?: string
  /** 课后练习：课程内嵌曲目 */
  practiceSong?: Song
  practiceNote?: string
}

/** 第 5 课内嵌练习曲：双手五指齐奏（每拍左右手同音） */
const handsSong: Song = {
  id: 'lesson-hands',
  name: '双手五指 · 齐奏入门',
  bpm: 72,
  notes: [
    { midi: 60, time: 0, duration: 1 }, { midi: 48, time: 0, duration: 1 },
    { midi: 62, time: 1, duration: 1 }, { midi: 50, time: 1, duration: 1 },
    { midi: 64, time: 2, duration: 1 }, { midi: 52, time: 2, duration: 1 },
    { midi: 65, time: 3, duration: 1 }, { midi: 53, time: 3, duration: 1 },
    { midi: 67, time: 4, duration: 2 }, { midi: 55, time: 4, duration: 2 },
    { midi: 65, time: 6, duration: 1 }, { midi: 53, time: 6, duration: 1 },
    { midi: 64, time: 7, duration: 1 }, { midi: 52, time: 7, duration: 1 },
    { midi: 62, time: 8, duration: 1 }, { midi: 50, time: 8, duration: 1 },
    { midi: 60, time: 9, duration: 3 }, { midi: 48, time: 9, duration: 3 },
  ],
}

export const LESSONS: Lesson[] = [
  {
    id: 'l1-keyboard',
    order: 1,
    title: '认识键盘',
    subtitle: '黑白键的排列规律与找音方法',
    hue: 206,
    steps: [
      {
        heading: '钢琴是一张"音的地图"',
        body: '标准钢琴有 88 个键：52 个白键、36 个黑键。黑键不是乱排的——它们以"2 个一组"和"3 个一组"交替出现，像地标一样把键盘分成了一个个八度。记住这个规律，任何键你都能快速找到。',
        diagram: 'keyboard',
      },
      {
        heading: '找到 C，就找到了原点',
        body: '每组"2 个相邻黑键"紧左边的那个白键，就是 C。整个键盘从左到右有 8 个 C，越往右音越高。位于键盘中间、在我们练习区起点的那个，叫中央 C（C4）。',
      },
      {
        heading: '白键的七个名字',
        body: '白键按 C、D、E、F、G、A、B 七个字母命名，到 B 之后又从 C 重新开始——所以隔一个八度的两个 C，听起来"是同一个音，只是高了"。黑键则是相邻白键的升（♯）或降（♭）半音。',
      },
      {
        heading: '正确的坐姿',
        body: '琴凳坐前一半，双脚放平踩实；手肘大致与键盘同高，手腕放平不塌、不拱。身体离琴一拳远——放松，是弹琴的第一原则。',
        diagram: 'posture',
      },
    ],
    task: {
      prompt: '在键盘上找到并按下任意一个 C',
      targets: [48, 60, 72],
      mode: 'any',
      hint: '提示：两个相邻黑键左边的白键就是 C',
    },
  },
  {
    id: 'l2-staff',
    order: 2,
    title: '五线谱入门',
    subtitle: '谱表、谱号与音的位置',
    hue: 268,
    steps: [
      {
        heading: '五条线，四个间',
        body: '五线谱由五条平行横线和四个间组成。位置越低音越低、越高越高；比五条线更高或更低的音，用短短的"上加线 / 下加线"来表示。',
        diagram: 'staff',
      },
      {
        heading: '高音谱号（𝄞）',
        body: '写在每行谱表开头的这个漂亮符号叫高音谱号，也叫 G 谱号。带高音谱号的谱表通常记录右手弹的音区。',
      },
      {
        heading: '中央 C 的位置',
        body: '下加一线上那个音就是 C4（中央 C）——它是五线谱的"原点"。从它开始往上：下加一间是 D4、第一线是 E4、第一间是 F4……线与间交替着往上爬。',
      },
      {
        heading: '低音谱号（𝄢）',
        body: '左手音区用低音谱号记录，它的上加一线上同样是 C4。高低音谱号像一对翅膀，围绕中央 C 向上下两边展开，合起来就是"大谱表"。',
      },
    ],
    task: {
      prompt: '下加一线上的音是中央 C——请按下 C4',
      targets: [60],
      mode: 'any',
      hint: '电脑键盘按 A 键也是 C4',
    },
  },
  {
    id: 'l3-right-hand',
    order: 3,
    title: '右手五指',
    subtitle: '手型、指法编号与五指位',
    hue: 152,
    steps: [
      {
        heading: '好的手型',
        body: '手指自然弯曲，像轻轻握住一个鸡蛋；用指腹（不是指尖）触键，拇指用外侧触键。手腕放平，与手背成一条线。',
        diagram: 'handshape',
      },
      {
        heading: '指法编号 1-5',
        body: '拇指 = 1、食指 = 2、中指 = 3、无名指 = 4、小指 = 5，左右手都从拇指数起。乐谱上标注的小数字，就是告诉你这一音用哪根手指弹。',
      },
      {
        heading: '右手五指位',
        body: '把 1 指放在 C4 上，其余手指依次各占一个键：2 指 D4、3 指 E4、4 指 F4、5 指 G4。一指一键，五个音全覆盖，弹奏时手指不用来回挪。',
      },
      {
        heading: '抬指与击键',
        body: '从掌关节把手指抬起，垂直落键，力度均匀；弹完手指自然贴在键上放松。不要用手腕压，也不要敲出噪音——"抬得从容，落得坚定"。',
        diagram: 'strike',
      },
    ],
    task: {
      prompt: '右手五指位：按指法 1-2-3-4-5 依次弹 C4 D4 E4 F4 G4',
      targets: [60, 62, 64, 65, 67],
      mode: 'sequence',
      hint: '弹错会从头计，慢慢来',
    },
    practiceSongId: 'warmup',
    practiceNote: '课后用「热身 · 五指练习」巩固：等待式练认音，弹准每一个音。',
  },
  {
    id: 'l4-rhythm',
    order: 4,
    title: '节奏与时值',
    subtitle: '拍、BPM 与音符长短',
    hue: 30,
    steps: [
      {
        heading: '什么是"一拍"',
        body: '拍（Beat）是音乐的心跳。BPM 表示每分钟多少拍——96 BPM 就是每秒约 1.6 拍。练习时永远先慢后快：慢速弹对了，快速才有可能对。',
      },
      {
        heading: '音符家族',
        body: '全音符 4 拍、二分音符 2 拍、四分音符 1 拍、八分音符半拍——每往下一级，时值减半。本应用里你看到的方块长度，就对应音符时值。',
      },
      {
        heading: '小节与拍号',
        body: '乐谱被竖线（小节线）分成一段段小节。开头的 4/4 表示：以四分音符为一拍、每小节 4 拍。',
      },
      {
        heading: '数拍练习',
        body: '弹四分音符时心里匀速数"1、2、3、4"；八分音符数"1 & 2 &"（& 落在半拍上）。嘴里数的速度不能变——这就是你的"内置节拍器"。',
      },
    ],
    practiceSongId: 'warmup',
    practiceNote: '课后把「热身 · 五指练习」切成自由式练一遍：跟上连续播放的节奏，感受"拍"的存在。',
  },
  {
    id: 'l5-both-hands',
    order: 5,
    title: '左手与双手',
    subtitle: '左手五指位与双手配合',
    hue: 220,
    steps: [
      {
        heading: '左手五指位',
        body: '左手与右手镜像：5 指放 C3（比中央 C 低一个八度），4 指 D3、3 指 E3、2 指 F3、1 指 G3。',
      },
      {
        heading: '两条平行铁轨',
        body: '双手五指位相隔一个八度，各自负责自己的音区，像两条平行铁轨——互不干扰，却一起向前。',
        diagram: 'bothhands',
      },
      {
        heading: '从"同音齐奏"开始',
        body: '双手合奏最简单的起点：左右手同时按下（左手低八度）。先感受"两只手同时启动"，再追求各自独立。',
      },
      {
        heading: '分-合-分-合',
        body: '标准练法：先分手各自练熟 → 合手慢速 → 暴露问题再分手 → 再合手。永远不要一上来就合手硬磕。',
      },
    ],
    task: {
      prompt: '双手齐奏：同时按下 C4（右手 1 指）和 C3（左手 5 指）',
      targets: [48, 60],
      mode: 'all',
      hint: '两个音都在按下的状态才算完成',
    },
    practiceSong: handsSong,
    practiceNote: '课后练习「双手五指 · 齐奏入门」：左手低八度跟随右手，等待式逐音过关。',
  },
  {
    id: 'l6-technique',
    order: 6,
    title: '弹奏技法',
    subtitle: '连奏、断奏与放松',
    hue: 340,
    steps: [
      {
        heading: '连奏 Legato——走路',
        body: '音与音之间连贯不断开，像走路时脚几乎不离地：后一个音按下去了，前一个手指才松开。乐谱上用连线（弧线）标记。',
      },
      {
        heading: '断奏 Staccato——跳跃',
        body: '音短促、有弹性，像轻快的小跳：指尖弹下立刻离键，音符下带一个圆点标记。断奏靠手腕的弹性，不是手指硬拍。',
      },
      {
        heading: '力量从放松中来',
        body: '肩膀→手臂→手腕一路放松，力量自然沉到指尖。初学者最大的敌人是紧张——弹几分钟就酸，说明某个环节在较劲，停下来甩甩手。',
      },
      {
        heading: '每日练习配方',
        body: '15-20 分钟足够：热身五指 3 分钟 → 复习旧曲 5 分钟 → 新内容 8 分钟。宁可慢而对，不要快而错——错的习惯要花十倍时间改。',
      },
    ],
    quiz: {
      question: '以下哪句描述的是"连奏 Legato"?',
      options: [
        '音与音之间连贯不断开，后一音按下前一音才松',
        '每个音都短促有弹性地立刻断开',
        '用尽全力把琴键砸到底',
        '只弹黑键不弹白键',
      ],
      answer: 0,
      explain: 'Legato = 连贯如走路；"短促断开"是断奏 Staccato。',
    },
  },
  {
    id: 'l7-piece',
    order: 7,
    title: '实战曲目',
    subtitle: '用《小星星》走完整流程',
    hue: 190,
    steps: [
      {
        heading: '分段学习',
        body: '把《小星星》分成 4 个乐句，每次只练一句，练熟再连。一句 10 遍不出错，再练下一句——比从头到尾磕 10 遍有效得多。',
      },
      {
        heading: '先右手，后双手',
        body: '先把右手旋律弹顺（可以用等待式专门练认音），再上双手版本。双手谱里方块会同时落两个音——这就是你在第 5 课学的齐奏升级版。',
      },
      {
        heading: '两种模式交替用',
        body: '等待式：弹对才前进——练认音和指法。自由式：连续播放——练节奏和时值。先等待式过关，再自由式检验，是高效路径。',
      },
      {
        heading: '毕业快乐 🎉',
        body: '完成本课你就掌握了入门全部基础。接下来：用「导入乐谱」把任何喜欢的曲子变成练习曲；每次练完看报告、听 AI 教练复盘。持续练，持续进步！',
      },
    ],
    practiceSongId: 'twinkle',
    practiceNote: '毕业实战：分段攻克《小星星》，两种模式各练一遍。',
  },
]
