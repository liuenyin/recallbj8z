import { type GameEvent, type GameState, Phase } from '../types';
import { getMoLeagueAward, getMoResult, isMoAwardScore, MO_LEAGUE_WEEK, MO_MOCK_WEEK, scoreMoPaperOne, scoreMoPaperTwo, trainMo } from './mo_competition';
import { getLearningMultiplier, modifySub } from './utils';

const onMoRoute = (s: GameState) => s.competition === 'MO';

const papers = (kind: 'league' | 'mock') => {
    const league = kind === 'league';
    const title = league ? '高中数学联赛' : '数竞校内模拟';
    const secondId = `mo_${kind}_paper_two`;
    const second: GameEvent = {
        id: secondId,
        title: league ? '高中数学联赛 · 二试' : '数竞校内模拟 · 二试',
        description: '9:40 开考，12:30 交卷。平面几何、代数、数论、组合各一道证明题。几何和代数各 40 分，数论和组合各 50 分。',
        type: 'neutral',
        allowChallengeSleep: false,
        choices: [
            { text: '先看几何和代数', strategy: 'geometry_algebra' as const },
            { text: '先看数论和组合', strategy: 'number_combinatorics' as const }
        ].map(({ text, strategy }) => ({
            text,
            resultDescription: league ? '监考老师收走了答题纸。教练让你等查分通知。' : '监考老师收走了答题纸。',
            action: s => {
                const secondPaper = scoreMoPaperTwo(s, strategy);
                const first = Number(s.flags[`mo_${kind}_first`] ?? 0);
                const awarded = league && isMoAwardScore(first, secondPaper.total);
                return {
                    fatigue: s.fatigue + 9,
                    flags: {
                        ...s.flags,
                        [`mo_${kind}_second`]: secondPaper.total,
                        [`mo_${kind}_geometry`]: secondPaper.marks[0],
                        [`mo_${kind}_algebra`]: secondPaper.marks[1],
                        [`mo_${kind}_number_theory`]: secondPaper.marks[2],
                        [`mo_${kind}_combinatorics`]: secondPaper.marks[3],
                        ...(awarded ? { mo_league_awarded: true } : {})
                    },
                    general: { ...s.general, experience: s.general.experience + 4 },
                    ...(league ? {} : { eventQueue: [MO_MOCK_RESULT] })
                };
            }
        }))
    };
    const first: GameEvent = {
        id: `mo_${kind}_paper_one`,
        title: league ? '高中数学联赛 · 一试' : '数竞校内模拟 · 一试',
        description: league
            ? '9 月，周日 8:00 开考。一试 80 分钟，八道填空题和三道解答题。填空每题 8 分，解答题分别是 16、20、20 分。'
            : '教练在春季安排了一场周日上午的校内模拟，沿用联赛的计时和分值。一试 80 分钟，八道填空题和三道解答题。',
        type: 'neutral',
        triggerType: 'FIXED',
        fixedPhase: league ? Phase.SEMESTER_1 : Phase.SEMESTER_2,
        fixedWeek: league ? MO_LEAGUE_WEEK : MO_MOCK_WEEK,
        condition: s => onMoRoute(s) && (league ? s.flags.mo_league_registered === true && !s.flags.mo_league_sat && !s.flags.mo_league_skipped : !s.flags.mo_mock_sat && !s.flags.mo_mock_skipped),
        allowChallengeSleep: false,
        choices: [
            ...[
                { text: '先做填空，留时间验算', strategy: 'check' as const },
                { text: '做一遍填空，尽快写解答题', strategy: 'written' as const }
            ].map(({ text, strategy }) => ({
                text,
                nextEventId: secondId,
                resultDescription: '9:20 收卷。离二试还有二十分钟。',
                action: (s: GameState) => {
                    const score = scoreMoPaperOne(s, strategy);
                    return {
                        fatigue: s.fatigue + 5,
                        flags: { ...s.flags, [`mo_${kind}_sat`]: true, [`mo_${kind}_first`]: score.total, [`mo_${kind}_blanks`]: score.blanks }
                    };
                }
            })),
            {
                text: league ? '这次不进考场' : '这次不参加校内模拟',
                resultDescription: league ? '你缺席了这次联赛。教练把春季模拟的时间记给了你。' : '这次你没有参加。教练把模拟卷留给你带回去做。',
                action: s => ({ flags: { ...s.flags, [`mo_${kind}_skipped`]: true } })
            }
        ],
    };
    const result: GameEvent = {
        id: `mo_${kind}_result`,
        title: league ? '高中数学联赛查分' : '数竞校内模拟讲评',
        description: league ? '10 月，教练发来了北京赛区的查分通知，让你按考号核对成绩。' : '教练发回了两张答卷。填空按答案计分，解答和证明按写出的步骤给分。',
        type: 'neutral',
        triggerType: league ? 'FIXED' : undefined,
        fixedPhase: league ? Phase.SEMESTER_1 : undefined,
        fixedWeek: league ? 7 : undefined,
        condition: s => onMoRoute(s) && getMoResult(s, kind) !== null,
        allowChallengeSleep: false,
        choices: [{
            text: league ? '核对两张卷子的分数' : '看答卷和讲评',
            action: s => {
                const score = getMoResult(s, kind);
                if (!score) return {};
                const f = s.flags;
                const messages = [
                    `${title}：一试 ${score.first}/120，二试 ${score.second}/180，总分 ${score.total}/300。`,
                    `一试填空 ${f[`mo_${kind}_blanks`]}/64，解答 ${score.first - Number(f[`mo_${kind}_blanks`] || 0)}/56。`,
                    `二试平面几何 ${f[`mo_${kind}_geometry`]}/40，代数 ${f[`mo_${kind}_algebra`]}/40，数论 ${f[`mo_${kind}_number_theory`]}/50，组合 ${f[`mo_${kind}_combinatorics`]}/50。`
                ];
                return {
                    flags: { ...s.flags, [`mo_${kind}_published`]: true },
                    log: [...s.log, { message: messages.join('\n'), type: 'event', timestamp: Date.now() }]
                };
            }
        }]
    };
    return { first, second, result };
};

