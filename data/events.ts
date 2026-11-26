import { POST_FINAL_DRAMA_EVENT, SEMESTER_2_EVENTS, WINTER_BREAK_EVENTS } from "./events_semester2";
import { OI_ROUTE_EVENTS } from './events_oi_route';
import { MO_EVENTS } from './events_mo';
import { OI_EVENTS } from "./events_oi";
import { ROMANCE_EVENTS } from "./events_romance";
import { RIVAL_EVENTS } from "./events_character";

import { GameState, GameEvent, SubjectKey, SUBJECT_NAMES, OIStats, EventChoice, Phase } from '../types';
import { modifySub, modifyOI, mapAiEventToGameEvent } from './utils';
import { STATUSES } from './mechanics';
import { CHAINED_EVENTS, NEW_YEAR_GALA_EVENT } from './event_defs';
import { SCIENCE_FESTIVAL_EVENTS } from './events_science_festival';
import { SATURDAY_COURSE_SIGNUP } from './saturday_courses';
import { SCHOOL_SIGNALS } from './events_school_signals';
import { CAMPUS_PROJECT_EVENTS } from './events_campus_project';
import { COMPETITION_SUMMER_WEEKS, MILITARY_TRAINING_WEEKS } from './game_flow';
import AI_EVENTS from './ai_generated_events.json';

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

// Apply at display time too: generated and historical events are not in PHASE_EVENTS.
export const withChallengeSleep = (event: GameEvent): GameEvent => {
    const offersSleep = event.choices?.some(choice =>
        choice.text === CHALLENGE_SLEEP_CHOICE.text ||
        (!choice.condition && (choice.tags?.includes('sleep') ||
            (!choice.tags?.includes('study') && !/不睡|清醒/.test(choice.text) && /睡|梦/.test(choice.text))))
    );
    if (event.allowChallengeSleep === false || offersSleep) return event;
    return { ...event, choices: [...(event.choices || []), CHALLENGE_SLEEP_CHOICE] };
};
const injectSleep = (events: GameEvent[]): GameEvent[] => events.map(withChallengeSleep);

