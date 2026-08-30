
import { GameState, GameEvent, SubjectKey, SUBJECT_NAMES, OIStats, Phase } from '../types';
import { modifySub, modifyOI, getEffectiveEfficiency, getLearningMultiplier } from './utils';
import { STATUSES } from './mechanics';
import { CHAINED_EVENTS } from './event_defs';
import oiEventsData from '../oi_events.json';

const parsedOiEvents: GameEvent[] = (oiEventsData as any[]).map(e => ({
    id: e.id,
    title: e.title,
    description: e.description,
    type: e.type,
    triggerType: e.triggerType || 'RANDOM',
    choices: e.choices.map((c: any) => ({
        text: c.text,
        action: (s: GameState) => {
            const nextGen = { ...s.general };
            let bonusOI: Partial<OIStats> = {};
            if (c.effect) {
                if (c.effect.efficiency) nextGen.efficiency = Math.min(100, Math.max(0, nextGen.efficiency + c.effect.efficiency));
                if (c.effect.health) nextGen.health = Math.min(100, Math.max(0, nextGen.health + c.effect.health));
                if (c.effect.mindset) nextGen.mindset = Math.min(100, Math.max(0, nextGen.mindset + c.effect.mindset));
                if (c.effect.experience) nextGen.experience = Math.min(999, Math.max(0, nextGen.experience + c.effect.experience));
                if (c.effect.luck) nextGen.luck = Math.min(100, Math.max(0, nextGen.luck + c.effect.luck));
                if (c.effect.money) nextGen.money = nextGen.money + c.effect.money; // Allow negative (debt system)
                if (c.effect.romance) nextGen.romance = Math.min(100, Math.max(0, nextGen.romance + c.effect.romance));
                
                if (c.effect.oi_dp) bonusOI.dp = c.effect.oi_dp;
                if (c.effect.oi_ds) bonusOI.ds = c.effect.oi_ds;
                if (c.effect.oi_graph) bonusOI.graph = c.effect.oi_graph;
                if (c.effect.oi_string) bonusOI.string = c.effect.oi_string;
                if (c.effect.oi_math) bonusOI.math = c.effect.oi_math;
                if (c.effect.oi_misc) bonusOI.misc = c.effect.oi_misc;
            }
            return {
                general: nextGen,
                oiStats: modifyOI(s, bonusOI),
                log: c.resultDescription ? [...s.log, { message: c.resultDescription, type: 'info', timestamp: Date.now() }] : s.log
            };
        }
    }))
}));

export const generateOIRandomEvent = (state: GameState): GameEvent => {
    const phaseAliases: Record<Phase, string[]> = {
        [Phase.SUMMER]: ['SUMMER'],
        [Phase.WINTER_BREAK]: ['WINTER'],
        [Phase.SUMMER_BREAK]: ['SUMMER'],
        [Phase.SEMESTER_1]: ['SEMESTER_1'],
        [Phase.SEMESTER_2]: ['SEMESTER_2'],
        [Phase.CSP_EXAM]: ['CSP_EXAM'],
        [Phase.NOIP_EXAM]: ['NOIP_EXAM'],
        [Phase.MIDTERM_EXAM]: ['MIDTERM_EXAM'],
        [Phase.INIT]: [], [Phase.MILITARY]: [], [Phase.SELECTION]: [],
        [Phase.PLACEMENT_EXAM]: [], [Phase.SUBJECT_RESELECTION]: [], [Phase.FINAL_EXAM]: [],
        [Phase.MIDTERM_EXAM_2]: [], [Phase.FINAL_EXAM_2]: [], [Phase.ENDING]: [], [Phase.WITHDRAWAL]: [],
        [Phase.WC_EXAM]: ['WC_EXAM'], [Phase.PROVINCIAL_EXAM]: ['PROVINCIAL_EXAM'],
        [Phase.APIO_EXAM]: ['APIO_EXAM'], [Phase.NOI_EXAM]: ['NOI_EXAM']
    };
    const allowedPhases = phaseAliases[state.phase] || [];
    const matchesPhase = (raw: any) => !raw.phase || allowedPhases.includes(String(raw.phase));
    const matchesRating = (raw: any) => {
        const currentRating = state.oiStats.rating || 0;
        return (!raw.cfRatingMin || currentRating >= raw.cfRatingMin) && (!raw.cfRatingMax || currentRating <= raw.cfRatingMax);
    };
    const pool = parsedOiEvents.filter(e => {
        const raw = oiEventsData.find((d: any) => d.id === e.id) as any;
        return !!raw && matchesPhase(raw) && matchesRating(raw);
    });
    if (pool.length > 0) {
        return pool[Math.floor(Math.random() * pool.length)];
    }
    const phasePool = parsedOiEvents.filter(e => {
        const raw = oiEventsData.find((d: any) => d.id === e.id) as any;
        return !!raw && matchesPhase(raw);
    });
    if (phasePool.length > 0) return phasePool[Math.floor(Math.random() * phasePool.length)];
    return parsedOiEvents[0];
};

