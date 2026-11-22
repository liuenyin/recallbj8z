
import { Challenge } from '../types';

export const IRREGULAR_CHALLENGES: Challenge[] = [
    {
        id: 'c_debt_king',
        title: '负债生存挑战',
        description: '开局欠 100 元，每周增加 25 元利息。每欠 15 元，学习效率增加 1 点。',
        conditions: {
            initialStats: { money: -100, mindset: 60, health: 80, efficiency: 5 }
        }
    },
    {
        id: 'c_sleep_king',
        title: '嗜睡生存挑战',
        description: '每周必须至少睡一次，可以在事件里选睡觉，也可以在周末安排补觉。漏掉一周就会结束本局。',
        conditions: {
            initialStats: { money: 50, mindset: 20, health: 20, efficiency: 5 }
        }
    }
];

export const WEEKLY_CHALLENGES = IRREGULAR_CHALLENGES; // Backward compatibility