const SUMMER_EVENTS_RAW: GameEvent[] = [
    {
        id: 'sum_goal_selection',
        title: '暑假的抉择',
        description: '录取通知书到了。家长把两张报名表递给你。“信竞（OI）用编程解题，数竞（MO）做竞赛数学题并写清证明。报这两项竞赛会有 8 周暑假训练，开学后还有额外竞赛或联赛，占用部分周末；不报竞赛（专注课内或先补觉）则 3 周后较快入校。”',
        type: 'neutral',
        once: true,
        triggerType: 'FIXED',
        fixedWeek: 1,
        choices: [
            { 
                text: '信息竞赛(OI)', 
                hint: '暑假 8 周，提前练算法。学年中会有额外竞赛，周末自由时间更少。',
                hintKind: 'rule',
                resultDescription: '你把暑假留给算法入门。开学后还要给线上赛和机房训练留时间。',
                action: (s) => ({
                competition: 'OI', 
                totalWeeksInPhase: COMPETITION_SUMMER_WEEKS,
                general: { ...s.general, experience: s.general.experience + 10 },
                oiStats: { ...s.oiStats, misc: 5 }
                }) 
            },
            {
                text: '数学竞赛(MO)',
                hint: '暑假练竞赛数学，开学后可以参加联赛和训练。',
                hintKind: 'rule',
                resultDescription: '你给暑假留了时间练竞赛数学。教练说开学就到联赛的月份了。',
                action: (s) => ({
                    competition: 'MO',
                    totalWeeksInPhase: COMPETITION_SUMMER_WEEKS,
                    general: { ...s.general, experience: s.general.experience + 8 },
                    subjects: modifySub(s, ['math'], 3)
                })
            },
            {
                text: '专注课内综合', 
                hint: '较快入校。正常参加分班、社团招新和校园活动。',
                hintKind: 'rule',
                resultDescription: '你简单理了理课本和行李，把更多精力留给开学后的班级生活。',
                action: (s) => ({ 
                competition: 'None', 
                general: { ...s.general, efficiency: s.general.efficiency + 2 }
                }) 
            },
            {
                text: '先补觉',
                hint: '较快入校。先恢复体力，适合嗜睡挑战。',
                hintKind: 'rule',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 5, health: s.general.health + 5  }, sleepCount: (s.sleepCount || 0) + 1,
                    log: [...s.log, { message: '你关掉闹钟，补了个觉。', type: 'success', timestamp: Date.now()}]
                })
            }
        ]
    },
    {
        id: 'sum_city_walk',
        title: '去学校周边看看',
        description: '你坐车到了学校附近。离回家吃饭还有一小时。',
        type: 'positive',
        triggerType: 'RANDOM', // Set as RANDOM
        choices: [
            { 
                text: '买点吃的（2 元）',
                action: (s) => ({ 
                    general: { ...s.general, money: s.general.money - 2, experience: s.general.experience + 2, romance: s.general.romance + 1 } 
                }) 
            },
                { 
                text: '沿街走一圈',
                action: (s) => {
                    const rand = Math.random();
                    if (rand < 0.2) return { general: { ...s.general, romance: s.general.romance + 1, experience: s.general.experience + 2, mindset: s.general.mindset + 1 } };
                    return { general: { ...s.general, mindset: s.general.mindset + 2, experience: s.general.experience + 1 } };
                }
            },
            {
                text: '在长椅上睡一会儿',
                action: (s) => ({
                    general: { ...s.general, health: s.general.health + 2, mindset: s.general.mindset + 3 } , sleepCount: (s.sleepCount || 0) + 1,
                    log: [...s.log, { message: '你在长椅上睡了一会儿，醒来刚好赶上回家的车。', type: 'success', timestamp: Date.now() }]
                })
            }
        ]
    },
    {
        id: 'sum_water_group',
        title: '新生群潜水',
        description: '你加入了八中新生群。有人问军训要带什么，有位高二学生发了去操场的路线。',
        type: 'neutral',
        triggerType: 'RANDOM', // Set as RANDOM
        choices: [
            { text: '问问高二学生还要带什么', action: (s) => ({ general: { ...s.general, romance: s.general.romance + 0.5, experience: s.general.experience + 2, mindset: s.general.mindset - 2 } }) },
            { text: '和其他新生聊几句', action: (s) => ({ general: { ...s.general, romance: s.general.romance + 2, mindset: s.general.mindset + 3, experience: s.general.experience - 1 } }) },
            { text: '把路线存到手机里', action: (s) => ({ general: { ...s.general, experience: s.general.experience + 1 } }) },
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
            { text: '报名衔接班（5 元）', action: (s) => ({ subjects: modifySub(s, ['math', 'physics', 'chemistry', 'english'], 2), general: { ...s.general, money: s.general.money - 5, experience: s.general.experience + 4, mindset: s.general.mindset - 1 } }) },
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
        description: '暑假还没正式开学，家里就先给你排了一节数学衔接课。',
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
        description: '曾经的同学们聚在一起，有人欢喜有人愁。你也注意到了同样将去高中的同龄人。',
        type: 'neutral',
        once: true,
        triggerType: 'RANDOM',
        choices: [
            { 
                text: '主动打招呼，约好开学见',
                resultDescription: '你们简单聊了几句近况，彼此约好九月开学再慢慢熟悉。',
                action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5, romance: s.general.romance + 3 } })
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
            { text: '空调续命（5 元）', action: (s) => ({ general: { ...s.general, money: s.general.money - 5, health: s.general.health + 2 } }) },
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
            { text: '忍痛付款（18 元）', action: (s) => ({ general: { ...s.general, money: s.general.money - 18, mindset: s.general.mindset -1 } }) },
            { text: '默默放回', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 4 } }) },
            {
                text: '【家里有矿】多拿两根顺手分给身边同学（35 元）',
                condition: (s) => s.talents.some(t => t.id === 'rich_kid') && s.general.money >= 35,
                resultDescription: '你刷卡结账，把多出来的两根分给一起走出来的同学，一路边聊边回家。',
                action: (s) => ({ general: { ...s.general, money: s.general.money - 35, romance: s.general.romance + 4, mindset: s.general.mindset + 6 } })
            }
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
        description: '军训第一天，大家戴着刚领的帽子到操场集合。教官让各班按身高排队，先练站姿。',
        type: 'neutral',
        once: true,
        triggerType: 'FIXED',
        fixedWeek: 1,
        choices: [
            { text: '到队伍里站好', action: (s) => ({ general: { ...s.general, health: s.general.health + 5, mindset: s.general.mindset - 5 } }) },
            {
                text: '【体育特长】帮教官领口令，把方阵节奏带稳',
                condition: (s) => s.talents.some(t => t.id === 'healthy'),
                resultDescription: '跟着口令把步频带稳后，前排不再老踩脚，你站一天也没觉得那么累。',
                action: (s) => ({ general: { ...s.general, health: s.general.health + 8, experience: s.general.experience + 4, mindset: s.general.mindset + 3 } })
            }
        ]
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
            { text: '靠着椅背睡一会儿', action: (s) => ({ general: { ...s.general, health: s.general.health + 1 }, sleepCount: (s.sleepCount || 0) + 1  }) }
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
    },
    {
        id: 'mil_closing',
        title: '军训最后一天',
        description: '会操结束，队伍散开，大家准备把行李搬上车。排在你前面的同学回头喊你，问要不要一起拍张照。',
        type: 'positive',
        triggerType: 'FIXED',
        fixedWeek: 1,
        condition: state => state.totalWeeksInPhase === MILITARY_TRAINING_WEEKS,
        choices: [
            {
                text: '过去站一排，拍完再搬行李',
                resultDescription: '拍照时大家都在笑。后来上车才发现，你已经能叫出旁边好几个人的名字了。',
                action: state => ({ general: { ...state.general, mindset: state.general.mindset + 3, experience: state.general.experience + 1 } })
            },
            {
                text: '先把行李放好，上车歇一会儿',
                tags: ['rest'],
                resultDescription: '车窗外有人还在挥手。你把帽子收进包里，靠着座椅慢慢缓过劲来。',
                action: state => ({ fatigue: state.fatigue - 5 })
            }
        ]
    }
];

