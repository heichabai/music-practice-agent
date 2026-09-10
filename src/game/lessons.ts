import type { Song } from '../types'

export type DiagramKind =
  | 'keyboard' | 'staff' | 'fingers' | 'posture' | 'handshape' | 'strike' | 'bothhands'
  | 'octaves' | 'clefs' | 'positions' | 'durations' | 'rests' | 'timesig'
  | 'eighth' | 'dotted' | 'chord' | 'chordprog' | 'metronome' | 'form'

export interface LessonStep {
  heading: string
  body: string
  diagram?: DiagramKind
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
  /** 所属单元（1-5），用于学习路径分组 */
  unit: number
  order: number
  title: string
  subtitle: string
  hue: number
  steps: LessonStep[]
  task?: LessonTask
  quiz?: LessonQuiz
  /** 课后练习：内置曲库曲目 id */
  practiceSongId?: string
  /** 课后练习：课程内嵌曲目（优先于 practiceSongId） */
  practiceSong?: Song
  practiceNote?: string
}

/** 单元元信息：学习路径上的单元横幅 */
export interface LessonUnit {
  id: number
  title: string
  color: string
  shadow: string
}

export const UNITS: LessonUnit[] = [
  { id: 1, title: 'UNIT 1 · 认识钢琴', color: '#1CB0F6', shadow: '#1899D6' },
  { id: 2, title: 'UNIT 2 · 学读谱', color: '#CE82FF', shadow: '#A568CC' },
  { id: 3, title: 'UNIT 3 · 右手旋律', color: '#58CC02', shadow: '#46A302' },
  { id: 4, title: 'UNIT 4 · 节奏进阶', color: '#FF9600', shadow: '#D97D00' },
  { id: 5, title: 'UNIT 5 · 左手与双手', color: '#FF4B4B', shadow: '#D63B3B' },
]

