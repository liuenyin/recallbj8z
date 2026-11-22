
import { GameEvent, GameState, Phase, SUBJECT_NAMES } from '../types';

const PROFICIENCY_SUBJECTS = ['chemistry', 'biology', 'history', 'geography'] as const;

const finishProficiencyExam = (state: GameState, intensivePrep: boolean): Partial<GameState> => {
    const prepBonus = intensivePrep ? 3 : 0;
    const results = PROFICIENCY_SUBJECTS.map(subject => ({
        subject,
        passed: state.subjects[subject].level + prepBonus >= 15
    }));
    const allPassed = results.every(result => result.passed);
    const summary = results.map(({ subject, passed }) => `${SUBJECT_NAMES[subject]}${passed ? '合格' : '不合格'}`).join('，');
    return {
        general: {
            ...state.general,
            health: state.general.health - (intensivePrep ? 10 : 5),
            mindset: state.general.mindset + (allPassed ? (intensivePrep ? 18 : 8) : (intensivePrep ? -10 : -5)),
            efficiency: state.general.efficiency + (intensivePrep ? 0 : 1)
        },
        log: [...state.log, {
            message: `合格考成绩出来了。${summary}。${allPassed ? '这一轮报考的科目都通过了。' : '没通过的科目还可以参加以后学期的合格考。'}`,
            type: allPassed ? 'success' : 'warning',
            timestamp: Date.now()
        }]
    };
};

