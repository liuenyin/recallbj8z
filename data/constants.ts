
import { Difficulty, GeneralStats } from '../types';

export const CHANGELOG_DATA = [
    { version: 'v1.0.0/稳定', date: '2026-1-3', content: ['三月七好可爱', '珂朵莉好可爱', '风堇好可爱', '广告位招租'] }
];

export const DIFFICULTY_PRESETS: Record<Exclude<Difficulty, 'CUSTOM'>, { label: string, desc: string, stats: GeneralStats, color: string }> = {
    'NORMAL': {
        label: '普通',
        desc: '体验相对轻松的高中生活。(属性大幅提升，更易获得高分)',
        color: 'bg-emerald-500',
        stats: {
            mindset: 40, // Buffed
            experience: 15,
            luck: 45,
            romance: 40,
            health: 80,
            money: 80,
            efficiency: 14 // Buffed significantly
        }
    },
    'HARD': {
        label: '困难',
        desc: '资源紧张，压力较大。',
        color: 'bg-orange-500',
        stats: {
            mindset: 35,
            experience: 10,
            luck: 40,
            romance: 10,
            health: 70,
            money: 50,
            efficiency: 10
        }
    },
    'REALITY': {
        label: '现实',
        desc: '这就是真实的人生。只有在此模式下可解锁成就。',
        color: 'bg-rose-600',
        stats: {
            mindset: 30,
            experience: 0,
            luck: 30,
            romance: 5,
            health: 60,
            money: 20,
            efficiency: 8
        }
    }
};
