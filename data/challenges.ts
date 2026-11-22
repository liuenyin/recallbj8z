
import { Challenge } from '../types';

export const IRREGULAR_CHALLENGES: Challenge[] = [
    {
        id: 'c_debt_king',
        title: '负债生存挑战',
        description: '开局负债 100 且每周新增 25 利息；每负债 15 元，学习效率 +1。在债务压力与高效率之间走钢丝，你能撑完高一吗？',
        conditions: {
            initialStats: { money: -100, mindset: 60, health: 80, efficiency: 5 }
        }
    },
    {
        id: 'c_sleep_king',
        title: '嗜睡生存挑战',
        description: '获得【嗜睡】体质：每周必须至少进行一次“睡觉”类行为（包括事件中睡觉或周末补觉），否则立即结束。如何在有限精力里兼顾学业与睡眠？',
        conditions: {
            initialStats: { money: 50, mindset: 20, health: 20, efficiency: 5 }
        }
    }
];

export const WEEKLY_CHALLENGES = IRREGULAR_CHALLENGES; // Backward compatibility
