import { GameEvent, Phase } from '../types';
import { modifySub } from './utils';

/** A compact MO route: training, collaboration, setting, then one contest. */
export const MO_EVENTS: GameEvent[] = [
    {
        id: 'mo_first_training',
        title: '数学竞赛训练课',
        description: '数学老师在放学后开了一次竞赛训练课。黑板上的几何题看起来不像平时的作业，更像是一扇需要自己推开的门。',
        type: 'neutral',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.competition === 'MO' && s.phase === Phase.SEMESTER_1 && s.week >= 3 && s.week <= 7 && !s.flags.mo_training_started,
        choices: [
            {
                text: '留下来参加训练',
                tags: ['study'],
                action: (s) => ({
                    flags: { ...s.flags, mo_training_started: true },
                    subjects: modifySub(s, ['math'], 2),
                    general: { ...s.general, experience: s.general.experience + 5, mindset: s.general.mindset - 3 }
                })
            },
            {
                text: '先旁听一次再决定',
                tags: ['study'],
                action: (s) => ({
                    flags: { ...s.flags, mo_training_started: true },
                    subjects: modifySub(s, ['math'], 1),
                    general: { ...s.general, experience: s.general.experience + 2, mindset: s.general.mindset + 1 }
                })
            }
        ]
    },
    {
        id: 'mo_problem_circle',
        title: '一起解一道难题',
        description: '训练课上的几位同学组成了临时讨论组。有人负责画图，有人负责找反例，最后一道题在争论里慢慢有了轮廓。',
        type: 'positive',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.competition === 'MO' && s.flags.mo_training_started === true && s.phase === Phase.SEMESTER_1 && s.week >= 7 && s.week <= 13 && !s.flags.mo_team,
        choices: [
            {
                text: '加入解题小组',
                tags: ['study', 'social'],
                action: (s) => ({
                    flags: { ...s.flags, mo_team: true },
                    subjects: modifySub(s, ['math'], 2),
                    general: { ...s.general, experience: s.general.experience + 6, romance: s.general.romance + 2 }
                })
            },
            {
                text: '独自整理自己的方法',
                tags: ['study'],
                action: (s) => ({
                    flags: { ...s.flags, mo_team: false },
                    subjects: modifySub(s, ['math'], 3),
                    general: { ...s.general, experience: s.general.experience + 4, mindset: s.general.mindset - 2 }
                })
            }
        ]
    },
    {
        id: 'mo_setter_invite',
        title: '命题组的邀请',
        description: '老师准备给校内数学竞赛出一套压轴题，邀请解题小组一起讨论难度和解法。你第一次发现，命题本身也是一种数学表达。',
        type: 'neutral',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.competition === 'MO' && s.flags.mo_team === true && ((s.phase === Phase.SEMESTER_1 && s.week >= 12) || (s.phase === Phase.SEMESTER_2 && s.week <= 4)) && !s.flags.mo_setter,
        choices: [
            {
                text: '接受邀请，试着参与命题',
                tags: ['study', 'social'],
                action: (s) => ({
                    flags: { ...s.flags, mo_setter: true },
                    subjects: modifySub(s, ['math'], 1),
                    general: { ...s.general, experience: s.general.experience + 8, mindset: s.general.mindset - 4 }
                })
            },
            {
                text: '婉拒，专心准备比赛',
                tags: ['study'],
                action: (s) => ({
                    flags: { ...s.flags, mo_setter: false },
                    subjects: modifySub(s, ['math'], 2),
                    general: { ...s.general, experience: s.general.experience + 3, mindset: s.general.mindset + 2 }
                })
            }
        ]
    },
    {
        id: 'mo_setter_review',
        title: '证明写到最后一行',
        description: '命题组的题目进入审稿。你的解答已经有了漂亮的主线，只差把关键一步写得足够严谨。',
        type: 'neutral',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.competition === 'MO' && s.flags.mo_setter === true && s.phase === Phase.SEMESTER_2 && s.week >= 5 && s.week <= 10 && !s.flags.mo_review,
        choices: [
            {
                text: '把证明补完整',
                tags: ['study'],
                action: (s) => ({
                    flags: { ...s.flags, mo_review: 'polished' },
                    subjects: modifySub(s, ['math'], 2),
                    general: { ...s.general, experience: s.general.experience + 8, mindset: s.general.mindset - 5 }
                })
            },
            {
                text: '先交一个漂亮的结论',
                tags: ['risky'],
                action: (s) => ({
                    flags: { ...s.flags, mo_review: 'rough' },
                    subjects: modifySub(s, ['math'], 1),
                    general: { ...s.general, experience: s.general.experience + 3 }
                })
            }
        ]
    },
    {
        id: 'mo_contest_day',
        title: '数学竞赛决赛日',
        description: '考场里很安静，草稿纸上只剩下笔尖摩擦的声音。你先遇到了一道熟悉的题型，但最后一题完全没有见过。',
        type: 'positive',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.competition === 'MO' && s.phase === Phase.SEMESTER_2 && s.week >= 12 && s.week <= 18 && !!s.flags.mo_training_started && !s.flags.mo_contest_result,
        choices: [
            {
                text: '稳住前面的证明',
                tags: ['study'],
                action: (s) => {
                    const medal = s.subjects.math.level >= 35 || s.general.luck >= 70;
                    return {
                        flags: { ...s.flags, mo_contest_result: medal ? 'medal' : 'completed' },
                        general: { ...s.general, experience: s.general.experience + (medal ? 15 : 8), mindset: s.general.mindset + (medal ? 12 : 4) }
                    };
                }
            },
            {
                text: '冲最后一道压轴题',
                tags: ['risky', 'study'],
                action: (s) => {
                    const medal = s.subjects.math.level >= 45 && s.general.mindset >= 45;
                    return {
                        flags: { ...s.flags, mo_contest_result: medal ? 'medal' : 'missed' },
                        general: { ...s.general, experience: s.general.experience + (medal ? 20 : 5), mindset: s.general.mindset + (medal ? 18 : -8), health: s.general.health - 3 }
                    };
                }
            }
        ]
    }
];
