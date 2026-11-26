import type { Difficulty, GeneralStats } from '../types';

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
    { version: 'v1.8/bugfix', date: '2026-09-05', content: ['统一文化课考试总分为750分：语数英各150分，三门选考各100分。', '修复熬夜打游戏错误恢复疲劳、社团选择期间主循环继续推进的问题。', '修复时间表预览与执行不一致、损坏存档反复显示可继续，以及AI事件绕过恋爱路线直接确立关系的问题。'] },
    { version: 'v1.7/stability', date: '2026-09-01', content: ['修复事件队列在条件变化后卡住或丢失的问题，周计划阻塞规则与预览保持一致。', '修复多账号切换、AI 旧字段兼容、OI 正式比赛履历重复记录和高难度数值显示问题。', '清理未接通的小游戏/竞赛弹窗状态，并补充流程与数据回归测试。'] },
    { version: 'v1.6/accounts-and-balance', date: '2026-08-30', content: ['整合高难度规则为【现实】难度：完善心态与疲劳学习限制，统一高挑战体验。', '新增本地账号与多存档管理；旧版游客存档仍可继续读取。', '本轮暂缓背景图和事件配图，继续优先打磨玩法内容与可读性。'] },
    { version: 'v1.5/oi-route', date: '2026-08-29', content: ['完善 OI 路线：加入外校集训、训练组模拟赛、公开赛出题、验题上线和赛后游记。', '省选/APIO 会参考竞赛成绩和持续训练记录。'] },
    { version: 'v1.4/gameplay', date: '2026-08-29', content: ['新增兴奋值：影响学习、体育和休息收益。', '加入课堂效率、疲劳系统与周末学习节奏机制。', '调整同学平均水平与考试排名机制，并优化小卖部道具定价。'] },
    { version: 'v1.3/beta', date: '2026-1-22', content: ['新增【无限重开 AI版】，接入 Gemini API 实现动态事件。', '优化了负债逻辑，现在负债会有分级 Debuff。'] },
    { version: 'v1.2/testing', date: '2026-1-21', content: ['实装了每日挑战','修复了已知问题'] },
    { version: 'v1.1.2/testing', date: '2026-1-15', content: ['1.2试运行','修改了主页','增加了深色模式和存档功能（可能会有若干bug）','添加了若干事件和成就'] },
    { version: 'v1.1.1', date: '2026-1-11', content: ['修复若干已知问题，完善支持页面展示。','感谢大家的反馈，大更新预计在1.20左右上线（截至该版本上线，已收到来自15+省区的~50份反馈问卷，衷心感谢大家的支持）。'] },
    { version: 'v1.1.0', date: '2026-1-4', content: ['调整了多项数值与流程，欢迎游玩体验。','此版本仍在测试打磨中，可能存在若干问题。'] },
    { version: 'v1.0.0/稳定', date: '2026-1-3', content: ['初版上线：完整覆盖高一学年、分班选科、社团与日常校园事件。', '实装基础属性系统、周末日程规划与多结局生涯档案。'] }
];

// --- Mechanic Constants ---
export const MECHANICS_CONFIG = {
    GENERAL_REGRESSION_RATE: 0.05, // 5% regression per week for general stats (towards baseline)
    EFFICIENCY_REGRESSION_RATE: 0.15,
    REALISTIC_EFFICIENCY_WEEKLY_DECLINE: 0.2,
    REALISTIC_EFFICIENCY_MONTHLY_RECOVERY: 0.1,
    SUBJECT_DECAY_RATE: 0.02 // 2% natural forgetting per week for subjects
};

export const getWeeklyEfficiency = (current: number, difficulty: Difficulty): number => {
    const baseline = 10;
    let rate = MECHANICS_CONFIG.EFFICIENCY_REGRESSION_RATE;
    if (difficulty === 'REALITY') {
        rate = current > baseline
            ? MECHANICS_CONFIG.REALISTIC_EFFICIENCY_WEEKLY_DECLINE
            // Apply the monthly recovery evenly over four weekly settlements.
            : 1 - Math.pow(1 - MECHANICS_CONFIG.REALISTIC_EFFICIENCY_MONTHLY_RECOVERY, 1 / 4);
    }
    return Math.min(30, Math.max(0, current + (baseline - current) * rate));
};

export const DIFFICULTY_PRESETS: Record<Exclude<Difficulty, 'CUSTOM'>, DifficultyPreset> = {
    'NORMAL': {
        label: '普通',
        desc: '开局属性较高，学习收益更高，疲劳积累较慢。',
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
        peerAverage: 0.77
    },
    'HARD': {
        label: '困难',
        desc: '开局资源较少，考试排名更难提升。',
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
        peerAverage: 0.785
    },
    'REALITY': {
        label: '现实',
        desc: '周末活动每周变化。除余额外，属性以体感呈现。心态过低或疲劳过高时无法学习。',
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
        peerAverage: 0.8,
        studyMindsetThreshold: 20,
        studyFatigueThreshold: 90
    }
};

export const getDifficultyPreset = (difficulty: Difficulty): DifficultyPreset =>
    DIFFICULTY_PRESETS[difficulty !== 'CUSTOM' && difficulty in DIFFICULTY_PRESETS ? difficulty : 'NORMAL'];
