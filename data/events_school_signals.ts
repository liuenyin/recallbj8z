import type { GameEvent } from '../types';
import { hasRomanticInterest } from './relationships';
import { modifySub } from './utils';

// Reworked from the February–May event pool for the current semester flow.
export const SCHOOL_SIGNALS: GameEvent[] = [
    {
        id: 'exam_fail_talk', title: '考后谈话', type: 'neutral', triggerType: 'CONDITIONAL', once: true,
        description: '班主任把你的卷子翻到背面，指着两道空题问：“当时是没时间，还是没想起来怎么做？”',
        condition: state => (state.academicExamHistory.at(-1)?.rank ?? 0) >= 430,
        choices: [
            { text: '请老师带我看一道空题', tags: ['study'], resultDescription: '老师让你先写下知道的条件。你发现第一步其实推得出来。', action: state => ({ subjects: modifySub(state, ['math'], 1.2), general: { ...state.general, experience: state.general.experience + 3 } }) },
            { text: '先回座位，把没做完的地方记下来', resultDescription: '你在卷子旁记了一句“先做完会的”。老师让你下次试试。', action: state => ({ general: { ...state.general, mindset: state.general.mindset + 4 } }) },
        ]
    },
    {
        id: 'evt_homework_service', title: '一份数学作业', type: 'neutral', triggerType: 'CONDITIONAL', once: true,
        description: '放学时，隔壁班的同学拿着一本还没写的练习册过来，问你愿不愿意收十块钱替他写完。',
        condition: state => state.week >= 4 && state.week <= 9,
        choices: [
            { text: '只讲一道题，剩下的自己写', tags: ['study'], resultDescription: '你讲完第一题，把练习册推回去。对方照着思路接着写。', action: state => ({ subjects: modifySub(state, ['math'], 0.8), general: { ...state.general, experience: state.general.experience + 2 } }) },
            { text: '收下钱，帮忙写完', tags: ['risky'], resultDescription: '你收了十块钱，写到楼道快熄灯才交还练习册。', action: state => ({ general: { ...state.general, money: state.general.money + 10 }, fatigue: state.fatigue + 9 }) },
            { text: '推掉这份活，早点回家', resultDescription: '你背上书包，赶上了平时那班车。', action: state => ({ fatigue: state.fatigue - 2 }) },
        ]
    },
    {
        id: 'health_morning_warning', title: '早上的闹钟', type: 'negative', triggerType: 'CONDITIONAL', once: true,
        description: '闹钟响了两遍。你坐起来，胸口发紧，站了一会儿才想起书包还没收。',
        condition: state => state.general.health <= 32 || state.fatigue >= 88,
        choices: [
            { text: '告诉家长和老师，先缓一缓', tags: ['rest'], resultDescription: '家长让你先坐下吃点东西，老师回消息说迟到一会儿也行。', action: state => ({ general: { ...state.general, health: state.general.health + 5, mindset: state.general.mindset + 4 }, fatigue: state.fatigue - 10 }) },
            { text: '照常出门，到校再说', resultDescription: '进教室时预备铃已经响了。你把书包放下，坐着缓了一会儿。', action: state => ({ fatigue: state.fatigue + 3 }) },
        ]
    },
    {
        id: 'health_school_door', title: '在校门口站了一会儿', type: 'negative', triggerType: 'CONDITIONAL', once: true,
        description: '这几天一想到上学你就觉得累。今天到了校门口，你在门外多站了一会儿。',
        condition: state => state.general.health <= 22 && state.triggeredEvents.includes('health_morning_warning'),
        choices: [
            { text: '去办公室说说最近的情况', tags: ['rest'], resultDescription: '你把最近几天的情况说了。老师帮你联系家长，先把今天的安排减下来。', action: state => ({ general: { ...state.general, health: state.general.health + 7, mindset: state.general.mindset + 5 }, fatigue: state.fatigue - 10 }) },
            { text: '先去教室，午休再找老师', resultDescription: '你到了座位上，把“午休去办公室”记在了纸上。', action: state => ({ general: { ...state.general, mindset: state.general.mindset + 1 } }) },
        ]
    },
    {
        id: 'romance_margin_of_the_page', title: '笔记留了一页', type: 'neutral', triggerType: 'CONDITIONAL', once: true,
        description: '上课时你又往TA那边看了一眼。下课后翻开笔记，才发现后半页一直空着。',
        condition: state => hasRomanticInterest(state) && Number(state.flags.ta_favorability || 0) < 65,
        choices: [
            { text: '问TA后半节讲了什么', tags: ['social'], resultDescription: 'TA把笔记转过来，顺手给你圈了老师刚讲的例题。', action: state => ({ flags: { ...state.flags, ta_favorability: Number(state.flags.ta_favorability || 0) + 3 } }) },
            { text: '留到放学再把笔记补上', resultDescription: '你在空白处写了两行关键词，放学后再回来找。', action: state => ({ general: { ...state.general, mindset: state.general.mindset + 2 } }) },
        ]
    },
];