const SEMESTER_1_EVENTS_RAW: GameEvent[] = [
    {
        id: 'evt_autumn_trip',
        title: '金秋考察',
        description: '学校组织了高一年级的秋游活动（名曰：金秋社会实践考察）。这可是难得的放松机会！',
        triggerType: 'FIXED',
        fixedWeek: 8,
        once: true,
        type: 'positive',
        choices: [
            { text: '太棒了，去玩！', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 20 } }) }
        ]
    },
    {
        id: 'evt_homework_spot_check',
        title: '作业抽查',
        description: '几周前那份侥幸交上去的作业被抽到了。老师没有立刻点名，只是把名单放在讲台上。',
        condition: (s) => s.flags.copied_homework === true && Number(s.flags.copied_homework_week || s.week) <= s.week - 2,
        triggerType: 'CONDITIONAL',
        once: true,
        type: 'negative',
        choices: [
            {
                text: '主动补做',
                tags: ['study'],
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset - 2, experience: s.general.experience + 3 },
                    flags: { ...s.flags, copied_homework: false, homework_check_resolved: true },
                    log: [...s.log, { message: '你承认了之前的侥幸，补做作业到很晚，但心里轻松了一点。', type: 'info', timestamp: Date.now() }]
                })
            },
            {
                text: '装作没事',
                tags: ['risky'],
                action: (s) => {
                    const caught = Math.random() < Math.max(0.25, 0.65 - s.general.luck / 200);
                    return {
                        general: caught
                            ? { ...s.general, mindset: s.general.mindset - 8, health: s.general.health - 3 }
                            : { ...s.general, experience: s.general.experience + 2 },
                        flags: { ...s.flags, copied_homework: false, homework_check_resolved: true },
                        log: [...s.log, { message: caught ? '老师抽出你的名字，你只能留下来重写。' : '名单被放回抽屉，你又侥幸躲过了一次。', type: caught ? 'warning' : 'info', timestamp: Date.now() }]
                    };
                }
            }
        ]
    },
    SATURDAY_COURSE_SIGNUP,
    ...SCIENCE_FESTIVAL_EVENTS,
    NEW_YEAR_GALA_EVENT,
    {
        id: 'evt_fight',
        title: '争吵',
        description: (s: GameState) => `你和${s.romancePartner || '父母'}发生了一些不愉快，气氛降到了冰点。`,
        condition: (s) => !s.romancePartner && Math.random() < 0.5,
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
        id: 'evt_oi_steal_learn',
        title: '卷王时刻',
        description: '在其他人摸鱼摆烂的时候，你却在偷偷学习。这样的学习方式也许会带来一些效果？',
        condition: (s) => s.competition === 'OI',
        type: 'neutral',
        triggerType: 'RANDOM',
        choices: [
            { text: '偷学动态规划', action: (s) => ({ oiStats: modifyOI(s, { dp: 1 }), general: { ...s.general, experience: s.general.experience + 1 } }) },
            { text: '偷学数据结构', action: (s) => ({ oiStats: modifyOI(s, { ds: 1 }), general: { ...s.general, experience: s.general.experience + 1 } }) },
            { text: '不卷了，睡觉', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 1 }, sleepCount: (s.sleepCount || 0) + 1 }) }
        ]
    },
    {
        id: 'evt_oi_gaming',
        title: '机房隔膜',
        description: '竞赛生的快乐来源之一，当然是打隔膜(Generals/Majsoul)。你和训练群里的朋友约在临时借到的电脑旁边打隔膜。',
        condition: (s) => s.competition === 'OI',
        type: 'neutral',
        triggerType: 'RANDOM',
        choices: [
            { text: '大杀四方', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 2, experience: s.general.experience - 1 } }) },
            { text: '被虐了', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 1 } }) },
            { text: '被老师抓包', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 5 }, isGrounded: true }) }
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
        description: '你又找了台能用的电脑加练，旁边没有固定教练，只能先按自己的题单来。',
        condition: (s) => s.competition === 'OI',
        type: 'neutral',
        triggerType: 'RANDOM',
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
        title: '训练组模拟赛 AK',
        description: '今天训练组组织线上模拟赛，你居然全场第一个 AK（全部通过）。',
        condition: (s) => s.competition === 'OI',
        type: 'positive',
        triggerType: 'RANDOM',
        choices: [{ text: '信心爆棚', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 30, luck: s.general.luck + 10 } }) }]
    },
    {
        id: 'oi_temple_visit',
        title: '赛前迷信',
        description: 'CSP-S 临近，机房里有人把电脑桌面换成了代表 AC 的绿色壁纸，也有同学约你周末顺路去孔庙门口求张祈福牌图个安心。',
        condition: (s) => s.competition === 'OI' && s.phase === Phase.SEMESTER_1 && s.week < 7 && !s.triggeredEvents.includes('csp_exam_trigger'),
        once: true,
        type: 'neutral',
        triggerType: 'RANDOM',
        choices: [
            {
                text: '去孔庙门口求张祈福牌（5 元）',
                resultDescription: '你挑了张印着“顺利通过”的小木牌挂在廊下，心里踏实了一点。',
                action: (s) => ({ general: { ...s.general, luck: s.general.luck + 15, money: s.general.money - 5 } })
            },
            {
                text: '换上绿色壁纸，回机房再刷两道题',
                tags: ['study'],
                resultDescription: '你把桌面换成绿色图个吉利，顺手把去年 CSP-S 的几道模拟题又过了一遍。',
                action: (s) => ({ general: { ...s.general, luck: s.general.luck + 5, mindset: s.general.mindset + 3 }, oiStats: modifyOI(s, { misc: 1 }) })
            }
        ]
    },
    {
        id: 's1_library',
        title: '图书馆的宁静',
        description: '八中图书馆是寻找灵感的好地方。',
        type: 'positive',
        triggerType: 'RANDOM',
        choices: [
            { text: '高效自修', action: (s) => ({ subjects: modifySub(s, ['chinese', 'english'], 3), general: { ...s.general, efficiency: s.general.efficiency + 1 } }) },
            {
                text: '【机房幽灵】顺手在角落看几页算法讲义',
                condition: (s) => s.talents.some(t => t.id === 'oi_nerd'),
                resultDescription: '你在靠窗桌旁把卡了两天的边界条件手推了一遍，晚自习前终于理顺了。',
                action: (s) => ({ oiStats: modifyOI(s, { misc: 2 }), subjects: modifySub(s, ['math'], 2), general: { ...s.general, efficiency: s.general.efficiency + 1 } })
            }
        ]
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
        title: '秋季运动会',
        description: '十月的田径场上挂起了各班的班旗，广播里循环念着检录通知。上午刚比完短跑预赛，下午还有长跑和接力。',
        condition: (s) => s.phase === Phase.SEMESTER_1 && s.week >= 4 && s.week <= 8,
        triggerType: 'RANDOM',
        once: true,
        type: 'positive',
        choices: [
            {
                text: '报名1000米',
                tags: ['sport'],
                resultDescription: '你跑完两圈半回到看台，同学立刻递过来一瓶矿泉水。',
                action: (s) => ({ general: { ...s.general, health: s.general.health + 1, mindset: s.general.mindset + 2 } })
            },
            {
                text: '在看台角落眯一会儿',
                tags: ['sleep'],
                resultDescription: '广播声混着操场上的呐喊成了背景音，你靠在书包上踏实歇了半小时。',
                action: (s) => ({ general: { ...s.general, health: s.general.health + 3 }, sleepCount: (s.sleepCount || 0) + 1 })
            },
            {
                text: '坐在看台写加油稿',
                resultDescription: '你对照参赛名单写了三段短句递去广播台，没过多久操场喇叭里还真念了出来。',
                action: (s) => ({ subjects: modifySub(s, ['chinese'], 1), general: { ...s.general, mindset: s.general.mindset + 2 } })
            }
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
    },
    {
        id: 's1_class_board',
        title: '班级板报谁来画',
        description: '教室后面的黑板报空了半个月，班主任把粉笔递到你手里：这次主题是“我的高中第一印象”。',
        condition: (s) => s.phase === Phase.SEMESTER_1 && s.week >= 3 && s.week <= 8 && !s.flags.class_board_started,
        triggerType: 'CONDITIONAL',
        once: true,
        type: 'neutral',
        choices: [
            { text: '我来画，先把框架搭起来', action: (s) => ({ flags: { ...s.flags, class_board_started: true, class_board_start_week: s.week, class_board_role: 'draw' }, subjects: modifySub(s, ['chinese'], 2), general: { ...s.general, experience: s.general.experience + 4, mindset: s.general.mindset - 1 }, log: [...s.log, { message: '你接下了板报，和几位同学约好周五放学后一起完成。', type: 'info', timestamp: Date.now() }] }) },
            { text: '帮忙找素材，别让我主笔', action: (s) => ({ flags: { ...s.flags, class_board_started: true, class_board_start_week: s.week, class_board_role: 'research' }, general: { ...s.general, experience: s.general.experience + 2, romance: s.general.romance + 1 } }) },
            { text: '假装低头找笔', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 1 } }) }
        ]
    },
    {
        id: 's1_class_board_finish',
        title: '板报交稿前夜',
        description: (s) => s.flags.class_board_role === 'research' ? '你找来的素材已经剪好贴上黑板，负责画板的同学站在梯凳旁叫住你，想请你帮忙核对最后几行文字的落款。' : '板报评选截止就在明早。标题和边框已经画齐，右下角留出来的一块空白还得今晚收个尾。',
        condition: (s) => s.phase === Phase.SEMESTER_1 && s.flags.class_board_started === true && s.week >= Math.max(6, Number(s.flags.class_board_start_week ?? 5) + 1) && !s.flags.class_board_finished,
        triggerType: 'CONDITIONAL',
        once: true,
        type: 'positive',
        choices: [
            { text: '晚走一会儿，把细节补完', action: (s) => ({ flags: { ...s.flags, class_board_finished: true, class_board_finish_week: s.week }, subjects: modifySub(s, ['chinese'], 2), general: { ...s.general, experience: s.general.experience + 6, mindset: s.general.mindset + 2 }, fatigue: s.fatigue + 5, log: [...s.log, { message: '板报赶在早读前完成，路过的同学都停下来多看了一眼。', type: 'success', timestamp: Date.now() }] }) },
            { text: '留白即可，按现在的版面定稿', action: (s) => ({ flags: { ...s.flags, class_board_finished: true, class_board_finish_week: s.week }, general: { ...s.general, experience: s.general.experience + 3, mindset: s.general.mindset + 4 } }) }
        ]
    },
];

