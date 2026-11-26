import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { GameState } from '../types.ts';
import { getWeeklyEfficiency } from '../data/constants.ts';
import { getMoLeagueAward, getMoResult, isMoAwardScore, scoreMoPaperOne, scoreMoPaperTwo, trainMo } from '../data/mo_competition.ts';
import { evaluateOIProblemScore, getOIContestMaxScore, selectOIExamProblems } from '../data/oi_data.ts';
import { ACTIVITY_REPEAT_MULTIPLIERS, getActivityRepeatMultiplier, getWeekendActivityFatigueDelta, clamp, getAcademicSubjectScore, getAcademicExamSubjectScore, getAcademicExamRank, getRealisticExamRank } from '../data/balance.ts';
import { clearEveningStudySchedule, getEveningStudySlots, ALLOWED_SLOTS_MAP, BLOCKED_SLOTS_MAP } from '../data/timetable.ts';

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

test('MO award tiers use both papers and preserve legacy award results', () => {
  const award = (first: number, second: number) => getMoLeagueAward({
    flags: { mo_league_first: first, mo_league_second: second }
  });
  assert.equal(award(120, 23), null);
  assert.equal(award(87, 24), null);
  assert.equal(award(88, 24), '三等奖');
  assert.equal(award(97, 24), '三等奖');
  assert.equal(award(101, 34), '三等奖');
  assert.equal(award(100, 35), '二等奖');
  assert.equal(award(111, 44), '二等奖');
  assert.equal(award(110, 45), '一等奖');
  assert.equal(getMoLeagueAward({ flags: { mo_league_awarded: true } }), '已获奖');
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

test('school reserves Monday through Thursday and keeps Friday free, including for legacy saves', () => {
  const legacy = { phase: 'SEMESTER_1' as GameState['phase'], flags: { joined_evening_study: true } };
  assert.deepEqual(getEveningStudySlots(legacy), ['Mon_Eve', 'Tue_Eve', 'Wed_Eve', 'Thu_Eve']);
  assert.deepEqual(
    clearEveningStudySchedule({ Mon_Eve: 'w_game', Fri_Eve: 'w_chat', Sat_Aft: 'w_sleep' }, legacy),
    { Fri_Eve: 'w_chat', Sat_Aft: 'w_sleep' }
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

test('HARD and REALITY academic difficulty curves progress smoothly without placement inversion', () => {
  const hardPlacement = getAcademicExamSubjectScore(
    { phase: 'PLACEMENT_EXAM' as GameState['phase'], difficulty: 'HARD', subjects: { math: { aptitude: 80, level: 12 } } as GameState['subjects'] },
    'math', 150, 10, 1
  );
  const realityPlacement = getAcademicExamSubjectScore(
    { phase: 'PLACEMENT_EXAM' as GameState['phase'], difficulty: 'REALITY', subjects: { math: { aptitude: 70, level: 10 } } as GameState['subjects'] },
    'math', 150, 7.2, 1
  );
  assert.ok(hardPlacement >= 105 && hardPlacement <= 125);
  assert.ok(realityPlacement >= 100 && realityPlacement <= 120);
  const realityMidterm2 = getAcademicExamSubjectScore(
    { phase: 'MIDTERM_EXAM_2' as GameState['phase'], difficulty: 'REALITY', subjects: { math: { aptitude: 70, level: 30 } } as GameState['subjects'] },
    'math', 150, 18, 1
  );
  const realityFinal1 = getAcademicExamSubjectScore(
    { phase: 'FINAL_EXAM' as GameState['phase'], difficulty: 'REALITY', subjects: { math: { aptitude: 70, level: 30 } } as GameState['subjects'] },
    'math', 150, 18, 1
  );
  assert.ok(realityMidterm2 < realityFinal1);
});

test('OI contests match realistic problem counts, max totals, and 5-pt/2-pt score steps', () => {
  const expected: Array<[GameState['phase'], number, number]> = [
    ['CSP_EXAM' as GameState['phase'], 4, 400],
    ['NOIP_EXAM' as GameState['phase'], 4, 400],
    ['WC_EXAM' as GameState['phase'], 3, 300],
    ['PROVINCIAL_EXAM' as GameState['phase'], 6, 600],
    ['APIO_EXAM' as GameState['phase'], 3, 300],
    ['NOI_EXAM' as GameState['phase'], 7, 700]
  ];
  const steady = () => 0.5;
  const nerdOnly = { dp: 5, ds: 5, math: 5, string: 5, graph: 5, misc: 10 };
  const topOi = { dp: 28, ds: 25, math: 25, string: 14, graph: 22, misc: 22 };
  const mathStats = { aptitude: 80, level: 25 };

  for (const [phase, count, maxTotal] of expected) {
    const problems = selectOIExamProblems(phase, steady);
    assert.equal(problems.length, count, phase);
    assert.equal(getOIContestMaxScore(phase), maxTotal, phase);
    for (const prob of problems) {
      const score = evaluateOIProblemScore(phase, prob, topOi, mathStats, 30, 1, steady);
      assert.ok(score >= 0 && score <= 100);
      assert.equal(score % (prob.isWritten ? 2 : 5), 0, `${phase} ${prob.name}=${score}`);
    }
  }
  const wcNerdTotal = selectOIExamProblems('WC_EXAM' as GameState['phase'], steady)
    .reduce((sum, p) => sum + evaluateOIProblemScore('WC_EXAM' as GameState['phase'], p, nerdOnly, { aptitude: 80, level: 15 }, 10, 1, steady), 0);
  const apioTopTotal = selectOIExamProblems('APIO_EXAM' as GameState['phase'], steady)
    .reduce((sum, p) => sum + evaluateOIProblemScore('APIO_EXAM' as GameState['phase'], p, topOi, mathStats, 30, 1, steady), 0);
  assert.ok(wcNerdTotal < 135, `untrained oi_nerd should not reach WC silver/gold (${wcNerdTotal})`);
  assert.ok(apioTopTotal <= 300 && apioTopTotal >= 200, `top OIer APIO expected 200..300 (${apioTopTotal})`);
});
