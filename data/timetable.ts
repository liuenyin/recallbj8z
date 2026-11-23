import type { GameState } from '../types';
import { getMoExamScheduleTitle } from './mo_competition.ts';

export type TimeSlotId = 'Mon_Eve' | 'Tue_Eve' | 'Wed_Eve' | 'Thu_Eve' | 'Fri_Eve' | 'Sat_Morn' | 'Sat_Aft' | 'Sat_Eve' | 'Sat_Night' | 'Sun_Morn' | 'Sun_Aft' | 'Sun_Eve';

export interface ScheduleSlot {
    id: TimeSlotId;
    label: string;
    day: string;
}

export const SCHEDULE_SLOTS: ScheduleSlot[] = [
    { id: 'Mon_Eve', label: '周一晚', day: 'Mon' },
    { id: 'Tue_Eve', label: '周二晚', day: 'Tue' },
    { id: 'Wed_Eve', label: '周三晚', day: 'Wed' },
    { id: 'Thu_Eve', label: '周四晚', day: 'Thu' },
    { id: 'Fri_Eve', label: '周五晚', day: 'Fri' },
    { id: 'Sat_Morn', label: '周六上午', day: 'Sat' },
    { id: 'Sat_Aft', label: '周六下午', day: 'Sat' },
    { id: 'Sat_Eve', label: '周六晚上', day: 'Sat' },
    { id: 'Sat_Night', label: '周六深夜', day: 'Sat' },
    { id: 'Sun_Morn', label: '周日上午', day: 'Sun' },
    { id: 'Sun_Aft', label: '周日下午', day: 'Sun' },
    { id: 'Sun_Eve', label: '周日晚', day: 'Sun' },
];

export const BLOCKED_SLOTS_MAP: Record<string, TimeSlotId[]> = {
    'act_cf': ['Sun_Morn'], // Codeforces blocks Sunday Morning
};

/** Activities that are only meaningful in a specific time slot. */
export const HOMEWORK_ACTIVITY_ID = 'w_homework';
export const WEEKEND_ACTIVITY_HISTORY_LIMIT = 3;

export const ALLOWED_SLOTS_MAP: Record<string, TimeSlotId[]> = {
    'act_cf': ['Sat_Night'],
    w_invite_contest: ['Sat_Aft'],
    w_invite_club: ['Sat_Aft'],
    w_invite_peer: ['Sat_Aft'],
    [HOMEWORK_ACTIVITY_ID]: SCHEDULE_SLOTS.filter(slot => slot.day === 'Sat' || slot.day === 'Sun').map(slot => slot.id),
};

/** Weekly slot caps shared between the planner preview and timetable executor. */
export const ACTIVITY_MAX_SLOTS: Record<string, number> = {
    'act_cf': 1,
    'w_cf': 1,
    'w_atc': 1,
    'w_game_late': 1,
    'w_game': 2,
    'w_club_activity': 1,
    w_mo_training: 1,
    w_mo_proof: 1,
};

export const getActivityMaxSlots = (activityId: string, state?: Pick<GameState, 'phase' | 'week'>): number =>
    activityId === HOMEWORK_ACTIVITY_ID && state ? getHomeworkSlotsNeeded(state) : ACTIVITY_MAX_SLOTS[activityId] || 3;

export const isSchoolSemester = (state: Pick<GameState, 'phase'>): boolean =>
    state.phase === 'SEMESTER_1' || state.phase === 'SEMESTER_2';

export const getEveningStudySlots = (state: Pick<GameState, 'phase'>): TimeSlotId[] =>
    isSchoolSemester(state) ? ['Mon_Eve', 'Tue_Eve', 'Wed_Eve', 'Thu_Eve'] : [];

export const getMoExamSlots = (state: Pick<GameState, 'phase' | 'week' | 'flags'>): TimeSlotId[] =>
    getMoExamScheduleTitle(state) ? ['Sun_Morn'] : [];

export const getHomeworkSlotsNeeded = (state: Pick<GameState, 'phase' | 'week'>): number =>
    isSchoolSemester(state) ? (state.week % 3 === 0 ? 3 : 2) : 0;

export const clearEveningStudySchedule = (schedule: Record<string, string>, state: Pick<GameState, 'phase'>): Record<string, string> => {
    const reserved = new Set<string>(getEveningStudySlots(state));
    return Object.fromEntries(Object.entries(schedule).filter(([slot]) => !reserved.has(slot)));
};

const SLOT_ORDER = new Map(SCHEDULE_SLOTS.map((slot, index) => [slot.id, index]));

/** Object insertion order depends on the order in which the player clicked slots. */
export const getOrderedScheduleEntries = (schedule: Record<string, string> = {}): Array<[string, string]> =>
    Object.entries(schedule).map(([slot, activity]): [string, string] => [slot, activity === 'act_library' ? 'w_library' : activity]).sort(([left], [right]) =>
        (SLOT_ORDER.get(left as TimeSlotId) ?? Number.MAX_SAFE_INTEGER)
        - (SLOT_ORDER.get(right as TimeSlotId) ?? Number.MAX_SAFE_INTEGER)
    );