SEMESTER_1_EVENTS_RAW.push({
    id: 's1_class_board_reunion',
    title: '有人记得那块板报',
    description: (s) => s.flags.class_board_role === 'research'
        ? '月考前整理讲义时，一起出板报的同学把一份手抄笔记放到了你桌角：“上次找素材多亏你了，这门选修我笔记记全了，给你借走看看。”'
        : '一起忙完黑板报的同学在走廊叫住你：“前阵子你画完最后半块才走，我一直记着。周末有空吗？我把这周错题理了一份，一起看看。”',
    triggerType: 'CONDITIONAL', once: true, type: 'positive',
    condition: s => s.phase === Phase.SEMESTER_1 && s.flags.class_board_finished === true
        && s.week >= Number(s.flags.class_board_finish_week ?? 6) + 2 && !s.flags.class_board_reunited,
    choices: [
        { text: '好，放学一起看看错题', tags: ['social'],
          resultDescription: '你们各自讲明白了一道题，临走约好后面不懂的随时问。',
          action: s => ({ flags: { ...s.flags, class_board_reunited: true },
            subjects: modifySub(s, ['math'], 2), general: { ...s.general, mindset: s.general.mindset + 3 } }) },
        { text: '收下笔记，顺手买两瓶饮料', tags: ['social'],
          resultDescription: '黑板报在月底就会擦掉重写，一起在空教室里站到天黑的那晚还挺难忘的。',
          action: s => ({ flags: { ...s.flags, class_board_reunited: true },
            general: { ...s.general, mindset: s.general.mindset + 4, romance: s.general.romance + 2 } }) }
    ]
});

