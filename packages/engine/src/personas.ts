export type PersonaArchetype =
  | "methodical"
  | "sharp"
  | "cautious"
  | "rhythmic"
  | "counter"
  | "intuitive"
  | "press"
  | "highroller"
  | "expressive"
  | "veteran";

export interface PersonaVoice {
  /** Routine betting lines. */
  betCalm: readonly string[];
  /** Betting while on a winning streak or feeling hot. */
  betHot: readonly string[];
  /** Betting after losses or a bust. */
  betCold: readonly string[];
  /** Betting when shoe count looks rich in high cards. */
  betRich: readonly string[];
  /** Betting near the end of the 12-round session. */
  betLate: readonly string[];
  /** Fast/easy stand (19-21). */
  playStrong: readonly string[];
  /** Easy low-card hit (<= 11). */
  playLow: readonly string[];
  /** Soft hand with Ace cushion. */
  playSoft: readonly string[];
  /** Dealer showing bust card (2-6) vs stiff hand. */
  playDealerWeak: readonly string[];
  /** Painful stiff hand vs strong dealer (15-16 vs 7-A). */
  playStiffHard: readonly string[];
  /** Second beat while tanking on a painful spot. */
  playStiffPivot: readonly string[];
  /** Considering double down. */
  playDoubleSpot: readonly string[];
  /** Considering splitting a pair. */
  playSplitSpot: readonly string[];
  /** Micro-reactions right after actions or on reveal. */
  reactBust: readonly string[];
  reactBlackjack: readonly string[];
  reactWin: readonly string[];
  reactDealerBust: readonly string[];
  reactBadBeat: readonly string[];
  reactDouble: readonly string[];
  reactSplit: readonly string[];
  reactHit21: readonly string[];
  reactSurrender: readonly string[];
}

export interface PlayStyle {
  archetype: PersonaArchetype;
  /** Short Chinese persona descriptor. */
  tagline: string;
  /** Extra chance to stand a stiff hand that basic strategy would hit. */
  foldBelow: number;
  /** Typical share of the legal bet range (0..1). */
  sizeBias: number;
  /** Random wobble so they don't play like a script. */
  mood: number;
  /** Extra chance to chicken out of a stiff hit / risky line. */
  scratch: number;
  /** Chance to take bold borderline lines (double / press / chase). */
  shove: number;
  /** Public Hi-Lo count reading accuracy (0..1). */
  countSkill: number;
  /** How strongly winning/losing streaks scale wagers (-0.3..1). */
  streakDrive: number;
  /** Tendency to chase losses / play looser when tilted (0..1). */
  tiltProne: number;
  /** Habit to repeat previous wager when nothing dramatic changed (0..1). */
  repeatHabit: number;
  /** How often the bot chimes in with a brief post-action/reveal reaction (0..1). */
  chattiness: number;
  /** Baseline hesitation scale for tough spots (ms). */
  thinkMin: number;
  thinkMax: number;
  /** Fallback lines. */
  thinkLines: readonly string[];
  voice: PersonaVoice;
}

export interface LlmPersona {
  id: string;
  name: string;
  initials: string;
  color: string;
  style: PlayStyle;
}

