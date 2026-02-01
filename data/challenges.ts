
import { Challenge } from '../types';

export const IRREGULAR_CHALLENGES: Challenge[] = [
    {
        id: 'c_debt_king',
        title: '我就是不还钱，那咋了',
        description: '开局负债100，并且每周还要还25的利息！但是...这种在刀尖上跳舞的感觉让你极其兴奋。每负债15元，学习效率+1。你能撑多久？',
        conditions: {
            initialStats: { money: -100, mindset: 60, health: 80, efficiency: 5 }
        }
    },
    {
        id: 'c_sleep_king',
        title: '可恶啊，又打扰我睡觉',
        description: '为什么上课睡觉总被发现啊！获得【嗜睡】体质。每周必须进行至少一次“睡觉”类行为（包括周末补觉或事件中选择睡觉），否则游戏结束。但在梦中，你似乎能链接到阿卡西记录...',
        conditions: {
            initialStats: { money: 50, mindset: 20, health: 20, efficiency: 5 }
        }
    }
];

export const WEEKLY_CHALLENGES = IRREGULAR_CHALLENGES; // Backward compatibility
