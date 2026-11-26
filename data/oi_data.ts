
import type { Phase, OIProblem, OIStats, SubjectStats } from '../types';

export interface OIExamItem extends OIProblem {
    isWritten?: boolean;
}

export const OI_EXAM_PHASES = new Set<Phase>([
    'CSP_EXAM' as Phase,
    'NOIP_EXAM' as Phase,
    'WC_EXAM' as Phase,
    'PROVINCIAL_EXAM' as Phase,
    'APIO_EXAM' as Phase,
    'NOI_EXAM' as Phase
]);

export const isOIExamPhase = (phase: Phase): boolean => OI_EXAM_PHASES.has(phase);

export const OI_PROBLEMS: OIProblem[] = [
    { name: "基础模拟", level: 1, difficulty: { dp: 0, ds: 1, math: 0, string: 1, graph: 0, misc: 2 } },
    { name: "排序与贪心", level: 1, difficulty: { dp: 0, ds: 2, math: 0, string: 0, graph: 0, misc: 2 } },
    { name: "前缀与序列", level: 2, difficulty: { dp: 1, ds: 2, math: 1, string: 0, graph: 0, misc: 2 } },
    { name: "字符串枚举", level: 2, difficulty: { dp: 0, ds: 1, math: 0, string: 3, graph: 0, misc: 2 } },
    { name: "树上遍历", level: 3, difficulty: { dp: 1, ds: 2, math: 0, string: 0, graph: 3, misc: 2 } },
    { name: "线性 DP", level: 3, difficulty: { dp: 4, ds: 1, math: 1, string: 0, graph: 0, misc: 2 } },
    { name: "最短路与拓扑", level: 4, difficulty: { dp: 1, ds: 2, math: 0, string: 0, graph: 4, misc: 2 } },
    { name: "博弈与构造", level: 4, difficulty: { dp: 2, ds: 1, math: 3, string: 0, graph: 0, misc: 4 } },
    { name: "字符串匹配", level: 5, difficulty: { dp: 0, ds: 1, math: 0, string: 5, graph: 0, misc: 3 } },
    { name: "区间与树形 DP", level: 5, difficulty: { dp: 5, ds: 2, math: 0, string: 0, graph: 2, misc: 2 } },
    { name: "树上数据结构", level: 6, difficulty: { dp: 1, ds: 6, math: 0, string: 0, graph: 3, misc: 3 } },
    { name: "计数与期望", level: 6, difficulty: { dp: 3, ds: 0, math: 6, string: 0, graph: 0, misc: 4 } },
    { name: "网络流建模", level: 7, difficulty: { dp: 0, ds: 2, math: 1, string: 0, graph: 7, misc: 4 } },
    { name: "进阶数据结构", level: 7, difficulty: { dp: 1, ds: 8, math: 1, string: 0, graph: 0, misc: 5 } },
    { name: "自动机与后缀结构", level: 8, difficulty: { dp: 1, ds: 2, math: 0, string: 8, graph: 0, misc: 4 } },
    { name: "动态规划优化", level: 8, difficulty: { dp: 9, ds: 4, math: 2, string: 0, graph: 0, misc: 4 } },
    { name: "高阶图论连通", level: 9, difficulty: { dp: 1, ds: 3, math: 1, string: 0, graph: 9, misc: 5 } },
    { name: "多项式与数论", level: 9, difficulty: { dp: 1, ds: 1, math: 10, string: 0, graph: 0, misc: 6 } },
    { name: "压轴综合构造", level: 10, difficulty: { dp: 3, ds: 2, math: 4, string: 0, graph: 2, misc: 10 } },
    { name: "多算法融合压轴", level: 10, difficulty: { dp: 5, ds: 5, math: 4, string: 3, graph: 4, misc: 6 } }
];

const NOI_WRITTEN_EXAM: OIExamItem = {
    name: "NOI 笔试（赛制与常识）",
    level: 1,
    difficulty: { dp: 0, ds: 0, math: 0, string: 0, graph: 0, misc: 0 },
    isWritten: true
};

