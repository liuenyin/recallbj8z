import test from 'node:test';
import assert from 'node:assert/strict';
import { PHASE_ORDER, getAcademicMaxScore, getPostEventFlow, getSubjectReselectionReturnPhase, isExamPhase, isQueuedEventStillEligible } from '../data/game_flow.ts';

const PHASE = {
  NOI_EXAM: 'NOI_EXAM',
  SUMMER: 'SUMMER',
  MILITARY: 'MILITARY',
  SEMESTER_1: 'SEMESTER_1',
  SEMESTER_2: 'SEMESTER_2'
} as any;

test('exam phases block post-event weekend controls', () => {
  assert.equal(isExamPhase(PHASE.NOI_EXAM), true);
  assert.equal(getPostEventFlow(PHASE.NOI_EXAM), 'BLOCKED_PHASE');
});

test('selected academic exams use the 750-point maximum', () => {
  assert.equal(getAcademicMaxScore(['chinese', 'math', 'english', 'physics', 'chemistry', 'biology']), 750);
  assert.equal(getAcademicMaxScore(['chinese', 'math', 'english', 'physics', 'physics', 'oi_prob_1']), 550);
});

test('summer and military events advance directly to the next week', () => {
  assert.equal(getPostEventFlow(PHASE.SUMMER), 'ADVANCE_WITHOUT_WEEKEND');
  assert.equal(getPostEventFlow(PHASE.MILITARY), 'ADVANCE_WITHOUT_WEEKEND');
});

test('subject reselection returns to the semester it came from', () => {
  assert.equal(getSubjectReselectionReturnPhase({ subjectReselectionReturnPhase: PHASE.SEMESTER_2, midtermRank: null }), PHASE.SEMESTER_2);
  assert.equal(getSubjectReselectionReturnPhase({ subjectReselectionReturnPhase: null, midtermRank: 'SEMESTER_2_DONE' }), PHASE.SEMESTER_2);
  assert.equal(getSubjectReselectionReturnPhase({ subjectReselectionReturnPhase: null, midtermRank: null }), PHASE.SEMESTER_1);
});

test('queued random events do not roll their probability gate a second time', () => {
  const state = {} as any;
  const gated = { id: 'gated', triggerType: 'RANDOM', condition: () => false } as any;
  const conditional = { id: 'conditional', triggerType: 'CONDITIONAL', condition: () => false } as any;
  assert.equal(isQueuedEventStillEligible(gated, state), true);
  assert.equal(isQueuedEventStillEligible(conditional, state), false);
});

test('queued random events are discarded after their route context changes', () => {
  const event = {
    id: 'route-event',
    triggerType: 'RANDOM',
    queueContext: { phase: PHASE.SEMESTER_1, week: 8, competition: 'OI' }
  } as any;
  assert.equal(isQueuedEventStillEligible(event, { phase: PHASE.SEMESTER_1, week: 8, competition: 'OI' } as any), true);
  assert.equal(isQueuedEventStillEligible(event, { phase: PHASE.SEMESTER_1, week: 8, competition: 'None' } as any), false);
});

test('project phase order follows the playable calendar', () => {
  assert.ok(PHASE_ORDER.indexOf('CSP_EXAM' as any) < PHASE_ORDER.indexOf('MIDTERM_EXAM' as any));
  assert.ok(PHASE_ORDER.indexOf('WINTER_BREAK' as any) < PHASE_ORDER.indexOf('SEMESTER_2' as any));
  assert.ok(PHASE_ORDER.indexOf('APIO_EXAM' as any) < PHASE_ORDER.indexOf('SUMMER_BREAK' as any));
});
