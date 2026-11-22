import { Phase, type GameState, type WeekendActivity } from '../types';
import { modifyOI } from './utils';

const inviteWeeks = {
    [Phase.SEMESTER_1]: [8, 16],
    [Phase.SEMESTER_2]: [7, 15]
};

const onInviteWeek = (state: GameState) => state.isWeekend
    && inviteWeeks[state.phase as keyof typeof inviteWeeks]?.includes(state.week) === true;

const inviteIds = ['w_invite_contest', 'w_invite_club', 'w_invite_peer'] as const;

export const isWeekendInvitationId = (id: string): boolean => inviteIds.some(invite => invite === id);

const timesAttended = (state: GameState, id: string) => Number(state.flags[id] || 0);
const attended = (state: GameState, id: string) => ({ ...state.flags, [id]: timesAttended(state, id) + 1 });

const knowsPeer = (state: GameState) => Number(state.flags.ta_favorability || 0) >= 8;
const peerName = (state: GameState) => state.romancePartner || knowsPeer(state) ? 'TA' : '同桌';

export const getWeekendInvitationText = (state: GameState, id: string) => {
    const returning = timesAttended(state, id) > 0;
    switch (id) {
        case 'w_invite_contest':
            return returning ? '队友带了上回没做完的题，约你这次一起讲解。' : '竞赛组约你和队友一起做一场练习赛。';
        case 'w_invite_club':
            return returning ? '社员问你能不能带新人排练，把活动室钥匙留给了你。' : '社员约你去活动室，帮忙检查下次活动要用的东西。';
        case 'w_invite_peer':
            return returning ? `${peerName(state)}把上回的笔记整理好了，约你接着写。` : `${peerName(state)}想找个地方坐一会儿，问你要不要一起带上错题本。`;
        default:
            return '';
    }
};

export const WEEKEND_INVITATIONS: WeekendActivity[] = [
    {
        id: 'w_invite_contest', name: '和队友练习', icon: 'fa-pen-to-square', type: 'STUDY',
        condition: state => onInviteWeek(state) && state.competition === 'OI',
        resultText: state => timesAttended(state, 'w_invite_contest')
            ? '你把上次没讲清的题重新讲了一遍。队友核对了你的例子。'
            : '你们交了练习卷，把一道没做完的题留给下次。',
        action: state => ({
            flags: attended(state, 'w_invite_contest'),
            general: { ...state.general, experience: state.general.experience + (timesAttended(state, 'w_invite_contest') ? 4 : 2) },
            oiStats: modifyOI(state, { dp: 0.45, misc: 0.35 })
        })
    },
    {
        id: 'w_invite_club', name: '去社团帮忙', icon: 'fa-users', type: 'SOCIAL',
        condition: state => onInviteWeek(state) && !!state.club && state.club !== 'none',
        resultText: state => timesAttended(state, 'w_invite_club')
            ? '你带新人走了一遍流程，等大家离开后归还了钥匙。'
            : '你和社员对了一遍清单，把缺的材料记在纸上。',
        action: state => ({
            flags: { ...attended(state, 'w_invite_club'), attended_club_activity: true },
            general: { ...state.general, mindset: state.general.mindset + 2, experience: state.general.experience + (timesAttended(state, 'w_invite_club') ? 5 : 3) }
        })
    },
    {
        id: 'w_invite_peer', name: '和同学见面', icon: 'fa-comment', type: 'SOCIAL',
        condition: onInviteWeek,
        resultText: state => timesAttended(state, 'w_invite_peer')
            ? `你和${peerName(state)}接着对了几道题。临走时，对方把补完的笔记借给了你。`
            : `你和${peerName(state)}各挑了一道错题，在本子上写下自己的解法。`,
        action: state => ({
            flags: {
                ...attended(state, 'w_invite_peer'),
                ta_favorability: Number(state.flags.ta_favorability || 0) + (knowsPeer(state) && !state.flags.romance_resolution ? 3 : 0)
            },
            general: { ...state.general, mindset: state.general.mindset + 4, romance: state.general.romance + 1 }
        })
    }
];
