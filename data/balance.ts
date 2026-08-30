/**
 * Small, pure balance helpers kept outside React so they can be regression
 * tested without rendering the game.
 */
export const ACTIVITY_REPEAT_MULTIPLIERS = [1, 0.68, 0.45, 0.3] as const;

export const getActivityRepeatMultiplier = (repeatCount: number): number => {
  if (!Number.isFinite(repeatCount) || repeatCount <= 1) return ACTIVITY_REPEAT_MULTIPLIERS[0];
  if (repeatCount === 2) return ACTIVITY_REPEAT_MULTIPLIERS[1];
  if (repeatCount === 3) return ACTIVITY_REPEAT_MULTIPLIERS[2];
  return ACTIVITY_REPEAT_MULTIPLIERS[3];
};

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