const PARSED_AI_EVENTS = (AI_EVENTS as any[]).reduce((acc: GameEvent[], e: any, eventIndex: number) => {
    if (e.childrens && Array.isArray(e.childrens)) {
        e.childrens.forEach((child: any, childIndex: number) => {
            // The authored offline pack reuses short IDs across batches. A
            // stable source index keeps each distinct event addressable in
            // recent-event tracking and save files.
            acc.push(mapAiEventToGameEvent({ ...child, id: `offline_${eventIndex}_${childIndex}` }));
        });
    } else if (e.choices || e.effect) {
        const event = mapAiEventToGameEvent({ ...e, id: e.id || `offline_${eventIndex}` });
        if (event.id === 'campus_borrow_pen' || event.id === 'campus_lost_card') {
            const followupKey = event.id === 'campus_borrow_pen' ? 'pen' : 'card';
            const helpIndex = followupKey === 'pen' ? 0 : 1;
            event.choices = event.choices?.map((choice, index) => {
                if (index !== helpIndex) return choice;
                const action = choice.action;
                return { ...choice, action: (s: GameState) => ({ ...action(s),
                    ...(followupKey === 'card' ? { fatigue: s.fatigue + 3 } : {}),
                    flags: { ...s.flags,
                        [`campus_${followupKey}_help`]: true,
                        [`campus_${followupKey}_phase`]: s.phase,
                        [`campus_${followupKey}_week`]: s.week }
                }) };
            });
            // Keep authored actions addressable when an event is restored.
            delete event.serialized;
        }
        acc.push({ ...event, autoContinue: e.id?.startsWith('campus_') === true });
    }
    return acc;
}, []);

