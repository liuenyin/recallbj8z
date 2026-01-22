
import { GameState, GameEvent, SubjectKey, SUBJECT_NAMES, OIStats, EventChoice, Phase } from '../types';
import { modifySub, modifyOI } from './utils';
import { STATUSES } from './mechanics';
import { CHAINED_EVENTS, SCIENCE_FESTIVAL_EVENT, NEW_YEAR_GALA_EVENT } from './event_defs';

export * from './event_defs';
export * from './event_generators';

// --- Challenge Mode Special Option ---
const CHALLENGE_SLEEP_CHOICE: EventChoice = {
    text: '不管了，我要睡觉',
    condition: (s) => s.activeChallengeId === 'c_sleep_king',
    action: (s) => ({
        hasSleptThisWeek: true,
        general: { ...s.general, health: s.general.health + 3, mindset: s.general.mindset + 1}, sleepCount: (s.sleepCount || 0) + 1 ,
        log: [...s.log, { message: "你无视了眼前发生的一切，找个地方睡了一觉。任务进度+1。", type: 'success', timestamp: Date.now() }]
    })
};

// Helper to inject the choice
const injectSleep = (events: GameEvent[]): GameEvent[] => {
    return events.map(e => {
        const hasSleep = e.choices?.some(c => c.text.includes('睡') || c.text.includes('梦'));
        if (hasSleep) return e;

        return {
            ...e,
            choices: [...(e.choices || []), CHALLENGE_SLEEP_CHOICE]
        };
    });
};

