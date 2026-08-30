import { GameEvent, Phase } from '../types';

const oiTotal = (state: Parameters<NonNullable<GameEvent['condition']>>[0]): number => {
    const stats = state.oiStats;
    return stats.dp + stats.ds + stats.math + stats.string + stats.graph + stats.misc;
};

export const OI_EVENTS: GameEvent[] = [
    // ---------------- NOIWC (Winter Break) ----------------
    {
        id: 'oi_wc_invite',
        title: 'NOIWC 冬令营邀请',
        description: '你的 CSP-S 成绩超过 280 分，收到了 NOI 冬令营的报名通知。去不去，要自己安排时间和费用。',
        type: 'positive',
        once: true,
        triggerType: 'FIXED',
        fixedWeek: 2,
        condition: (s) => s.phase === Phase.WINTER_BREAK && s.competition === 'OI' && (s.flags.csp_score || 0) > 280,
        choices: [
            { 
                text: '前往报到', 
                action: (s) => ({ 
                    eventQueue: [
                        {...OI_EVENTS_POOL.find(e=>e.id==='oi_wc_arrive')! }
                    ]
                }) 
            },
            { 
                text: '算了，我要在家里卷', 
                action: (s) => ({ general: { ...s.general, mindset: s.general.mindset - 10, efficiency: s.general.efficiency + 5 } }) 
            }
        ]
    },
    // ---------------- 省选 (Semester 2, Week 4) ----------------
    {
        id: 'oi_provincial_invite',
        title: '联合省选集结令',
        description: 'NOIP 成绩出来后，你在报名名单里看到了自己的名字。八中没有一支成熟的校队，能不能走到省队，更多取决于你这一学期自己刷题、参加线上赛和跨校训练留下的积累。',
        type: 'neutral',
        once: true,
        triggerType: 'FIXED',
        fixedWeek: 4,
        condition: (s) => s.phase === Phase.SEMESTER_2 && s.competition === 'OI' && (s.flags.noip_score || 0) >= 180 && (Number(s.flags.oi_practice_sessions || 0) >= 4 || oiTotal(s) >= 24),
        choices: [
            {
                text: '迎战省选！',
                action: (s) => ({
                    eventQueue: [
                        {...OI_EVENTS_POOL.find(e=>e.id==='oi_provincial_day1')!}
                    ]
                })
            },
            {
                text: '我感觉希望渺茫，专心搞文化课吧',
                action: (s) => ({
                    competition: 'None',
                    general: { ...s.general, efficiency: s.general.efficiency + 10, mindset: s.general.mindset - 20 }
                })
            }
        ]
    },
    // ---------------- APIO (Semester 2, Week 12) ----------------
    {
        id: 'oi_apio_invite',
        title: 'APIO 亚洲与太平洋地区信息学奥林匹克',
        description: '你报名参加了 APIO 线上赛。它不等着学校替你安排，报名、看英文题面和调试都得自己完成；这是一场很好的检验。',
        type: 'positive',
        once: true,
        triggerType: 'FIXED',
        fixedWeek: 12,
        condition: (s) => s.phase === Phase.SEMESTER_2 && s.competition === 'OI' && (s.flags.noip_score || 0) > 200 && Number(s.flags.oi_practice_sessions || 0) >= 5,
        choices: [
            {
                text: '参加线上测试',
                action: (s) => ({
                    eventQueue: [
                        {...OI_EVENTS_POOL.find(e=>e.id==='oi_apio_exam')!}
                    ]
                })
            },
            {
                text: '放弃参赛',
                action: (s) => ({ general: { ...s.general, money: s.general.money + 50 } }) // Saved registration fee
            }
        ]
    },
    // ---------------- NOI (Summer Break, Week 2) ----------------
    {
        id: 'oi_noi_invite',
        title: 'NOI 全国青少年信息学奥林匹克竞赛',
        description: '你进入了省队，拿到了参加 NOI 的资格。接下来是正式比赛，结果不会因为进队就提前写好。',
        type: 'positive',
        once: true,
        triggerType: 'FIXED',
        fixedWeek: 2,
        condition: (s) => s.phase === Phase.SUMMER_BREAK && s.competition === 'OI' && !!s.flags.provincial_team,
        choices: [
            {
                text: '出征 NOI！',
                action: (s) => ({
                    eventQueue: [
                        {...OI_EVENTS_POOL.find(e=>e.id==='oi_noi_arrive')!}
                    ]
                })
            }
        ]
    }
];

