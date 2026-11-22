import type { GameState } from '../types';

export const MO_LEAGUE_WEEK = 2;
export const MO_MOCK_WEEK = 14;
export const MO_PAPER_MAX = [120, 180] as const;
export const MO_TRAINING_IDS = ['w_mo_training', 'w_mo_proof'] as const;

const PROOF_TOPICS = ['geometry', 'algebra', 'number_theory', 'combinatorics'] as const;
type ProofTopic = typeof PROOF_TOPICS[number];
type MoSkill = 'speed' | ProofTopic;
type MoExam = 'league' | 'mock';

const MO_SKILLS = ['speed', ...PROOF_TOPICS] as const;
const bound = (value: number, max: number) => Math.max(0, Math.min(max, value));

export const getMoSkill = (state: GameState, skill: MoSkill) => {
    const stored = state.flags[`mo_skill_${skill}`];
    return typeof stored === 'number' && Number.isFinite(stored) ? bound(stored, 100) : skill === 'speed' ? 24 : 17;
};

export const getMoReadiness = (state: GameState) =>
    MO_SKILLS.reduce((sum, skill) => sum + getMoSkill(state, skill), 0) / MO_SKILLS.length;

export const trainMo = (state: GameState, gains: Partial<Record<MoSkill, number>>, multiplier = 1) => {
    const flags = { ...state.flags };
    for (const skill of MO_SKILLS) {
        const gain = gains[skill];
        if (!gain) continue;
        const current = getMoSkill(state, skill);
        const diminishing = current >= 75 ? 0.25 : current >= 55 ? 0.65 : 1;
        flags[`mo_skill_${skill}`] = bound(current + gain * multiplier * diminishing, 100);
    }
    return flags;
};

export const getMoPracticeTopic = (state: GameState) =>
    PROOF_TOPICS[(state.week - 1 + (state.phase === 'SEMESTER_2' ? 1 : 0)) % PROOF_TOPICS.length] ?? 'geometry';

export const MO_PRACTICE_TITLES = {
    geometry: '平面几何专题',
    algebra: '代数专题',
    number_theory: '数论专题',
    combinatorics: '组合专题'
};

const examCondition = (state: GameState) =>
    Math.max(0, state.fatigue - 32) * 0.19
    + Math.max(0, 53 - state.general.mindset) * 0.12
    + Math.max(0, 45 - state.general.health) * 0.10;

const partialCredit = (ability: number, startsAt: number, fullAt: number, max: number) =>
    Math.floor(max * bound((ability - startsAt) / (fullAt - startsAt), 1));

export const scoreMoPaperOne = (state: GameState, strategy: 'check' | 'written', random = Math.random) => {
    // School maths helps with fluency, but cannot replace timed competition practice.
    const schoolBasics = bound((state.subjects.math.level - 10) * 0.48, 12);
    const ability = getMoSkill(state, 'speed') + schoolBasics - examCondition(state);
    const variance = () => (random() - 0.5) * 10;
    const blanks = [16, 23, 29, 35, 43, 51, 61, 72].reduce((score, difficulty) =>
        score + (ability + variance() + (strategy === 'check' ? 4 : -3) >= difficulty ? 8 : 0), 0);
    const proofBasics = (getMoSkill(state, 'algebra') + getMoSkill(state, 'geometry')) / 2;
    const writtenAbility = ability * 0.76 + proofBasics * 0.24 + (strategy === 'written' ? 6 : 0);
    const written = partialCredit(writtenAbility + variance(), 14, 59, 16)
        + partialCredit(writtenAbility + variance(), 26, 75, 20)
        + partialCredit(writtenAbility + variance(), 40, 91, 20);
    return { blanks, written, total: blanks + written };
};

export const scoreMoPaperTwo = (state: GameState, strategy: 'geometry_algebra' | 'number_combinatorics', random = Math.random) => {
    const favoured = strategy === 'geometry_algebra' ? PROOF_TOPICS.slice(0, 2) : PROOF_TOPICS.slice(2);
    const marks = PROOF_TOPICS.map((topic, index) => {
        const time = favoured.includes(topic) ? 5 : -2;
        const ability = getMoSkill(state, topic) + time - examCondition(state) + (random() - 0.5) * 10;
        // Harder proofs yield something for a valid lemma, but require a complete solution for full marks.
        return partialCredit(ability, [18, 24, 32, 38][index], [74, 80, 91, 97][index], index < 2 ? 40 : 50);
    });
    return { marks, total: marks.reduce((sum, score) => sum + score, 0) };
};

const readMark = (state: GameState, key: string, max: number): number | undefined => {
    const value = state.flags[key];
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max ? value : undefined;
};

export const getMoResult = (state: GameState, exam: MoExam) => {
    const first = readMark(state, `mo_${exam}_first`, MO_PAPER_MAX[0]);
    const second = readMark(state, `mo_${exam}_second`, MO_PAPER_MAX[1]);
    return first !== undefined && second !== undefined ? { first, second, total: first + second } : null;
};

// These cutoffs are for the simulation. Beijing bases awards on that year's results.
export const isMoAwardScore = (first: number, second: number) => first + second >= 112 && second >= 24;

export const getMoExamScheduleTitle = (state: Pick<GameState, 'phase' | 'week' | 'flags'>) => {
    if (state.phase === 'SEMESTER_1' && state.week === MO_LEAGUE_WEEK && state.flags.mo_league_sat) return '高中数学联赛';
    if (state.phase === 'SEMESTER_2' && state.week === MO_MOCK_WEEK && state.flags.mo_mock_sat) return '数竞校内模拟';
    return undefined;
};