export const LESSONS: Lesson[] = [
  // ============================================================
  // UNIT 1 · 认识钢琴
  // ============================================================
  {
    id: 'u1l1-find-c',
    unit: 1,
    order: 1,
    title: '找到 C',
    subtitle: '黑键分组规律与定位法',
    hue: 206,
    steps: [
      {
        heading: '钢琴是一张"音的地图"',
        body: '标准钢琴有 88 个键：52 个白键、36 个黑键。黑键以"2 个一组"和"3 个一组"交替出现，像地标一样把键盘分成一个个八度。记住这个规律，任何键你都能快速找到。',
        diagram: 'keyboard',
      },
      {
        heading: '黑键分组的秘密',
        body: '盯住键盘中间区域：两个黑键、三个黑键、两个黑键、三个黑键……无限循环。这个图案就是你认路的"路牌"，不用数白键也能定位。',
      },
      {
        heading: '找到 C，就找到了原点',
        body: '每组"2 个相邻黑键"紧左边的那个白键，就是 C。整个键盘从左到右有 8 个 C，越往右音越高。',
        diagram: 'octaves',
      },
      {
        heading: '中央 C（C4）',
        body: '位于键盘正中间的那个 C，叫中央 C。它是钢琴的"原点"，也是我们练习区的起点。接下来的所有课程都从它出发。',
      },
    ],
    task: {
      prompt: '在键盘上找到并按下任意一个 C',
      targets: [48, 60, 72],
      mode: 'any',
      hint: '提示：两个相邻黑键左边的白键就是 C；电脑键盘按 Z / A / K 键',
    },
  },
  {
    id: 'u1l2-white-keys',
    unit: 1,
    order: 2,
    title: '白键的名字',
    subtitle: 'C 到 B 的七个字母循环',
    hue: 216,
    steps: [
      {
        heading: '七个字母',
        body: '白键按 C、D、E、F、G、A、B 七个字母命名，从 C 开始向右依次排列。记住这个顺序，就像记住星期一到星期日。',
        diagram: 'keyboard',
      },
      {
        heading: '循环往复',
        body: '到 B 之后不是结束，而是又从 C 重新开始——所以整个键盘就是 CDEFGAB 不断重复。每重复一次，音就高一个八度。',
      },
      {
        heading: '什么是八度',
        body: '隔一个八度的两个 C，听起来"是同一个音，只是高了"。它们相差 12 个键（7 白 + 5 黑），音高恰好相差一倍。',
        diagram: 'octaves',
      },
      {
        heading: '黑键怎么命名',
        body: '黑键没有自己的字母，它借用旁边白键的名字：C 右边相邻的黑键叫"升 C"（C♯），D 左边相邻的黑键叫"降 D"（D♭）——它们是同一个键。',
      },
    ],
    task: {
      prompt: '从 C4 开始，依次弹出 C D E F G A B（7 个白键）',
      targets: [60, 62, 64, 65, 67, 69, 71],
      mode: 'sequence',
      hint: '跟着琥珀色高亮走：C→B，正好走完一组白键',
    },
  },
  {
    id: 'u1l3-posture',
    unit: 1,
    order: 3,
    title: '坐姿与手型',
    subtitle: '好的开始是成功的一半',
    hue: 196,
    steps: [
      {
        heading: '坐姿四要点',
        body: '琴凳坐前一半，双脚放平踩实；手肘大致与键盘同高；身体离琴一拳远。重心稳了，双手才能自由发力。',
        diagram: 'posture',
      },
      {
        heading: '手型：握一个鸡蛋',
        body: '手指自然弯曲，像轻轻握住一个鸡蛋——掌心留空、指节立起。不要摊平，也不要攥拳。',
        diagram: 'handshape',
      },
      {
        heading: '指腹触键',
        body: '用指腹（不是指尖）触键，拇指用外侧触键。手腕放平，与手背成一条线，不塌不拱。',
      },
      {
        heading: '放松是第一原则',
        body: '肩膀→手臂→手腕一路放松，力量自然沉到指尖。弹几分钟就酸，说明某个环节在较劲——停下来甩甩手再来。',
        diagram: 'strike',
      },
    ],
  },
  {
    id: 'u1l4-fingers',
    unit: 1,
    order: 4,
    title: '指法编号',
    subtitle: '拇指是 1，小指是 5',
    hue: 186,
    steps: [
      {
        heading: '指法编号 1-5',
        body: '拇指 = 1、食指 = 2、中指 = 3、无名指 = 4、小指 = 5，左右手都从拇指数起。乐谱上标注的小数字，就是告诉你这一音用哪根手指。',
        diagram: 'fingers',
      },
      {
        heading: '为什么要指法',
        body: '钢琴的十个手指能力不同：1 指强壮、4 指最弱。合理的指法让每个音都用最合适的手指弹，速度快、不容易乱。',
      },
      {
        heading: '一指对一键',
        body: '初级练习中，右手 1 指放 C4、2 指 D4、3 指 E4、4 指 F4、5 指 G4——一指一键，弹奏时手指不用来回挪。',
      },
      {
        heading: '左右手镜像',
        body: '左手编号相同但方向相反：左手 1 指也是拇指。之后学到左手时，5 指放低音 C，1 指靠近中央 C。',
      },
    ],
    task: {
      prompt: '用右手 1-2-3-4-5 指依次弹 C4 D4 E4 F4 G4',
      targets: [60, 62, 64, 65, 67],
      mode: 'sequence',
      hint: '一指一键，弹错会从头计，慢慢来',
    },
  },
  {
    id: 'u1l5-warmup',
    unit: 1,
    order: 5,
    title: '五指位热身',
    subtitle: '第一次用等待式练完整首曲子',
    hue: 176,
    steps: [
      {
        heading: '什么是五指位',
        body: 'C 五指位（C Position）就是刚才练过的：1-5 指分别压住 C D E F G。初级教材 80% 的曲子都在这个把位里。',
        diagram: 'handshape',
      },
      {
        heading: '上行与下行',
        body: '从 C 弹到 G 叫"上行"，从 G 弹回 C 叫"下行"。今天的练习曲就是上行一遍、下行一遍，全用四分音符。',
      },
      {
        heading: '等待式怎么用',
        body: '练习页选「等待式」：音符落到线上会停住等你，弹对了才继续。它是专门练"认音"的模式——眼睛看方块、手找键。',
      },
      {
        heading: '第一课作业',
        body: '目标：整首曲子零失误过一遍。错音没关系，停下来、看清楚、再按。慢，就是快。',
      },
    ],
    practiceSongId: 'warmup',
    practiceNote: '课后练习「热身 · 五指练习」：等待式逐音过关，目标零失误。',
  },

  // ============================================================
  // UNIT 2 · 学读谱
  // ============================================================
  {
    id: 'u2l1-staff',
    unit: 2,
    order: 6,
    title: '五线谱',
    subtitle: '五条线就是钢琴的地图',
    hue: 268,
    steps: [
      {
        heading: '五条线，四个间',
        body: '五线谱由五条平行横线和四个"间"组成。从下往上数：第 1 线、第 1 间、第 2 线……音的位置就写在这些线和间上。',
        diagram: 'staff',
      },
      {
        heading: '加线：谱外的音',
        body: '比五条线更高或更低的音，用短短的"上加线 / 下加线"来表示。线可以一直往下加、往上加，只是很少见。',
      },
      {
        heading: '位置 = 音高',
        body: '谱面上的位置和键盘一一对应：位置越低音越低、越高音越高。看谱本质就是看"这个音在地图上哪个位置"。',
      },
      {
        heading: '中央 C 在哪里',
        body: '下加一线上那个音就是中央 C（C4）——它是整张地图的"原点"。先把它刻进脑子里，其他音都从它数上去。',
      },
    ],
    task: {
      prompt: '下加一线上的音是中央 C——请按下 C4',
      targets: [60],
      mode: 'any',
      hint: '电脑键盘按 A 键就是 C4',
    },
  },
  {
    id: 'u2l2-clefs',
    unit: 2,
    order: 7,
    title: '谱号',
    subtitle: '高音谱号与低音谱号',
    hue: 278,
    steps: [
      {
        heading: '高音谱号（𝄞）',
        body: '写在谱表开头、像花体符号的那个，叫高音谱号，也叫 G 谱号——它的螺旋中心正好圈住 G4 所在的第二线。带高音谱号的谱表记录右手音区。',
        diagram: 'clefs',
      },
      {
        heading: '低音谱号（𝄢）',
        body: '左手音区用低音谱号记录，也叫 F 谱号——它的两个圆点夹着 F3 所在的第四线。低音谱表上的音整体低一个八度。',
        diagram: 'clefs',
      },
      {
        heading: '大谱表',
        body: '钢琴谱通常把高低音谱表上下叠起来、用括号连住，这叫"大谱表"。上手下谱，中央 C 正好卡在中间——像一对翅膀围绕它展开。',
        diagram: 'clefs',
      },
      {
        heading: '谱号决定读法',
        body: '同一个位置，在高音谱表和低音谱表上是不同的音。看谱第一步永远是先看谱号——这决定了地图的"坐标系"。',
      },
    ],
  },
  {
    id: 'u2l3-positions',
    unit: 2,
    order: 8,
    title: '音符的位置',
    subtitle: '从中央 C 往上数',
    hue: 288,
    steps: [
      {
        heading: '从 C4 出发',
        body: '高音谱表里：C4 在下加一线，D4 在下加一间（谱表正下方），E4 在第 1 线，F4 在第 1 间，G4 在第 2 线。线和间交替着往上爬。',
        diagram: 'positions',
      },
      {
        heading: '音名跟着位置走',
        body: '谱面上每上升一个位置（线→间→线），音名就往前走一个字母（C→D→E），键盘上就往右走一个白键。三个系统严格对齐。',
      },
      {
        heading: '先记三个"地标"',
        body: '入门不用背全部位置，先记三个地标：下加一线 = C、第 1 线 = E、第 2 间 = A。其他音从地标数过去，几秒钟就能认出来。',
        diagram: 'positions',
      },
      {
        heading: '眼—脑—手',
        body: '认音的路径：眼睛看位置 → 脑子想音名 → 手指找键。一开始慢很正常，练多了会变成条件反射——这就是"视奏"。',
      },
    ],
    task: {
      prompt: '按谱面顺序弹 C（下加一线）→ D → E（第一线）',
      targets: [60, 62, 64],
      mode: 'sequence',
      hint: '位置从低到高，键盘从左到右',
    },
  },
  {
    id: 'u2l4-durations',
    unit: 2,
    order: 9,
    title: '音符时值',
    subtitle: '全音符、二分、四分与八分',
    hue: 298,
    steps: [
      {
        heading: '先认识"拍"',
        body: '拍（Beat）是音乐的心跳——匀速、稳定。所有音符的"长短"都用拍来衡量：这个音弹几拍，就是按住它数几下。',
      },
      {
        heading: '全音符与二分音符',
        body: '空心椭圆、没有符杆的是全音符，弹 4 拍；空心加符杆的是二分音符，弹 2 拍。它们都是"长音"，弹下去要数拍。',
        diagram: 'durations',
      },
      {
        heading: '四分音符',
        body: '实心加符杆的是四分音符，弹 1 拍——它是钢琴曲里最常见的音符，你可以把它当作"标准步幅"。',
        diagram: 'durations',
      },
      {
        heading: '八分音符',
        body: '四分音符的符尾加一面小旗（或两音间连一条横线）就是八分音符，只弹半拍——两个八分音符加起来正好一拍。规律：每往下一级，时值减半。',
        diagram: 'durations',
      },
    ],
    quiz: {
      question: '在 4/4 拍里，一个四分音符弹几拍？',
      options: ['半拍', '1 拍', '2 拍', '4 拍'],
      answer: 1,
      explain: '四分音符 = 1 拍，是最常用的"步幅"；二分 = 2 拍，全音符 = 4 拍。',
    },
  },
  {
    id: 'u2l5-rests',
    unit: 2,
    order: 10,
    title: '休止符',
    subtitle: '不弹，也是音乐',
    hue: 258,
    steps: [
      {
        heading: '休止符是什么',
        body: '乐谱上不只有"弹"的记号，还有"不弹"的记号——休止符。它表示在这段时间里安静，让上一个音的余韵走完。',
      },
      {
        heading: '四分休止符',
        body: '长得像一道闪电的那个是四分休止符：安静 1 拍。看到它，手可以抬起准备，但心里要继续数拍。',
        diagram: 'rests',
      },
      {
        heading: '二分与全休止符',
        body: '二分休止符是坐在第 3 线上的小方块（安静 2 拍）；全休止符是吊在第 4 线下的小方块（安静 4 拍）。记忆法：坐线=2 拍，吊线=4 拍。',
        diagram: 'rests',
      },
      {
        heading: '休止也要数拍',
        body: '初学者最容易在休止符上"掉拍"——手停了，心里数拍也停了。记住：休止符期间节拍照样走，1、2、3、4 一个不能少。',
      },
    ],
    quiz: {
      question: '在乐谱里，休止符表示什么？',
      options: ['这段时间不弹，安静相应的拍数', '弹得更响', '弹得更快', '换另一只手弹'],
      answer: 0,
      explain: '休止符 = 有拍数的安静。不弹，但拍子照常走。',
    },
  },

  // ============================================================
  // UNIT 3 · 右手旋律
  // ============================================================
  {
    id: 'u3l1-three-notes',
    unit: 3,
    order: 11,
    title: '三音旋律',
    subtitle: '只用 C D E 弹一支小曲',
    hue: 152,
    steps: [
      {
        heading: '三个音也能成曲',
        body: '只用 C、D、E 三个音（1、2、3 指），就能弹出好听的旋律。音乐的魅力不在音多，而在排列——就像三个词也能造句。',
      },
      {
        heading: '今天的小曲',
        body: '练习曲《三音小曲》的走向：上台阶（C-D-E）→ 下台阶（E-D-C）→ 再变化一次。全是四分音符，专注认音，不用管节奏难度。',
        diagram: 'positions',
      },
      {
        heading: '边弹边唱音名',
        body: '弹每个音的同时，嘴里念出音名："do-re-mi"或"C-D-E"。多感官并用，认音速度快一倍——这是所有钢琴老师都会用的招。',
      },
      {
        heading: '听辨训练',
        body: '弹熟了以后试试：不看键盘，只听声音判断是上行还是下行。耳朵和手指建立连接，是学琴最重要的底层能力。',
      },
    ],
    task: {
      prompt: '热身：按 C → D → E → D → C 弹一遍（上台阶再下来）',
      targets: [60, 62, 64, 62, 60],
      mode: 'sequence',
      hint: '1-2-3-2-1 指',
    },
    practiceSongId: 'mini-cde',
    practiceNote: '课后练习「三音小曲」：等待式，边弹边念音名。',
  },
  {
    id: 'u3l2-five-notes',
    unit: 3,
    order: 12,
    title: '五音旋律',
    subtitle: '加入 F 和 G，五指全开',
    hue: 142,
    steps: [
      {
        heading: '五指位全开',
        body: '这一课加入 4 指的 F 和 5 指的 G，五个手指全部用上。注意 4 指天生较弱，弹 F 时多给一点耐心。',
        diagram: 'keyboard',
      },
      {
        heading: '下行比上行难',
        body: '从 G 往 C 弹（5→4→3→2→1）时，小指和无名指先启动，力量容易不均匀。解决办法：慢，慢到每个音都弹得一样响。',
      },
      {
        heading: '连奏的感觉',
        body: '试着让音与音"连"起来：下一个音按下去的瞬间，上一个手指才松开。听起来像走路，一步接一步——这就是 Legato。',
      },
      {
        heading: '今天的曲子',
        body: '《五音下行》先下后上、再下一次结尾。结构工整，正好练"下行流畅度"这个新难点。',
      },
    ],
    task: {
      prompt: '下行热身：从 G4 依次弹回 C4（G → F → E → D → C）',
      targets: [67, 65, 64, 62, 60],
      mode: 'sequence',
      hint: '5-4-3-2-1 指，注意小指先启动',
    },
    practiceSongId: 'mini-five',
    practiceNote: '课后练习「五音下行」：重点听 4 指、5 指的音量是否均匀。',
  },
  {
    id: 'u3l3-mary',
    unit: 3,
    order: 13,
    title: '玛丽的小羊',
    subtitle: '第一首"真正的歌"',
    hue: 132,
    steps: [
      {
        heading: '为什么先学这首',
        body: '《玛丽的小羊》（Mary Had a Little Lamb）是全世界钢琴教材的第一首歌：音域只有五个音、节奏规整、旋律耳熟能详——你已经具备弹它的全部条件。',
      },
      {
        heading: '先分句',
        body: '这首歌分两句。第一句：E-D-C-D | E-E-E；第二句前半：D-D-D | E-G-G。把 8 小节的曲子切成 2-3 小节的小段，逐段攻克。',
        diagram: 'form',
      },
      {
        heading: '指法已经内置',
        body: '练习页的每个音符都标了指法数字。跟着数字弹就行，不用自己设计——起步阶段，一致性比"自由发挥"重要。',
      },
      {
        heading: '验收标准',
        body: '等待式零失误一遍 → 自由式跟上 90 BPM 一遍。两个都过了，这首歌就算"拿下"。',
      },
    ],
    practiceSongId: 'mary',
    practiceNote: '课后练习「玛丽的小羊」：先等待式分段，再自由式整曲。',
  },
  {
    id: 'u3l4-twinkle',
    unit: 3,
    order: 14,
    title: '小星星',
    subtitle: '变奏曲之王的第一主题',
    hue: 122,
    steps: [
      {
        heading: 'A 段 + 变化 + A 段',
        body: '《小星星》的结构是"A-B-A"：前两句相同，中间两句变化，最后两句回到开头。学会前两句，整首歌就会了一半。',
        diagram: 'form',
      },
      {
        heading: '两个音一组',
        body: '旋律里大量"同音重复"：1-1-5-5-6-6-5。同一个手指连按两下，注意第二下要和第一下一样稳——别"滑"过去。',
      },
      {
        heading: '分段学习法',
        body: '把歌分成 4 个乐句，每次只练一句，练熟再连。一句 10 遍不出错，再练下一句——比从头到尾磕 10 遍有效得多。',
      },
      {
        heading: '加入音乐性',
        body: '弹熟以后，试着把每句的开头弹得稍强、结尾稍弱，像说话有语气一样。这是从"弹对"走向"弹好听"的第一步。',
      },
    ],
    practiceSongId: 'twinkle',
    practiceNote: '课后练习「小星星」：等待式练认音，自由式检验节奏。',
  },
  {
    id: 'u3l5-ode',
    unit: 3,
    order: 15,
    title: '欢乐颂',
    subtitle: '附点节奏初体验',
    hue: 112,
    steps: [
      {
        heading: '贝多芬的礼物',
        body: '《欢乐颂》来自贝多芬第九交响曲，旋律气势磅礴却只用五个音。它是检验你 Unit 1-3 学习成果的最好曲目。',
      },
      {
        heading: '附点是什么',
        body: '音符右边加一个小圆点，时值增加一半：附点四分音符 = 1.5 拍。这首歌里"E-E."的长短对比，就是它灵魂所在。',
        diagram: 'dotted',
      },
      {
        heading: '数拍拆附点',
        body: '遇到附点四分 + 八分（1.5 + 0.5）时，把它数成"1-&-2"：附点占"1 和 &"，八分落在"2"上。拍子拆细了，节奏自然就对了。',
      },
      {
        heading: '挑战目标',
        body: '自由式跟上 104 BPM。如果跟不上，先回到等待式把附点位置弹熟——节奏不稳多半是附点没吃准。',
      },
    ],
    practiceSongId: 'ode',
    practiceNote: '课后练习「欢乐颂」：重点攻克第 2、4 句结尾的附点节奏。',
  },

  // ============================================================
  // UNIT 4 · 节奏进阶
  // ============================================================
  {
    id: 'u4l1-time-sig',
    unit: 4,
    order: 16,
    title: '拍号与小节',
    subtitle: '4/4 拍到底什么意思',
    hue: 30,
    steps: [
      {
        heading: '小节：音乐的句子',
        body: '乐谱被竖线（小节线）切成一段段"小节"，就像文章被句号切成句子。每小节的拍数由开头的"拍号"规定。',
        diagram: 'timesig',
      },
      {
        heading: '4/4 的含义',
        body: '拍号像分数：下面的 4 = 以四分音符为一拍，上面的 4 = 每小节 4 拍。所以 4/4 就是"每小节数 1-2-3-4"。',
        diagram: 'timesig',
      },
      {
        heading: '强弱规律',
        body: '4/4 拍天然有强弱：第 1 拍最强、第 3 拍次强，2、4 拍弱。弹的时候第 1 拍稍微"沉"一点，音乐立刻有了律动感。',
      },
      {
        heading: '还有别的拍号',
        body: '3/4 拍（每小节 3 拍，圆舞曲的"蹦-恰-恰"）、2/4 拍（进行曲）、6/8 拍（摇曳感）。入门阶段先吃透 4/4。',
      },
    ],
    quiz: {
      question: '4/4 拍表示每小节有几拍？',
      options: ['2 拍', '3 拍', '4 拍', '8 拍'],
      answer: 2,
      explain: '上面的数字 = 每小节拍数。4/4 = 每小节 4 拍，以四分音符为一拍。',
    },
    practiceSongId: 'waltz-3',
    practiceNote: '课后练习「圆舞曲 · 三拍子」：每小节数"1-2-3"，第 1 拍稍强，感受 3/4 拍。',
  },
  {
    id: 'u4l2-eighth',
    unit: 4,
    order: 17,
    title: '八分音符',
    subtitle: '半拍的世界',
    hue: 40,
    steps: [
      {
        heading: '一拍劈两半',
        body: '八分音符 = 半拍。一拍里要塞下两个八分音符，速度是四分音符的两倍——手的动作没变快，只是"落键间隔"变短了。',
      },
      {
        heading: '"1 & 2 &" 数拍法',
        body: '数八分音符时在拍点之间加一个"&"（读"and"）："1 & 2 & 3 & 4 &"。正拍落在数字上，半拍落在 & 上。嘴上数出来，手就稳了。',
        diagram: 'eighth',
      },
      {
        heading: '均匀是唯一的标准',
        body: '八分音符最常见的错误：前长后短，弹成"瘸腿"。检验方法：打开节拍器，让每个音都恰好落在"嗒"或两"嗒"正中间。',
      },
      {
        heading: '今天的练习曲',
        body: '《八分音符练习曲》用"上台阶-下台阶"的走句练均匀度。先用等待式感受每个半拍的位置，再上自由式。',
      },
    ],
    practiceSongId: 'eighth-ex',
    practiceNote: '课后练习「八分音符练习曲」：嘴里数"1 & 2 &"，追求绝对均匀。',
  },
  {
    id: 'u4l3-dotted',
    unit: 4,
    order: 18,
    title: '附点节奏',
    subtitle: '长短相间的推动力',
    hue: 50,
    steps: [
      {
        heading: '附点 = 延长一半',
        body: '任何音符右边加一个附点，时值就延长自身的一半。附点四分 = 1 + 0.5 = 1.5 拍；附点二分 = 2 + 1 = 3 拍。',
        diagram: 'dotted',
      },
      {
        heading: '黄金搭档',
        body: '附点四分（1.5 拍）后面几乎总跟着一个八分音符（0.5 拍），凑成整齐的 2 拍。这一"长-短"组合自带向前冲的动力。',
      },
      {
        heading: '在《欢乐颂》里找它',
        body: '回忆《欢乐颂》"E-E."那一句：附点让第二个音拖长，紧接着的短音像弹跳一样接上去。回去再弹一遍，这次有意识地做出长短对比。',
      },
      {
        heading: '数拍拆解',
        body: '把 1.5 + 0.5 数成"1-&-2"：附点音占满"1 和 &"，八分音落在"2"。把拍拆成半拍来数，附点节奏永远不会错。',
        diagram: 'dotted',
      },
    ],
    quiz: {
      question: '附点四分音符弹几拍？',
      options: ['1 拍', '1.5 拍', '2 拍', '0.5 拍'],
      answer: 1,
      explain: '附点 = 原时值 + 一半。四分（1 拍）+ 半拍 = 1.5 拍。',
    },
    practiceSongId: 'dotted-ex',
    practiceNote: '课后练习「附点练习曲」：把 1.5 + 0.5 数成"1-&-2"，弹出明显的长短对比。',
  },
  {
    id: 'u4l4-tempo',
    unit: 4,
    order: 19,
    title: '速度与节拍器',
    subtitle: 'BPM 与慢练的艺术',
    hue: 20,
    steps: [
      {
        heading: 'BPM 是什么',
        body: 'BPM = 每分钟拍数。60 BPM 就是一秒一拍；120 BPM 是一秒两拍。曲子上标的 ♩=96，意思就是以 96 BPM 的速度演奏。',
        diagram: 'metronome',
      },
      {
        heading: '节拍器是你的教练',
        body: '节拍器匀速打拍，像一位从不出错的陪练。跟着它练，节奏不稳的问题会立刻暴露——它很严格，但它是对的。',
      },
      {
        heading: '慢练原则',
        body: '永远先慢后快：用能"零失误"的速度练熟，再一档一档提速（每次 +5 BPM）。慢速弹对了，快速才有可能对——反过来练的全是错误。',
      },
      {
        heading: '提速阶梯',
        body: '拿课后练习《快板 · 速度练习》做实验：先用 60 BPM 弹一遍，然后 70、80、90……找到你开始出错的那一档，就退回上一档继续练。那个速度就是你今天的上限。',
        diagram: 'metronome',
      },
    ],
    practiceSongId: 'tempo-ex',
    practiceNote: '课后练习「快板 · 速度练习」（120 BPM）：先用等待式弹准，再自由式感受速度压力。',
  },
  {
    id: 'u4l5-rhythm-review',
    unit: 4,
    order: 20,
    title: '节奏复习',
    subtitle: '四分 + 八分 + 附点综合',
    hue: 45,
    steps: [
      {
        heading: '三种节奏型',
        body: '你已经掌握：四分音符（匀速走）、八分音符（小跑步）、附点节奏（长-短推进）。一首真曲子里，它们会混合出现。',
        diagram: 'durations',
      },
      {
        heading: '看谱先找"难点小节"',
        body: '拿到一首新曲子，先扫一遍找出节奏最密的小节（八分最多的、有附点的），单独练它们。难点过了，全曲就顺了。',
      },
      {
        heading: '手打拍子',
        body: '弹之前，先用手拍着大腿把全曲节奏"打"一遍，嘴里数拍。节奏先在身体里过一遍，手上就不慌了。',
      },
      {
        heading: '下一单元预告',
        body: '节奏关过了，该请出左手了。下一单元：左手五指位 → 双手齐奏 → 和弦，你的演奏将从"单声道"升级成"立体声"。',
      },
    ],
    practiceSongId: 'rhythm-review',
    practiceNote: '课后练习「节奏复习曲」：四分、八分、附点、休止全都有，是最好的综合测试。',
  },

  // ============================================================
  // UNIT 5 · 左手与双手
  // ============================================================
  {
    id: 'u5l1-left-hand',
    unit: 5,
    order: 21,
    title: '左手五指位',
    subtitle: '镜像的另一半',
    hue: 340,
    steps: [
      {
        heading: '左手是右手的镜像',
        body: '左手五指位：5 指（小指）放 C3——比中央 C 低一个八度，然后 4 指 D3、3 指 E3、2 指 F3、1 指（拇指）G3。方向和右手正好相反。',
        diagram: 'bothhands',
      },
      {
        heading: '在低音谱表上',
        body: '左手的音记在低音谱表（𝄢）：C3 在第 2 间，D3 在第 3 线……同样是从地标出发、线间交替往上数。',
      },
      {
        heading: '左手的"使命"',
        body: '左手大多弹伴奏：低音、和弦、节拍。它不需要像右手那样灵活跑动，但需要稳——像建筑的地基，像乐队里的贝斯手。',
      },
      {
        heading: '力量控制',
        body: '左手低音天生比右手高音"显响"，稍用力就盖过旋律。练习时有意把左手弹轻一点，给右手旋律留空间。',
      },
    ],
    task: {
      prompt: '左手五指位：用 5-4-3-2-1 指依次弹 C3 D3 E3 F3 G3',
      targets: [48, 50, 52, 53, 55],
      mode: 'sequence',
      hint: '电脑键盘：Z X C V B 正好对应 C3-G3',
    },
  },
  {
    id: 'u5l2-both-hands',
    unit: 5,
    order: 22,
    title: '双手认识',
    subtitle: '两条平行铁轨',
    hue: 330,
    steps: [
      {
        heading: '相隔八度的两只手',
        body: '右手五指位在 C4-G4，左手在 C3-G3——相隔一个八度，各自负责自己的音区，像两条平行铁轨：互不干扰，一起向前。',
        diagram: 'bothhands',
      },
      {
        heading: '最难的是"同时启动"',
        body: '单手弹琴是"单线程"，双手是"双线程"。大脑要同时发两条指令——一开始会"打架"，所有人都一样，慢练就过去了。',
      },
      {
        heading: '对齐手腕和肩膀',
        body: '双手上琴后检查：两个手腕同样平、肩膀没耸、身体没有向一边歪。姿势一歪，一只手就会不自觉用力过猛。',
      },
      {
        heading: '分-合-分-合练法',
        body: '标准流程：先分手各自练熟 → 合手慢速 → 暴露问题再分手 → 再合手。永远不要一上来就合手硬磕。',
      },
    ],
    task: {
      prompt: '双手齐奏：同时按下 C4（右手 1 指）和 C3（左手 5 指）',
      targets: [48, 60],
      mode: 'all',
      hint: '两个音同时处于按下状态才算完成；电脑键盘：A + Z',
    },
  },
  {
    id: 'u5l3-unison',
    unit: 5,
    order: 23,
    title: '齐奏入门',
    subtitle: '第一次用双手弹曲子',
    hue: 320,
    steps: [
      {
        heading: '最简单的双手形态',
        body: '双手合奏从"齐奏"开始：左右手弹同一个音（相隔八度）、同时起落。它练的是"同步"——双手配合里最基础也最重要的一环。',
        diagram: 'bothhands',
      },
      {
        heading: '感受八度和声',
        body: '八度齐奏的声音厚实、饱满，比单手有分量得多。听一听：这就是交响乐里"全奏"的基本原理。',
      },
      {
        heading: '音量平衡',
        body: '左手低音容易盖过右手。齐奏时主动"偏袒"右手：左手六成力、右手八成力，让高八度的旋律浮在上面。',
      },
      {
        heading: '今天的曲子',
        body: '《双手齐奏入门》就是五指位的上下行，左右手镜像同弹。用等待式，一个音一个音地校准"同时性"。',
      },
    ],
    practiceSongId: 'hands-unison',
    practiceNote: '课后练习「双手齐奏入门」：等待式，听每一次起落是否完全同步。',
  },
  {
    id: 'u5l4-c-chord',
    unit: 5,
    order: 24,
    title: 'C 和弦',
    subtitle: '三个音同时响',
    hue: 350,
    steps: [
      {
        heading: '和弦是什么',
        body: '三个或更多的音同时弹响，就是和弦。它是"纵向"的音乐——旋律是线条，和弦是色块。',
      },
      {
        heading: 'C 大三和弦',
        body: 'C 和弦 = C + E + G（1、3、5 指）。它在谱面上是三个叠在一起的音，在键盘上是"隔一个白键按一个"——C 跳过 D 按 E，跳过 F 按 G。',
        diagram: 'chord',
      },
      {
        heading: '同时下键',
        body: '和弦的三个音必须同时出声：三根手指像一块板一样整体落下，不能"滚"着按。手腕放松，用整只手的重量带下去。',
      },
      {
        heading: '听一听',
        body: 'C 大三和弦的色彩是明亮、安定的。按住它 2 拍，听三个音融在一起的声音——这就是"和声"。',
      },
    ],
    task: {
      prompt: '按出 C 和弦：C + E + G 三个音同时按住（1-3-5 指）',
      targets: [60, 64, 67],
      mode: 'all',
      hint: '三个音同时处于按下状态；电脑键盘：A + D + G',
    },
    practiceSongId: 'chord-c',
    practiceNote: '课后练习「C 和弦练习」：反复按 C 和弦，追求三音齐响、整齐干净。',
  },
  {
    id: 'u5l5-chord-prog',
    unit: 5,
    order: 25,
    title: '和弦进行',
    subtitle: 'C - F - G - C 环游',
    hue: 0,
    steps: [
      {
        heading: 'F 和弦与 G 和弦',
        body: 'F 和弦 = F + A + C（在五指位里是 4-2-1 指的"转位"），G 和弦 = G + B + D。加上 C 和弦，三个和弦就能给上千首流行歌伴奏。',
        diagram: 'chordprog',
      },
      {
        heading: '换和弦的秘诀',
        body: '和弦之间不要"跳"，要"滑"：提前想好下一个和弦的指型，前一个和弦一松手，整只手平移过去。眼睛看手，不看谱。',
      },
      {
        heading: 'C - F - G - C',
        body: '这个进行叫"终止式"：从家（C）出发，到 F 探个险，到 G 制造紧张，最后回 C 落地。听 G→C 那一下"解决"的感觉——和声的魔力。',
        diagram: 'chordprog',
      },
      {
        heading: '三个和弦的色彩',
        body: 'C 明亮安定、F 温暖开阔、G 紧张期待。弹今天的练习曲时，有意识地听每次换和弦带来的情绪变化。',
      },
    ],
    quiz: {
      question: 'G 大三和弦由哪三个音构成？',
      options: ['G - B - D', 'G - C - E', 'G - D - F', 'A - C - E'],
      answer: 0,
      explain: '大三和弦 = 根音 + 三度 + 五度。G 往上数：G、B、D。',
    },
    practiceSongId: 'chord-prog',
    practiceNote: '课后练习「和弦进行 · C-F-G-C」：慢速，换和弦时追求无缝衔接。',
  },
  {
    id: 'u5l6-hands-melody',
    unit: 5,
    order: 26,
    title: '双手练习曲',
    subtitle: '旋律 + 伴奏的立体声',
    hue: 310,
    steps: [
      {
        heading: '分工明确了',
        body: '这首曲子里，右手弹旋律、左手弹低音根音——这才是钢琴的"完全体"：一只手唱歌，一只手打地基。',
        diagram: 'bothhands',
      },
      {
        heading: '左手先记位置',
        body: '左手只有三个音来回走：C3、F3、G3，每个按 2 拍。先把左手单独弹 3 遍，让手记住"往哪挪"，再合手。',
      },
      {
        heading: '合手：对齐拍点',
        body: '双手不同时下键的地方，先找"谁和谁对齐"：左手换音时右手在弹哪个音？把对齐点一个个标出来，合手就是把这些点串起来。',
      },
      {
        heading: '毕业展望 🎉',
        body: '完成这一课，你已经掌握：认键、读谱、节奏、右手旋律、左手低音、和弦——钢琴入门的全部地基。接下来去「导入乐谱」，把任何喜欢的曲子变成你的练习曲吧！',
      },
    ],
    practiceSongId: 'hands-melody',
    practiceNote: '毕业作业「双手练习曲」：分手各 3 遍 → 合手慢速，享受立体声。',
  },
]