const OI_CONTEST_BRACKETS: Partial<Record<Phase, ReadonlyArray<readonly [min: number, max: number]>>> = {
    CSP_EXAM: [[1, 1], [2, 2], [3, 3], [4, 4]],
    NOIP_EXAM: [[2, 3], [4, 4], [5, 6], [6, 7]],
    WC_EXAM: [[6, 7], [8, 8], [9, 10]],
    APIO_EXAM: [[6, 7], [8, 8], [9, 10]],
    PROVINCIAL_EXAM: [[5, 6], [7, 8], [9, 10], [5, 6], [7, 8], [9, 10]],
    NOI_EXAM: [[6, 7], [8, 8], [9, 10], [6, 7], [8, 8], [9, 10]]
};

export const getOIPaperDifficulty = (phase: Phase): number => {
    switch (phase) {
        case 'CSP_EXAM': return 0.95;
        case 'NOIP_EXAM': return 1.25;
        case 'WC_EXAM': return 1.50;
        case 'PROVINCIAL_EXAM': return 1.65;
        case 'APIO_EXAM': return 1.55;
        case 'NOI_EXAM': return 1.72;
        default: return 1.0;
    }
};

export const getOIContestMaxScore = (phase: Phase): number => {
    const codingCount = OI_CONTEST_BRACKETS[phase]?.length ?? 4;
    return (codingCount + (phase === 'NOI_EXAM' ? 1 : 0)) * 100;
};

export const selectOIExamProblems = (phase: Phase, random = Math.random): OIExamItem[] => {
    const brackets = OI_CONTEST_BRACKETS[phase];
    if (!brackets) return [];
    const used = new Set<string>();
    const coding = brackets.map(([min, max]) => {
        const bracketPool = OI_PROBLEMS.filter(problem => problem.level >= min && problem.level <= max);
        const candidates = bracketPool.filter(problem => !used.has(problem.name));
        const pool = candidates.length > 0 ? candidates : bracketPool.length > 0 ? bracketPool : OI_PROBLEMS;
        const picked = pool[Math.floor(random() * pool.length)];
        used.add(picked.name);
        return picked;
    });
    return phase === 'NOI_EXAM' ? [NOI_WRITTEN_EXAM, ...coding] : coding;
};

export const evaluateOIProblemScore = (
    phase: Phase,
    problem: OIExamItem,
    oiStats: OIStats,
    mathStats: SubjectStats,
    experience: number,
    luckMultiplier: number,
    random = Math.random
): number => {
    if (problem.isWritten) {
        // NOI written test is 50 two-point questions covering Linux and contest rules.
        const base = 92 + Math.min(6, (oiStats.misc || 0) * 0.15 + experience * 0.05) + (random() * 4 - 1) + (luckMultiplier - 1) * 12;
        return Math.min(100, Math.max(84, Math.round(base / 2) * 2));
    }
    const difficultyMod = getOIPaperDifficulty(phase);
    let weightedRatio = 0;
    let totalWeight = 0;
    (['dp', 'ds', 'math', 'string', 'graph', 'misc'] as const).forEach(k => {
        const d = problem.difficulty[k];
        if (d > 0) {
            const need = (d * 2.1 + 6.5) * difficultyMod;
            const dimRatio = Math.min(1.04, (oiStats[k] || 0) / need);
            weightedRatio += dimRatio * d;
            totalWeight += d;
        }
    });
    const baseMastery = totalWeight > 0 ? weightedRatio / totalWeight : 0;
    const mathBonus = Math.min(0.05, (mathStats.aptitude * 0.015 + mathStats.level * 0.05) / (45 * difficultyMod));
    const finalRatio = (baseMastery + mathBonus) * luckMultiplier;
    const raw = finalRatio >= 0.96 ? 100 : Math.max(0, Math.min(100, finalRatio * 100));
    const stepped = raw >= 97 ? 100 : Math.floor((raw + 2.5) / 5) * 5;
    return Math.min(100, Math.max(0, stepped));
};