export const hasOIRandomEventsForPhase = (phase: Phase): boolean => {
    const rawPhase = phase === Phase.WINTER_BREAK ? 'WINTER' : phase === Phase.SUMMER_BREAK ? 'SUMMER' : phase;
    return (oiEventsData as any[]).some(event => !event.phase || event.phase === rawPhase);
};



export const generateStudyEvent = (state: GameState): GameEvent => {
    const pool: SubjectKey[] = state.selectedSubjects.length > 0 
        ? ['chinese', 'math', 'english', ...state.selectedSubjects]
        : (Object.keys(SUBJECT_NAMES) as SubjectKey[]);

    const subject = pool[Math.floor(Math.random() * pool.length)];
    const subName = SUBJECT_NAMES[subject];
    const efficiency = getEffectiveEfficiency(state);
    const learningMultiplier = getLearningMultiplier(state);

    return {
        id: `study_weekly_${Date.now()}`,
        title: `${subName}课的抉择`,
        description: `这节是${subName}课，老师讲的内容似乎有点催眠，或者...有点太难了？`,
        type: 'neutral',
        choices: [
            { 
                text: '认真听讲',
                tags: ['study'],
                action: (s) => ({ 
                    subjects: modifySub(s, [subject], (1 + efficiency * 0.05) * learningMultiplier),
                    general: { ...s.general, mindset: s.general.mindset - 2 }
                }) 
            },
            { 
                text: '偷偷刷题',
                tags: ['study', 'risky'],
                action: (s) => ({ 
                    subjects: modifySub(s, [subject], (2 + efficiency * 0.05) * learningMultiplier),
                    general: { ...s.general, health: s.general.health - 3 }
                }) 
            },
            { 
                text: '睡觉',
                tags: ['sleep', 'rest'],
                action: (s) => {
                    // Luck affects if you get caught sleeping
                    const caughtChance = Math.max(0, 0.4 - s.general.luck / 200); 
                    if (Math.random() < caughtChance) {
                        return {
                            general: { ...s.general, mindset: s.general.mindset - 5, romance: s.general.romance - 2 },
                            log: [...s.log, { message: "补觉被老师发现了！当众被点名...", type: 'warning', timestamp: Date.now() }]
                        };
                    }
                    return { 
                        general: { ...s.general, health: s.general.health + 5, mindset: s.general.mindset + 2, efficiency: s.general.efficiency + 1 },
                        subjects: modifySub(s, [subject], -1), 
                        sleepCount: (s.sleepCount || 0) + 1,
                        log: [...s.log, { message: "运气不错，老师没发现你睡着了。", type: 'success', timestamp: Date.now() }]
                    };
                } 
            }
        ]
    };
};