/** Table nicknames. `id` is an internal play-style key, not shown to players. */
export const LLM_PERSONAS: readonly LlmPersona[] = [
  {
    id: "claude",
    name: "Tibo",
    initials: "TB",
    color: "#B85D43",
    style: {
      archetype: "methodical",
      tagline: "稳健精算",
      foldBelow: -0.38,
      sizeBias: 0.22,
      mood: 0.04,
      scratch: 0.22,
      shove: 0.12,
      countSkill: 0.65,
      streakDrive: 0.25,
      tiltProne: 0.12,
      repeatHabit: 0.55,
      chattiness: 0.45,
      thinkMin: 5200,
      thinkMax: 9800,
      thinkLines: ["先算下赔率…", "这手别急", "稳一手吧", "小注试水"],
      voice: {
        betCalm: ["先稳着推一手", "照节奏来吧", "小试一把"],
        betHot: ["手气顺，微调加一点", "节奏不错，稍微加码"],
        betCold: ["收一收，先稳住", "缓一手再看"],
        betRich: ["小牌出得差不多了", "牌面有点偏大，加一点"],
        betLate: ["尾盘了，保一下筹码", "最后几手别冒进"],
        playStrong: ["这个点数够用了", "稳住，停牌"],
        playLow: ["点数小，补一张", "先要一张看看"],
        playSoft: ["有 A 兜底，空间不错", "软牌可以打得活一点"],
        playDealerWeak: ["庄家明牌弱，不抢着爆", "让庄家自己去补"],
        playStiffHard: ["这手点数最尴尬…", "对庄家大牌，赔率吃亏"],
        playStiffPivot: ["算了，按概率走吧", "忍一下，做个决断"],
        playDoubleSpot: ["这手胜率够，考虑加倍", "机会难得，加倍值"],
        playSplitSpot: ["对子拆开更合理", "分两手摊一下风险"],
        reactBust: ["还是补大了", "意料之中，下把来"],
        reactBlackjack: ["干净，黑杰克", "省心了"],
        reactWin: ["稳稳拿下", "按节奏走就行"],
        reactDealerBust: ["还好没手痒", "等庄家爆最省力"],
        reactBadBeat: ["这都能被翻，行吧", "20点都拦不住庄家"],
        reactDouble: ["这把加倍合算", "拉满这一手"],
        reactSplit: ["拆开打更舒服", "两手分开算"],
        reactHit21: ["补得刚刚好", "精准 21"],
        reactSurrender: ["止损一半，划算", "这手没必要硬拼"],
      },
    },
  },
  {
    id: "gpt",
    name: "Linus",
    initials: "LI",
    color: "#1B7A62",
    style: {
      archetype: "sharp",
      tagline: "纪律流",
      foldBelow: -0.4,
      sizeBias: 0.26,
      mood: 0.035,
      scratch: 0.16,
      shove: 0.16,
      countSkill: 0.8,
      streakDrive: 0.2,
      tiltProne: 0.08,
      repeatHabit: 0.6,
      chattiness: 0.4,
      thinkMin: 4800,
      thinkMax: 9200,
      thinkLines: ["算一下…", "按表走", "控制注码", "再核对一眼"],
      voice: {
        betCalm: ["标准注走起", "按计划下注", "保持注码"],
        betHot: ["顺风局，稍微上调", "节奏在线，加一点"],
        betCold: ["回撤控制，退回底注", "冷静，别追注"],
        betRich: ["真数偏正，提一档注", "高牌密度不错，推多点"],
        betLate: ["收官阶段，控好波动", "最后几手稳着打"],
        playStrong: ["不用想，直接停", "稳妥停牌"],
        playLow: ["必补牌", "拿一张"],
        playSoft: ["软牌不亏，继续", "A 当 11 还是 1 都好打"],
        playDealerWeak: ["庄家在爆牌区，停", "明牌偏弱，稳着来"],
        playStiffHard: ["边缘牌，看牌靴比例…", "16 对大牌，标准难题"],
        playStiffPivot: ["执行纪律吧", "决定了，不犹豫"],
        playDoubleSpot: ["正期望加倍点", "这手该加倍"],
        playSplitSpot: ["标准分牌位", "拆开期望更高"],
        reactBust: ["概率如此", "正常波动"],
        reactBlackjack: ["漂亮，黑杰克", "一赔二到位"],
        reactWin: ["稳", "拿下"],
        reactDealerBust: ["纪律奏效", "庄家自己交了"],
        reactBadBeat: ["这手牌运偏低", "可惜了这手牌"],
        reactDouble: ["标准加倍", "机会位，上"],
        reactSplit: ["拆成两手", "分牌处理"],
        reactHit21: ["刚好 21", "补到位了"],
        reactSurrender: ["保留一半更优", "理性弃牌"],
      },
    },
  },
  {
    id: "kimi",
    name: "Aqua",
    initials: "AQ",
    color: "#3B4D61",
    style: {
      archetype: "cautious",
      tagline: "避爆保守",
      foldBelow: -0.35,
      sizeBias: 0.18,
      mood: 0.04,
      scratch: 0.3,
      shove: 0.08,
      countSkill: 0.35,
      streakDrive: 0.15,
      tiltProne: 0.06,
      repeatHabit: 0.68,
      chattiness: 0.42,
      thinkMin: 5600,
      thinkMax: 10200,
      thinkLines: ["慢慢看…", "可别爆呀", "保守一点", "先停吧"],
      voice: {
        betCalm: ["小注慢慢玩", "稳妥一点好", "轻轻推一手"],
        betHot: ["赢了两把，还是稳着来", "见好就收，别太飘"],
        betCold: ["先缩回最小注", "避避风头"],
        betRich: ["大牌好像挺多的…", "稍微多放一点点"],
        betLate: ["快结算了，守住筹码", "稳稳收尾就行"],
        playStrong: ["太好了，直接停", "稳稳的，不要了"],
        playLow: ["还早呢，再摸一张", "安全，补一张"],
        playSoft: ["有 A 护体，不怕爆", "软牌还能再看看"],
        playDealerWeak: ["庄家牌小，我先停", "不敢贪，等庄家补"],
        playStiffHard: ["哎呀，再要好容易爆…", "这点数看着就心慌"],
        playStiffPivot: ["算了算了，稳字当头", "深呼吸，做决定"],
        playDoubleSpot: ["要不要加倍呢…有点犹豫", "牌挺好，试试看？"],
        playSplitSpot: ["对子啊，拆开是不是稳点", "分两手试试"],
        reactBust: ["呜，果然爆了…", "早知道停牌了"],
        reactBlackjack: ["哇，黑杰克！", "今天运气真不错"],
        reactWin: ["稳稳收下", "慢慢攒筹码"],
        reactDealerBust: ["太好了庄家爆了", "还好我忍住了"],
        reactBadBeat: ["啊？这样都能输…", "庄家也太准了吧"],
        reactDouble: ["难得加倍一次！", "鼓起勇气上"],
        reactSplit: ["小心拆成两手", "分牌慢慢打"],
        reactHit21: ["刚好 21，吓我一跳", "绝了，卡点 21"],
        reactSurrender: ["先退一步，留得青山在", "这把不硬扛"],
      },
    },
  },
  {
    id: "glm",
    name: "Alice",
    initials: "AL",
    color: "#2C63B8",
    style: {
      archetype: "rhythmic",
      tagline: "顺风节奏",
      foldBelow: -0.46,
      sizeBias: 0.36,
      mood: 0.05,
      scratch: 0.14,
      shove: 0.28,
      countSkill: 0.5,
      streakDrive: 0.72,
      tiltProne: 0.25,
      repeatHabit: 0.48,
      chattiness: 0.62,
      thinkMin: 4600,
      thinkMax: 8800,
      thinkLines: ["掂量一下", "看看节奏", "这把能打", "下多少合适呢"],
      voice: {
        betCalm: ["先走个中注看看", "这手感觉不错", "跟一手节奏"],
        betHot: ["手正热呢，多推点！", "连胜节奏，乘胜追击"],
        betCold: ["换个注码改改运", "退一步，调下节奏"],
        betRich: ["前面全小牌，这把多下点", "大牌该冒头了"],
        betLate: ["最后几局，冲一把！", "尾声了，看准再下"],
        playStrong: ["舒舒服服停牌", "这手稳了"],
        playLow: ["再来一张", "继续补"],
        playSoft: ["软牌不慌，看庄家", "有 A 撑着，好商量"],
        playDealerWeak: ["庄家明牌一般，等他爆", "这手没必要冒险"],
        playStiffHard: ["头大，进退两难啊", "这手有点考验胆量"],
        playStiffPivot: ["信自己一次", "好吧，就这么打"],
        playDoubleSpot: ["这手太适合加倍了", "顺手加个倍"],
        playSplitSpot: ["对子来了，拆开打", "两手一起博"],
        reactBust: ["手滑补大了", "哎呀，差一点"],
        reactBlackjack: ["黑杰克！节奏起飞", "漂亮，直接收米"],
        reactWin: ["节奏稳稳的", "顺手拿下"],
        reactDealerBust: ["庄家送分啦", "全场收米咯"],
        reactBadBeat: ["庄家这运气没谁了", "居然被反杀了"],
        reactDouble: ["加倍跟上！", "好机会不放过"],
        reactSplit: ["拆开两手打！", "好事成双"],
        reactHit21: ["哈哈，刚好 21！", "神来一笔"],
        reactSurrender: ["这局太难打，撤一半", "保存实力下把来"],
      },
    },
  },
  {
    id: "qwen",
    name: "Seth",
    initials: "SE",
    color: "#574FB8",
    style: {
      archetype: "counter",
      tagline: "记牌猎手",
      foldBelow: -0.48,
      sizeBias: 0.38,
      mood: 0.04,
      scratch: 0.1,
      shove: 0.34,
      countSkill: 0.95,
      streakDrive: 0.25,
      tiltProne: 0.1,
      repeatHabit: 0.42,
      chattiness: 0.5,
      thinkMin: 4500,
      thinkMax: 8600,
      thinkLines: ["看一眼牌靴", "算下余牌", "这口值得推", "别浪费好牌靴"],
      voice: {
        betCalm: ["牌靴还平，先跟底注", "等好牌靴，先潜伏"],
        betHot: ["节奏和牌靴都顺", "继续保持压制"],
        betCold: ["牌靴偏冷，缩回小注", "小牌太多，先苟一手"],
        betRich: ["牌靴热起来了，推大注", "高牌扎堆，这把上量"],
        betLate: ["余牌结构不错，收官一击", "看准最后几手"],
        playStrong: ["够大了，停", "收住"],
        playLow: ["先补", "拿牌"],
        playSoft: ["软牌看牌靴进退", "有 A 好调整"],
        playDealerWeak: ["庄家明牌吃亏，停牌等爆", "大牌多，庄家更容易爆"],
        playStiffHard: ["算下 10 点牌剩余密度…", "这手要看牌靴冷热"],
        playStiffPivot: ["高牌偏多，不敢乱补了", "按牌靴走，定了"],
        playDoubleSpot: ["高牌密，这手加倍太香", "加倍窗口到了"],
        playSplitSpot: ["这手分牌有优势", "拆开吃满价值"],
        reactBust: ["大牌刚好撞枪口", "牌靴真厚，认了"],
        reactBlackjack: ["早猜到有 10 和 A", "黑杰克，牌靴没骗我"],
        reactWin: ["读准了", "拿下这口"],
        reactDealerBust: ["高牌把庄家抬走了", "漂亮，正中下怀"],
        reactBadBeat: ["这也能抽到小牌补满…", "庄家神抽啊"],
        reactDouble: ["趁牌靴热，加倍！", "推满这一手"],
        reactSplit: ["两手吃庄家", "拆开压过去"],
        reactHit21: ["刚好卡死 21", "算得挺准"],
        reactSurrender: ["高牌太多，半注撤退", "明智止损"],
      },
    },
  },
  {
    id: "grok",
    name: "Nori",
    initials: "NO",
    color: "#2C3531",
    style: {
      archetype: "intuitive",
      tagline: "直觉气氛组",
      foldBelow: -0.54,
      sizeBias: 0.52,
      mood: 0.11,
      scratch: 0.09,
      shove: 0.56,
      countSkill: 0.2,
      streakDrive: 0.65,
      tiltProne: 0.6,
      repeatHabit: 0.3,
      chattiness: 0.72,
      thinkMin: 4000,
      thinkMax: 8200,
      thinkLines: ["有点意思", "第六感来了", "搏一把？", "玩的就是心跳"],
      voice: {
        betCalm: ["随便来一口", "看感觉推个注", "先热热场"],
        betHot: ["挡不住了，往上加！", "手感滚烫，继续冲"],
        betCold: ["不信邪，再来一把", "该触底反弹了吧"],
        betRich: ["直觉告诉我大牌要来", "气氛到位，多推点"],
        betLate: ["最后几把不冲干嘛", "压轴戏，下重一点"],
        playStrong: ["稳如老狗，停！", "这点数可以喝茶了"],
        playLow: ["闭眼要牌", "来张大的！"],
        playSoft: ["有 A 怕什么，浪起来", "软牌容错拉满"],
        playDealerWeak: ["庄家这牌悬，先看他表演", "坐等庄家自己炸"],
        playStiffHard: ["这手好刺激啊…", "爆还是赢，一念之间"],
        playStiffPivot: ["管他的，搏了！", "听一次直觉的"],
        playDoubleSpot: ["这不加倍说不过去吧", "来吧，双倍快乐"],
        playSplitSpot: ["对子必拆，两倍乐趣", "一手变两手，走起"],
        reactBust: ["哈哈哈，直接炸穿", "没事，节目效果拉满"],
        reactBlackjack: ["天胡黑杰克！", "直接收工，太爽了"],
        reactWin: ["轻松写意", "直觉从不骗人"],
        reactDealerBust: ["庄家先炸为敬！", "爽，躺赢"],
        reactBadBeat: ["不是吧，庄家开了？", "这都能输我服了"],
        reactDouble: ["加倍！心跳拉满", "一发入魂！"],
        reactSplit: ["拆！今天就要热闹", "两手全都要"],
        reactHit21: ["神抽 21！谁来谁服", "这手气没谁了"],
        reactSurrender: ["战略撤退，别笑", "先留一半下把翻"],
      },
    },
  },
  {
    id: "gemini",
    name: "Milo",
    initials: "MI",
    color: "#7358B5",
    style: {
      archetype: "press",
      tagline: "进攻压迫",
      foldBelow: -0.56,
      sizeBias: 0.62,
      mood: 0.055,
      scratch: 0.05,
      shove: 0.64,
      countSkill: 0.55,
      streakDrive: 0.8,
      tiltProne: 0.45,
      repeatHabit: 0.35,
      chattiness: 0.58,
      thinkMin: 3800,
      thinkMax: 7800,
      thinkLines: ["能打就打", "这把有空间", "多推一点", "拉满进攻"],
      voice: {
        betCalm: ["上来就给点压力", "别太保守，推一手", "直接上节奏"],
        betHot: ["连赢必须加码！", "顺风不推更待何时"],
        betCold: ["稳半步，随时反打", "小调一下，继续干"],
        betRich: ["牌面正合适，拉高注码", "好机会，直接加注"],
        betLate: ["最后冲刺，拉开差距", "尾盘发力"],
        playStrong: ["漂亮，直接锁定", "高点停牌"],
        playLow: ["果断要牌", "再来一张"],
        playSoft: ["软牌进攻窗口，别浪费", "有 A 直接压上去"],
        playDealerWeak: ["庄家难受了，稳稳收网", "压力给到庄家"],
        playStiffHard: ["顶着大牌硬打吗…", "这手要拼一下胆识"],
        playStiffPivot: ["进攻是最好的防守", "别怂，出手"],
        playDoubleSpot: ["绝佳加倍位！", "直接翻倍压上去"],
        playSplitSpot: ["果断分牌扩大战果", "拆开两线进攻"],
        reactBust: ["拼过火了，下把拿回来", "没事，节奏不能丢"],
        reactBlackjack: ["黑杰克！暴力美学", "直接起飞"],
        reactWin: ["进攻奏效", "漂亮拿下"],
        reactDealerBust: ["庄家扛不住了", "稳收这一波"],
        reactBadBeat: ["庄家这手太硬了", "差一口气，可惜"],
        reactDouble: ["加倍压死！", "这手看我的"],
        reactSplit: ["分牌双线开花", "两手一起压"],
        reactHit21: ["一击 21！", "漂亮，绝杀点数"],
        reactSurrender: ["这手太劣，先退半步", "留弹药打下一把"],
      },
    },
  },
  {
    id: "deepseek",
    name: "Vera",
    initials: "VE",
    color: "#224BB8",
    style: {
      archetype: "highroller",
      tagline: "大注猛将",
      foldBelow: -0.58,
      sizeBias: 0.72,
      mood: 0.045,
      scratch: 0.04,
      shove: 0.72,
      countSkill: 0.6,
      streakDrive: 0.65,
      tiltProne: 0.52,
      repeatHabit: 0.38,
      chattiness: 0.48,
      thinkMin: 3600,
      thinkMax: 7400,
      thinkLines: ["往里推", "筹码别闲着", "直接干", "跟到底"],
      voice: {
        betCalm: ["筹码不推白放着", "直接上主注", "爽快点，推大注"],
        betHot: ["手热直接顶满", "这波必须推满"],
        betCold: ["输一把算什么，继续压", "加一口拿回来"],
        betRich: ["大牌来了，满注上", "牌靴够肥，直接拉满"],
        betLate: ["最后几把，一锤定音", "收官必须上重注"],
        playStrong: ["够硬，停", "稳了"],
        playLow: ["补", "再来"],
        playSoft: ["软牌放开打", "有 A 随便要"],
        playDealerWeak: ["庄家悬，我停着看", "坐等庄家爆"],
        playStiffHard: ["这手硬骨头…", "退半步还是硬刚？"],
        playStiffPivot: ["不投降，拼一张", "硬着头皮上"],
        playDoubleSpot: ["直接加倍，不废话", "翻倍拿下"],
        playSplitSpot: ["拆开打大底池", "分牌，两手一起吃"],
        reactBust: ["爆了就爆了，下把推回来", "手大容易炸，正常"],
        reactBlackjack: ["黑杰克，翻倍收割", "痛快"],
        reactWin: ["大注吃肉", "痛快拿下"],
        reactDealerBust: ["大底池全收", "庄家送大礼"],
        reactBadBeat: ["庄家今天挺硬啊", "行，下把加倍奉还"],
        reactDouble: ["加倍！干脆点", "直接推上去"],
        reactSplit: ["分牌，底池做大", "两手一起上"],
        reactHit21: ["21点，漂亮", "这手值回票价"],
        reactSurrender: ["罕见撤一次", "留筹码打下局"],
      },
    },
  },
  {
    id: "minimax",
    name: "Juno",
    initials: "JU",
    color: "#A83E63",
    style: {
      archetype: "expressive",
      tagline: "灵动戏精",
      foldBelow: -0.55,
      sizeBias: 0.56,
      mood: 0.08,
      scratch: 0.08,
      shove: 0.54,
      countSkill: 0.3,
      streakDrive: 0.85,
      tiltProne: 0.62,
      repeatHabit: 0.32,
      chattiness: 0.78,
      thinkMin: 4000,
      thinkMax: 8000,
      thinkLines: ["冲一下", "感觉来了", "来个21点啊", "这手有戏"],
      voice: {
        betCalm: ["这把预感不错哟", "推一手试试水", "来点彩头"],
        betHot: ["哇手气停不下来，加注！", "今晚我是主角，多下点"],
        betCold: ["哎呀连黑了，先缓缓…", "拜托这把发手好牌"],
        betRich: ["感觉要出黑杰克了！", "大牌快到碗里来"],
        betLate: ["最后几把翻盘时刻！", "冲呀，就看这两手"],
        playStrong: ["安心停牌～", "哇这个点数很稳"],
        playLow: ["还小呢，继续发！", "再来一张好牌"],
        playSoft: ["有 A 真安心，再搏一下", "软牌好灵活呀"],
        playDealerWeak: ["庄家明牌好小，快爆快爆", "我不动，看庄家表演"],
        playStiffHard: ["天呐最怕这个点数…", "手心冒汗了喂"],
        playStiffPivot: ["闭眼赌一次！", "冲了，不管了！"],
        playDoubleSpot: ["哇塞好牌，必须加倍！", "翻倍翻倍！"],
        playSplitSpot: ["对子耶，拆开玩！", "两手都要赢！"],
        reactBust: ["啊！！差一点点就 21", "救命，又补爆了"],
        reactBlackjack: ["黑杰克！！太快乐了", "耶！一赔二到手"],
        reactWin: ["开心收筹码～", "嘿嘿，赢啦"],
        reactDealerBust: ["庄家爆啦，大家一起赢！", "耶，不用动手就赢"],
        reactBadBeat: ["不会吧！我 20 点都输…", "庄家你认真的吗"],
        reactDouble: ["加倍冲锋！", "给我来张 10！"],
        reactSplit: ["拆开两手，双倍快乐！", "分牌走起"],
        reactHit21: ["21 点！！尖叫！", "绝杀补牌！"],
        reactSurrender: ["打不过先溜一半～", "好汉不吃眼前亏"],
      },
    },
  },
  {
    id: "logan",
    name: "Logan",
    initials: "LG",
    color: "#7A5938",
    style: {
      archetype: "veteran",
      tagline: "老派冷面",
      foldBelow: -0.44,
      sizeBias: 0.42,
      mood: 0.04,
      scratch: 0.11,
      shove: 0.36,
      countSkill: 0.72,
      streakDrive: 0.45,
      tiltProne: 0.14,
      repeatHabit: 0.52,
      chattiness: 0.56,
      thinkMin: 4400,
      thinkMax: 8400,
      thinkLines: ["不急，看清再说", "老规矩走", "这手有点讲究", "稳住节奏"],
      voice: {
        betCalm: ["老规矩，先上一手", "不急，慢慢热桌", "推一手看看成色"],
        betHot: ["牌路顺了，加一档", "势头正好，别客气"],
        betCold: ["风头不对，先收一手", "牌背时少输就是赢"],
        betRich: ["小牌走空了，该加码", "大牌藏牌靴里呢，多推点"],
        betLate: ["最后几把，该收网了", "尾盘才见真章"],
        playStrong: ["够硬了，不动", "老老实实停牌"],
        playLow: ["还差得远，补", "来一张看看"],
        playSoft: ["有 A 垫底，进退自如", "软牌好周旋"],
        playDealerWeak: ["庄家露破绽了，稳住", "让庄家自己去扛"],
        playStiffHard: ["老难题了，掂量一下…", "这点数最磨人"],
        playStiffPivot: ["行，就这么办", "见多了，落子无悔"],
        playDoubleSpot: ["好局不常有，加倍", "这口该咬死"],
        playSplitSpot: ["拆开打，两头吃", "对子就得这么处理"],
        reactBust: ["老马也有失蹄时", "没事，下把找补"],
        reactBlackjack: ["干脆利落，黑杰克", "老手气还在"],
        reactWin: ["稳稳落袋", "姜还是老的辣"],
        reactDealerBust: ["果然，庄家扛不住", "坐着收筹码最舒服"],
        reactBadBeat: ["见多了，下一把", "庄家这手真硬"],
        reactDouble: ["机会到了，加倍", "这一手压下去"],
        reactSplit: ["拆开两手慢慢算", "分牌，两边通吃"],
        reactHit21: ["正好 21，手还没生", "卡点到位"],
        reactSurrender: ["留一半筹码，不吃亏", "识时务者为俊杰"],
      },
    },
  },
] as const;

export const DEFAULT_THINK_LINES = ["看牌…", "琢磨一下", "停还是要"] as const;

export function personaById(id: string): LlmPersona | undefined {
  return LLM_PERSONAS.find((p) => p.id === id);
}

export function styleForPersona(id: string | undefined): PlayStyle {
  return personaById(id ?? "")?.style ?? LLM_PERSONAS[3]!.style;
}