const league = papers('league');
const mock = papers('mock');
const MO_MOCK_RESULT = mock.result;

export const MO_CHAINED_EVENTS = {
    [league.second.id]: league.second,
    [mock.second.id]: mock.second,
    [mock.result.id]: mock.result
};

export const MO_EVENTS: GameEvent[] = [
    {
        id: 'mo_summer_diagnostic',
        title: '数竞暑假训练',
        description: '教练带来两叠练习。一叠是函数、不等式和数列，要在规定时间内做完。另一叠是圆幂和相似，图上没有画辅助线。',
        type: 'neutral',
        triggerType: 'FIXED',
        fixedPhase: Phase.SUMMER,
        fixedWeek: 2,
        condition: onMoRoute,
        choices: [
            {
                text: '先做一试限时题',
                tags: ['study'],
                resultDescription: '你重算了一次数列填空，把漏掉的首项补上了。',
                action: s => ({
                    flags: trainMo(s, { speed: 22, algebra: 9 }, getLearningMultiplier(s)),
                    subjects: modifySub(s, ['math'], 0.6)
                })
            },
            {
                text: '先练几何证明',
                tags: ['study'],
                resultDescription: '你用圆幂找到了两段线段的关系。教练让你再把用到的共圆条件写出来。',
                action: s => ({
                    flags: trainMo(s, { speed: 9, geometry: 29, algebra: 5 }, getLearningMultiplier(s)),
                    subjects: modifySub(s, ['math'], 0.3)
                })
            },
            {
                text: '今天先听讲',
                tags: ['social'],
                resultDescription: '你记下了训练时间，也抄了两道题准备回去做。',
                action: s => ({ flags: trainMo(s, { speed: 4, geometry: 4 }) })
            }
        ]
    },
    {
        id: 'mo_summer_topics',
        title: '把证明写完',
        description: '数论题要找出所有满足条件的整数，组合题要证明一种排法一定可行。教练让你挑一题，写完以后再看讲义。',
        type: 'neutral',
        triggerType: 'FIXED',
        fixedPhase: Phase.SUMMER,
        fixedWeek: 5,
        condition: onMoRoute,
        choices: [
            {
                text: '先用同余删掉不可能的情况',
                tags: ['study'],
                resultDescription: '你按余数分了几类，最后补上了对剩下那一类的验证。',
                action: s => ({ flags: trainMo(s, { speed: 10, number_theory: 31, combinatorics: 8 }, getLearningMultiplier(s)) })
            },
            {
                text: '从最小的排法做起',
                tags: ['study'],
                resultDescription: '你列完小规模例子，找到了每次操作都保持不变的量。',
                action: s => ({ flags: trainMo(s, { speed: 10, number_theory: 8, combinatorics: 31 }, getLearningMultiplier(s)) })
            },
            {
                text: '今天先听讲',
                tags: ['social'],
                resultDescription: '你在讲义上记下了两个例子。',
                action: s => ({ flags: trainMo(s, { speed: 4, number_theory: 4, combinatorics: 4 }) })
            }
        ]
    },
    {
        id: 'mo_summer_mock',
        title: '暑假最后一次限时卷',
        description: '教练把往年卷子印了出来。你可以按联赛时间做完两张，也可以先做一试、订正自己常错的题。',
        type: 'neutral',
        triggerType: 'FIXED',
        fixedPhase: Phase.SUMMER,
        fixedWeek: 7,
        condition: onMoRoute,
        choices: [
            {
                text: '按联赛时间做完两张卷子',
                tags: ['study'],
                resultDescription: '两场之间你出去走了一圈。二试收卷后，你把没写到结论的证明标了出来。',
                action: s => ({
                    flags: trainMo(s, { speed: 10, geometry: 11, algebra: 11, number_theory: 11, combinatorics: 11 }, getLearningMultiplier(s)),
                    fatigue: s.fatigue + 8
                })
            },
            {
                text: '做一试，留时间订正',
                tags: ['study'],
                resultDescription: '你按时停笔，在错题旁记下了当时漏看的条件。',
                action: s => ({ flags: trainMo(s, { speed: 15, algebra: 4 }, getLearningMultiplier(s)) })
            },
            {
                text: '今天先听讲',
                tags: ['social'],
                resultDescription: '你把卷子折好，回家有空再做。',
                action: s => ({ flags: trainMo(s, { speed: 3 }) })
            }
        ]
    },
    {
        id: 'mo_september_entry',
        title: '九月的准考证',
        description: '教练来核对报名信息。今年 9 月的联赛只对已取得资格的学生开放，你的报名已通过审核。下周日早上要连考两场。你打算参赛吗？',
        type: 'neutral',
        triggerType: 'FIXED',
        fixedPhase: Phase.SEMESTER_1,
        fixedWeek: 1,
        condition: onMoRoute,
        choices: [
            {
                text: '确认参赛',
                resultDescription: '你把周日早上的考场和报到时间记进了日历。',
                action: s => ({ flags: { ...s.flags, mo_league_registered: true } })
            },
            {
                text: '先跟训练，下次再报',
                tags: ['social'],
                resultDescription: '教练把本学期的训练讲义发给了你。',
                action: s => ({ flags: { ...s.flags, mo_league_registered: false } })
            }
        ]
    },
    league.first,
    league.result,
    {
        id: 'mo_league_award_notice',
        title: '北京赛区获奖名单',
        description: '11 月，教练把赛区获奖名单发到了班群。',
        type: 'positive',
        triggerType: 'FIXED',
        fixedPhase: Phase.SEMESTER_1,
        fixedWeek: 10,
        allowChallengeSleep: false,
        condition: s => onMoRoute(s) && s.flags.mo_league_published === true && !!getMoLeagueAward(s),
        choices: [{
            text: '在名单上查自己的考号',
            action: s => {
                const award = getMoLeagueAward(s);
                const message = award && award !== '已获奖'
                    ? `你在名单上找到了自己的考号。赛区${award}（游戏内评定）。`
                    : '你在北京赛区获奖名单上看到了自己的考号。';
                return {
                    flags: { ...s.flags, mo_league_award_announced: true },
                    log: [...s.log, { message, type: 'event', timestamp: Date.now() }]
                };
            }
        }]
    },
    mock.first
];