const SUMMER_EVENTS_RAW: GameEvent[] = [
    {
        id: 'sum_goal_selection',
        title: '暑假的抉择',
        description: '在正式开始高中生活前，你需要决定这漫长八周的主攻方向。',
        type: 'neutral',
        once: true,
        triggerType: 'FIXED',
        fixedWeek: 1,
        choices: [
            { 
                text: '信息竞赛(OI)', 
                action: (s) => ({ 
                competition: 'OI', 
                log: [...s.log, { message: "你选择了信息竞赛(OI)。注意：这条线会丧失很多普通事件，且周末自由时间减少", type: 'warning', timestamp: Date.now() }],
                general: { ...s.general, experience: s.general.experience + 10 },
                oiStats: { ...s.oiStats, misc: 5 }
                }) 
            },
            { 
                text: '专注课内综合', 
                action: (s) => ({ 
                competition: 'None', 
                general: { ...s.general, efficiency: s.general.efficiency + 2 } 
                }) 
            },
            {
                text: '什么玩意，先睡一觉再说',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 5, health: s.general.health + 5  }, sleepCount: (s.sleepCount || 0) + 1,
                    log: [...s.log, { message: "磨刀不误砍柴工，睡饱了才有力气学习。", type: 'success', timestamp: Date.now()}]
                })
            }
        ]
    },
    {
        id: 'sum_city_walk',
        title: '出去走走吧！',
        description: '去学校周边转转，顺便干点啥？',
        type: 'positive',
        triggerType: 'RANDOM', // Set as RANDOM
        choices: [
            { 
                text: '花几块钱买点吃的？', 
                action: (s) => ({ 
                    general: { ...s.general, money: s.general.money - 2, experience: s.general.experience + 2, romance: s.general.romance + 1 } 
                }) 
            },
                { 
                text: 'Citywalk', 
                action: (s) => {
                    const rand = Math.random();
                    if (rand < 0.2) return { general: { ...s.general, romance: s.general.romance + 1, experience: s.general.experience + 2, mindset: s.general.mindset + 1 } };
                    return { general: { ...s.general, mindset: s.general.mindset + 2, experience: s.general.experience + 1 } };
                }
            },
            {
                text: '找个草坪睡大觉',
                action: (s) => ({
                    general: { ...s.general, health: s.general.health + 2, mindset: s.general.mindset + 3 } , sleepCount: (s.sleepCount || 0) + 1,
                    log: [...s.log, { message: "阳光，草地，还有一个做白日梦的你。", type: 'success', timestamp: Date.now() }]
                })
            }
        ]
    },
    {
        id: 'sum_water_group',
        title: '新生群潜水',
        description: '你加入了2028届八中新生群。群里消息99+，有人在爆照，有人在装弱，似乎还有学长学姐。',
        type: 'neutral',
        triggerType: 'RANDOM', // Set as RANDOM
        choices: [
            { text: '膜拜大佬', action: (s) => ({ general: { ...s.general, romance: s.general.romance + 0.5, experience: s.general.experience + 2, mindset: s.general.mindset - 2 } }) },
            { text: '龙王喷水', action: (s) => ({ general: { ...s.general, romance: s.general.romance + 2, mindset: s.general.mindset + 3, experience: s.general.experience - 1 } }) },
            { text: '潜水观察', action: (s) => ({ general: { ...s.general, experience: s.general.experience + 1 } }) },
            { text: '看着群消息睡着了', action: (s) => ({ general: { ...s.general, health: s.general.health + 1  }, sleepCount: (s.sleepCount || 0) + 1 }) }
        ]
    },
    {
        id: 'sum_preview',
        title: '预习衔接课程',
        description: '你翻开了崭新的高中教材。看着《必修一》，你决定...',
        type: 'neutral',
        triggerType: 'RANDOM',
        choices: [
            { text: '报名衔接班', action: (s) => ({ subjects: modifySub(s, ['math', 'physics', 'chemistry', 'english'], 2), general: { ...s.general, money: s.general.money - 5, experience: s.general.experience + 4, mindset: s.general.mindset - 1 } }) },
            { text: '在家自学', action: (s) => {
                    if (s.general.efficiency > 11) {
                        return { subjects: modifySub(s, ['math', 'physics'], 2), general: { ...s.general, experience: s.general.experience + 3, mindset: s.general.mindset + 2 } };
                    } else {
                        return { general: { ...s.general, efficiency: s.general.efficiency - 1, mindset: s.general.mindset - 2, experience: s.general.experience + 1 }, log: [...s.log, { message: "效率太低，看着书睡着了...", type: 'warning', timestamp: Date.now() }], sleepCount: (s.sleepCount || 0) + 1 };
                    }
            }},
            { text: '看B站网课', action: (s) => {
                    if (Math.random() < 0.7) return { subjects: modifySub(s, ['math', 'physics', 'chemistry', 'english', 'biology', 'history', 'geography', 'politics'], 0.5), general: { ...s.general, experience: s.general.experience + 1 } };
                    return { general: { ...s.general, efficiency: s.general.efficiency - 2, mindset: s.general.mindset + 1 }, log: [...s.log, { message: "看着看着点开了游戏视频...", type: 'warning', timestamp: Date.now() }] };
            }},
            { text: '书盖在脸上睡觉', action: (s) => ({ 
                general: { ...s.general, experience: s.general.experience + 1, mindset: s.general.mindset + 1 },
                sleepCount: (s.sleepCount || 0) + 1 ,
                log: [...s.log, { message: "知识通过渗透作用进入了你的大脑（大概）。", type: 'success', timestamp: Date.now() }]
            }) }
        ]
    },
    {
        id: 'sum_math_bridge',
        title: '暑期数学衔接班',
        description: 'woc，我咋不知道我还要上数学课？',
        type: 'neutral',
        triggerType: 'RANDOM',
        choices: [
            { text: '全神贯注', action: (s) => ({ subjects: modifySub(s, ['math'], 8), general: { ...s.general, mindset: s.general.mindset - 3 } }) },
            { text: '随便听听', action: (s) => ({ subjects: modifySub(s, ['math'], 2), general: { ...s.general, mindset: s.general.mindset + 2 } }) },
            { text: '上课睡觉', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5, health: s.general.health + 2 } , sleepCount: (s.sleepCount || 0) + 1 }) }
        ]
    },
    {
        id: 'sum_english_camp',
        title: '预习英语',
        description: '单词背得怎么样了？abandon, abandon, abandon...',
        type: 'neutral',
        triggerType: 'RANDOM',
        choices: [
            { text: '狂背单词', action: (s) => ({ subjects: modifySub(s, ['english'], 8), general: { ...s.general, health: s.general.health - 2 } }) },
            { text: '看美剧练习', action: (s) => ({ subjects: modifySub(s, ['english'], 4), general: { ...s.general, mindset: s.general.mindset + 5 } }) }
        ]
    },
    {
        id: 'sum_physics_intro',
        title: '物理讲座',
        description: '你被拉去听一场科普讲座。',
        type: 'positive',
        triggerType: 'RANDOM',
        choices: [
            { text: '这也太酷了', action: (s) => ({ subjects: modifySub(s, ['physics'], 6), general: { ...s.general, experience: s.general.experience + 5 } }) },
            { text: '听睡着了', action: (s) => ({ general: { ...s.general, health: s.general.health + 3 }, sleepCount: (s.sleepCount || 0) + 1 }) }
        ]
    },
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
        triggerType: 'RANDOM',
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
        triggerType: 'RANDOM',
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
        triggerType: 'RANDOM',
        choices: [
            { text: '欣然前往', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 15, romance: s.general.romance + 5 } }) },
            { text: '在家宅着', action: (s) => ({ subjects: modifySub(s, ['english'], 3), general: { ...s.general, efficiency: s.general.efficiency + 1 } }) },
            { text: '带书去读', action: (s) => ({ subjects: modifySub(s, ['chinese', 'history'], 4), general: { ...s.general, mindset: s.general.mindset - 5 } }) },
            { text: '换个地方睡觉', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 10, health: s.general.health + 5} , sleepCount: (s.sleepCount || 0) + 1 }) }
        ]
    },
    // --- More Repeatable Summer Events ---
    {
        id: 'sum_hot_day',
        title: '酷暑难耐',
        description: '说好的季风气候雨热同期，我咋只看到了热？',
        type: 'negative',
        triggerType: 'RANDOM', // Set as RANDOM
        choices: [
            { text: '空调续命', action: (s) => ({ general: { ...s.general, money: s.general.money - 5, health: s.general.health + 2 } }) },
            { text: '心静自然凉', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5, health: s.general.health - 5 } }) }
        ]
    },
    {
        id: 'sum_ice_cream',
        title: '雪糕刺客',
        description: '走进便利店想买根冰棍，结账时发现要18。 欸等等，你这雪糕怎么烤不化？',
        type: 'neutral',
        triggerType: 'RANDOM', // Set as RANDOM
        choices: [
            { text: '忍痛付款', action: (s) => ({ general: { ...s.general, money: s.general.money - 20, mindset: s.general.mindset -1 } }) },
            { text: '默默放回', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 4 } }) }
        ]
    },
    {
        id: 'sum_mosquito',
        title: '蚊子的夜袭',
        description: '嗡嗡嗡……啪！没打着。',
        type: 'negative',
        triggerType: 'RANDOM', // Set as RANDOM
        choices: [
            { text: '通宵对峙', action: (s) => ({ general: { ...s.general, health: s.general.health - 5, mindset: s.general.mindset - 5, efficiency: s.general.efficiency - 2 } }) },
            { text: '点蚊香睡大觉', action: (s) => ({ general: { ...s.general, health: s.general.health - 1 }, log: [...s.log, { message: "虽然有点呛，但至少睡着了。", type: 'info', timestamp: Date.now() }] }) }
        ]
    }
];

