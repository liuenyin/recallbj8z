
import { Phase, GameEvent, SubjectKey, GameState, Achievement, GameStatus, SUBJECT_NAMES, Difficulty, GeneralStats } from './types';

const modifySub = (s: GameState, keys: SubjectKey[], val: number) => {
  const newSubs = { ...s.subjects };
  keys.forEach(k => {
    newSubs[k] = { ...newSubs[k], level: Math.max(0, newSubs[k].level + val) };
  });
  return newSubs;
};

// --- Configs ---

export const CHANGELOG_DATA = [
    { version: 'v1.1.2', date: '2026-1-2', content: ['修复了【争吵】事件文案显示错误的问题','修改了排名计算方式','上调了普通难度的难度'] },
    { version: 'v1.1.1', date: '2026-1-2', content: ['优化普通难度体验，更容易考入实验班', '增加约会多样性与情感危机事件', '优化考试结算交互', '事件结束后自动继续游戏'] },
    { version: 'v1.1.0', date: '2026-1-2', content: ['新增难度选择系统', '现实难度增加初始Debuff机制', '成就系统仅在【现实】难度开放'] },
    { version: 'v1.0.0', date: '2026-1-1', content: ['八中重开模拟器正式发布'] }
];

export const DIFFICULTY_PRESETS: Record<Exclude<Difficulty, 'CUSTOM'>, { label: string, desc: string, stats: GeneralStats, color: string }> = {
    'NORMAL': {
        label: '普通',
        desc: '体验相对轻松的高中生活。(属性大幅提升，更易获得高分)',
        color: 'bg-emerald-500',
        stats: {
            mindset: 65, // Buffed
            experience: 20,
            luck: 55,
            romance: 40,
            health: 100,
            money: 150,
            efficiency: 20 // Buffed significantly
        }
    },
    'HARD': {
        label: '困难',
        desc: '资源紧张，压力较大。',
        color: 'bg-orange-500',
        stats: {
            mindset: 40,
            experience: 10,
            luck: 40,
            romance: 10,
            health: 70,
            money: 50,
            efficiency: 10
        }
    },
    'REALITY': {
        label: '现实',
        desc: '这就是真实的人生。只有在此模式下可解锁成就。',
        color: 'bg-rose-600',
        stats: {
            mindset: 30,
            experience: 0,
            luck: 30,
            romance: 5,
            health: 60,
            money: 20,
            efficiency: 8
        }
    }
};

// --- Definitions ---

export const ACHIEVEMENTS: Record<string, Achievement> = {
    'first_blood': { id: 'first_blood', title: '初入八中', description: '成功开始你的高中生活。', icon: 'fa-school', rarity: 'common' },
    'nerd': { id: 'nerd', title: '卷王', description: '单科成绩达到满分。', icon: 'fa-book-reader', rarity: 'rare' },
    'romance_master': { id: 'romance_master', title: '海王', description: '魅力值达到95以上。', icon: 'fa-heart', rarity: 'legendary' },
    'oi_god': { id: 'oi_god', title: '???', description: '获得五大竞赛省一。', icon: 'fa-code', rarity: 'legendary' },
    'survival': { id: 'survival', title: '极限生存', description: '在健康低于10的情况下完成一个学期。', icon: 'fa-notes-medical', rarity: 'rare' },
    'rich': { id: 'rich', title: '小金库', description: '持有金钱超过200。', icon: 'fa-coins', rarity: 'common' },
    'in_debt': { id: 'in_debt', title: '负债累累', description: '负债超过100。', icon: 'fa-file-invoice-dollar', rarity: 'common' },
    'top_rank': { id: 'top_rank', title: '一览众山小', description: '在大型考试中获得年级第一。', icon: 'fa-crown', rarity: 'legendary' },
    'bottom_rank': { id: 'bottom_rank', title: '旷世奇才', description: '在大型考试中获得年级倒数第一。', icon: 'fa-poop', rarity: 'rare' },
};