export const OI_EVENTS_POOL: GameEvent[] = [
    // WC Events
    {
        id: 'oi_wc_arrive',
        title: 'NOIWC 报到与开幕式',
        description: '你到了全国冬令营现场。报到、讲座和训练安排排得很满，周围的人大多已经有过几次大赛经历。',
        type: 'neutral',
        triggerType: 'CHAINED',
        choices: [
            {
                text: '认真听讲座，记笔记',
                action: (s) => ({
                    general: { ...s.general, experience: s.general.experience + 10, mindset: s.general.mindset - 5 },
                    phase: Phase.WC_EXAM
                })
            },
            {
                text: '在下面偷偷刷题',
                action: (s) => ({
                    general: { ...s.general, efficiency: s.general.efficiency + 2 },
                    phase: Phase.WC_EXAM
                })
            }
        ]
    },
    {
        id: 'oi_wc_result', // Triggered in handleExamFinish or closeExamResult if Phase.WC_EXAM ends
        title: 'NOIWC 赛后活动',
        description: '考试结束后，晚上有文艺汇演，第二天还能旁听国家集训队答辩。你第一次近距离看到不同省份的选手怎样准备比赛。',
        type: 'positive',
        triggerType: 'CHAINED',
        choices: [
            {
                text: '看完答辩，查自己的成绩',
                action: (s) => {
                    const score = s.flags.wc_score || 0;
                    let msg = '';
                    if (score >= 420) { msg = '这次发挥很好，成绩达到冬令营前列。'; }
                    else if (score >= 300) { msg = '成绩还算稳，几道题的失分原因已经很清楚。'; }
                    else { msg = '题目比平时训练难不少。这次主要是来认识差距，回去还得补题。'; }
                    return {
                        general: { ...s.general, mindset: s.general.mindset + 20, experience: s.general.experience + 30 },
                        log: [...s.log, { message: msg, type: score > 80 ? 'success' : 'warning', timestamp: Date.now() }]
                    };
                }
            }
        ]
    },

    // Provincial Events
    {
        id: 'oi_provincial_day1',
        title: '联合省选 Day 1',
        description: '赛前一天去试机，你在签到群里认识的几个人终于见了面。有人聊题，有人只确认了键盘和编译环境。第一天考试快开始了。',
        type: 'neutral',
        triggerType: 'CHAINED',
        choices: [
            {
                text: '深呼吸，进入考场',
                action: (s) => ({ phase: Phase.PROVINCIAL_EXAM })
            }
        ]
    },
    {
        id: 'oi_provincial_result', 
        title: '联合省选 Day 2 与落幕',
        description: '两天考试结束。各省的名额和分数线按当年的成绩分布确定，不能只拿别人的往年线来估计。',
        type: 'neutral',
        triggerType: 'CHAINED',
        choices: [
            {
                text: '查看省队名单',
                action: (s) => {
                    const score = s.flags.provincial_score || 0;
                    // Provincial lines vary by year. Treat a borderline score as
                    // uncertain instead of making one low cutoff universal.
                    let madeTeam = false;
                    if (score >= 430) madeTeam = true;
                    else if (score >= 340) madeTeam = Math.random() < 0.6;
                    else if (score >= 260) madeTeam = Math.random() < 0.2;
                    else madeTeam = Math.random() < 0.05;
                    
                    if (madeTeam) {
                        return {
                            flags: { ...s.flags, provincial_team: true },
                            general: { ...s.general, mindset: s.general.mindset + 50, experience: s.general.experience + 50 },
                            log: [...s.log, { message: "你进入了省队，拿到了参加 NOI 的资格。接下来还要继续训练。", type: 'success', timestamp: Date.now() }]
                        };
                    } else {
                        return {
                            general: { ...s.general, mindset: s.general.mindset - 40, efficiency: s.general.efficiency + 20 },
                            log: [...s.log, { message: `你的总分为 ${score}，没有进省队。分数线和名额要等正式名单，结果只能接受。`, type: 'error', timestamp: Date.now() }]
                        };
                    }
                }
            }
        ]
    },

    // APIO Events
    {
        id: 'oi_apio_exam',
        title: 'APIO 线上测试',
        description: '比赛开始，题面以英文为主。你得先确认题意，再安排读题和写代码的时间。',
        type: 'neutral',
        triggerType: 'CHAINED',
        choices: [
            {
                text: '开始答题',
                action: (s) => ({ phase: Phase.APIO_EXAM })
            }
        ]
    },
    {
        id: 'oi_apio_result',
        title: 'APIO 成绩公布',
        description: '成绩公布。线上赛少了报到和现场环节，但题目的难度和赛后复盘都还在。',
        type: 'positive',
        triggerType: 'CHAINED',
        choices: [
            {
                text: '看看自己的排名',
                action: (s) => {
                    const score = s.flags.apio_score || 0;
                    let msg = '';
                    if (score >= 420) { msg = '这次成绩达到 APIO 前列。'; }
                    else if (score >= 300) { msg = '成绩不错，至少有几道题完整做出了。'; }
                    else { msg = '分数不高，但你知道自己在哪些题型上还不熟。'; }
                    return {
                        general: { ...s.general, experience: s.general.experience + 15 },
                        log: [...s.log, { message: msg, type: 'info', timestamp: Date.now() }]
                    };
                }
            }
        ]
    },

    // NOI Events
    {
        id: 'oi_noi_arrive',
        title: 'NOI 报到日：徽章交换',
        description: '你抵达 NOI 举办学校。报到后，很多人拿着省队或学校的徽章互相交换，也顺便和以前只在群里见过的人打了招呼。',
        type: 'positive',
        triggerType: 'CHAINED',
        choices: [
            {
                text: '去换徽章，认识几个人',
                action: (s) => ({
                    general: { ...s.general, romance: s.general.romance + 15, mindset: s.general.mindset + 30 },
                    eventQueue: [{...OI_EVENTS_POOL.find(e=>e.id==='oi_noi_exam_start')!}]
                })
            },
            {
                text: '回宿舍再看一会题',
                action: (s) => ({
                    general: { ...s.general, efficiency: s.general.efficiency + 5 },
                    eventQueue: [{...OI_EVENTS_POOL.find(e=>e.id==='oi_noi_exam_start')!}]
                })
            }
        ]
    },
    {
        id: 'oi_noi_exam_start',
        title: 'NOI Day 1',
        description: 'NOI Day 1 开始。上午的笔试结束后进入上机，周围只剩键盘和提交提示音。',
        type: 'neutral',
        triggerType: 'CHAINED',
        choices: [
            {
                text: '全神贯注，开题！',
                action: (s) => ({ phase: Phase.NOI_EXAM })
            }
        ]
    },
    {
        id: 'oi_noi_social_practice',
        title: '社会实践日 & Day 2',
        description: 'Day 1 结束后，中间安排了一天活动。有人去参观，有人留在住处补觉，第二天继续考试。',
        type: 'neutral',
        triggerType: 'CHAINED',
        choices: [
            {
                text: '随波逐流，完成 Day 2',
                action: (s) => {
                    // We only have one NOI exam phase in our game for simplicity, 
                    // so we represent Day 2 narratively.
                    return {
                        eventQueue: [{...OI_EVENTS_POOL.find(e=>e.id==='oi_noi_result')!}]
                    };
                }
            }
        ]
    },
    {
        id: 'oi_noi_result',
        title: 'NOI 成绩公布',
        description: '比赛结束，成绩和排名公布。奖牌、名次和后续机会都以正式结果为准。',
        type: 'positive',
        triggerType: 'CHAINED',
        choices: [
            {
                text: '查看奖牌',
                action: (s) => {
                    const score = s.flags.noi_score || 0;
                    let msg = '';
                    if (score >= 600) {
                        msg = '你拿到了 NOI 金牌，成绩进入国家集训队选拔范围。';
                    } else if (score >= 450) {
                        msg = '你拿到了 NOI 银牌，获得了后续强基计划的竞争机会。';
                    } else if (score >= 300) {
                        msg = '你拿到了 NOI 铜牌，至少把这段省队经历完整走完了。';
                    } else {
                        msg = '你参加完了 NOI，但分数没有达到奖牌线。回去后要不要继续写题，再慢慢决定。';
                    }
                    return {
                        general: { ...s.general, mindset: s.general.mindset + 100 },
                        flags: { ...s.flags, noi_medal: score >= 600 ? 'GOLD' : (score >= 450 ? 'SILVER' : (score >= 300 ? 'BRONZE' : 'PARTICIPANT')) },
                        log: [...s.log, { message: msg, type: score >= 600 ? 'success' : 'info', timestamp: Date.now() }]
                    };
                }
            }
        ]
    }
];