const MILITARY_EVENTS_RAW: GameEvent[] = [
    {
        id: 'mil_start',
        title: '军训开始',
        description: '烈日当空，为期一周的军训开始了。教官看起来很严厉。',
        type: 'neutral',
        once: true,
        triggerType: 'FIXED',
        fixedWeek: 1,
        choices: [{ text: '坚持就是胜利', action: (s) => ({ general: { ...s.general, health: s.general.health + 5, mindset: s.general.mindset - 5 } }) }]
    },
    {
        id: 'mil_blanket',
        title: '叠军被',
        description: '教官要求把被子叠成“豆腐块”。你看着软趴趴的被子发愁。',
        type: 'neutral',
        triggerType: 'RANDOM',
        choices: [
            { 
                text: '精益求精', 
                action: (s) => {
                    const perfect = Math.random() < 0.5;
                    if (perfect) return { chainedEvent: CHAINED_EVENTS['mil_star_performance'] };
                    return { general: { ...s.general, efficiency: s.general.efficiency + 3, mindset: s.general.mindset - 5 } };
                }
            },
            { text: '不要不要，我就要抱着被子睡一觉！', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5 }, sleepCount: (s.sleepCount || 0) + 1, log: [...s.log, { message: "被子没叠好，但是人睡舒服了。", type: 'success', timestamp: Date.now() }] }) },
        ]
    },
    {
        id: 'mil_sing',
        title: '拉歌环节',
        description: '晚上休息时，各个班级开始拉歌。',
        type: 'positive',
        triggerType: 'RANDOM',
        choices: [
            { text: '大声吼出来', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 2, romance: s.general.romance + 2 } }) },
            { text: '默默鼓掌', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 2 } }) },
            { text: '靠着旁边同学肩膀睡着了喵', action: (s) => ({ general: { ...s.general, health: s.general.health + 1 }, sleepCount: (s.sleepCount || 0) + 1  }) }
        ]
    },
    {
        id: 'mil_night_talk',
        title: '深夜卧谈',
        description: '熄灯了，但是大家都睡不着，开始聊起了天。',
        type: 'positive',
        triggerType: 'RANDOM',
        choices: [
            { text: '聊八卦', action: (s) => ({ general: { ...s.general, romance: s.general.romance + 5 } }) },
            { text: '聊理想', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5, experience: s.general.experience + 5 } }) },
            { text: '赶紧睡觉', action: (s) => ({ general: { ...s.general, health: s.general.health + 5 }, sleepCount: (s.sleepCount || 0) + 1 }) }
        ]
    }
];