export const STATUSES: Record<string, Omit<GameStatus, 'duration'>> = {
    'focused': { id: 'focused', name: '心流', description: '你进入了极度专注的状态。', type: 'BUFF', icon: 'fa-bolt', effectDescription: '全学科效率大幅提升' },
    'anxious': { id: 'anxious', name: '焦虑', description: '对未来的担忧让你无法平静。', type: 'DEBUFF', icon: 'fa-cloud-rain', effectDescription: '每回合心态 -2' },
    'crush': { id: 'crush', name: '暗恋', description: '那个人的身影总是在脑海挥之不去。', type: 'NEUTRAL', icon: 'fa-heart', effectDescription: '智力 -10%，魅力 +10%' },
    'in_love': { id: 'in_love', name: '恋爱', description: '酸臭味弥漫在空气中。', type: 'BUFF', icon: 'fa-heartbeat', effectDescription: '每周心态 +5' },
    'exhausted': { id: 'exhausted', name: '透支', description: '你需要休息。', type: 'DEBUFF', icon: 'fa-bed', effectDescription: '健康无法自然恢复' },
    'debt': { id: 'debt', name: '负债', description: '身无分文甚至欠了外债，这让你非常焦虑。', type: 'DEBUFF', icon: 'fa-file-invoice-dollar', effectDescription: '每周心态 -5，魅力 -3' },
    'crush_pending': { id: 'crush_pending', name: '恋人未满', description: '虽然还没捅破窗户纸，但这种暧昧的感觉真好。', type: 'BUFF', icon: 'fa-comments', effectDescription: '每周运气 +2，经验 +2' }
};

// --- Helper to Generate Dynamic Events ---

export const generateStudyEvent = (state: GameState): GameEvent => {
    // Pick a random subject from selected or main subjects
    const pool: SubjectKey[] = ['chinese', 'math', 'english', ...state.selectedSubjects];
    const subject = pool[Math.floor(Math.random() * pool.length)];
    const subName = SUBJECT_NAMES[subject];

    return {
        id: `study_weekly_${Date.now()}`,
        title: `${subName}课的抉择`,
        description: `这节是${subName}课，老师讲的内容似乎有点催眠，或者...有点太难了？`,
        type: 'neutral',
        choices: [
            { 
                text: '认真听讲', 
                action: (s) => ({ 
                    subjects: modifySub(s, [subject], 2 + s.general.efficiency * 0.1),
                    general: { ...s.general, mindset: s.general.mindset - 1 }
                }) 
            },
            { 
                text: '偷偷刷题', 
                action: (s) => ({ 
                    subjects: modifySub(s, [subject], 4 + s.general.efficiency * 0.1),
                    general: { ...s.general, health: s.general.health - 2 }
                }) 
            },
            { 
                text: '补觉', 
                action: (s) => ({ 
                    general: { ...s.general, health: s.general.health + 5, mindset: s.general.mindset + 2, efficiency: s.general.efficiency + 1 },
                    subjects: modifySub(s, [subject], -1) // Penalty for sleeping
                }) 
            }
        ]
    };
};

