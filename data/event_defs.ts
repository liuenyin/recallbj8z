
import { GameEvent } from '../types';
import { modifySub } from './utils';
import { STATUSES } from './mechanics';
import { Phase } from '../types';

export const CHAINED_EVENTS: Record<string, GameEvent> = {
    'sum_confess_success': {
        id: 'sum_confess_success',
        title: '表白成功',
        description: '对方竟然答应了！你们约定在高中互相鼓励，共同进步。',
        type: 'positive',
        choices: [{ text: '太棒了', action: (s) => ({ 
            general: { ...s.general, mindset: s.general.mindset + 20, romance: s.general.romance + 20 }, 
            romancePartner: 'TA',
            activeStatuses: [...s.activeStatuses, { ...STATUSES['in_love'], duration: 10 }] 
        }) }]
    },
    'sum_confess_fail': {
        id: 'sum_confess_fail',
        title: '被发好人卡',
        description: '“你是个好人，但我现在只想好好学习。”',
        type: 'negative',
        choices: [{ 
            text: '心碎满地', 
            action: (s) => ({ 
                general: { ...s.general, mindset: s.general.mindset - 20 },
                rejectionCount: (s.rejectionCount || 0) + 1,
                log: [...s.log, { message: "被发好人卡了... ", type: 'warning', timestamp: Date.now() }] 
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

export const SCIENCE_FESTIVAL_EVENT: GameEvent = {
    id: 'evt_sci_fest',
    title: '科技节',
    description: '一年一度的科技节开始了，地下场馆摆满了各个社团和班级的展台。',
    type: 'positive',
    triggerType: 'FIXED',
    fixedPhase: Phase.SEMESTER_1,
    fixedWeek: 15, // Fixed at Week 15
    choices: [
        { 
            text: '参观展览', 
            action: (s) => ({ 
                general: { ...s.general, experience: s.general.experience + 10, mindset: s.general.mindset + 5 },
                log: [...s.log, { message: "你参观了科技节展览，大开眼界。", type: 'success', timestamp: Date.now() }]
            }) 
        },
        { 
            text: '在教室自习', 
            action: (s) => ({ 
                subjects: modifySub(s, ['math', 'physics'], 3),
                general: { ...s.general, mindset: s.general.mindset - 5 }
            }) 
        }
    ]
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
        choices: [
            { 
                text: '还钱 (金钱归零)', 
                action: (s) => ({ 
                    general: { ...s.general, money: 0, mindset: s.general.mindset - 40, health: s.general.health - 20,romance: s.general.romance-=10 },
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
    },
    'exam_fail_talk': {
        id: 'exam_fail_talk',
        title: '考后谈话',
        description: '因为考试成绩太差，班主任找你谈话。',
        type: 'negative',
        choices: [
            { 
                text: '虚心接受', 
                action: (s) => ({ 
                    general: { ...s.general, mindset: s.general.mindset + 5 } 
                }) 
            },
            { 
                text: '左耳进右耳出', 
                action: (s) => ({ 
                    general: { ...s.general, mindset: s.general.mindset - 2 } 
                }) 
            }
        ]
    }
};