const SEMESTER_1_EVENTS_RAW: GameEvent[] = [
    SCIENCE_FESTIVAL_EVENT,
    NEW_YEAR_GALA_EVENT,
    {
        id: 'evt_crush_encounter',
        title: '偶遇',
        description: '在去食堂的路上，你撞见了一个特别的身影。只是一瞬间的对视，你的心跳好像漏了一拍。',
        condition: (s) => !s.romancePartner && !s.activeStatuses.find(st => st.id === 'crush') && s.general.romance >= 10,
        triggerType: 'CONDITIONAL',
        once: true,
        type: 'positive',
        choices: [
            { 
                text: '是心动的感觉', 
                action: (s) => ({ 
                    general: { ...s.general, romance: s.general.romance + 5, mindset: s.general.mindset - 2 },
                    activeStatuses: [...s.activeStatuses, { ...STATUSES['crush'], duration: 4 }],
                    log: [...s.log, { message: "你获得状态【暗恋】。效率-2，魅力+2。", type: 'event', timestamp: Date.now() }]
                }) 
            },
            { text: '无视', action: (s) => ({ general: { ...s.general, efficiency: s.general.efficiency + 1 } }) }
        ]
    },
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
            { 
                text: '就，再多看一眼嘛…… 真好看', 
                action: (s) => ({ 
                    general: { ...s.general, mindset: s.general.mindset + 1, romance: s.general.romance + 2 },
                    activeStatuses: !s.activeStatuses.find(st => st.id === 'crush') ? [...s.activeStatuses, { ...STATUSES['crush'], duration: 2 }] : s.activeStatuses,
                    log: [...s.log, { message: "你选择默默暗恋，这种感觉也不错。", type: 'info', timestamp: Date.now() }]
                }) 
            },
            { text: '回班睡觉', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 0 }, sleepCount: (s.sleepCount || 0) + 1 }) }
        ]
    },
    {
        id: 'evt_first_date',
        title: '初次约会',
        description: '你们决定这周末去西单逛逛。这是你们确立关系后的第一次正式约会。',
        condition: (s) => !!s.romancePartner && s.general.romance > 30,
        triggerType: 'CONDITIONAL',
        once: true,
        type: 'positive',
        choices: [
            { 
                text: '精心准备', 
                action: (s) => {
                    const success = Math.random() < 0.7;
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
    {
        id: 'evt_fight',
        title: '争吵',
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
            },
            { 
                text: '睡一觉就好了', 
                action: (s) => ({ 
                    general: { ...s.general, mindset: s.general.mindset + 5, romance: s.general.romance - 5 },
                    sleepCount: (s.sleepCount || 0) + 1,
                    log: [...s.log, { message: "你选择用睡眠逃避现实。醒来时，问题依然存在，但你不在乎了。", type: 'info', timestamp: Date.now() }]
                }) 
            }
        ]
    },
    {
        id: 'evt_betrayal',
        title: '背叛',
        description: '你发现TA最近总是躲着你回消息，直到你看到了不该看到的一幕。',
        condition: (s) => !!s.romancePartner,
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
    {
        id: 'evt_oi_steal_learn',
        title: '卷王时刻',
        description: '在其他人摸鱼摆烂的时候，你却在偷偷学习。这样的学习方式也许会带来一些效果？',
        condition: (s) => s.competition === 'OI',
        type: 'neutral',
        triggerType: 'RANDOM',
        choices: [
            { text: '偷学动态规划', action: (s) => ({ oiStats: modifyOI(s, { dp: 1 }), general: { ...s.general, experience: s.general.experience + 1 } }) },
            { text: '偷学数据结构', action: (s) => ({ oiStats: modifyOI(s, { dp: 1 }), general: { ...s.general, experience: s.general.experience + 1 } }) },
            { text: '不卷了，睡觉', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 1 }, sleepCount: (s.sleepCount || 0) + 1 }) }
        ]
    },
    {
        id: 'evt_oi_gaming',
        title: '机房隔膜',
        description: '竞赛生的快乐来源之一，当然是打隔膜(Generals/Majsoul)。你和你的朋友们一起在机房打隔膜。',
        condition: (s) => s.competition === 'OI',
        type: 'neutral',
        triggerType: 'RANDOM',
        choices: [
            { text: '大杀四方', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 2, experience: s.general.experience - 1 } }) },
            { text: '被虐了', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 1 } }) },
            { text: '被教练抓包', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 5 }, isGrounded: true }) }
        ]
    },
    {
        id: 'evt_oi_anxiety',
        title: '精神内耗',
        description: '长期的高压生活，你总会陷入焦虑。一次次的挫折后，你开始怀疑自己是否真的适合 OI。',
        condition: (s) => s.competition === 'OI' && s.general.mindset < 100,
        type: 'negative',
        triggerType: 'RANDOM',
        choices: [
            { text: '思考人生意义', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 1 } }) },
            { text: '选择遗忘', action: (s) => ({ general: { ...s.general, experience: Math.max(0, s.general.experience - 2) }, log: [...s.log, { message: "你选择性遗忘了一些痛苦的算法...", type: 'info', timestamp: Date.now() }] }) }
        ]
    },
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
                    oiStats: modifyOI(s, { ds: 1, math: 1 }), 
                    general: { ...s.general, health: s.general.health - 8, experience: s.general.experience + 5 },
                    activeStatuses: Math.random() < 0.3 ? [...s.activeStatuses, { ...STATUSES['focused'], duration: 2 }] : s.activeStatuses
                }) 
            },
            { text: '整理学习笔记', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5, experience: s.general.experience + 10 }, oiStats: modifyOI(s, { misc: 1 }) }) }
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
            { text: '再改一遍', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 15, experience: s.general.experience + 5, health: s.general.health - 5 }, oiStats: modifyOI(s, { misc: 1 }) }) },
            { text: '求助学长', action: (s) => ({ general: { ...s.general, romance: s.general.romance + 5, experience: s.general.experience + 8 }, oiStats: modifyOI(s, { misc: 1 }) }) }
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
        condition: (s) => s.competition === 'OI' && s.week < 10,
        once: true,
        type: 'neutral',
        triggerType: 'RANDOM',
        choices: [{ text: '求个好运', action: (s) => ({ general: { ...s.general, luck: s.general.luck + 15, money: s.general.money - 5 } }) }]
    },
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
    },
    {
        id: 'evt_sport_meet',
        title: '神秘体育场运动会',
        description: '你发现，堵车时自己下去走真的比在车上呆着快一些。',
        triggerType: 'RANDOM',
        once: true,
        type: 'positive',
        choices: [
            { text: '报名1000米', action: (s) => ({ general: { ...s.general, health: s.general.health + 1, mindset: s.general.mindset + 2 } }) },
            { text: '好困好困，睡一觉', action: (s) => ({ general: { ...s.general, health: s.general.health + 3 } , sleepCount: (s.sleepCount || 0) + 1}) },
            { text: '写加油稿（我真的不会写）', action: (s) => ({ subjects: modifySub(s, ['chinese'], 1), general: { ...s.general, mindset: s.general.mindset + 2 } }) }
        ]
    },
    {
        id: 'evt_canteen_rush',
        title: '食堂抢饭',
        description: '第五节课下课铃一响，全校进入了百米冲刺模式。',
        triggerType: 'RANDOM',
        type: 'neutral',
        choices: [
            { text: '冲！', action: (s) => ({ general: { ...s.general, health: s.general.health + 1, efficiency: s.general.efficiency + 1 } }) },
            { text: '等人少了再去', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 1 } }) }
        ]
    }
];

export const PHASE_EVENTS: Record<Phase, GameEvent[]> = {
    [Phase.INIT]: [],
    [Phase.SUMMER]: injectSleep(SUMMER_EVENTS_RAW),
    [Phase.MILITARY]: injectSleep(MILITARY_EVENTS_RAW),
    [Phase.SEMESTER_1]: injectSleep(SEMESTER_1_EVENTS_RAW),
    [Phase.SELECTION]: [],
    [Phase.PLACEMENT_EXAM]: [],
    [Phase.MIDTERM_EXAM]: [],
    [Phase.SUBJECT_RESELECTION]: [],
    [Phase.CSP_EXAM]: [],
    [Phase.NOIP_EXAM]: [],
    [Phase.FINAL_EXAM]: [],
    [Phase.ENDING]: [],
    [Phase.WITHDRAWAL]: []
};