export const generateRandomFlavorEvent = (state: GameState): GameEvent => {
    // --- Dynamic Date Event (If Partner Exists) ---
    if (state.romancePartner && Math.random() < 0.25) { // 25% chance if partner exists
        const dateLocations = ['西单', '北海公园', '电影院', '国家图书馆', '什刹海'];
        const loc = dateLocations[Math.floor(Math.random() * dateLocations.length)];
        return {
            id: `evt_date_${Date.now()}`,
            title: '甜蜜约会',
            description: `周末到了，${state.romancePartner}约你去${loc}逛逛。`,
            type: 'positive',
            choices: [
                { 
                    text: '欣然前往 (-30金钱)', 
                    action: (st) => ({ 
                        general: { ...st.general, money: st.general.money - 30, romance: st.general.romance + 5, mindset: st.general.mindset + 10 },
                        activeStatuses: [...st.activeStatuses, { ...STATUSES['in_love'], duration: 2 }]
                    }) 
                },
                { 
                    text: '我要学习', 
                    action: (st) => ({ 
                        general: { ...st.general, mindset: st.general.mindset - 5, romance: st.general.romance - 5 } 
                    }) 
                }
            ]
        };
    }

    const events: ((s: GameState) => GameEvent)[] = [
        (s) => ({
            id: 'evt_rain',
            title: '突如其来的雨',
            description: '放学时，天空突然下起了倾盆大雨。',
            type: 'neutral',
            choices: [
                ...(s.romancePartner ? [{
                    text: `和${s.romancePartner}共撑一把伞`,
                    action: (st: GameState) => ({
                        general: { ...st.general, romance: st.general.romance + 5, mindset: st.general.mindset + 10 },
                        activeStatuses: [...st.activeStatuses, { ...STATUSES['in_love'], duration: 2 }]
                    })
                }] : []),
                { text: '冒雨跑回去', action: (st) => ({ general: { ...st.general, health: st.general.health - 10, mindset: st.general.mindset - 5 } }) },
                { text: '在便利店买把伞', action: (st) => ({ general: { ...st.general, money: st.general.money - 20 } }) }
            ]
        }),
        (s) => ({
            id: 'evt_homework',
            title: '作业如山',
            description: '今天的作业量异常的大，各科老师仿佛商量好了一样。',
            type: 'negative',
            choices: [
                { text: '熬夜写完', action: (st) => ({ general: { ...st.general, health: st.general.health - 15, efficiency: st.general.efficiency - 2 }, subjects: modifySub(st, ['math', 'english'], 3) }) },
                { text: '抄作业', action: (st) => ({ general: { ...st.general, experience: st.general.experience + 5, luck: st.general.luck - 5 } }) } // Luck penalty
            ]
        }),
        (s) => ({
            id: 'evt_lost_card',
            title: '饭卡去哪了',
            description: '中午去食堂打饭时，你摸遍了口袋也没找到饭卡。',
            type: 'negative',
            choices: [
                { text: '借同学的刷', action: (st) => ({ general: { ...st.general, romance: st.general.romance + 2, money: st.general.money - 15 } }) },
                { text: '补办一张', action: (st) => ({ general: { ...st.general, money: st.general.money - 50, mindset: st.general.mindset - 5 } }) }
            ]
        }),
        (s) => ({
            id: 'evt_snow',
            title: '瑞雪兆丰年',
            description: '北京下雪了，操场上一片白茫茫。',
            type: 'positive',
            choices: [
                 ...(s.romancePartner ? [{
                    text: `和${s.romancePartner}在雪中漫步`,
                    action: (st: GameState) => ({
                        general: { ...st.general, romance: st.general.romance + 10, mindset: st.general.mindset + 15 },
                        activeStatuses: [...st.activeStatuses, { ...STATUSES['in_love'], duration: 3 }]
                    })
                }] : []),
                { text: '打雪仗！', action: (st) => ({ general: { ...st.general, health: st.general.health + 5, mindset: st.general.mindset + 10 } }) },
                { text: '太冷了，回班', action: (st) => ({ general: { ...st.general, health: st.general.health - 2 } }) }
            ]
        }),
        (s) => ({
            id: 'evt_break_time',
            title: '难得的休息',
            description: '有一节自习课，老师还没来。你打算怎么打发时间？',
            type: 'neutral',
            choices: [
                { 
                    text: '刷B站', 
                    action: (st) => ({ 
                        general: { ...st.general, mindset: st.general.mindset + 5, efficiency: st.general.efficiency - 1 } 
                    }) 
                },
                { 
                    text: '启动崩坏：星穹铁道', 
                    action: (st) => ({ 
                        general: { ...st.general, mindset: st.general.mindset + 8, money: st.general.money - 5, efficiency: st.general.efficiency - 2 },
                        log: [...st.log, { message: "你为了抽卡充了个小月卡...", type: 'info', timestamp: Date.now() }]
                    }) 
                },
                { 
                    text: '和周围同学聊天', 
                    action: (st) => ({ 
                        general: { ...st.general, romance: st.general.romance + 3, experience: st.general.experience + 2 } 
                    }) 
                }
            ]
        }),
        (s) => ({
            id: 'evt_dinner',
            title: '周末聚餐',
            description: '几个要好的同学提议周末去西单大悦城聚餐。',
            type: 'positive',
            choices: [
                { 
                    text: 'AA制走起 (-30金钱)', 
                    action: (st) => ({ 
                        general: { ...st.general, money: st.general.money - 30, mindset: st.general.mindset + 10, romance: st.general.romance + 5 } 
                    }) 
                },
                { 
                    text: '囊中羞涩，不去了', 
                    action: (st) => ({ 
                        general: { ...st.general, mindset: st.general.mindset - 2 } 
                    }) 
                }
            ]
        })
    ];

    const picker = events[Math.floor(Math.random() * events.length)];
    return { ...picker(state), id: `flavor_${Date.now()}` };
};

