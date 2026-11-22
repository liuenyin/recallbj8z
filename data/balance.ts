/**
 * Small, pure balance helpers kept outside React so they can be regression
 * tested without rendering the game.
 */
import type { GameState, GameStatus, Phase, SubjectKey, WeekendActivity } from '../types';
import { HOMEWORK_ACTIVITY_ID } from './timetable.ts';

export const WEEKEND_STATUSES = {
  homework_fog: { id: 'homework_fog', name: '连写作业走神', description: '写到一半开始走神。', type: 'DEBUFF', icon: 'fa-cloud', effectDescription: '后续作业收益减半，睡一觉可以恢复。' },
  homework_backlog: { id: 'homework_backlog', name: '作业积压', description: '还有没写完的作业。', type: 'DEBUFF', icon: 'fa-book', effectDescription: '短时间内影响专注。' },
  late_night_lag: { id: 'late_night_lag', name: '熬夜犯困', description: '一坐下来就想打哈欠。', type: 'DEBUFF', icon: 'fa-moon', effectDescription: '短时间内影响专注，补觉后消失。' },
} satisfies Record<string, Omit<GameStatus, 'duration'>>;

export const ACTIVITY_REPEAT_MULTIPLIERS = [1, 0.68, 0.45, 0.3] as const;

export const getActivityRepeatMultiplier = (repeatCount: number): number => {
  if (!Number.isFinite(repeatCount) || repeatCount <= 1) return ACTIVITY_REPEAT_MULTIPLIERS[0];
  if (repeatCount === 2) return ACTIVITY_REPEAT_MULTIPLIERS[1];
  if (repeatCount === 3) return ACTIVITY_REPEAT_MULTIPLIERS[2];
  return ACTIVITY_REPEAT_MULTIPLIERS[3];
};

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const getAcademicSubjectScore = (
  subject: SubjectKey, rawPercentage: number, maximum: number, reduceHighScoreGrowth = false
): number => {
  if (subject === 'chinese') {
    const compressed = 102 + 30 * Math.tanh((rawPercentage - 64) / 36);
    return Math.floor(clamp(compressed - 1.8 * Math.max(0, 20 - rawPercentage), 0, maximum));
  }
  const adjustedPercentage = subject === 'math' ? 80 + 1.13 * (rawPercentage - 80)
    : subject === 'english' ? rawPercentage + 2.5
    : rawPercentage;
  const percentage = reduceHighScoreGrowth && adjustedPercentage > 80
    ? 80 + (adjustedPercentage - 80) * 0.66 : adjustedPercentage;
  return Math.floor(clamp(percentage / 100, 0, 1) * maximum);
};

const ACADEMIC_PAPER_DIFFICULTIES: Partial<Record<Phase, readonly [standard: number, realistic: number]>> = {
  PLACEMENT_EXAM: [1.05, 0.69],
  MIDTERM_EXAM: [1.27, 1.13],
  FINAL_EXAM: [1.46, 1.44],
  MIDTERM_EXAM_2: [1.63, 1.815],
  FINAL_EXAM_2: [1.75, 1.85]
};

export const getAcademicExamSubjectScore = (
  state: Pick<GameState, 'phase' | 'difficulty' | 'subjects'>,
  subject: SubjectKey,
  maximum: number,
  effectiveEfficiency: number,
  luckMultiplier: number
): number => {
  const realistic = state.difficulty === 'REALITY';
  const difficulty = ACADEMIC_PAPER_DIFFICULTIES[state.phase]?.[realistic ? 1 : 0] ?? 1;
  const stats = state.subjects[subject];
  const focusBonus = Math.max(0, effectiveEfficiency - 15) * (realistic ? 1 : 0.35);
  const accuracy = (stats.aptitude * 0.4 + stats.level * 3) / difficulty + focusBonus;
  return getAcademicSubjectScore(subject, accuracy * luckMultiplier, maximum, !realistic);
};

// Score cutoffs for 633 students, expressed on a 750-point paper.
export const REALISTIC_RANK_CUTOFFS = [
  [710, 1], [693, 2], [690, 3], [677, 10], [665, 30], [655, 50], [640, 100],
  [628, 165], [602, 329], [570, 528], [520, 613], [450, 633],
] as const;

export const getRealisticExamRank = (score: number, maximum: number): number => {
  const equivalent = score * 750 / maximum;
  const lowerIndex = REALISTIC_RANK_CUTOFFS.findIndex(([cutoff]) => equivalent >= cutoff);
  if (lowerIndex <= 0) return lowerIndex === 0 ? 1 : 633;
  const [lowScore, lowRank] = REALISTIC_RANK_CUTOFFS[lowerIndex];
  const [highScore, highRank] = REALISTIC_RANK_CUTOFFS[lowerIndex - 1];
  const fraction = (highScore - equivalent) / (highScore - lowScore);
  return Math.ceil(highRank + fraction * (lowRank - highRank));
};

export const getAcademicExamRank = (score: number, maximum: number, peerAverage: number): number => {
  const equivalent = score * 750 / maximum;
  // The top of the year group uses the same reference scores. Middle and
  // lower ranks are a little more forgiving on the easier difficulties.
  const middleRankWeight = clamp((640 - equivalent) / 40, 0, 1);
  const allowance = Math.max(0, 0.8 - peerAverage) * maximum * middleRankWeight;
  return getRealisticExamRank(score + allowance, maximum);
};

/** Fatigue cost/recovery for a single scheduled weekend activity. */
export const getWeekendActivityFatigueDelta = (
  activity: Pick<WeekendActivity, 'id' | 'type'>,
  restMultiplier: number,
  fatigueGainMultiplier: number
): number => {
  if (activity.id === 'w_sleep') return -35 * restMultiplier;
  if (activity.id === HOMEWORK_ACTIVITY_ID) return 6 * fatigueGainMultiplier;
  if (activity.id.startsWith('saturday_course_')) return 7 * fatigueGainMultiplier;
  // Staying up all night is deliberately not treated as restorative rest.
  if (activity.id === 'w_game_late') return 16 * fatigueGainMultiplier;
  // Physical exercise builds health and focus, while costing moderate stamina instead of clearing fatigue.
  if (activity.id === 'act_sport') return 6 * fatigueGainMultiplier;
  if (activity.type === 'REST') return -10 * restMultiplier;
  if (activity.type === 'SOCIAL' || activity.type === 'LOVE') return 4;
  if (activity.type === 'OI') return 14 * fatigueGainMultiplier;
  return 10 * fatigueGainMultiplier;
};
