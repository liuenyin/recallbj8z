/**
 * Small, pure balance helpers kept outside React so they can be regression
 * tested without rendering the game.
 */
import type { WeekendActivity } from '../types';

export const ACTIVITY_REPEAT_MULTIPLIERS = [1, 0.68, 0.45, 0.3] as const;

export const getActivityRepeatMultiplier = (repeatCount: number): number => {
  if (!Number.isFinite(repeatCount) || repeatCount <= 1) return ACTIVITY_REPEAT_MULTIPLIERS[0];
  if (repeatCount === 2) return ACTIVITY_REPEAT_MULTIPLIERS[1];
  if (repeatCount === 3) return ACTIVITY_REPEAT_MULTIPLIERS[2];
  return ACTIVITY_REPEAT_MULTIPLIERS[3];
};

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** Fatigue cost/recovery for a single scheduled weekend activity. */
export const getWeekendActivityFatigueDelta = (
  activity: Pick<WeekendActivity, 'id' | 'type'>,
  restMultiplier: number,
  fatigueGainMultiplier: number
): number => {
  if (activity.id === 'w_sleep') return -35 * restMultiplier;
  // Staying up all night is deliberately not treated as restorative rest.
  if (activity.id === 'w_game_late') return 16 * fatigueGainMultiplier;
  if (activity.type === 'REST') return -10 * restMultiplier;
  if (activity.type === 'SOCIAL' || activity.type === 'LOVE') return 4;
  if (activity.type === 'OI') return 14 * fatigueGainMultiplier;
  return 10 * fatigueGainMultiplier;
};