// --- Fixed Special Events ---

export const SCIENCE_FESTIVAL_EVENT: GameEvent = {
    id: 'fixed_science_fest',
    title: '第N届科技节',
    description: '八中一年一度的科技节开始了，地下篮球场摆满了各个社团的展位，还有精彩的FTC机器人表演。',
    type: 'positive',
    fixedWeek: 15,
    fixedPhase: Phase.SEMESTER_1,
    choices: [
        { text: '去看看机器人？', action: (s) => ({ subjects: modifySub(s, ['physics', 'math'], 5), general: { ...s.general, experience: s.general.experience + 10 } }) },
        { text: '在各个摊位闲逛', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 10, efficiency: s.general.efficiency + 5 } }) },
        { text: '躲在教室自习', action: (s) => ({ subjects: modifySub(s, ['math', 'english'], 3), general: { ...s.general, mindset: s.general.mindset - 5 } }) }
    ]
};

export const NEW_YEAR_GALA_EVENT: GameEvent = {
    id: 'fixed_new_year_gala',
    title: '元旦联欢 & 致美音乐会',
    description: '新年的钟声即将敲响，学校举办了盛大的联欢活动。你想怎么度过？',
    type: 'positive',
    fixedWeek: 19,
    fixedPhase: Phase.SEMESTER_1,
    choices: [
        { 
            text: '去逛逛？', 
            action: (s) => ({ general: { ...s.general, romance: s.general.romance + 20, experience: s.general.experience + 15 } }) 
        },
        { 
            text: '在班里看电影吃零食', 
            action: (s) => ({ general: { ...s.general, health: s.general.health + 5, mindset: s.general.mindset + 10 } }) 
        }
    ]
};

// --- Events ---

export const CHAINED_EVENTS: Record<string, GameEvent> = {
    'sum_confess_success': {
        id: 'sum_confess_success',
        title: '表白成功',
        description: '对方竟然答应了！你们约定在高中互相鼓励，共同进步。',
        type: 'positive',
        choices: [{ text: '太棒了', action: (s) => ({ 
            general: { ...s.general, mindset: s.general.mindset + 20, romance: s.general.romance + 20 }, 
            romancePartner: 'TA',
            activeStatuses: [...s.activeStatuses, { ...STATUSES['in_love'], duration: 10 }] 
        }) }]
    },
    'sum_confess_fail': {
        id: 'sum_confess_fail',
        title: '被发好人卡',
        description: '“你是个好人，但我现在只想好好学习。”',
        type: 'negative',
        choices: [{ text: '心碎满地', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 20 } }) }]
    },
    'sum_gaming_caught': {
        id: 'sum_gaming_caught',
        title: '被抓包',
        description: '你的房门突然被推开，父母一脸怒容地看着还在发光的屏幕。“几点了还在玩？！”',
        type: 'negative',
        choices: [{ text: '挨骂', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 15 }, isGrounded: true }) }]
    },
    'mil_star_performance': {
        id: 'mil_star_performance',
        title: '军训标兵',
        description: '教官在全连队面前表扬了你。',
        type: 'positive',
        choices: [{ text: '倍感光荣', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 10, experience: s.general.experience + 5 } }) }]
    }
};

