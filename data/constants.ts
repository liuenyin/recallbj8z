import { Difficulty, GeneralStats } from '../types';

export interface DifficultyPreset {
    label: string;
    desc: string;
    stats: GeneralStats;
    color: string;
    subjectAptitudeDelta: number;
    subjectLevelDelta: number;
    lessonEfficiencyMultiplier: number;
    learningRewardMultiplier: number;
    fatigueGainMultiplier: number;
    restRecoveryMultiplier: number;
    peerAverage: number;
    weekendStudyLimit?: number;
    healthDeathThreshold?: number;
    studyMindsetThreshold?: number;
    studyFatigueThreshold?: number;
    shopPriceMultiplier?: number;
    talentPoints?: number;
}

export const CHANGELOG_DATA = [
    { version: 'v1.6/accounts-and-hell', date: '2026-8-30', content: ['新增极限难度：健康低于10立即结束，心态低于20或疲劳超过90不能学习，学习收益为2/3，同学更强，小卖部价格翻倍，开局天赋点为-1。', '新增本地账号与多存档管理；旧版游客存档仍可继续读取。', '本轮暂缓背景图和事件配图，继续优先打磨玩法内容与可读性。'] },
    { version: 'v1.5/oi-route', date: '2026-8-29', content: ['完善 OI 路线：加入外校集训、训练组模拟赛、公开赛出题、验题上线和赛后游记。', '按八中校内资源有限的背景调整省选/APIO 门槛，持续训练和跨校交流比一次高分更重要。'] },
    { version: 'v1.4/gameplay', date: '2026-8-29', content: ['新增兴奋值：影响学习、体育和休息收益。', '新增【地狱】难度，加入课堂效率、疲劳和周末学习限制。', '调整同学平均水平与考试排名，兴奋剂售价调整为150。'] },
    { version: 'v1.3/beta', date: '2026-1-22', content: ['新增【无限重开 AI版】，接入 Gemini API 实现动态事件。', '优化了负债逻辑，现在负债会有分级 Debuff。'] },
    { version: 'v1.2/testing', date: '2026-1-21', content: ['实装了每日挑战','修复了已知问题'] },
    { version: 'v1.1.2/testing', date: '2026-1-15', content: ['1.2试运行','修改了主页','增加了深色模式和存档功能（可能会有若干bug）','添加了若干事件和成就'] },
    { version: 'v1.1.1', date: '2026-1-11', content: ['修bug，增加金主位，欢迎赞助','感谢大家的反馈，大更新预计在1.20左右上线（截至该版本上线，已收到来自15+省区的~50份反馈问卷，真的感谢大家的支持，给大家磕一个）'] },
    { version: 'v1.1.0', date: '2026-1-4', content: ['我们调整了很多东西，请您自行游玩体验','此版本并不足够稳定，可能存在若干Bug'] },
    { version: 'v1.0.0/稳定', date: '2026-1-3', content: ['三月七好可爱', '珂朵莉好可爱', '风堇好可爱', '广告位招租'] }
];

// --- Mechanic Constants ---
export const MECHANICS_CONFIG = {
    GENERAL_REGRESSION_RATE: 0.05, // 5% regression per week for general stats (towards baseline)
    EFFICIENCY_REGRESSION_RATE: 0.15, // 15% regression per week for efficiency (harder to maintain high focus)
    SUBJECT_DECAY_RATE: 0.02 // 2% natural forgetting per week for subjects
};

export const DIFFICULTY_PRESETS: Record<Exclude<Difficulty, 'CUSTOM'>, DifficultyPreset> = {
    'NORMAL': {
        label: '普通',
        desc: '体验相对轻松的高中生活。(属性大幅提升，更易获得高分)',
        color: 'bg-emerald-500',
        stats: {
            mindset: 40,
            experience: 15,
            luck: 45,
            romance: 40,
            health: 80,
            money: 80,
            efficiency: 14,
            excitement: 45
        },
        subjectAptitudeDelta: 15,
        subjectLevelDelta: 5,
        lessonEfficiencyMultiplier: 1,
        learningRewardMultiplier: 1.1,
        fatigueGainMultiplier: 0.75,
        restRecoveryMultiplier: 1.15,
        peerAverage: 0.58
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
            efficiency: 10,
            excitement: 30
        },
        subjectAptitudeDelta: 0,
        subjectLevelDelta: 0,
        lessonEfficiencyMultiplier: 1,
        learningRewardMultiplier: 1,
        fatigueGainMultiplier: 1,
        restRecoveryMultiplier: 1,
        peerAverage: 0.68
    },
    'REALITY': {
        label: '现实',
        desc: '这就是真实的人生。只有在此模式下可解锁成就。',
        color: 'bg-rose-600',
        stats: {
            mindset: 30,
            experience: 5,
            luck: 30,
            romance: 5,
            health: 60,
            money: 20,
            efficiency: 8,
            excitement: 18
        },
        subjectAptitudeDelta: -10,
        subjectLevelDelta: -2,
        lessonEfficiencyMultiplier: 0.9,
        learningRewardMultiplier: 0.9,
        fatigueGainMultiplier: 1.2,
        restRecoveryMultiplier: 0.8,
        peerAverage: 0.68
    },
    'HELL': {
        label: '地狱',
        desc: '极限生存：健康低于10会结束，心态低于20或疲劳超过90不能学习；同学更强、学习收益为2/3、商品价格翻倍，开局天赋点为-1。',
        color: 'bg-slate-900',
        stats: {
            mindset: 25,
            experience: 0,
            luck: 25,
            romance: 0,
            health: 48,
            money: 10,
            efficiency: 7,
            excitement: 10
        },
        subjectAptitudeDelta: -15,
        subjectLevelDelta: -4,
        lessonEfficiencyMultiplier: 2 / 3,
        learningRewardMultiplier: 2 / 3,
        fatigueGainMultiplier: 1.5,
        restRecoveryMultiplier: 0.65,
        peerAverage: 0.82,
        weekendStudyLimit: 1,
        healthDeathThreshold: 10,
        studyMindsetThreshold: 20,
        studyFatigueThreshold: 90,
        shopPriceMultiplier: 2,
        talentPoints: -1
    }
};

export const getDifficultyPreset = (difficulty: Difficulty): DifficultyPreset =>
    DIFFICULTY_PRESETS[difficulty !== 'CUSTOM' && difficulty in DIFFICULTY_PRESETS ? difficulty : 'NORMAL'];
