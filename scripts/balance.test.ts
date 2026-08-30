import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVITY_REPEAT_MULTIPLIERS, getActivityRepeatMultiplier, clamp } from '../data/balance.ts';
import { clearWeekdaySchedule } from '../data/timetable.ts';

test('repeated activity multipliers decline without becoming punitive', () => {
  assert.deepEqual(
    [1, 2, 3, 4, 8].map(getActivityRepeatMultiplier),
    [1, 0.68, 0.45, 0.3, 0.3]
  );
  assert.equal(getActivityRepeatMultiplier(0), ACTIVITY_REPEAT_MULTIPLIERS[0]);
  assert.equal(getActivityRepeatMultiplier(Number.NaN), ACTIVITY_REPEAT_MULTIPLIERS[0]);
});

test('clamp keeps projected values in the game meter range', () => {
  assert.equal(clamp(-5, 0, 100), 0);
  assert.equal(clamp(45, 0, 100), 45);
  assert.equal(clamp(105, 0, 100), 100);
});

test('joining evening study clears weekday schedule entries but keeps weekends', () => {
  assert.deepEqual(
    clearWeekdaySchedule({ Mon_Eve: 'w_game', Fri_Eve: 'w_chat', Sat_Aft: 'w_sleep' }),
    { Sat_Aft: 'w_sleep' }
  );
});