const CAMPUS_FOLLOWUPS: GameEvent[] = [
    {
        id:'campus_pen_return',title:'借笔记顺便还个情',type:'positive',triggerType:'CONDITIONAL',once:true,
        condition:s => s.flags.campus_pen_help === true && s.flags.campus_pen_phase === s.phase && s.week > Number(s.flags.campus_pen_week),
        description:'上次借你笔的同桌把整理好的数学错题本推过来：“上回谢谢你帮我交练习册，这几道容易跳坑的大题标了红色，借你对照着看。”',
        choices:[
            {text:'凑一起过一遍上面标出来的几道题',tags:['study'],resultDescription:'你俩一道题拆开对了一遍步骤，原来平时漏看的都是同一个角标。',
             action:s=>({subjects:modifySub(s,['math'],2),flags:{...s.flags,campus_pen_help:false}})},
            {text:'道谢收好本子，约好下课陪去接水',tags:['social'],resultDescription:'趁课间走去水房聊了五分钟最近几科的作业量，回来再坐下做题清醒了些。',
             action:s=>({general:{...s.general,mindset:s.general.mindset+5},flags:{...s.flags,campus_pen_help:false}})}
        ]
    },
    {
        id:'campus_card_return',title:'失主带着饮料来了',type:'positive',triggerType:'CONDITIONAL',once:true,
        condition:s => s.flags.campus_card_help === true && s.flags.campus_card_phase === s.phase && s.week > Number(s.flags.campus_card_week),
        description:'那天掉饭卡的同学趁大课间特意跑来你们班门口，手里拎了盒利乐包装的茶饮：“找过你两趟了，上回真的谢啦。”',
        choices:[
            {text:'顺手收下饮料道谢',tags:['social'],resultDescription:'你们隔着窗台又多聊了几句各班进度，加完联系方式各自回去上课。',
             action:s=>({general:{...s.general,mindset:s.general.mindset+4,romance:s.general.romance+2},flags:{...s.flags,campus_card_help:false}})},
            {text:'谢了饮料，顺便约好问一道物理难题',tags:['study'],resultDescription:'对方立刻记下题号，午休拿着草稿纸来给你的受力分析画了个清清楚楚的图。',
             action:s=>({subjects:modifySub(s,['physics'],2),flags:{...s.flags,campus_card_help:false}})}
        ]
    }
];