export const SEMESTER_2_EVENTS: GameEvent[] = [
    {
        id: 's2_april_fools',
        title: '愚人节的整蛊',
        description: '今天是 4 月 1 日愚人节，班里弥漫着一股“不怀好意”的气息。你要不要也加入这场狂欢？',
        type: 'neutral',
        triggerType: 'FIXED',
        fixedWeek: 5, // 假设 4月1日 在第 5 周
        choices: [
            {
                text: '给同桌的水杯里加点“料”（柠檬汁）',
                resultDescription: '趁同桌不注意，你把备好的柠檬汁倒进了水杯。',
                action: (s) => {
                    if (Math.random() < Math.min(0.85, 0.35 + s.general.luck / 200)) {
                        return {
                            general: { ...s.general, romance: s.general.romance + 5, mindset: s.general.mindset + 10 },
                            log: [...s.log, { message: '整蛊大成功！同桌被酸得五官扭曲，随后你们笑作一团。', type: 'success', timestamp: Date.now() }]
                        };
                    } else {
                        return {
                            general: { ...s.general, romance: s.general.romance - 5, mindset: s.general.mindset - 5 },
                            log: [...s.log, { message: '被同桌提前识破了，你反而被整了一顿...', type: 'warning', timestamp: Date.now() }]
                        };
                    }
                }
            },
            {
                text: '老老实实刷题，不参与',
                action: (s) => ({
                    general: { ...s.general, efficiency: s.general.efficiency + 2 }
                })
            }
        ]
    },
    {
        id: 's2_classmate_birthday',
        title: '同桌的生日',
        description: '今天是你同桌的生日，大家都准备了小礼物，你打算怎么表示？',
        type: 'neutral',
        triggerType: 'RANDOM',
        condition: (s) => s.phase === Phase.SEMESTER_2 && Math.random() < 0.1, // 10% chance any week in Sem 2
        once: true,
        choices: [
            {
                text: '买一份精致的礼物 (花费 ¥50)',
                condition: (s) => s.general.money >= 50,
                action: (s) => ({
                    general: { ...s.general, money: s.general.money - 50, romance: s.general.romance + 15 },
                    log: [...s.log, { message: '同桌收到礼物非常开心，你们的关系更进了一步！', type: 'success', timestamp: Date.now() }]
                })
            },
            {
                text: '送上一句真诚的祝福',
                action: (s) => ({
                    general: { ...s.general, romance: s.general.romance + 2 },
                    log: [...s.log, { message: '一句“生日快乐”，礼轻情意重。', type: 'info', timestamp: Date.now() }]
                })
            }
        ]
    },
    {
        id: 's2_spring_trip',
        title: '春游',
        description: '高一下半学期的春游开始了，这是一次放松的好机会。',
        type: 'positive',
        once: true,
        triggerType: 'FIXED',
        fixedWeek: 12,
        choices: [
            { text: '开心玩耍', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 30 }, flags: { ...s.flags, went_spring_trip: true } }) }
        ]
    },
    {
        id: 's2_debate_start',
        title: '辩论赛报名',
        description: '学校将举办辩论赛，每个班派队伍参加，16个班抽签对决。你要报名吗？',
        type: 'neutral',
        once: true,
        triggerType: 'FIXED',
        fixedWeek: 9,
        choices: [
            { text: '报名参加！', action: (s) => ({ flags: { ...s.flags, debate_joined: true, debate_stage: 16 } }) },
            { text: '没兴趣，去学习', action: (s) => ({ general: { ...s.general, efficiency: s.general.efficiency + 5 } }) }
        ]
    },
    {
        id: 's2_basketball_start',
        title: '篮球赛报名',
        description: '高一篮球联赛开始报名了，赛程和辩论赛类似，也是班级对抗。',
        type: 'neutral',
        once: true,
        triggerType: 'FIXED',
        fixedWeek: 5,
        choices: [
            { text: '上场比赛！', action: (s) => ({ flags: { ...s.flags, basketball_joined: true, basketball_stage: 16 } }) },
            { text: '做拉拉队', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5 } }) }
        ]
    },
    {
        id: 's2_drama_start',
        title: '英语戏剧节报名',
        description: '英语戏剧节开始筹备了。要在期末考完后表演，这是一个展示自我的好机会！',
        type: 'neutral',
        once: true,
        triggerType: 'FIXED',
        fixedWeek: 13,
        choices: [
            { text: '参与演出', action: (s) => ({ flags: { ...s.flags, drama_joined: true, drama_progress: 0 } }) },
            { text: '当个观众就好', action: (s) => ({}) }
        ]
    },
    
    // Changing Selection Conditional Event
    {
        id: 's2_change_subject_selection',
        title: '班主任的谈话',
        description: '期中考试结束了。班主任把你叫到办公室：“我看你这次期中考试有些选科成绩不太理想，你要不要考虑换一下选科？”',
        type: 'negative',
        once: true,
        triggerType: 'CONDITIONAL',
        condition: (s) => s.phase === Phase.SEMESTER_2 && s.week >= 11 && s.selectedSubjects.some(sub => s.subjects[sub].level < 10 && s.subjects[sub].aptitude < 30),
        choices: [
            { 
                text: '坚持原本的选择', 
                action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5 } }) 
            },
            {
                text: '重新考虑选科',
                action: (s) => ({
                    phase: Phase.SUBJECT_RESELECTION,
                    subjectReselectionReturnPhase: Phase.SEMESTER_2,
                    log: [...s.log, { message: "你决定重新考虑你的选科方向。", type: 'info', timestamp: Date.now() }]
                })
            }
        ]
    },

    // 6 Related events for Debate, Basketball, Spring Trip
    {
        id: 's2_debate_prep',
        title: '辩论赛准备',
        description: '下周就要打辩论赛了，你们队伍正在熬夜查资料写一辩稿。',
        type: 'neutral',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && !!s.flags.debate_joined && s.week === 10,
        choices: [
            { text: '肝！', action: (s) => ({ general: { ...s.general, health: s.general.health - 5, experience: s.general.experience + 10 } }) }
        ]
    },
    {
        id: 's2_debate_match',
        title: '辩论赛比赛日',
        description: '比赛正式开始！对方辩友咄咄逼人，你站起来开始反击。',
        type: 'positive',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && !!s.flags.debate_joined && s.week >= 12 && s.week <= 13,
        choices: [
            { 
                text: '逻辑碾压', 
                action: (s) => {
                    const win = Math.random() < 0.6;
                    return {
                        flags: { ...s.flags, debate_stage: win ? 8 : 0 },
                        general: { ...s.general, mindset: s.general.mindset + (win ? 15 : -5) },
                        log: [...s.log, { message: win ? '你们赢得了比赛，晋级8强！' : '你们遗憾落败，止步16强。', type: win ? 'success' : 'warning', timestamp: Date.now() }]
                    }
                }
            }
        ]
    },
    {
        id: 's2_basketball_training',
        title: '篮球赛训练',
        description: '为了班级的荣誉，你每天放学后都在操场上练习投篮。',
        type: 'neutral',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && !!s.flags.basketball_joined && s.week >= 6 && s.week <= 7,
        choices: [
            { text: '挥洒汗水', action: (s) => ({ general: { ...s.general, health: s.general.health + 5, experience: s.general.experience + 5 } }) }
        ]
    },
    {
        id: 's2_basketball_match',
        title: '篮球联赛进行中',
        description: '今天是你们班的淘汰赛。比分非常焦灼，到了最后一节。',
        type: 'positive',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && !!s.flags.basketball_joined && s.week >= 7 && s.week <= 8,
        choices: [
            { 
                text: '全力拼搏！', 
                action: (s) => {
                    const win = Math.random() < 0.5 + (s.general.health - 50) / 200;
                    return {
                        flags: { ...s.flags, basketball_stage: win ? 8 : 0 },
                        general: { ...s.general, health: s.general.health - 5, mindset: s.general.mindset + (win ? 20 : -10) },
                        log: [...s.log, { message: win ? '你投进了关键球，球队晋级8强！' : '体能不支，球队遗憾被淘汰。', type: win ? 'success' : 'error', timestamp: Date.now() }]
                    }
                }
            }
        ]
    },
    {
        id: 's2_basketball_final',
        title: '篮球联赛争冠战',
        description: '经过前面几轮拼杀，你们班杀进了四强后的决赛舞台，操场边站满了来加油的同学。',
        type: 'positive',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && s.flags.basketball_stage === 8 && s.week >= 10 && s.week <= 11,
        choices: [
            {
                text: '拼到最后一秒',
                action: (s) => {
                    const win = Math.random() < 0.45 + (s.general.health - 50) / 200;
                    return {
                        flags: { ...s.flags, basketball_stage: win ? 1 : 0 },
                        general: { ...s.general, health: s.general.health - 6, mindset: s.general.mindset + (win ? 30 : 5), romance: s.general.romance + (win ? 6 : 2) },
                        log: [...s.log, { message: win ? '终场哨响，你们班捧起了年级篮球冠军！' : '惜败夺亚，全场依然为你们的拼劲鼓掌。', type: win ? 'success' : 'info', timestamp: Date.now() }]
                    };
                }
            },
            {
                text: '稳扎稳打打团队配合',
                action: (s) => {
                    const win = Math.random() < 0.4 + s.general.experience / 250;
                    return {
                        flags: { ...s.flags, basketball_stage: win ? 1 : 0 },
                        general: { ...s.general, experience: s.general.experience + 8, mindset: s.general.mindset + (win ? 25 : 8) },
                        log: [...s.log, { message: win ? '默契传切打穿防线，你们拿下了冠军！' : '虽然遗憾错失冠军，但这次配合默契十足。', type: win ? 'success' : 'info', timestamp: Date.now() }]
                    };
                }
            }
        ]
    },
    {
        id: 's2_spring_trip_photo',
        title: '春游合照',
        description: '春游进行到一半，大家提议在风景最好的地方拍一张大合照。',
        type: 'positive',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && !!s.flags.went_spring_trip && s.week === 14,
        choices: [
            { text: '找个好位置', action: (s) => ({ general: { ...s.general, romance: s.general.romance + 5, mindset: s.general.mindset + 5 } }) }
        ]
    },
    {
        id: 's2_spring_trip_lost',
        title: '春游小插曲',
        description: '在自由活动时间，你为了买特色纪念品，和同学们走散了。',
        type: 'neutral',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && !!s.flags.went_spring_trip && s.week === 14,
        choices: [
            { text: '赶紧联系班长', action: (s) => ({ general: { ...s.general, experience: s.general.experience + 5 } }) }
        ]
    },
    // --- DEBATE PROGRESSION ---
    {
        id: 's2_debate_quarter',
        title: '辩论赛 8进4',
        description: '你们队成功杀入八强！这场的辩题非常刁钻，比赛十分焦灼。',
        type: 'positive', triggerType: 'CONDITIONAL', once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && s.flags.debate_stage === 8 && s.week >= 13 && s.week <= 14,
        choices: [
            { 
                text: '背水一战', 
                action: (s) => {
                    const win = Math.random() < 0.5 + (s.general.mindset - 50)/200;
                    return {
                        flags: { ...s.flags, debate_stage: win ? 4 : 0 },
                        general: { ...s.general, mindset: s.general.mindset + (win ? 20 : -10) },
                        log: [...s.log, { message: win ? '惊险取胜，挺进半决赛！' : '发挥失常，遗憾淘汰。', type: win ? 'success' : 'warning', timestamp: Date.now() }]
                    }
                }
            }
        ]
    },
    {
        id: 's2_debate_semi',
        title: '辩论赛 半决赛的黑幕',
        description: '四强赛！全校都在关注这场比赛。但就在上场前，你们突然发现一个致命问题：组委会通知双方抽签竟然都抽到了正方，然而你们队伍辛辛苦苦准备了一周的实际上是反方的稿子！',
        type: 'negative', triggerType: 'CONDITIONAL', once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && s.flags.debate_stage === 4 && s.week === 15,
        choices: [
            { 
                text: '当场声明并留存经验，不打不公平的局', 
                action: (s) => {
                    return {
                        flags: { ...s.flags, debate_stage: 0 },
                        general: { ...s.general, experience: s.general.experience + 12, romance: s.general.romance + 4, mindset: s.general.mindset - 8 },
                        log: [...s.log, { message: '你们体面申诉后退赛，在场同学都认可你们坚持原则的态度。', type: 'warning', timestamp: Date.now() }]
                    }
                }
            },
            { 
                text: '不管了，全部脱稿硬刚！', 
                action: (s) => {
                    const win = Math.random() < 0.15 + (s.general.mindset - 50)/300;
                    return {
                        flags: { ...s.flags, debate_stage: win ? 2 : 0 },
                        general: { ...s.general, experience: s.general.experience + 20, mindset: s.general.mindset + (win ? 40 : -20) },
                        log: [...s.log, { message: win ? '奇迹发生！凭借强大的临场应变能力逆天改命，杀入总决赛！' : '准备完全作废，临场发挥不佳，遗憾落败。', type: win ? 'success' : 'warning', timestamp: Date.now() }]
                    }
                }
            }
        ]
    },
    {
        id: 's2_debate_final',
        title: '辩论赛 总决赛',
        description: '站在大礼堂的聚光灯下，你们离冠军只有一步之遥！',
        type: 'positive', triggerType: 'CONDITIONAL', once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && s.flags.debate_stage === 2 && s.week === 17,
        choices: [
            { 
                text: '为了冠军！', 
                action: (s) => {
                    const win = Math.random() < 0.3 + (s.general.experience)/200;
                    return {
                        flags: { ...s.flags, debate_stage: win ? 1 : 0, achievement_debater: win ? true : undefined },
                        general: { ...s.general, experience: s.general.experience + 20, mindset: s.general.mindset + (win ? 50 : 10) },
                        log: [...s.log, { message: win ? '我们是冠军！！！' : '获得亚军，已经很棒了。', type: win ? 'success' : 'info', timestamp: Date.now() }]
                    }
                }
            }
        ]
    },
    // --- DRAMA PROGRESSION ---
    {
        id: 's2_drama_audition',
        title: '英语戏剧节 选角',
        description: '戏剧节马上开始排练了，你决定竞选什么角色？',
        type: 'neutral', triggerType: 'CONDITIONAL', once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && !!s.flags.drama_joined && s.week === 14,
        choices: [
            { text: '竞选主角 (英语水平≥15 或 天赋≥75)', condition: (s) => s.subjects.english.level >= 15 || s.subjects.english.aptitude >= 75, action: (s) => ({ flags: { ...s.flags, drama_progress: 1, drama_role: 'main' }, general: { ...s.general, mindset: s.general.mindset - 5 } }) },
            { text: '当个配角/旁白', action: (s) => ({ flags: { ...s.flags, drama_progress: 1, drama_role: 'sub' } }) },
            { text: '负责幕后道具与统筹', action: (s) => ({ flags: { ...s.flags, drama_progress: 1, drama_role: 'prop' } }) }
        ]
    },
    {
        id: 's2_drama_rehearsal',
        title: '戏剧节 排练',
        description: state => state.flags.drama_role === 'prop'
            ? '放学后，剧组借了间空教室走一遍。两件道具看起来差不多，上场顺序却刚好相反。'
            : '放学后，剧组借了间空教室走一遍。台词背熟了，换场时还是有人走错边。',
        type: 'neutral', triggerType: 'CONDITIONAL', once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && s.flags.drama_progress === 1 && s.week === 16,
        choices: [
            {
                text: '把换场和接台词再过一遍',
                condition: state => state.flags.drama_role !== 'prop',
                resultDescription: '你们把走错的一段重来了一遍，约好听见上一句台词再从幕边往前走。',
                action: state => ({ flags: { ...state.flags, drama_progress: 2 }, general: { ...state.general, health: state.general.health - 5, experience: state.general.experience + 10 } })
            },
            {
                text: '给道具贴上出场顺序',
                condition: state => state.flags.drama_role === 'prop',
                resultDescription: '你把两件道具分开摆，又写了张能在昏暗里看清的清单，让接手的人也能马上找到。',
                action: state => ({ flags: { ...state.flags, drama_progress: 2 }, general: { ...state.general, health: state.general.health - 5, experience: state.general.experience + 10 } })
            }
        ]
    },
    {
        id: 's2_drama_performance',
        title: '英语戏剧节 正式演出！',
        description: state => state.flags.drama_role === 'prop'
            ? '轮到你们班了。灯一暗，前台有人伸手催下一件道具。你认出了彩排时贴的标记。'
            : '轮到你们班了。台下渐渐安静下来，幕边的同学正等你接上第一句。',
        type: 'positive', triggerType: 'CONDITIONAL', once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && s.flags.drama_progress === 2 && s.week === 18,
        choices: [
            {
                text: '听准提示，把自己的戏接上',
                condition: state => state.flags.drama_role !== 'prop',
                resultDescription: '短短几分钟比彩排过得快。最后一幕走完，你才听见台下开始鼓掌。',
                action: state => ({
                    flags: { ...state.flags, drama_performed: true },
                    general: {
                        ...state.general,
                        mindset: state.general.mindset + (state.flags.drama_role === 'main' ? 28 : 18),
                        romance: state.general.romance + (state.flags.drama_role === 'main' ? 8 : 4),
                        experience: state.general.experience + 8
                    }
                })
            },
            {
                text: '照清单递道具，确认下一幕也摆好了',
                condition: state => state.flags.drama_role === 'prop',
                resultDescription: '幕布合上前，台上同学回头跟你比了个手势。你这才发现手里还攥着那张被揉皱的清单。',
                action: state => ({
                    flags: { ...state.flags, drama_performed: true },
                    general: {
                        ...state.general,
                        mindset: state.general.mindset + 12,
                        romance: state.general.romance + 2,
                        experience: state.general.experience + 14,
                        efficiency: state.general.efficiency + 1
                    }
                })
            }
        ]
    },
    // --- ACADEMIC PROFICIENCY EXAM (学考) ---
    {
        id: 's2_academic_exam',
        title: '高中学业水平合格考',
        description: '这次报名表上是化学、生物、历史和地理。每门各判一次合格，你准备用多少时间过一遍没弄懂的内容？',
        type: 'negative', triggerType: 'FIXED', once: true, fixedWeek: 19,
        choices: [
            { 
                text: '集中补一补薄弱的科目',
                hint: '各科过关更稳，会多消耗一些体力。',
                action: state => finishProficiencyExam(state, true)
            },
            {
                text: '按平常的节奏准备，给期末留点精力',
                action: state => finishProficiencyExam(state, false)
            }
        ]
    },
    // --- RANDOM FILLERS ---
    {
        id: 's2_spring_fatigue',
        title: '春困秋乏',
        description: '外面的阳光暖洋洋的，微风吹过，你坐在教室里上物理课，眼皮疯狂打架。',
        type: 'negative', triggerType: 'RANDOM', once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && s.week >= 6 && s.week <= 14,
        choices: [
            { text: '死撑着听课', action: (s) => ({ general: { ...s.general, health: s.general.health - 5, efficiency: s.general.efficiency - 2 } }) },
            { text: '偷偷睡一觉', action: (s) => ({ general: { ...s.general, health: s.general.health + 5, efficiency: s.general.efficiency + 2 }, sleepCount: (s.sleepCount || 0) + 1 }) }
        ]
    },
    {
        id: 's2_seat_change',
        title: '换座位的悸动',
        description: '班主任宣布本周重新排座位，你暗暗祈祷能和心仪的那个TA坐得近一点。',
        type: 'neutral', triggerType: 'RANDOM', once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && s.general.romance > 10,
        choices: [
            { text: '期待', action: (s) => {
                const luck = Math.random() > 0.5;
                return {
                    general: { ...s.general, mindset: s.general.mindset + (luck ? 10 : -5), romance: s.general.romance + (luck ? 5 : -2) },
                    log: [...s.log, { message: luck ? '竟然真的坐在了附近！' : '离得很远，有点失落。', type: luck ? 'success' : 'info', timestamp: Date.now() }]
                }
            } }
        ]
    }
];

export const WINTER_BREAK_EVENTS: GameEvent[] = [
    {
        id: 'wb_new_year',
        title: '除夕夜',
        description: '今天是除夕，外面鞭炮齐鸣，家里热热闹闹的。',
        type: 'positive',
        once: true,
        triggerType: 'FIXED',
        fixedWeek: 3,
        choices: [
            {
                text: '吃年夜饭，收压岁钱！',
                resultDescription: '一家人热热闹闹吃过年夜饭，你把长辈塞来的压岁钱收进小金库。',
                action: (s) => ({ general: { ...s.general, money: s.general.money + 200, mindset: s.general.mindset + 20 } })
            }
        ]
    }
];