export const BASE_EVENTS: Record<string, GameEvent> = {
  'sick': {
    id: 'sick',
    title: '身心俱疲',
    description: '你靠在课桌上，感觉世界在旋转。医生建议你立即回家休养。',
    type: 'negative',
    choices: [{ 
        text: '撑不住了', 
        action: (s) => ({ 
            isSick: true, 
            general: { ...s.general, mindset: s.general.mindset - 5, health: s.general.health - 5 } 
        }) 
    }]
  },
  'debt_collection': {
      id: 'debt_collection',
      title: '催债上门',
      description: '“那个...上次借你的钱能不能还我？” 你的朋友看起来很为难，但你的钱包比脸还干净。',
      type: 'negative',
      choices: [
          { 
              text: '厚着脸皮拖延', 
              action: (s) => ({ 
                  general: { ...s.general, mindset: s.general.mindset - 10, romance: s.general.romance - 5 },
                  log: [...s.log, { message: "你失去了朋友的信任。", type: 'error', timestamp: Date.now() }]
              }) 
          },
          { 
              text: '找家里要钱填坑', 
              action: (s) => ({ 
                  general: { ...s.general, money: s.general.money + 200, mindset: s.general.mindset - 20 },
                  activeStatuses: [...s.activeStatuses, { ...STATUSES['anxious'], duration: 3 }],
                  log: [...s.log, { message: "被家里狠狠骂了一顿，但债务解决了。", type: 'warning', timestamp: Date.now() }]
              }) 
          }
      ]
  },
  'exam_fail_talk': {
      id: 'exam_fail_talk',
      title: '班主任的凝视',
      description: '“看看你这门课的分数。”班主任把成绩单拍在桌子上，“连及格线都不到。你是来八中度假的吗？”',
      type: 'negative',
      choices: [
          { 
              text: '痛定思痛', 
              action: (s) => ({ 
                  general: { ...s.general, mindset: s.general.mindset - 10, efficiency: s.general.efficiency + 3 },
                  activeStatuses: [...s.activeStatuses, { ...STATUSES['anxious'], duration: 2 }] 
              }) 
          },
          { 
              text: '低头认错', 
              action: (s) => ({ 
                  general: { ...s.general, mindset: s.general.mindset - 5 } 
              }) 
          }
      ]
  }
};

