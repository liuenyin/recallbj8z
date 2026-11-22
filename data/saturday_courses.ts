import { Phase, SUBJECT_NAMES, type GameEvent, type GameState, type SubjectKey, type WeekendActivity } from '../types';
import type { TimeSlotId } from './timetable';
import { modifySub } from './utils';

const subjectKeys = Object.keys(SUBJECT_NAMES) as SubjectKey[];
const signupWeek = 3;
const secondCourseId = 'saturday_course_second';

export const SATURDAY_COURSE_SIGNUP: GameEvent = {
    id: 'saturday_course_signup',
    title: '三修课报名',
    description: '老师发来三修课报名表。你可以选一门周六上午的课，再决定要不要加选下午的课。上课会提升对应科目，也会占用周六的自由时间。',
    type: 'neutral',
    triggerType: 'FIXED',
    fixedPhase: Phase.SEMESTER_1,
    fixedWeek: signupWeek,
    choices: [
        { text: '这学年先不报三修课', action: () => ({}) },
        ...subjectKeys.map(subject => ({
            text: SUBJECT_NAMES[subject],
            nextEventId: secondCourseId,
            resultDescription: '周六上午留给这门课。接下来可以选一门下午的课。',
            action: (state: GameState) => ({ flags: { ...state.flags, saturday_course_first: subject } })
        }))
    ]
};

export const SATURDAY_COURSE_SECOND: GameEvent = {
    id: secondCourseId,
    title: '加选周六下午的三修课',
    description: '下午也可以选一门课。只修上午那一门的话，下午可以照常自由安排。',
    type: 'neutral',
    choices: [
        { text: '只修上午这一门', action: () => ({}) },
        ...subjectKeys.map(subject => ({
            text: SUBJECT_NAMES[subject],
            condition: (state: GameState) => state.flags.saturday_course_first !== subject,
            resultDescription: '周六上午和下午各留一个时段上课。',
            action: (state: GameState) => ({ flags: { ...state.flags, saturday_course_second: subject } })
        }))
    ]
};

const courseActivity = (subject: SubjectKey): WeekendActivity => ({
    id: `saturday_course_${subject}`,
    name: `三修课 · ${SUBJECT_NAMES[subject]}`,
    type: 'STUDY',
    icon: 'fa-book-open',
    resultText: `你在三修课上练了${SUBJECT_NAMES[subject]}。`,
    action: state => ({ subjects: modifySub(state, [subject], 2.2) })
});

export const getSaturdayCourses = (state: GameState): Partial<Record<TimeSlotId, WeekendActivity>> => {
    if (state.phase !== Phase.SEMESTER_2 && (state.phase !== Phase.SEMESTER_1 || state.week < signupWeek)) return {};

    const { saturday_course_first: first, saturday_course_second: second } = state.flags;
    if (!subjectKeys.includes(first)) return {};
    return {
        Sat_Morn: courseActivity(first),
        ...(second !== first && subjectKeys.includes(second) && { Sat_Aft: courseActivity(second) })
    };
};
