import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ACTIVITY_REPEAT_MULTIPLIERS, getActivityRepeatMultiplier, getWeekendActivityFatigueDelta, clamp } from '../data/balance.ts';
import { clearWeekdaySchedule, ALLOWED_SLOTS_MAP, BLOCKED_SLOTS_MAP } from '../data/timetable.ts';

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

test('Codeforces is restricted to Saturday night and blocks Sunday morning', () => {
  assert.deepEqual(ALLOWED_SLOTS_MAP.act_cf, ['Sat_Night']);
  assert.deepEqual(BLOCKED_SLOTS_MAP.act_cf, ['Sun_Morn']);
});

test('staying up to play games increases fatigue instead of receiving rest recovery', () => {
  const mechanicsSource = fs.readFileSync(new URL('../data/mechanics.ts', import.meta.url), 'utf8');
  assert.match(mechanicsSource, /id: 'w_game_late'[\s\S]*?type: 'REST'/);
  assert.match(mechanicsSource, /w_game_late'[\s\S]*?头痛/);
  const source = fs.readFileSync(new URL('../data/utils.ts', import.meta.url), 'utf8');
  assert.match(source, /getWeekendActivityFatigueDelta\(/);
});

test('weekend fatigue preview uses the same late-night penalty as execution', () => {
  assert.equal(getWeekendActivityFatigueDelta({ id: 'w_game_late', type: 'REST' }, 1, 1), 16);
  assert.equal(getWeekendActivityFatigueDelta({ id: 'w_sleep', type: 'REST' }, 1, 1), -35);
});