export const PHASE_EVENTS: Record<string, GameEvent[]> = {
  [Phase.SUMMER]: [
    {
        id: 'sum_goal_selection',
        title: '暑假的抉择',
        description: '在正式开始高中生活前，你需要决定这五周的主攻方向。',
        type: 'neutral',
        once: true,
        triggerType: 'FIXED',
        fixedWeek: 1,
        choices: [
            { 
              text: '信息竞赛(OI)', 
              action: (s) => ({ 
                competition: 'OI', 
                log: [...s.log, { message: "你选择了信息竞赛(OI)。注意：这条线会丧失很多普通事件", type: 'warning', timestamp: Date.now() }],
                general: { ...s.general, experience: s.general.experience + 10 } 
              }) 
            },
            {
              text: '数学竞赛 (MO) 【暂未完成】',
              action: (s) => ({
                competition: 'MO',
                log: [...s.log, { message: "你选择了数学竞赛(MO)。(该路线暂未制作，将体验普通文化课生活)", type: 'info', timestamp: Date.now() }],
                general: { ...s.general, experience: s.general.experience + 5 }
              })
            },
             {
              text: '物理竞赛 (PhO) 【我也没打过不知道啥情况】',
              action: (s) => ({
                competition: 'PhO',
                log: [...s.log, { message: "你选择了物理竞赛(PhO)。(该路线暂未制作，将体验普通文化课生活)", type: 'info', timestamp: Date.now() }],
                general: { ...s.general, experience: s.general.experience + 5 }
              })
            },
             {
              text: '化学竞赛 (ChO) 【我也没打过不知道啥情况】',
              action: (s) => ({
                competition: 'ChO',
                log: [...s.log, { message: "你选择了化学竞赛(ChO)。(该路线暂未制作，将体验普通文化课生活)", type: 'info', timestamp: Date.now() }],
                general: { ...s.general, experience: s.general.experience + 5 }
              })
            },
            { 
              text: '专注课内综合', 
              action: (s) => ({ 
                competition: 'None', 
                general: { ...s.general, efficiency: s.general.efficiency + 2 } 
              }) 
            }
        ]
    },
    // --- New Summer Subject Courses ---
    {
        id: 'sum_math_bridge',
        title: '暑期数学衔接班',
        description: '老师正在讲授高一函数的预备知识，这对于高中数学至关重要。',
        type: 'neutral',
        choices: [
            { text: '全神贯注', action: (s) => ({ subjects: modifySub(s, ['math'], 8), general: { ...s.general, mindset: s.general.mindset - 3 } }) },
            { text: '随便听听', action: (s) => ({ subjects: modifySub(s, ['math'], 2), general: { ...s.general, mindset: s.general.mindset + 2 } }) }
        ]
    },
    {
        id: 'sum_english_camp',
        title: '英语集训',
        description: '为了适应高中的词汇量，你参加了为期一周的英语集训。',
        type: 'neutral',
        choices: [
            { text: '狂背单词', action: (s) => ({ subjects: modifySub(s, ['english'], 8), general: { ...s.general, health: s.general.health - 2 } }) },
            { text: '看美剧练习', action: (s) => ({ subjects: modifySub(s, ['english'], 4), general: { ...s.general, mindset: s.general.mindset + 5 } }) }
        ]
    },
    {
        id: 'sum_physics_intro',
        title: '物理前沿讲座',
        description: '你被拉去听一场科普讲座。',
        type: 'positive',
        choices: [
            { text: '这也太酷了', action: (s) => ({ subjects: modifySub(s, ['physics'], 6), general: { ...s.general, experience: s.general.experience + 5 } }) },
            { text: '这讲的是啥啊。', action: (s) => ({ general: { ...s.general, health: s.general.health + 3 } }) }
        ]
    },
    // ---------------------------------
    {
        id: 'sum_oi_basics',
        title: '机房的初见',
        description: '你第一次踏进八中的机房，这里的设备，呃，能用。',
        condition: (s) => s.competition === 'OI',
        type: 'positive',
        once: true,
        triggerType: 'CONDITIONAL',
        choices: [{ text: '开始配置环境', action: (s) => ({ general: { ...s.general, experience: s.general.experience + 5 }, subjects: modifySub(s, ['math'], 2) }) }]
    },
    {
        id: 'sum_summer_camp',
        title: '夏令营的邀请',
        description: '你收到了一封夏令营的邮件。',
        type: 'positive',
        once: true,
        choices: [
            { text: '报名参加 (-10金钱)', action: (s) => ({ general: { ...s.general, experience: s.general.experience + 15, money: s.general.money - 10 } }) },
            { text: '太贵了', action: (s) => ({ general: { ...s.general, money: s.general.money + 5 } }) }
        ]
    },
    {
        id: 'sum_reunion',
        title: '初中聚会',
        description: '曾经的同学们聚在一起，有人欢喜有人愁。你看到了那个熟悉的身影。',
        type: 'neutral',
        once: true,
        choices: [
            { 
                text: '趁机表白！', 
                action: (s) => {
                    const success = Math.random() < 0.4;
                    return { chainedEvent: success ? CHAINED_EVENTS['sum_confess_success'] : CHAINED_EVENTS['sum_confess_fail'] };
                }
            },
            { text: '畅谈理想', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 10 } }) },
            { text: '默默干饭', action: (s) => ({ general: { ...s.general, health: s.general.health + 5 } }) }
        ]
    },
    {
        id: 'sum_family_trip',
        title: '家庭出游',
        description: '父母计划去郊区玩两天，放松一下中考后的神经。',
        type: 'positive',
        choices: [
            { text: '欣然前往', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 15, romance: s.general.romance + 5 } }) },
            { text: '在家宅着', action: (s) => ({ subjects: modifySub(s, ['english'], 3), general: { ...s.general, efficiency: s.general.efficiency + 1 } }) },
            { text: '带书去读', action: (s) => ({ subjects: modifySub(s, ['chinese', 'history'], 4), general: { ...s.general, mindset: s.general.mindset - 5 } }) }
        ]
    }
  ],
  [Phase.MILITARY]: [
    {
        id: 'mil_blanket',
        title: '叠军被',
        description: '教官要求把被子叠成“豆腐块”。你看着软趴趴的被子发愁。',
        type: 'neutral',
        choices: [
            { 
                text: '精益求精', 
                action: (s) => {
                    const perfect = Math.random() < 0.5;
                    if (perfect) return { chainedEvent: CHAINED_EVENTS['mil_star_performance'] };
                    return { general: { ...s.general, efficiency: s.general.efficiency + 3, mindset: s.general.mindset - 5 } };
                }
            },
            { text: '差不多得了', action: (s) => ({ general: { ...s.general, efficiency: s.general.efficiency - 1, mindset: s.general.mindset + 5 } }) },
            { text: '请教室友', action: (s) => ({ general: { ...s.general, romance: s.general.romance + 3, experience: s.general.experience + 2 } }) }
        ]
    },
    {
        id: 'mil_night_talk',
        title: '深夜卧谈',
        description: '熄灯了，但是大家都睡不着，开始聊起了天。',
        type: 'positive',
        choices: [
            { text: '聊理想', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5, experience: s.general.experience + 5 } }) },
            { text: '聊八卦', action: (s) => ({ general: { ...s.general, romance: s.general.romance + 5 } }) },
            { text: '赶紧睡觉', action: (s) => ({ general: { ...s.general, health: s.general.health + 5 } }) }
        ]
    }
  ],
  [Phase.SEMESTER_1]: [
    // --- New Conditional Events ---
    // Confession Opportunity (Repeated chance)
    {
        id: 'evt_confession_generic',
        title: '心动的信号',
        description: '在校园的走廊里，你又遇到了那个让你心动的人。今天的阳光正好，氛围也不错。',
        condition: (s) => !s.romancePartner && s.general.romance >= 20,
        triggerType: 'CONDITIONAL',
        type: 'positive',
        choices: [
            { 
                text: '勇敢表白！', 
                action: (s) => {
                    const success = Math.random() < (0.3 + (s.general.romance - 20) * 0.02 + (s.general.luck - 50) * 0.01);
                    return { chainedEvent: success ? CHAINED_EVENTS['sum_confess_success'] : CHAINED_EVENTS['sum_confess_fail'] };
                }
            },
            { text: '再等等...', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 2 } }) }
        ]
    },
    // First Date (Strictly once)
    {
        id: 'evt_first_date',
        title: '初次约会',
        description: '你们决定这周末去西单逛逛。这是你们确立关系后的第一次正式约会。',
        condition: (s) => !!s.romancePartner && s.general.romance > 30,
        triggerType: 'CONDITIONAL',
        once: true, // Happens once as "First" date
        type: 'positive',
        choices: [
            { 
                text: '精心准备', 
                action: (s) => {
                    const success = Math.random() < 0.7; // High chance if stats are good (romance > 30 implied)
                    if (success) {
                        return {
                            general: { ...s.general, mindset: s.general.mindset + 25, romance: s.general.romance + 15, money: s.general.money - 40 },
                            activeStatuses: [...s.activeStatuses, { ...STATUSES['in_love'], duration: 8 }],
                            log: [...s.log, { message: "约会非常完美！你们的关系更进一步。", type: 'success', timestamp: Date.now() }]
                        };
                    } else {
                        return {
                            general: { ...s.general, mindset: s.general.mindset - 10, money: s.general.money - 40 },
                             log: [...s.log, { message: "约会中出了一些小尴尬，不过没关系。", type: 'info', timestamp: Date.now() }]
                        };
                    }
                }
            }
        ]
    },
    // Conflict Event (Low Chance)
    {
        id: 'evt_fight',
        title: '争吵',
        // FIX: Use a function for dynamic description
        description: (s: GameState) => `你和${s.romancePartner || '父母'}发生了一些不愉快，气氛降到了冰点。`,
        condition: (s) => !!s.romancePartner || Math.random() < 0.5,
        triggerType: 'RANDOM',
        type: 'negative',
        choices: [
            { 
                text: '主动道歉', 
                action: (s) => ({ 
                    general: { ...s.general, mindset: s.general.mindset - 5, romance: s.general.romance + 2 },
                    log: [...s.log, { message: "退一步海阔天空。", type: 'info', timestamp: Date.now() }]
                }) 
            },
            { 
                text: '冷战', 
                action: (s) => ({ 
                    general: { ...s.general, mindset: s.general.mindset - 10, romance: s.general.romance - 5 },
                    activeStatuses: [...s.activeStatuses, { ...STATUSES['anxious'], duration: 2 }] 
                }) 
            }
        ]
    },
     // Betrayal Event (Rare, low romance, partner exists)
    {
        id: 'evt_betrayal',
        title: '背叛',
        description: '你发现TA最近总是躲着你回消息，直到你看到了不该看到的一幕。',
        condition: (s) => !!s.romancePartner && s.general.romance < 35,
        triggerType: 'RANDOM',
        once: true,
        type: 'negative',
        choices: [
            { 
                text: '分手！', 
                action: (s) => ({ 
                    romancePartner: null,
                    general: { ...s.general, mindset: s.general.mindset - 40, health: s.general.health - 10 },
                    activeStatuses: s.activeStatuses.filter(st => st.id !== 'in_love'),
                    log: [...s.log, { message: "这段感情画上了句号。", type: 'error', timestamp: Date.now() }]
                }) 
            }
        ]
    },
    // --- OI 竞赛支线 ---
    {
        id: 'oi_after_school',
        title: '课后加练',
        description: '你咋又去机房了？？？。',
        condition: (s) => s.competition === 'OI',
        type: 'neutral',
        triggerType: 'CONDITIONAL',
        choices: [
            { 
                text: '切一道难题', 
                action: (s) => ({ 
                    subjects: modifySub(s, ['math'], 10), 
                    general: { ...s.general, health: s.general.health - 8, experience: s.general.experience + 20 },
                    activeStatuses: Math.random() < 0.3 ? [...s.activeStatuses, { ...STATUSES['focused'], duration: 2 }] : s.activeStatuses
                }) 
            },
            { text: '整理学习笔记', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5, experience: s.general.experience + 10 } }) }
        ]
    },
    {
        id: 'oi_bug_hell',
        title: '调不出的Bug',
        description: '你的代码在本地跑得飞起，提交上去全是红色。你已经盯着屏幕两个小时了。',
        condition: (s) => s.competition === 'OI',
        type: 'negative',
        triggerType: 'RANDOM',
        choices: [
            { text: '再改一遍', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 15, experience: s.general.experience + 5, health: s.general.health - 5 } }) },
            { text: '求助学长', action: (s) => ({ general: { ...s.general, romance: s.general.romance + 5, experience: s.general.experience + 8 } }) }
        ]
    },
    {
        id: 'oi_mock_win',
        title: '模拟赛AK',
        description: '今天的校内模拟赛，你居然全场第一个AK（全部通过）。',
        condition: (s) => s.competition === 'OI',
        type: 'positive',
        triggerType: 'RANDOM',
        choices: [{ text: '信心爆棚', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 30, luck: s.general.luck + 10 } }) }]
    },
    {
        id: 'oi_temple_visit',
        title: '赛前迷信',
        description: 'CSP考试前，你打算换一个绿色的壁纸，甚至想去孔庙拜拜。',
        condition: (s) => s.competition === 'OI',
        once: true,
        type: 'neutral',
        triggerType: 'RANDOM',
        choices: [{ text: '求个好运', action: (s) => ({ general: { ...s.general, luck: s.general.luck + 15, money: s.general.money - 5 } }) }]
    },
    // --- 学习与生活 ---
    {
        id: 's1_library',
        title: '图书馆的宁静',
        description: '八中图书馆是寻找灵感的好地方。',
        type: 'positive',
        triggerType: 'RANDOM',
        choices: [{ text: '高效自修', action: (s) => ({ subjects: modifySub(s, ['chinese', 'english'], 3), general: { ...s.general, efficiency: s.general.efficiency + 1 } }) }]
    },
    {
        id: 's1_teacher_talk',
        title: '班主任的谈话',
        description: '班主任把你叫到办公室，询问最近的学习状态。',
        type: 'neutral',
        triggerType: 'RANDOM',
        choices: [
            { text: '虚心请教', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5, efficiency: s.general.efficiency + 2 } }) },
            { text: '沉默不语', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 5 } }) }
        ]
    }
  ]
};
