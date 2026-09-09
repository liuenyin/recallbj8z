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

/** Names shared by the game header, exams and story diary. */
export const PHASE_LABELS: Record<Phase, string> = {
  INIT: '新的开始', SUMMER: '入学前的暑假', MILITARY: '军训', SELECTION: '选择学科',
  PLACEMENT_EXAM: '分班考试', SEMESTER_1: '高一上学期', MIDTERM_EXAM: '高一上 · 期中考试',
  SUBJECT_RESELECTION: '重新选科', CSP_EXAM: 'CSP 认证', NOIP_EXAM: 'NOIP 竞赛',
  FINAL_EXAM: '高一上 · 期末考试', MIDTERM_EXAM_2: '高一下 · 期中考试',
  FINAL_EXAM_2: '高一下 · 期末考试', WINTER_BREAK: '寒假', SEMESTER_2: '高一下学期',
  SUMMER_BREAK: '高一后的暑假', WC_EXAM: '冬令营', PROVINCIAL_EXAM: '省队选拔',
  APIO_EXAM: 'APIO 竞赛', NOI_EXAM: 'NOI 竞赛', ENDING: '学年落幕', WITHDRAWAL: '提前离校'
};

export const getPhaseLabel = (phase: string): string => PHASE_LABELS[phase as Phase] || phase;

export const formatStoryDiary = (state: Pick<GameState, 'history' | 'className' | 'phase' | 'week'>): string => [
  '八中重开模拟器 · 我的校园手记',
  state.className || '尚未分班',
  getPhaseLabel(state.phase) + ' · 第 ' + state.week + ' 周',
  '',
  ...state.history.flatMap(entry => [
    getPhaseLabel(entry.phase) + ' · 第 ' + entry.week + ' 周｜' + entry.eventTitle,
    '我的选择：' + entry.choiceText,
    entry.resultSummary,
    ''
  ])
].join('\n');
