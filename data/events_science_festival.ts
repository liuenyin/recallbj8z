import { Phase, type GameEvent, type GameState } from '../types';
import { FESTIVAL_PARTNER_NICKNAME } from './campus_names';
import { CLUBS } from './mechanics';
import { modifySub } from './utils';

const festivalProject = (state: GameState) => {
    switch (state.club) {
        case 'astronomy': return '用活动星图找秋季星座';
        case 'math_research': return '用纸牌演示一条组合规律';
        case 'anime': return '用转筒把几张静止画面变成动画';
        default: return '用纸桥演示不同折法怎样改变承重';
    }
};

const exhibitionTeam = (state: GameState) =>
    CLUBS.find(club => club.id === state.club)?.name ?? '班级';

export const SCIENCE_FESTIVAL_EVENTS: GameEvent[] = [
    {
        id: 'sci_fest_first_day',
        title: '开学第一张课表',
        description: state => `你带着分班单找到了${state.className || '教室'}。同桌把多领的一张课表递给你。“叫我${FESTIVAL_PARTNER_NICKNAME}就行。你看后门那张照片，去年那座纸桥都歪成那样了，居然还能撑住。”`,
        type: 'neutral',
        triggerType: 'FIXED',
        fixedPhase: Phase.SEMESTER_1,
        fixedWeek: 1,
        condition: state => state.competition === 'None',
        choices: [
            {
                text: '放学后跟同桌去看看展板',
                hint: '先和同桌熟悉校园，科技节招募时可能会再见。',
                resultDescription: `你们在展板前站到保洁阿姨来关灯。${FESTIVAL_PARTNER_NICKNAME}把照片拍下来，说今年如果有机会也想试试。`,
                action: state => ({ flags: { ...state.flags, science_festival_teammate: true }, general: { ...state.general, mindset: state.general.mindset + 3 } })
            },
            {
                text: '先把下周的课程和教室记清楚',
                resultDescription: '你把容易走错的教室圈在课表上，明天换教室时就知道往哪边走了。',
                action: state => ({ general: { ...state.general, efficiency: state.general.efficiency + 1 } })
            }
        ]
    },
    {
        id: 'sci_fest_astronomy_notes',
        title: '南斗天文社的观测记录',
        description: '望远镜要轮流用。别人排队等着看的时候，一位社员问你能不能帮忙记下大家看到了什么。纸上已经有几颗星被不同的人认成了不同的名字。',
        type: 'neutral',
        triggerType: 'FIXED',
        fixedPhase: Phase.SEMESTER_1,
        fixedWeek: 4,
        condition: state => state.competition === 'None' && state.club === 'astronomy',
        choices: [
            {
                text: '留下帮忙记，把容易认错的也标出来',
                hint: '这些记录之后可以带去科技节。',
                resultDescription: '你把不同人的说法都留在纸上，又跟社员对照了一回星图。收望远镜时，对方问能不能把这张纸带去科技节给没看过的人试试。',
                action: state => ({
                    flags: { ...state.flags, science_festival_observation_notes: true },
                    general: { ...state.general, experience: state.general.experience + 3 },
                    fatigue: state.fatigue + 4
                })
            },
            {
                text: '今天先回去，下次再帮忙',
                resultDescription: '你把记录纸交回去，走之前记下了刚刚认出来的那颗星。',
                action: () => ({})
            }
        ]
    },
    {
        id: 'sci_fest_signup',
        title: '科技节展台招募',
        description: state => {
            const invitation = state.flags.science_festival_teammate
                ? `${FESTIVAL_PARTNER_NICKNAME}把那张展板照片又翻了出来，推来一张报名表：“上次说的那个展台，真有人招搭档了。”`
                : `${FESTIVAL_PARTNER_NICKNAME}把招募表传到你桌上，技术准备和讲解排班还有空位。`;
            const notes = state.flags.science_festival_observation_notes ? '上次观测时那张记错过星的纸，也可以带到展台上。' : '';
            return [invitation, `${exhibitionTeam(state)}这次想${festivalProject(state)}。`, notes].filter(Boolean).join('\n');
        },
        type: 'neutral',
        triggerType: 'FIXED',
        fixedPhase: Phase.SEMESTER_1,
        fixedWeek: 5,
        condition: state => state.competition === 'None',
        choices: [
            {
                text: '加入展台，负责把演示做出来',
                resultDescription: `${FESTIVAL_PARTNER_NICKNAME}在报名表里给你留出了材料栏。下次课间先带一个能试起来的方案过来。`,
                action: state => ({ flags: { ...state.flags, science_festival_role: 'build' } })
            },
            {
                text: '加入展台，负责讲解和排班',
                resultDescription: `你接过讲解人员名单。${FESTIVAL_PARTNER_NICKNAME}问能不能把午饭那一档错开，你在名字旁画了个小圈。`,
                action: state => ({ flags: { ...state.flags, science_festival_role: 'guide' } })
            },
            {
                text: '这次只去逛展',
                resultDescription: '你把报名表传给了后桌，顺手在课表上圈出了科技节那一周。',
                action: () => ({})
            }
        ]
    },
    {
        id: 'sci_fest_rehearsal',
        title: '放学后的展台彩排',
        description: state => state.flags.science_festival_role === 'build'
            ? `放学后你和${FESTIVAL_PARTNER_NICKNAME}第一次完整试做：${festivalProject(state)}。演示成功了一次，但换个人操作就卡住了，要不要再花些时间排查？`
            : `讲解人都到齐了，偏偏午饭和展台最忙的时段撞在一起。${FESTIVAL_PARTNER_NICKNAME}问，你们要不要留到最后，把换班和接待也排一遍？`,
        type: 'neutral',
        triggerType: 'FIXED',
        fixedPhase: Phase.SEMESTER_1,
        fixedWeek: 9,
        condition: state => ['build', 'guide'].includes(state.flags.science_festival_role),
        choices: [
            {
                text: '多留一会儿，把备用方案也走一遍',
                hint: '会更累，活动当天能直接用上这次准备。',
                resultDescription: '你们当着另一个组的面重新走了一遍，把最容易卡住的地方写在纸条上，夹进展台文件夹。',
                action: state => ({
                    flags: { ...state.flags, science_festival_prepared: true },
                    general: { ...state.general, experience: state.general.experience + 3 },
                    fatigue: state.fatigue + 6
                })
            },
            {
                text: '按今天的方案收工',
                resultDescription: `你把桌面收干净，和${FESTIVAL_PARTNER_NICKNAME}约好当天早到。如果出了岔子，就现场想办法。`,
                action: () => ({})
            }
        ]
    },
    {
        id: 'evt_sci_fest',
        title: '科技节',
        description: state => {
            if (state.flags.science_festival_role === 'build') {
                return `地下场馆刚放人进来，${exhibitionTeam(state)}的展台就围了一圈。轮到${festivalProject(state)}时，演示突然卡住了。${FESTIVAL_PARTNER_NICKNAME}看过来，等你拿主意。`;
            }
            if (state.flags.science_festival_role === 'guide') {
                return `地下场馆里排满了人，${exhibitionTeam(state)}的下一位讲解员还没回来。${FESTIVAL_PARTNER_NICKNAME}举着名单问：“前面这拨同学要先带进去吗？”`;
            }
            return '地下场馆里的展台已经排开了。有组同学请观众亲手试自己的展品，也有人还在桌底找接线板。';
        },
        type: 'positive',
        triggerType: 'FIXED',
        fixedPhase: Phase.SEMESTER_1,
        fixedWeek: 15,
        choices: [
            {
                text: '用彩排时备好的方案接着展示',
                condition: state => state.flags.science_festival_role === 'build' && state.flags.science_festival_prepared === true,
                resultDescription: `你从文件夹里翻出那张纸条，换了操作顺序。第二遍终于跑通，前排同学伸手要试，${FESTIVAL_PARTNER_NICKNAME}这才松了一口气。`,
                action: state => ({
                    flags: { ...state.flags, science_festival_outcome: 'built' },
                    general: { ...state.general, experience: state.general.experience + 10, mindset: state.general.mindset + 5 }
                })
            },
            {
                text: '按备用班次带观众，先顶上讲解',
                condition: state => state.flags.science_festival_role === 'guide' && state.flags.science_festival_prepared === true,
                resultDescription: `你让${FESTIVAL_PARTNER_NICKNAME}带一拨同学先试展品，自己把讲解讲完。换班的人回来时，队伍已经顺起来了。`,
                action: state => ({
                    flags: {
                        ...state.flags,
                        science_festival_outcome: 'guided',
                        science_festival_club_organizer: !!state.club && state.club !== 'none'
                    },
                    general: { ...state.general, experience: state.general.experience + 10, mindset: state.general.mindset + 5 }
                })
            },
            {
                text: '拿出南斗的观测记录，先带大家认星',
                condition: state => state.flags.science_festival_role === 'build'
                    && state.flags.science_festival_observation_notes === true && !state.flags.science_festival_prepared,
                resultDescription: '你把那张写满改动的记录摊开，请大家猜几颗最容易认错的星。等桌上的演示恢复，刚刚围在前面的同学还在比谁认得准。',
                action: state => ({
                    flags: { ...state.flags, science_festival_outcome: 'astronomy_notes' },
                    general: { ...state.general, experience: state.general.experience + 8, mindset: state.general.mindset + 4 }
                })
            },
            {
                text: `和${FESTIVAL_PARTNER_NICKNAME}把演示拆成两段，先把能做的做完`,
                condition: state => !!state.flags.science_festival_role,
                resultDescription: '你们先带大家做了一个简短的互动，把完整演示留到下一轮。有人走了，也有同学听完又回来看。',
                action: state => ({
                    flags: { ...state.flags, science_festival_outcome: 'improvised' },
                    general: { ...state.general, experience: state.general.experience + 6 },
                    fatigue: state.fatigue + 4
                })
            },
            {
                text: '参观展览',
                resultDescription: '台前的人把最初那个坏掉的方案也拿了出来，你才发现好看的成品前面有这么多试错。',
                action: state => ({
                    flags: { ...state.flags, science_festival_outcome: 'visited' },
                    general: { ...state.general, experience: state.general.experience + 5, mindset: state.general.mindset + 5 }
                })
            },
            {
                text: '在教室自习',
                tags: ['study'],
                resultDescription: '楼下的动静隔着窗还听得见。你留在教室，把卡了一周的那几道题过了一遍。',
                action: state => ({
                    flags: { ...state.flags, science_festival_outcome: 'studied' },
                    subjects: modifySub(state, ['math', 'physics'], 3),
                    general: { ...state.general, mindset: state.general.mindset - 5 }
                })
            }
        ]
    }
];
