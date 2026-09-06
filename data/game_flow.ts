import type { GameEvent, GameState, Phase } from '../types';

// Phase enum declaration order is not the same as the playable timeline:
// exams and selection screens are inserted into the two school semesters.
export const PHASE_ORDER: Phase[] = [
  'INIT' as Phase,
  'SUMMER' as Phase,
  'MILITARY' as Phase,
  'SELECTION' as Phase,
  'PLACEMENT_EXAM' as Phase,
  'SEMESTER_1' as Phase,
  'CSP_EXAM' as Phase,
  'MIDTERM_EXAM' as Phase,
  'SUBJECT_RESELECTION' as Phase,
  'NOIP_EXAM' as Phase,
  'FINAL_EXAM' as Phase,
  'WINTER_BREAK' as Phase,
  'WC_EXAM' as Phase,
  'SEMESTER_2' as Phase,
  'MIDTERM_EXAM_2' as Phase,
  'PROVINCIAL_EXAM' as Phase,
  'APIO_EXAM' as Phase,
  'FINAL_EXAM_2' as Phase,
  'SUMMER_BREAK' as Phase,
  'NOI_EXAM' as Phase,
  'ENDING' as Phase,
  'WITHDRAWAL' as Phase
];

const EXAM_PHASE_VALUES = new Set<string>([
  'PLACEMENT_EXAM',
  'MIDTERM_EXAM',
  'FINAL_EXAM',
  'MIDTERM_EXAM_2',
  'FINAL_EXAM_2',
  'CSP_EXAM',
  'NOIP_EXAM',
  'WC_EXAM',
  'PROVINCIAL_EXAM',
  'APIO_EXAM',
  'NOI_EXAM'
]);

const TERMINAL_OR_SELECTION_PHASE_VALUES = new Set<string>([
  'SELECTION',
  'SUBJECT_RESELECTION',
  'ENDING',
  'WITHDRAWAL'
]);

export type PostEventFlow = 'BLOCKED_PHASE' | 'ADVANCE_WITHOUT_WEEKEND' | 'OPEN_WEEKEND';

export const isExamPhase = (phase: Phase): boolean => EXAM_PHASE_VALUES.has(phase);

const MAIN_ACADEMIC_SUBJECTS = new Set(['chinese', 'math', 'english']);
const ELECTIVE_ACADEMIC_SUBJECTS = new Set(['physics', 'chemistry', 'biology', 'history', 'geography', 'politics']);

/** Return the written-paper maximum for an academic exam subject list. */
export const getAcademicMaxScore = (subjects: readonly string[]): number =>
  Array.from(new Set(subjects))
    .filter(subject => MAIN_ACADEMIC_SUBJECTS.has(subject) || ELECTIVE_ACADEMIC_SUBJECTS.has(subject))
    .reduce((total, subject) => total + (MAIN_ACADEMIC_SUBJECTS.has(subject) ? 150 : 100), 0);

export const getPostEventFlow = (phase: Phase): PostEventFlow => {
  if (isExamPhase(phase) || TERMINAL_OR_SELECTION_PHASE_VALUES.has(phase)) return 'BLOCKED_PHASE';
  if (phase === 'SUMMER' || phase === 'MILITARY') return 'ADVANCE_WITHOUT_WEEKEND';
  return 'OPEN_WEEKEND';
};

/** Random-event probability gates must not be rolled a second time after queueing. */
export const isQueuedEventStillEligible = (event: GameEvent, state: GameState): boolean =>
  (event.triggerType === 'RANDOM'
    ? (!event.queueContext
      || (event.queueContext.phase === state.phase
        && event.queueContext.week === state.week
        && event.queueContext.competition === state.competition))
    : (!event.condition || event.condition(state)));

export const getSubjectReselectionReturnPhase = (
  state: Pick<GameState, 'subjectReselectionReturnPhase' | 'midtermRank'>
): Phase.SEMESTER_1 | Phase.SEMESTER_2 => {
  if (state.subjectReselectionReturnPhase) return state.subjectReselectionReturnPhase;
  return state.midtermRank === 'SEMESTER_2_DONE'
    ? 'SEMESTER_2' as Phase.SEMESTER_2
    : 'SEMESTER_1' as Phase.SEMESTER_1;
};