export const generateRandomFlavorEvent = (state: GameState): GameEvent => {
    // --- High Luck Event (Req Luck >= 80, 5% Chance) ---
    // Reduced probability from 10% to 5% to balance event distribution
    if (state.general.luck >= 80 && Math.random() < 0.05) {
        return {
            id: `evt_lucky_moment_${Date.now()}`,
            title: '欧皇时刻',
            description: '今天你的运势简直好到爆棚！',
            type: 'positive',
            choices: [
                { 
                    text: '食堂阿姨的手抖', 
                    action: (s) => ({ 
                        general: { ...s.general, health: s.general.health + 5, money: s.general.money + 5 },
                        log: [...s.log, { message: "阿姨给你多打了一勺肉，还没收钱！", type: 'success', timestamp: Date.now() }]
                    }) 
                },
                { 
                    text: '捡到钱了', 
                    action: (s) => ({ 
                        general: { ...s.general, money: s.general.money + 50, luck: s.general.luck - 2 },
                        log: [...s.log, { message: "捡到了50块钱！运气稍微消耗了一点。", type: 'success', timestamp: Date.now() }]
                    }) 
                },
                { 
                    text: '老师的表扬', 
                    action: (s) => ({ 
                        general: { ...s.general, mindset: s.general.mindset + 5, experience: s.general.experience + 2 },
                        log: [...s.log, { message: "老师当众表扬了你的作业。", type: 'success', timestamp: Date.now() }]
                    }) 
                }
            ]
        };
    }

    // --- Low Luck Event (Req Luck <= 20, 5% Chance) ---
    if (state.general.luck <= 20 && Math.random() < 0.05) {
        return {
            id: `evt_bad_luck_${Date.now()}`,
            title: '水逆时刻',
            description: '今天诸事不顺，喝凉水都塞牙...',
            type: 'negative',
            choices: [
                { 
                    text: '平地摔', 
                    action: (s) => ({ 
                        general: { ...s.general, health: s.general.health - 5, mindset: s.general.mindset - 5 },
                        log: [...s.log, { message: "在众目睽睽之下摔了一跤，社死...", type: 'error', timestamp: Date.now() }]
                    }) 
                },
                { 
                    text: '被老师点名', 
                    action: (s) => ({ 
                        general: { ...s.general, mindset: s.general.mindset - 8 },
                        log: [...s.log, { message: "刚好这就是你不会的题...", type: 'error', timestamp: Date.now() }]
                    }) 
                }
            ]
        };
    }

    if (state.romancePartner && Math.random() < 0.25) { 
        const dateLocations = ['西单', '北海公园', '电影院', '图书馆', '什刹海'];
        const loc = dateLocations[Math.floor(Math.random() * dateLocations.length)];
        return {
            id: `evt_date_${Date.now()}`,
            title: '甜蜜约会',
            description: `周末到了，${state.romancePartner}约你去${loc}逛逛。`,
            type: 'positive',
            choices: [
                { 
                    text: '欣然前往', 
                    action: (st) => ({ 
                        general: { ...st.general, money: st.general.money - 30, romance: st.general.romance + 3, mindset: st.general.mindset + 5 },
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
                {
                    text: '熬夜写完',
                    tags: ['study', 'risky'],
                    action: (st) => ({
                        general: { ...st.general, health: st.general.health - 15, efficiency: st.general.efficiency - 2 },
                        subjects: modifySub(st, ['math', 'english'], 3)
                    })
                },
                { 
                    text: '抄作业',
                    tags: ['risky'],
                    action: (st) => {
                        // Luck affects chance of getting caught
                        const caughtChance = Math.max(0, 0.5 - st.general.luck / 200);
                        if (Math.random() < caughtChance) {
                             return { 
                                 general: { ...st.general, mindset: st.general.mindset - 10, luck: st.general.luck - 2 },
                                 log: [...st.log, { message: "抄作业被发现了！这运气也是没谁了。", type: 'error', timestamp: Date.now() }]
                             };
                        }
                        return {
                            general: { ...st.general, experience: st.general.experience + 5, luck: st.general.luck - 2 },
                            flags: { ...st.flags, copied_homework: true, copied_homework_week: st.week },
                            log: [...st.log, { message: "侥幸过关。", type: 'info', timestamp: Date.now() }]
                        };
                    } 
                }
            ]
        }),
        (s) => ({
            id: 'evt_snow',
            title: '瑞雪兆丰年',
            description: '外面下雪了，操场上一片白茫茫。',
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
                    text: '趴着休息', 
                    action: (st) => ({ 
                        general: { ...st.general, health: st.general.health + 3 }, 
                        sleepCount: (st.sleepCount || 0) + 1 
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
            description: '几个要好的同学提议周末去西单聚餐。',
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
        }),
        (s) => ({
            id: 'evt_homework_service',
            title: '代写作业',
            description: '隔壁班的同学想花钱找人代写数学作业。',
            type: 'neutral',
            choices: [
                {
                    text: '接单 (+20金钱)',
                    action: (st) => {
                         // Luck affects risk
                         const caught = Math.random() < (0.4 - st.general.luck / 300);
                         if (caught) {
                             return {
                                 general: { ...st.general, mindset: st.general.mindset - 10, efficiency: st.general.efficiency - 2 },
                                 log: [...st.log, { message: "惨！被老师发现了，钱没挣到还挨了顿骂。", type: 'error', timestamp: Date.now() }]
                             }
                         }
                         return { general: { ...st.general, money: st.general.money + 20, efficiency: st.general.efficiency - 1 } }
                    }
                },
                { text: '严词拒绝', action: (st) => ({ general: { ...st.general, mindset: st.general.mindset + 2 } }) }
            ]
        }),
        (s) => ({
            id: 'evt_help_card',
            title: '忘带饭卡',
            description: '排队打饭时，前面的同学发现忘带饭卡了，正尴尬地四处张望。',
            type: 'neutral',
            choices: [
                {
                    text: '帮刷一下',
                    action: (st) => ({
                        general: { ...st.general, money: st.general.money + 10, romance: st.general.romance + 1 },
                        log: [...st.log, { message: "同学非常感激，转了你红包还多给了点。", type: 'success', timestamp: Date.now() }]
                    })
                },
                { text: '假装没看见', action: (st) => ({ general: { ...st.general, experience: st.general.experience + 1 } }) }
            ]
        })
    ];

    const picker = events[Math.floor(Math.random() * events.length)];
    return { ...picker(state), id: `flavor_${Date.now()}` };
};

export const generateSummerLifeEvent = (state: GameState): GameEvent => {
    const leisureEvent: GameEvent = {
        id: `sum_leisure_${Date.now()}`,
        title: '暑期休闲时光',
        description: '（并非）漫长的暑假，除了学习，适当的放松也是必要的。今天你打算做什么？',
        type: 'positive',
        choices: [
            {
                text: '刷B站',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 5, efficiency: s.general.efficiency - 2 },
                    log: [...s.log, { message: "在B站刷了一下午视频，心情舒畅，但感觉脑子变慢了。", type: 'info', timestamp: Date.now() }]
                })
            },
            {
                text: '【数据删除】，启动！',
                action: (s) => {
                    // Luck heavily influences gacha
                    const baseRate = 0.05 + s.general.luck / 200; 
                    const isLucky = Math.random() < baseRate;
                    return {
                        general: { ...s.general, mindset: s.general.mindset + (isLucky ? 8 : 1), money: s.general.money - 30, luck: s.general.luck + (isLucky ? 5 : 1) },
                        log: [...s.log, { message: isLucky ? "十连双金！运气爆棚！" : "吃满大保底...非酋流泪。", type: isLucky ? 'success' : 'info', timestamp: Date.now() }]
                    }
                }
            },
            {
                text: '玩Minecraft ',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 5 },
                    log: [...s.log, { message: "你还记得，曾经陪你一起玩的朋友们吗？", type: 'success', timestamp: Date.now() }]
                })
            },
            {
                text: '为什么玩 Minecraft ，不如Minesweeper！！！！',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 5},
                })
            },
            {
                text: '预习新学期内容',
                action: (s) => ({
                    subjects: modifySub(s, ['math', 'physics', 'chemistry'], 2),
                    general: { ...s.general, mindset: s.general.mindset - 2, efficiency: s.general.efficiency + 1 },
                    log: [...s.log, { message: "好难啊啊啊啊。", type: 'info', timestamp: Date.now() }]
                })
            }
        ]
    };

    const studyEvents: GameEvent[] = [
        {
            id: 'sum_library_encounter',
            title: '上图书馆！',
            description: '一大早去图书馆，发现门口已经排起了长龙。',
            type: 'neutral',
            choices: [
                {
                    text: '死磕数学物理',
                    action: (s) => {
                        const luckySeat = Math.random() < 0.5 + s.general.luck / 500;
                        if(luckySeat) {
                            return {
                                subjects: modifySub(s, ['math', 'physics'], 6),
                                general: { ...s.general, efficiency: s.general.efficiency + 2 },
                                log: [...s.log, { message: "抢到了靠窗的好位置，效率倍增！", type: 'success', timestamp: Date.now() }]
                            }
                        } else {
                            return {
                                subjects: modifySub(s, ['math', 'physics'], 3),
                                general: { ...s.general, health: s.general.health - 2 },
                                log: [...s.log, { message: "只抢到了角落的位置，光线不太好。", type: 'info', timestamp: Date.now() }]
                            }
                        }
                    }
                },
                {
                    text: '这本小说好好看！',
                    action: (s) => ({
                        general: { ...s.general, mindset: s.general.mindset + 4, experience: s.general.experience + 3 }
                    })
                }
            ]
        },
        {
            id: 'sum_online_course',
            title: '这是啥？',
            description: '家长给你报了一个（据说很贵）的线上衔接班，据说主讲老师是【数据删除】的名师。',
            type: 'neutral',
            choices: [
                {
                    text: '认真听讲 ',
                    action: (s) => ({
                        general: { ...s.general,  efficiency: s.general.efficiency + 3 },
                        subjects: modifySub(s, ['math', 'physics', 'chemistry', 'english'], 4),
                        log: [...s.log, { message: "名师果然有一套，你感觉任督二脉被打通了。", type: 'success', timestamp: Date.now() }]
                    })
                },
                {
                    text: '挂机玩手机',
                    action: (s) => ({
                        general: { ...s.general, mindset: s.general.mindset + 5,efficiency: s.general.efficiency -1 },
                        log: [...s.log, { message: "好好玩。", type: 'warning', timestamp: Date.now() }]
                    })
                }
            ]
        },
        {
            id: 'sum_mistakes_review',
            title: '整理初中错题本',
            description: '翻开积灰的错题本，你决定在高中开始前彻底消灭知识盲区。',
            type: 'positive',
            choices: [
                {
                    text: '温故而知新',
                    action: (s) => ({
                        subjects: modifySub(s, ['math', 'physics', 'chemistry'], 3),
                        general: { ...s.general, efficiency: s.general.efficiency + 2 },
                        log: [...s.log, { message: "基础夯实了，你对分班考试更有信心了。", type: 'success', timestamp: Date.now() }]
                    })
                }
            ]
        }
    ];

    if (Math.random() < 0.5) return leisureEvent;
    return studyEvents[Math.floor(Math.random() * studyEvents.length)];
};

export const generateOIEvent = (state: GameState): GameEvent => {
    return generateOIRandomEvent(state);
};