const HOLIDAY_ROMANCE_IDS = new Set([
    'romance_confession',
    'romance_after_rejection',
    'romance_friend_callback',
    'romance_space_callback',
    'romance_dating_park',
    'romance_missed_message',
    'romance_repair',
    'romance_year_note'
]);
const HOLIDAY_ROMANCE_EVENTS = ROMANCE_EVENTS.filter(event => HOLIDAY_ROMANCE_IDS.has(event.id));

export const PHASE_EVENTS: Record<Phase, GameEvent[]> = {
    [Phase.INIT]: [],
    [Phase.SUMMER]: injectSleep([...SUMMER_EVENTS_RAW, ...MO_EVENTS.filter(event => event.fixedPhase === Phase.SUMMER)]),
    [Phase.MILITARY]: injectSleep(MILITARY_EVENTS_RAW),
    [Phase.SEMESTER_1]: injectSleep([...SEMESTER_1_EVENTS_RAW, ...SCHOOL_SIGNALS, ...CAMPUS_PROJECT_EVENTS.filter(event => event.fixedPhase === Phase.SEMESTER_1), ...RIVAL_EVENTS, ...PARSED_AI_EVENTS, ...CAMPUS_FOLLOWUPS, ...OI_ROUTE_EVENTS, ...MO_EVENTS.filter(event => event.fixedPhase === Phase.SEMESTER_1), ...ROMANCE_EVENTS]),
    [Phase.SELECTION]: [],
    [Phase.PLACEMENT_EXAM]: [],
    [Phase.MIDTERM_EXAM]: [],
    [Phase.SUBJECT_RESELECTION]: [],
    [Phase.CSP_EXAM]: [],
    [Phase.NOIP_EXAM]: [],
    [Phase.FINAL_EXAM]: [],
    [Phase.MIDTERM_EXAM_2]: [],
    [Phase.FINAL_EXAM_2]: [],
    [Phase.ENDING]: [],
    [Phase.WITHDRAWAL]: [],
    [Phase.WINTER_BREAK]: injectSleep([...WINTER_BREAK_EVENTS, ...OI_EVENTS, ...OI_ROUTE_EVENTS, ...HOLIDAY_ROMANCE_EVENTS]),
    [Phase.SEMESTER_2]: injectSleep([...SEMESTER_2_EVENTS, ...SCHOOL_SIGNALS, ...CAMPUS_PROJECT_EVENTS.filter(event => event.fixedPhase === Phase.SEMESTER_2), ...RIVAL_EVENTS, ...OI_EVENTS, ...OI_ROUTE_EVENTS, ...MO_EVENTS.filter(event => event.fixedPhase === Phase.SEMESTER_2), ...PARSED_AI_EVENTS, ...CAMPUS_FOLLOWUPS, ...ROMANCE_EVENTS]),
    [Phase.SUMMER_BREAK]: injectSleep([POST_FINAL_DRAMA_EVENT, ...OI_EVENTS, ...HOLIDAY_ROMANCE_EVENTS]),
    [Phase.WC_EXAM]: [],
    [Phase.PROVINCIAL_EXAM]: [],
    [Phase.APIO_EXAM]: [],
    [Phase.NOI_EXAM]: []
};
