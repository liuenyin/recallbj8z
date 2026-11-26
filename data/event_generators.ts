
import { GameState, GameEvent, SubjectKey, SUBJECT_NAMES, OIStats, Phase } from '../types';
import { modifySub, modifyOI, getEffectiveEfficiency } from './utils';
import { STATUSES } from './mechanics';
import { CHAINED_EVENTS } from './event_defs';
import { isWintryWeek } from './game_flow';
import { hasRomanticInterest } from './relationships';
import { getClassroomScene } from './classroom_scenes';
import oiEventsData from '../oi_events.json';

const parsedOiEvents: GameEvent[] = (oiEventsData as any[]).map(e => ({
    id: e.id,
    title: e.title,
    description: e.description,
    type: e.type,
    triggerType: e.triggerType === 'FIXED' || e.triggerType === 'CONDITIONAL' || e.triggerType === 'CHAINED' ? e.triggerType : 'RANDOM',
    choices: e.choices.map((c: any) => ({
        text: c.text,
        resultDescription: c.resultDescription,
        tags: Array.isArray(c.tags) ? c.tags : undefined,
        action: (s: GameState) => {
            const nextGen = { ...s.general };
            let bonusOI: Partial<OIStats> = {};
            if (c.effect) {
                if (c.effect.efficiency) nextGen.efficiency = Math.min(30, Math.max(0, nextGen.efficiency + c.effect.efficiency));
                if (c.effect.health) nextGen.health = Math.min(150, Math.max(0, nextGen.health + c.effect.health));
                if (c.effect.mindset) nextGen.mindset = Math.min(150, Math.max(0, nextGen.mindset + c.effect.mindset));
                if (c.effect.experience) nextGen.experience = Math.min(999, Math.max(0, nextGen.experience + c.effect.experience));
                if (c.effect.luck) nextGen.luck = Math.min(150, Math.max(0, nextGen.luck + c.effect.luck));
                if (c.effect.money) nextGen.money = nextGen.money + c.effect.money; // Allow negative (debt system)
                if (c.effect.romance) nextGen.romance = Math.min(150, Math.max(0, nextGen.romance + c.effect.romance));
                
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
    const currentRating = state.oiStats.rating ?? 1200;
    const matchesPhase = (raw: any) => !raw.phase || allowedPhases.includes(String(raw.phase));
    const matchesRating = (raw: any) => {
        return (raw.cfRatingMin === undefined || currentRating >= raw.cfRatingMin) && (raw.cfRatingMax === undefined || currentRating <= raw.cfRatingMax);
    };
    const pool = parsedOiEvents.filter(e => {
        const raw = oiEventsData.find((d: any) => d.id === e.id) as any;
        return !!raw && matchesPhase(raw) && matchesRating(raw);
    });
    if (pool.length > 0) {
        const freshPool = pool.filter(event => !state.recentEventIds.includes(event.id));
        const selectedPool = freshPool.length > 0 ? freshPool : pool;
        return selectedPool[Math.floor(Math.random() * selectedPool.length)];
    }
    const phasePool = parsedOiEvents.filter(e => {
        const raw = oiEventsData.find((d: any) => d.id === e.id) as any;
        return !!raw && matchesPhase(raw);
    });
    if (phasePool.length > 0) {
        // Ratings outside the authored bands should get the nearest band, not
        // an arbitrary beginner event. This keeps late-game progression
        // coherent even when the player exceeds the current data range.
        const distanceToBand = (event: GameEvent) => {
            const raw = oiEventsData.find((d: any) => d.id === event.id) as any;
            const min = typeof raw.cfRatingMin === 'number' ? raw.cfRatingMin : Number.NEGATIVE_INFINITY;
            const max = typeof raw.cfRatingMax === 'number' ? raw.cfRatingMax : Number.POSITIVE_INFINITY;
            return currentRating < min ? min - currentRating : currentRating > max ? currentRating - max : 0;
        };
        const nearestDistance = Math.min(...phasePool.map(distanceToBand));
        const nearest = phasePool.filter(event => distanceToBand(event) === nearestDistance);
        const freshNearest = nearest.filter(event => !state.recentEventIds.includes(event.id));
        const selectedNearest = freshNearest.length > 0 ? freshNearest : nearest;
        return selectedNearest[Math.floor(Math.random() * selectedNearest.length)];
    }
    return parsedOiEvents[0];
};

export const hasOIRandomEventsForPhase = (phase: Phase): boolean => {
    const rawPhase = phase === Phase.WINTER_BREAK ? 'WINTER' : phase === Phase.SUMMER_BREAK ? 'SUMMER' : phase;
    return (oiEventsData as any[]).some(event => !event.phase || event.phase === rawPhase);
};



export const generateStudyEvent = (state: GameState, queuedIds: readonly string[] = []): GameEvent => {
    const pool: SubjectKey[] = state.selectedSubjects.length > 0 
        ? ['chinese', 'math', 'english', ...state.selectedSubjects]
        : (Object.keys(SUBJECT_NAMES) as SubjectKey[]);

    const unqueuedSubjects = pool.filter(subject => !queuedIds.includes(`study_weekly_${subject}`));
    const availableSubjects = unqueuedSubjects.length ? unqueuedSubjects : pool;
    const freshSubjects = availableSubjects.filter(subject => !state.recentEventIds.includes(`study_weekly_${subject}`));
    const subjectPool = freshSubjects.length ? freshSubjects : availableSubjects;
    const subject = subjectPool[Math.floor(Math.random() * subjectPool.length)];
    const subName = SUBJECT_NAMES[subject];
    const efficiency = getEffectiveEfficiency(state);
    const isHoliday = state.phase === Phase.WINTER_BREAK || state.phase === Phase.SUMMER_BREAK;
    const distracted = !isHoliday && hasRomanticInterest(state);
    const scene = getClassroomScene(subject, state.phase, state.week);
    const groupLab = !isHoliday && (subject === 'chemistry' || (subject === 'biology' && state.phase === Phase.SEMESTER_1));

    return {
        id: `study_weekly_${subject}`,
        title: isHoliday ? `假期${subName}自习` : `${subName}课 · ${scene.topic}`,
        description: isHoliday
            ? `假期的${subName}专项计划摆在桌前，你是打算沉下心推进一章，还是先喘口气？`
            : scene.description,
        type: 'neutral',
        triggerType: 'RANDOM',
        choices: [
            { 
                text: isHoliday ? '系统整理一轮重点' : scene.choice,
                tags: ['study'],
                action: (s) => {
                    const lookedOver = distracted && Math.random() < 0.22;
                    const result = lookedOver ? scene.missed
                        : isHoliday ? '整理到最后，至少知道下一页该从哪里复习起。' : scene.result;
                    return {
                        subjects: modifySub(s, [subject], (1 + efficiency * 0.05) * (lookedOver ? 0.5 : 1)),
                        general: { ...s.general, mindset: s.general.mindset - 2 },
                        log: [...s.log, { message: result, type: 'event', timestamp: Date.now() }]
                    };
                }
            },
            ...(distracted ? [{
                text: '拿笔记和TA对一下',
                tags: ['social' as const],
                resultDescription: 'TA把刚才漏记的那一处指给你看。',
                action: (s: GameState) => ({ subjects: modifySub(s, [subject], 0.5), flags: { ...s.flags, ta_favorability: Number(s.flags.ta_favorability || 0) + 2 } })
            }] : []),
            {
                text: isHoliday ? '集中刷套卷' : groupLab ? '趁组员记录，做两道自己的题' : '偷偷刷题',
                resultDescription: isHoliday ? '做完一套卷子，纸角上攒了几道还值得回看的题。'
                    : groupLab ? '你多做了两题，抬头时小组已经在填下一栏了。' : '你多做了两页自己的题，抬头时老师已经讲到下一处了。',
                tags: ['study', 'risky'],
                action: (s) => ({ 
                    subjects: modifySub(s, [subject], 2 + efficiency * 0.05),
                    general: { ...s.general, health: s.general.health - 3 }
                }) 
            },
            { 
                text: isHoliday ? '先睡个回笼觉' : '睡觉',
                tags: ['sleep', 'rest'],
                action: (s) => {
                    const caughtChance = isHoliday ? 0 : Math.max(0, 0.4 - s.general.luck / 200); 
                    if (Math.random() < caughtChance) {
                        return {
                            general: { ...s.general, mindset: s.general.mindset - 5, romance: s.general.romance - 2 },
                            log: [...s.log, { message: "补觉被老师发现了！当众被点名...", type: 'warning', timestamp: Date.now() }]
                        };
                    }
                    return { 
                        general: { ...s.general, health: s.general.health + 5, mindset: s.general.mindset + 2, efficiency: s.general.efficiency + 1 },
                        subjects: modifySub(s, [subject], isHoliday ? 0 : -1), 
                        sleepCount: (s.sleepCount || 0) + 1,
                        log: [...s.log, { message: isHoliday ? "假期的回笼觉格外香甜。" : "运气不错，老师没发现你睡着了。", type: 'success', timestamp: Date.now() }]
                    };
                } 
            }
        ]
    };
};

export const generateRandomFlavorEvent = (state: GameState): GameEvent => {
    const isHoliday = state.phase === Phase.WINTER_BREAK || state.phase === Phase.SUMMER_BREAK;

    // --- High Luck Event (Req Luck >= 80, 5% Chance) ---
    // Reduced probability from 10% to 5% to balance event distribution
    if (!isHoliday && state.general.luck >= 80 && !state.recentEventIds.includes('evt_lucky_moment') && Math.random() < 0.05) {
        return {
            id: 'evt_lucky_moment',
            title: '欧皇时刻',
            description: '今天你的运势简直好到爆棚！',
            type: 'positive',
            triggerType: 'RANDOM',
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
    if (!isHoliday && state.general.luck <= 20 && !state.recentEventIds.includes('evt_bad_luck') && Math.random() < 0.05) {
        return {
            id: 'evt_bad_luck',
            title: '水逆时刻',
            description: '今天诸事不顺，喝凉水都塞牙...',
            type: 'negative',
            triggerType: 'RANDOM',
            choices: [
                { 
                    text: '平地摔', 
                    action: (s) => ({ 
                        general: { ...s.general, health: s.general.health - 5, mindset: s.general.mindset - 5 },
                        log: [...s.log, { message: '你在楼梯口摔了一跤，后面的同学停下来扶你。', type: 'error', timestamp: Date.now() }]
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

    const returningFromWinterBreak = state.phase === Phase.WINTER_BREAK && state.week === state.totalWeeksInPhase;
    const events: Record<string, (s: GameState) => GameEvent> = {
        flavor_0: (s) => ({
            id: 'evt_rain',
            title: '突如其来的雨',
            description: isHoliday ? '刚准备出门，天空突然下起了大雨。' : '放学时，天空突然下起了倾盆大雨。',
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
                { text: '在便利店买把伞（20 元）', action: (st) => ({ general: { ...st.general, money: st.general.money - 20 } }) }
            ]
        }),
        flavor_1: () => ({
            id: 'evt_homework',
            title: returningFromWinterBreak ? '开学前的两份作业' : '明早要交的作业',
            description: returningFromWinterBreak ? '寒假快结束了。你翻了一下开学要交的作业，还剩一张数学卷和一篇英语作文。' : '数学卷和英语作文都要明早交，你刚写完第一道大题。',
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
                    text: '先写会做的，留着没懂的题去问',
                    tags: ['study'],
                    resultDescription: '你把会做的题写完，在剩下几道题旁边贴了张便签。',
                    action: st => ({
                        subjects: modifySub(st, ['math', 'english'], 1),
                        general: { ...st.general, experience: st.general.experience + 2 }
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
                                 log: [...st.log, { message: '老师看见两份作业空了同一道题，让你们下课后留下。', type: 'error', timestamp: Date.now() }]
                             };
                        }
                        return {
                            general: { ...st.general, experience: st.general.experience + 5, luck: st.general.luck - 2 },
                            flags: { ...st.flags, copied_homework: true, copied_homework_week: st.week },
                            log: [...st.log, { message: '课代表收走了两份作业。', type: 'info', timestamp: Date.now() }]
                        };
                    } 
                }
            ]
        }),
        flavor_2: (s) => ({
            id: 'evt_snow',
            title: '下雪了',
            description: isHoliday ? '外面下雪了，楼下的空地白了一片。' : '外面下雪了，操场上一片白茫茫。',
            type: 'positive',
            choices: [
                 ...(s.romancePartner ? [{
                    text: `和${s.romancePartner}在雪中漫步`,
                    action: (st: GameState) => ({
                        general: { ...st.general, romance: st.general.romance + 10, mindset: st.general.mindset + 15 },
                        activeStatuses: [...st.activeStatuses, { ...STATUSES['in_love'], duration: 3 }]
                    })
                }] : []),
                 { text: '出去打雪仗', action: (st) => ({ general: { ...st.general, health: st.general.health + 5, mindset: st.general.mindset + 10 } }) },
                { text: isHoliday ? '太冷了，回屋' : '太冷了，回班', action: (st) => ({ general: { ...st.general, health: st.general.health - 2 } }) }
            ]
        }),
        flavor_3: () => ({
            id: 'evt_break_time',
            title: '难得的休息',
            description: isHoliday ? '午饭后，你看了一眼日历，下午没有别的安排。' : '自习课刚打铃，老师还没来。',
            type: 'neutral',
            choices: [
                { 
                    text: '刷B站', 
                    action: (st) => ({ 
                        general: { ...st.general, mindset: st.general.mindset + 5, efficiency: st.general.efficiency - 1 } 
                    }) 
                },
                { 
                    text: isHoliday ? '踏踏实实睡个午觉' : '趴着休息', 
                    action: (st) => ({ 
                        general: { ...st.general, health: st.general.health + 3 }, 
                        sleepCount: (st.sleepCount || 0) + 1 
                    }) 
                },
                { 
                    text: isHoliday ? '和同学线上连麦聊天' : '和周围同学聊天', 
                    action: (st) => ({ 
                        general: { ...st.general, romance: st.general.romance + 3, experience: st.general.experience + 2 } 
                    }) 
                }
            ]
        }),
        flavor_4: () => ({
            id: 'evt_dinner',
            title: '周末聚餐',
            description: '几个要好的同学提议周末去西单聚餐。',
            type: 'positive',
            choices: [
                { 
                    text: '一起去，平摊 30 元',
                    action: (st) => ({ 
                        general: { ...st.general, money: st.general.money - 30, mindset: st.general.mindset + 10, romance: st.general.romance + 5 } 
                    }) 
                },
                { 
                    text: '这次先不去',
                    action: (st) => ({ 
                        general: { ...st.general, mindset: st.general.mindset - 2 } 
                    }) 
                }
            ]
        }),
        flavor_6: () => ({
            id: 'evt_help_card',
            title: '忘带饭卡',
            description: '排队打饭时，前面的同学发现忘带饭卡了，正尴尬地四处张望。',
            type: 'neutral',
            choices: [
                {
                    text: '帮刷一下',
                    action: (st) => ({
                        general: { ...st.general, money: st.general.money + 10, romance: st.general.romance + 1 },
                        log: [...st.log, { message: '同学到教室后还了饭钱，多转了 10 元。', type: 'success', timestamp: Date.now() }]
                    })
                },
                { text: '假装没看见', action: (st) => ({ general: { ...st.general, experience: st.general.experience + 1 } }) }
            ]
        })
    };

    const eligibleEvents = Object.entries(events)
        .map(([id, buildEvent]) => ({ event: buildEvent(state), id }))
        .filter(({ event }) => (event.id !== 'evt_snow' || isWintryWeek(state))
            && (!isHoliday || event.id !== 'evt_help_card')
            && (event.id !== 'evt_homework' || !isHoliday || returningFromWinterBreak));
    const freshEvents = eligibleEvents.filter(({ id }) => !state.recentEventIds.includes(id));
    const pool = freshEvents.length ? freshEvents : eligibleEvents;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    return { ...picked.event, id: picked.id, triggerType: 'RANDOM' };
};

export const generateSummerLifeEvent = (state: GameState): GameEvent => {
    const leisureEvent: GameEvent = {
        id: 'sum_leisure',
        title: '暑期休闲时光',
        description: '你把练习册合上了。离晚饭还有两个小时。',
        type: 'positive',
        triggerType: 'RANDOM',
        choices: [
            {
                text: '刷B站',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 5, efficiency: s.general.efficiency - 2 },
                    log: [...s.log, { message: "在B站刷了一下午视频，心情舒畅，但感觉脑子变慢了。", type: 'info', timestamp: Date.now() }]
                })
            },
            {
                text: '抽一发二次元卡池（30 元）',
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
                text: '玩 Minecraft',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 5 },
                    log: [...s.log, { message: "你还记得，曾经陪你一起玩的朋友们吗？", type: 'success', timestamp: Date.now() }]
                })
            },
            {
                text: '挑战高难度扫雷',
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
            title: '暑期线上衔接课',
            description: '家长给你报了一个（据说很贵）的线上衔接班，主讲老师据说很有名。',
            type: 'neutral',
            choices: [
                {
                    text: '认真听讲 ',
                    action: (s) => ({
                        general: { ...s.general,  efficiency: s.general.efficiency + 3 },
                        subjects: modifySub(s, ['math', 'physics', 'chemistry', 'english'], 4),
                        log: [...s.log, { message: '老师讲完第二种解法，你回去照着做出了那道题。', type: 'success', timestamp: Date.now() }]
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

    const freshStudyEvents = studyEvents.filter(event => !state.recentEventIds.includes(event.id));
    if (Math.random() < 0.5 && !state.recentEventIds.includes(leisureEvent.id)) return leisureEvent;
    const selectedStudyEvents = freshStudyEvents.length > 0 ? freshStudyEvents : studyEvents;
    return { ...selectedStudyEvents[Math.floor(Math.random() * selectedStudyEvents.length)], triggerType: 'RANDOM' };
};

export const generateOIEvent = (state: GameState): GameEvent => {
    return generateOIRandomEvent(state);
};
