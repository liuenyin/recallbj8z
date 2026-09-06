import { GameEvent, Phase } from '../types';
import { modifyOI } from './utils';

const SCHOOL_PHASES = [Phase.SEMESTER_1, Phase.SEMESTER_2];

/** OI route beats that turn training into a small, readable story arc. */
export const OI_ROUTE_EVENTS: GameEvent[] = [
    {
        id: 'oi_training_group',
        title: '训练群里的小组',
        description: '训练群里几个人约着每周讲题，谁碰到卡住的地方就拿出来一起看。你进群时，他们把讨论文档的链接发给了你。',
        type: 'neutral',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.competition === 'OI' && s.phase === Phase.SEMESTER_1 && s.week >= 3 && s.week <= 8 && !s.flags.oi_training_group,
        choices: [
            {
                text: '加入小组，轮流讲题',
                tags: ['study', 'social'],
                action: (s) => ({
                    flags: { ...s.flags, oi_training_group: true },
                    general: { ...s.general, experience: s.general.experience + 6, romance: s.general.romance + 2, mindset: s.general.mindset + 2 },
                    oiStats: modifyOI(s, { ds: 1, misc: 1 })
                })
            },
            {
                text: '先一个人刷题',
                tags: ['study'],
                action: (s) => ({
                    flags: { ...s.flags, oi_training_group: false },
                    general: { ...s.general, experience: s.general.experience + 4, mindset: s.general.mindset - 1 },
                    oiStats: modifyOI(s, { dp: 1 })
                })
            }
        ]
    },
    {
        id: 'oi_external_training',
        title: '去外校听一场课',
        description: '八中没有固定的竞赛教练。训练群里转来一场外校周末课的通知，地点、费用和讲什么都写在报名表里。',
        type: 'neutral',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.competition === 'OI' && s.phase === Phase.SEMESTER_1 && s.week >= 8 && s.week <= 12 && !s.flags.oi_external_training,
        choices: [
            {
                text: '买票去听课',
                tags: ['study'],
                resultDescription: '坐地铁去听了一天课，讲义比你手上的旧资料新一些。课后还有人留下来讨论，你顺手加了几个联系方式。',
                action: (s) => ({
                    flags: { ...s.flags, oi_external_training: true },
                    general: { ...s.general, money: s.general.money - 20, experience: s.general.experience + 5, mindset: s.general.mindset - 2, health: s.general.health - 2 },
                    oiStats: modifyOI(s, { math: 1, graph: 1 })
                })
            },
            {
                text: '留在学校自己练',
                tags: ['study'],
                resultDescription: '你把题单下载下来，在学校把能找到的资料先过了一遍。不会的地方先记在本子上，等群里有人开讲。',
                action: (s) => ({
                    flags: { ...s.flags, oi_external_training: false },
                    general: { ...s.general, experience: s.general.experience + 3, mindset: s.general.mindset + 1 },
                    oiStats: modifyOI(s, { misc: 1 })
                })
            }
        ]
    },
    {
        id: 'oi_noip_recap',
        title: '写不写这篇游记',
        description: 'NOIP 成绩出来了。群里有人把赛前、考场和赛后整理成一篇游记，你也开了个空白文档，准备把失分写清楚。',
        type: 'neutral',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.competition === 'OI' && typeof s.flags.noip_score === 'number' && s.phase === Phase.SEMESTER_1 && s.week >= 14 && s.week <= 18 && !s.flags.oi_recap_written,
        choices: [
            {
                text: '把失分原因写下来',
                tags: ['study'],
                resultDescription: '你记下了哪几题没读懂、哪几个小时花在了错误方向上。下次训练至少知道先补什么。',
                action: (s) => ({
                    flags: { ...s.flags, oi_recap_written: true },
                    general: { ...s.general, experience: s.general.experience + 5, mindset: s.general.mindset + 2 },
                    oiStats: modifyOI(s, { misc: 1 })
                })
            },
            {
                text: '先关掉文档，继续刷题',
                tags: ['study'],
                resultDescription: '你不想现在回看，先把下一张题单打开。成绩先放着，错题以后再说。',
                action: (s) => ({
                    flags: { ...s.flags, oi_recap_written: false },
                    general: { ...s.general, mindset: s.general.mindset - 2 },
                    oiStats: modifyOI(s, { dp: 2 })
                })
            }
        ]
    },
    {
        id: 'oi_recap_followup',
        title: '游记里列的错题',
        description: '寒假第一周，你翻回那篇游记。里面列着几道没读懂的题，还有一行自己写的备注：别只看题解。',
        type: 'neutral',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.competition === 'OI' && s.flags.oi_recap_written === true && s.phase === Phase.WINTER_BREAK && s.week >= 1 && s.week <= 4 && !s.flags.oi_recap_reviewed,
        choices: [
            {
                text: '先独立重做，再对照题解',
                tags: ['study'],
                resultDescription: '有两道题还是不会，但你把卡住的步骤写了下来，再去看题解时能对上问题。',
                action: (s) => ({
                    flags: { ...s.flags, oi_recap_reviewed: true },
                    general: { ...s.general, experience: s.general.experience + 4, mindset: s.general.mindset - 1 },
                    oiStats: modifyOI(s, { dp: 1, misc: 1 })
                })
            },
            {
                text: '先做新的题单',
                tags: ['study'],
                resultDescription: '新题做得更顺手，但游记里的那几道题仍然留在原处。',
                action: (s) => ({
                    flags: { ...s.flags, oi_recap_reviewed: 'skipped' },
                    general: { ...s.general, experience: s.general.experience + 2, health: s.general.health - 1 },
                    oiStats: modifyOI(s, { dp: 2 })
                })
            }
        ]
    },
    {
        id: 'oi_setter_invite',
        title: '出题组的邀请',
        description: '训练群里一位学长正在给一次公开赛组卷，缺一个愿意把想法写成完整题面的人，问你要不要试试。',
        type: 'positive',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.competition === 'OI' && s.flags.oi_training_group === true && SCHOOL_PHASES.includes(s.phase) && ((s.phase === Phase.SEMESTER_1 && s.week >= 7 && s.week <= 19) || (s.phase === Phase.SEMESTER_2 && s.week <= 4)) && !s.flags.oi_setter,
        choices: [
            {
                text: '接受邀请，加入出题组',
                tags: ['study', 'social'],
                action: (s) => ({
                    flags: { ...s.flags, oi_setter: true },
                    general: { ...s.general, experience: s.general.experience + 8, mindset: s.general.mindset - 3 },
                    oiStats: modifyOI(s, { misc: 2 })
                })
            },
            {
                text: '婉拒，专心备赛',
                tags: ['study'],
                action: (s) => ({
                    flags: { ...s.flags, oi_setter: false },
                    general: { ...s.general, experience: s.general.experience + 3, mindset: s.general.mindset + 2 },
                    oiStats: modifyOI(s, { dp: 2 })
                })
            }
        ]
    },
    {
        id: 'oi_problem_draft',
        title: '把想法写成题目',
        description: '你有了一个算法想法，但写成别人看得懂、做得出来的题面并不简单。出题组的截稿时间快到了。',
        type: 'neutral',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.competition === 'OI' && s.flags.oi_setter === true && ((s.phase === Phase.SEMESTER_1 && s.week >= 10 && s.week <= 20) || (s.phase === Phase.SEMESTER_2 && s.week <= 7)) && !s.flags.oi_problem_drafted,
        choices: [
            {
                text: '把样例和证明都打磨好',
                tags: ['study'],
                resultDescription: '题面、样例和证明都过了一遍，接下来还要交给出题组验题。',
                action: (s) => ({
                    flags: {
                        ...s.flags,
                        oi_problem_drafted: true,
                        oi_problem_drafted_phase: s.phase,
                        oi_problem_drafted_week: s.week,
                        oi_problem_quality: 'polished'
                    },
                    general: { ...s.general, experience: s.general.experience + 8, mindset: s.general.mindset - 4 },
                    oiStats: modifyOI(s, { math: 1, misc: 2 })
                })
            },
            {
                text: '先交上去，细节以后再说',
                tags: ['risky'],
                resultDescription: '题面赶在截止前交了上去。你知道还有几处数据和题面没有完全放心。',
                action: (s) => ({
                    flags: {
                        ...s.flags,
                        oi_problem_drafted: true,
                        oi_problem_drafted_phase: s.phase,
                        oi_problem_drafted_week: s.week,
                        oi_problem_quality: 'rough'
                    },
                    general: { ...s.general, experience: s.general.experience + 3, mindset: s.general.mindset + 1 },
                    oiStats: modifyOI(s, { misc: 1 })
                })
            }
        ]
    },
    {
        id: 'oi_problem_testing',
        title: '验题与数据',
        description: '出题组把正解、暴力和数据放到一起跑。你负责看边界，学长负责对拍。',
        type: 'neutral',
        triggerType: 'CONDITIONAL',
        once: true,
        // A draft must be handed off to testing in a later week. This avoids
        // presenting an immediate follow-up before the author has had time to
        // submit the draft to the public-contest group.
        condition: (s) => {
            if (s.competition !== 'OI' || s.flags.oi_setter !== true || s.flags.oi_problem_drafted !== true || s.flags.oi_problem_tested) return false;
            const draftedPhase = s.flags.oi_problem_drafted_phase;
            const draftedWeek = Number(s.flags.oi_problem_drafted_week);
            if (draftedPhase && Number.isFinite(draftedWeek)) {
                if (s.phase !== draftedPhase || s.week <= draftedWeek) return false;
            }
            return (s.phase === Phase.SEMESTER_1 && s.week >= 11 && s.week <= 21)
                || (s.phase === Phase.SEMESTER_2 && s.week <= 9);
        },
        choices: [
            {
                text: '补一组边界数据',
                tags: ['study'],
                resultDescription: '对拍时确实抓到一个边界问题。改完后，题目才放心放进公开赛。',
                action: (s) => ({
                    flags: { ...s.flags, oi_problem_tested: 'passed', oi_problem_published: true },
                    general: { ...s.general, experience: s.general.experience + 5, mindset: s.general.mindset - 2 },
                    oiStats: modifyOI(s, { misc: 1 })
                })
            },
            {
                text: '样例能过就先上线',
                tags: ['risky'],
                resultDescription: '公开赛按时开了。你把剩下的担心留给了参赛者的提交记录。',
                action: (s) => ({
                    flags: { ...s.flags, oi_problem_tested: 'unchecked', oi_problem_published: true },
                    general: { ...s.general, experience: s.general.experience + 2, mindset: s.general.mindset + 1 }
                })
            }
        ]
    },
    {
        id: 'oi_problem_feedback',
        title: '题目上线后的反馈',
        description: '公开赛结束后，有人来讨论那道题：有人觉得有意思，也有人指出题面里有一处歧义。',
        type: 'neutral',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.competition === 'OI' && s.flags.oi_setter === true && s.flags.oi_problem_published === true && s.flags.oi_problem_quality === 'rough' && s.phase === Phase.SEMESTER_2 && s.week >= 5 && s.week <= 11 && !s.flags.oi_problem_feedback,
        choices: [
            {
                text: '承认问题，重新整理题面',
                tags: ['study'],
                action: (s) => ({
                    flags: { ...s.flags, oi_problem_feedback: 'resolved', oi_setter_reputation: 'good' },
                    general: { ...s.general, experience: s.general.experience + 6, mindset: s.general.mindset - 5, health: s.general.health - 2 },
                    oiStats: modifyOI(s, { misc: 2 })
                })
            },
            {
                text: '先不改，等大家慢慢讨论',
                tags: ['risky'],
                action: (s) => ({
                    flags: { ...s.flags, oi_problem_feedback: 'defended', oi_setter_reputation: 'shaky' },
                    general: { ...s.general, experience: s.general.experience + 2, mindset: s.general.mindset - 3 }
                })
            }
        ]
    },
    {
        id: 'oi_problem_review_polished',
        title: '题目上线后的反馈',
        description: '公开赛结束后，学长把几条反馈发到群里。大多数人做出了题，也有人卡在了你没想到的地方。',
        type: 'positive',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.competition === 'OI' && s.flags.oi_setter === true && s.flags.oi_problem_published === true && s.flags.oi_problem_quality === 'polished' && s.phase === Phase.SEMESTER_2 && s.week >= 5 && s.week <= 11 && !s.flags.oi_problem_feedback,
        choices: [
            {
                text: '记下大家卡住的地方',
                tags: ['study'],
                resultDescription: '你把反馈按题面、数据和解法分开记下来。下次写题时，至少知道先检查什么。',
                action: (s) => ({
                    flags: { ...s.flags, oi_problem_feedback: 'positive', oi_setter_reputation: 'good' },
                    general: { ...s.general, experience: s.general.experience + 6, mindset: s.general.mindset + 2 },
                    oiStats: modifyOI(s, { misc: 1 })
                })
            },
            {
                text: '看完反馈就算了',
                tags: ['social'],
                resultDescription: '题目顺利交付，你把剩下的时间留给了训练。',
                action: (s) => ({
                    flags: { ...s.flags, oi_problem_feedback: 'accepted', oi_setter_reputation: 'steady' },
                    general: { ...s.general, experience: s.general.experience + 3, mindset: s.general.mindset + 1 }
                })
            }
        ]
    },
    {
        id: 'oi_setter_followup',
        title: '下一套题还缺一个人',
        description: '上次公开赛结束后，出题组又来问你。这次给新生赛出题，时间和训练周末撞在了一起。',
        type: 'neutral',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.competition === 'OI' && s.flags.oi_setter === true && ['positive', 'resolved'].includes(s.flags.oi_problem_feedback) && s.phase === Phase.SEMESTER_2 && s.week >= 12 && s.week <= 18 && !s.flags.oi_setter_followup,
        choices: [
            {
                text: '接下这套题',
                tags: ['study', 'social'],
                resultDescription: '你和学长约好分工，先从一道中档题开始。训练计划得重新排一排了。',
                action: (s) => ({
                    flags: { ...s.flags, oi_setter_followup: 'accepted' },
                    general: { ...s.general, experience: s.general.experience + 7, mindset: s.general.mindset - 4 },
                    oiStats: modifyOI(s, { misc: 2 })
                })
            },
            {
                text: '这次先准备比赛',
                tags: ['study'],
                resultDescription: '你把周末空出来刷题。出题组说，等下次有合适的题再找你。',
                action: (s) => ({
                    flags: { ...s.flags, oi_setter_followup: 'declined' },
                    general: { ...s.general, experience: s.general.experience + 3, mindset: s.general.mindset + 1 },
                    oiStats: modifyOI(s, { dp: 2 })
                })
            }
        ]
    },
    {
        id: 'oi_team_practice',
        title: '周六的联合模拟赛',
        description: '训练小组约了一个下午的模拟赛。题不算新，难的是几个人要把思路讲清楚。',
        type: 'neutral',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.competition === 'OI' && s.flags.oi_training_group === true && Number(s.flags.oi_practice_sessions || 0) >= 3 && ((s.phase === Phase.SEMESTER_1 && s.week >= 9) || (s.phase === Phase.SEMESTER_2 && s.week <= 8)) && !s.flags.oi_team_practice,
        choices: [
            {
                text: '和小组一起打',
                tags: ['study', 'social'],
                resultDescription: '你们没有 AK，但把每道题的失分原因都说清楚了。',
                action: (s) => ({
                    flags: { ...s.flags, oi_team_practice: true, oi_team_sync: true },
                    general: { ...s.general, experience: s.general.experience + 5, mindset: s.general.mindset - 2 },
                    oiStats: modifyOI(s, { graph: 1, misc: 1 })
                })
            },
            {
                text: '按自己的节奏来',
                tags: ['study'],
                resultDescription: '你戴上耳机单独做题，速度快了一点，但没听到他们后来讨论出的解法。',
                action: (s) => ({
                    flags: { ...s.flags, oi_team_practice: true, oi_team_sync: false },
                    general: { ...s.general, experience: s.general.experience + 3 },
                    oiStats: modifyOI(s, { dp: 2 })
                })
            }
        ]
    }
];
