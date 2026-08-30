import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const routeSource = fs.readFileSync(new URL('../data/events_oi_route.ts', import.meta.url), 'utf8');
const eventsSource = fs.readFileSync(new URL('../data/events_oi.ts', import.meta.url), 'utf8');
const registrySource = fs.readFileSync(new URL('../data/events.ts', import.meta.url), 'utf8');

test('week-20 drafts keep a week-21 testing hand-off', () => {
  assert.match(routeSource, /oi_problem_testing[\s\S]*?week >= 11 && s\.week <= 21/);
});

test('provincial selection is not unlocked by one NOIP score alone', () => {
  assert.match(eventsSource, /oi_provincial_invite[\s\S]*?noip_score \|\| 0\) >= 180/);
  assert.match(eventsSource, /oi_provincial_invite[\s\S]*?oi_practice_sessions \|\| 0\) >= 4/);
});

test('APIO entry keeps a separate sustained-practice threshold', () => {
  assert.match(eventsSource, /oi_apio_invite[\s\S]*?noip_score \|\| 0\) > 200/);
  assert.match(eventsSource, /oi_apio_invite[\s\S]*?oi_practice_sessions \|\| 0\) >= 5/);
});

test('the route text acknowledges limited school-side OI support', () => {
  assert.match(routeSource, /没有固定的竞赛教练/);
  assert.match(eventsSource, /没有一支成熟的校队/);
});

test('the winter recap follow-up is mounted in the winter event pool', () => {
  assert.match(routeSource, /id: 'oi_recap_followup'/);
  assert.match(registrySource, /Phase\.WINTER_BREAK[^\n]*OI_ROUTE_EVENTS/);
});
