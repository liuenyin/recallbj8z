import { MO_CHAINED_EVENTS } from './events_mo';
import { GameEvent } from '../types';
import { startRelationship, relationshipCheckpoint } from './relationships';
import { modifySub } from './utils';
import { STATUSES } from './mechanics';
import { Phase } from '../types';
import { SATURDAY_COURSE_SECOND } from './saturday_courses';

export const CHAINED_EVENTS: Record<string, GameEvent> = {
    ...MO_CHAINED_EVENTS,
    [SATURDAY_COURSE_SECOND.id]: SATURDAY_COURSE_SECOND,
    'sum_confess_success': {
        id: 'sum_confess_success',
        title: '表白成功',
        description: 'TA停下脚步，想了一会儿。“好啊。明天放学我等你。”',
        type: 'positive',
        choices: [{ text: '好，明天见', action: (s) => ({
            general: { ...s.general, mindset: s.general.mindset + 20, romance: s.general.romance + 20 }, 
            ...startRelationship(s),
            activeStatuses: [...s.activeStatuses.filter(status => status.id !== 'crush'), { ...STATUSES['in_love'], duration: 10 }]
        }) }]
    },
    'sum_confess_fail': {
        id: 'sum_confess_fail',
        title: '对方的回答',
        description: 'TA听完后说：“我想继续做同学。”两个人在路口停了下来。',
        type: 'negative',
        choices: [{ 
            text: '点点头，各自回家',
            resultDescription: '你点了点头。绿灯亮起时，你们朝不同的方向走了。',
            action: (s) => ({ 
                general: { ...s.general, mindset: s.general.mindset - 20 },
                rejectionCount: (s.rejectionCount || 0) + 1,
                flags: { ...s.flags, ready_for_confession: false, romance_resolution: 'rejected', ...relationshipCheckpoint(s, 'romance_rejected') },
                activeStatuses: s.activeStatuses.filter(st => st.id !== 'crush')
            }) 
        }]   
    },
    'mil_star_performance': {
        id: 'mil_star_performance',
        title: '军训标兵',
        description: '教官在全连队面前表扬了你。',
        type: 'positive',
        choices: [{ text: '倍感光荣', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 10, experience: s.general.experience + 5 } }) }]
    },
    'evt_red_packet': {
        id: 'evt_red_packet',
        title: '新年红包',
        description: '过年了，亲戚们最关心的果然还是考试的成绩...',
        type: 'positive',
        choices: [{
            text: '收下红包',
            action: (s) => {
                let amount = 20;
                let msg = "成绩平平，长辈勉励了几句。";
                if (s.general.efficiency >= 25 || s.general.experience >= 60) {
                    amount = 80;
                    msg = "因为表现优异，在这个寒冬你收获颇丰！";
                } else if (s.general.efficiency >= 15) {
                    amount = 50;
                    msg = "表现尚可，拿到了标准的压岁钱。";
                }
                return {
                    general: { ...s.general, money: s.general.money + amount, mindset: s.general.mindset + 5 },
                    log: [...s.log, { message: `【新年】${msg} 金钱+${amount}`, type: 'success', timestamp: Date.now() }]
                };
            }
        }]
    }
};

export const NEW_YEAR_GALA_EVENT: GameEvent = {
    id: 'evt_new_year',
    title: '元旦联欢会',
    description: '新年的钟声即将敲响，班级里正如火如荼地举办元旦联欢会。',
    type: 'positive',
    triggerType: 'FIXED',
    fixedPhase: Phase.SEMESTER_1,
    fixedWeek: 20, // Fixed at Week 20
    choices: [
        { 
            text: '欣赏节目', 
            nextEventId: 'evt_red_packet', // CHAIN TO RED PACKET
            action: (s) => ({ 
                general: { ...s.general, mindset: s.general.mindset + 15, romance: s.general.romance + 2 },
                 log: [...s.log, { message: "你度过了一个愉快的下午。", type: 'success', timestamp: Date.now() }]
            }) 
        },
        { 
            text: '趁乱刷题', 
            nextEventId: 'evt_red_packet', // CHAIN TO RED PACKET
            action: (s) => ({ 
                subjects: modifySub(s, ['english', 'chinese'], 3),
                general: { ...s.general, mindset: s.general.mindset - 5, romance: s.general.romance - 5 }
            }) 
        }
    ]
};

export const BASE_EVENTS: Record<string, GameEvent> = {
    'debt_collection': {
        id: 'debt_collection',
        title: '债主上门',
        description: '因为你的负债过高，几个高大的学生拦住了你的去路...',
        type: 'negative',
        triggerType: 'RANDOM',
        choices: [
            { 
                text: '还钱 (金钱归零)', 
                action: (s) => ({ 
                    general: { ...s.general, money: 0, mindset: s.general.mindset - 40, health: s.general.health - 20, romance: s.general.romance - 10 },
                    log: [...s.log, { message: "你被迫还清了所有债务（虽然本来就是负的）。", type: 'warning', timestamp: Date.now() }]
                }) 
            },
            { 
                text: '逃跑', 
                action: (s) => ({ 
                    general: { ...s.general, health: s.general.health - 20, mindset: s.general.mindset - 10 },
                    log: [...s.log, { message: "你没跑掉，被揍了一顿。", type: 'error', timestamp: Date.now() }]
                }) 
            }
        ]
    }
};
