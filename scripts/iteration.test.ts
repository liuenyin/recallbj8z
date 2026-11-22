import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getWeekendActivityFatigueDelta } from '../data/balance.ts';
import { getActivityMaxSlots } from '../data/timetable.ts';
import { OI_PROBLEMS } from '../data/oi_data.ts';

const read = (path: string) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('physical exercise costs fatigue instead of recovering rest', () => {
  assert.equal(getWeekendActivityFatigueDelta({ id: 'act_sport', type: 'REST' }, 1, 1), 6);
  assert.equal(getWeekendActivityFatigueDelta({ id: 'act_sport', type: 'REST' }, 1, 1.5), 9);
});

test('shared slot cap matches timetable limits', () => {
  assert.equal(getActivityMaxSlots('act_cf'), 1);
  assert.equal(getActivityMaxSlots('w_game'), 2);
  assert.equal(getActivityMaxSlots('w_club_activity'), 1);
  assert.equal(getActivityMaxSlots('w_library'), 3);
});

test('OI_PROBLEMS has expanded 20 problems ordered monotonically by level', () => {
  assert.equal(OI_PROBLEMS.length, 20);
  for (let i = 1; i < OI_PROBLEMS.length; i += 1) {
    assert.ok(OI_PROBLEMS[i].level >= OI_PROBLEMS[i - 1].level);
  }
});

test('oi_events.json has no exam-locked events, bounded OI gains, and no cheat reward', () => {
  const rows = JSON.parse(read('../oi_events.json')) as any[];
  const examPhases = new Set(['CSP_EXAM', 'NOIP_EXAM', 'MIDTERM_EXAM']);
  assert.equal(rows.filter(e => examPhases.has(e.phase)).length, 0);
  const oiKeys = ['oi_dp', 'oi_ds', 'oi_graph', 'oi_math', 'oi_misc', 'oi_string'];
  for (const row of rows) {
    for (const ch of (row.choices || [])) {
      for (const k of oiKeys) {
        if (typeof ch.effect?.[k] === 'number') {
          assert.ok(ch.effect[k] <= 4 && ch.effect[k] >= -3, `${row.id} ${k}=${ch.effect[k]}`);
        }
      }
    }
  }
  const cheat = rows.find(e => e.id === 'oi_pu_csp_j_cheat');
  assert.ok(cheat);
  assert.ok((cheat.choices[1].effect.luck ?? 0) < 0);
  assert.equal(cheat.choices[1].effect.oi_misc ?? 0, 0);
});

test('core flow fixes and dead-code cleanups are present in source', () => {
  const endingSource = read('../data/ending.ts');
  const eventsSource = read('../data/events.ts');
  const logicSource = read('../hooks/useGameLogic.ts');
  const homeSource = read('../components/HomeView.tsx');
  const appSource = read('../App.tsx');

  // Academic S tier precedes lifestyle overrides and rivalGrowth no longer overrides main ending
  assert.ok(endingSource.indexOf("title = '年级学神'") < endingSource.indexOf("title = '平衡生活者'"));
  assert.doesNotMatch(endingSource, /else if \(rivalGrowth\)/);
  // Holiday romance pool excludes classroom events; legacy confession trap removed
  assert.match(eventsSource, /HOLIDAY_ROMANCE_IDS/);
  assert.doesNotMatch(eventsSource, /id:\s*'evt_confession_generic'/);
  assert.doesNotMatch(eventsSource, /id:\s*'evt_daoist_dream'/);
  // Close exam result preserves week for post-exam queued result phases
  assert.match(logicSource, /phase === Phase\.WC_EXAM[\s\S]*?week: prev\.week,/);
  assert.match(logicSource, /shop_week_count/);
  // HomeView exposes challenges and App exposes mobile stats drawer & confirmation dialog
  assert.match(homeSource, /IRREGULAR_CHALLENGES/);
  assert.match(appSource, /showMobileStats/);
  assert.match(appSource, /confirmAction/);
});

test('campus scope, event shortcuts, reduced motion and ending catalog are wired', () => {
  const modalSource = read('../components/EventModal.tsx');
  const endingSource = read('../data/ending.ts');
  const appSource = read('../App.tsx');
  const soundSource = read('../lib/sound.ts');

  assert.equal(fs.existsSync(new URL('../data/world_context.ts', import.meta.url)), false);
  assert.equal(fs.existsSync(new URL('../data/historical_events.ts', import.meta.url)), false);
  assert.equal(fs.existsSync(new URL('../data/events_study_tour.ts', import.meta.url)), false);
  assert.equal(fs.existsSync(new URL('../public/cities', import.meta.url)), false);
  assert.match(endingSource, /ENDING_CATALOG/);
  assert.match(modalSource, /useReducedMotion\(/);
  assert.match(modalSource, /keydown/);
  assert.doesNotMatch(modalSource, /getInnerWhisper|resultTone/);
  assert.doesNotMatch(appSource, /PHASE_TRANSITION_META/);
  assert.match(appSource, /pointer-events-none/);
  assert.match(appSource, /getMilestoneCountdown/);
  assert.match(soundSource, /playSound/);
});
