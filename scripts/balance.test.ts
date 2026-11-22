import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { GameState } from '../types.ts';
import { getWeeklyEfficiency } from '../data/constants.ts';
import { getMoResult, isMoAwardScore, scoreMoPaperOne, scoreMoPaperTwo, trainMo } from '../data/mo_competition.ts';
import { ACTIVITY_REPEAT_MULTIPLIERS, getActivityRepeatMultiplier, getWeekendActivityFatigueDelta, clamp, getAcademicSubjectScore, getAcademicExamSubjectScore, getAcademicExamRank, getRealisticExamRank } from '../data/balance.ts';
import { clearWeekdaySchedule, ALLOWED_SLOTS_MAP, BLOCKED_SLOTS_MAP } from '../data/timetable.ts';

test('Chinese scores cluster more tightly than maths and English', () => {
  assert.ok(getAcademicSubjectScore('chinese', 55, 150) > 80);
  assert.ok(getAcademicSubjectScore('math', 55, 150) < 80);
  assert.ok(getAcademicSubjectScore('chinese', 100, 150) < 130);
  assert.ok(getAcademicSubjectScore('math', 94, 150) >= 130);
  assert.ok(getAcademicSubjectScore('english', 91, 150) >= 130);
  assert.equal(getAcademicSubjectScore('physics', 80, 100), 80);
});

test('realistic exams use the year group score cutoffs', () => {
  for (const [score, rank] of [[710, 1], [701, 2], [693, 2], [690, 3], [677, 10], [655, 50], [640, 100], [632, 144], [628, 165], [602, 329]]) {
    assert.equal(getRealisticExamRank(score, 750), rank);
  }
  assert.equal(getRealisticExamRank(693 * 450 / 750, 450), 2);
});

test('a strong focus bonus cannot turn routine finals into full marks', () => {
  const subjects = { math: { aptitude: 95, level: 36 } } as GameState['subjects'];
  const standard = { phase: 'FINAL_EXAM_2' as GameState['phase'], difficulty: 'NORMAL', subjects } as const;
  const prepared = getAcademicExamSubjectScore(standard, 'math', 150, 30, 1);
  const rested = getAcademicExamSubjectScore(standard, 'math', 150, 15, 1);
  assert.ok(prepared > rested && prepared - rested <= 7);
  assert.ok(prepared >= 110 && prepared <= 140);
  const veryStrong = { ...standard, subjects: { ...subjects, math: { aptitude: 105, level: 60 } } };
  assert.equal(getAcademicExamSubjectScore(veryStrong, 'math', 150, 25, 1.025), 150);
  assert.ok(getAcademicExamSubjectScore({ ...standard, phase: 'MIDTERM_EXAM_2' as GameState['phase'] }, 'math', 150, 25, 1)
    < getAcademicExamSubjectScore({ ...standard, phase: 'FINAL_EXAM' as GameState['phase'] }, 'math', 150, 25, 1));
});

test('academic difficulty spreads middle ranks while keeping the same top scores', () => {
  const normal = 0.77;
  const hard = 0.785;
  const reality = 0.8;
  assert.equal(getAcademicExamRank(677, 750, normal), 10);
  assert.equal(getAcademicExamRank(655, 750, hard), 50);
  assert.ok(getAcademicExamRank(610, 750, normal) < getAcademicExamRank(610, 750, hard));
  assert.ok(getAcademicExamRank(610, 750, hard) < getAcademicExamRank(610, 750, reality));
  for (let score = 1; score <= 750; score += 1) {
    assert.ok(getAcademicExamRank(score, 750, normal) <= getAcademicExamRank(score - 1, 750, normal));
  }
});

test('realistic efficiency falls by a fifth weekly and recovers a tenth of the gap in four weeks', () => {
  assert.equal(getWeeklyEfficiency(20, 'REALITY'), 18);
  assert.equal(getWeeklyEfficiency(10, 'REALITY'), 10);
  let efficiency = 5;
  for (let week = 0; week < 4; week += 1) efficiency = getWeeklyEfficiency(efficiency, 'REALITY');
  assert.ok(Math.abs(efficiency - 5.5) < 1e-9);
  assert.equal(getWeeklyEfficiency(20, 'NORMAL'), 18.5);
});

test('MO counts blanks in eights and gives partial credit for written work', () => {
  const starter = { flags: {}, subjects: { math: { level: 20 } },
    fatigue: 20, general: { mindset: 70, health: 85, luck: 150 } } as GameState;
  const steady = () => 0.5;
  const novice = scoreMoPaperOne(starter, 'check', steady);
  const shortPractice = { ...starter, flags: trainMo(starter, { speed: 34 }) };
  const proofs = { ...starter, flags: trainMo(starter, { geometry: 32, algebra: 30, number_theory: 32, combinatorics: 32 }) };
  const rested = scoreMoPaperTwo(proofs, 'geometry_algebra', steady);
  const tired = scoreMoPaperTwo({ ...proofs, fatigue: 95 }, 'geometry_algebra', steady);
  assert.equal(novice.blanks % 8, 0);
  assert.ok(novice.written > 0 && novice.written < 56);
  assert.ok(scoreMoPaperOne(shortPractice, 'check', steady).total > novice.total);
  assert.ok(rested.total > tired.total && rested.marks.every((mark, i) => mark > 0 && mark < (i < 2 ? 40 : 50)));
  assert.equal(isMoAwardScore(novice.total, scoreMoPaperTwo(starter, 'geometry_algebra', steady).total), false);
  const expert = { ...starter, flags: trainMo(starter, { speed: 100, geometry: 100, algebra: 100, number_theory: 100, combinatorics: 100 }) };
  assert.equal(scoreMoPaperOne(expert, 'written', steady).total, 120);
  assert.equal(scoreMoPaperTwo(expert, 'number_combinatorics', steady).total, 180);
  assert.deepEqual(getMoResult({ ...starter, flags: { mo_league_first: 0, mo_league_second: 0 } }, 'league'), { first: 0, second: 0, total: 0 });
  assert.equal(getMoResult({ ...starter, flags: { mo_league_first: 121, mo_league_second: 0 } }, 'league'), null);
});

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
  assert.match(mechanicsSource, /w_game_late'[\s\S]*?health: s\.general\.health - 5/);
  const source = fs.readFileSync(new URL('../data/utils.ts', import.meta.url), 'utf8');
  assert.match(source, /getWeekendActivityFatigueDelta\(/);
});

test('weekend fatigue preview uses the same late-night penalty as execution', () => {
  assert.equal(getWeekendActivityFatigueDelta({ id: 'w_game_late', type: 'REST' }, 1, 1), 16);
  assert.equal(getWeekendActivityFatigueDelta({ id: 'w_sleep', type: 'REST' }, 1, 1), -35);
});
