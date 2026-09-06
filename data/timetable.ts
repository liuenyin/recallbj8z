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
export const ALLOWED_SLOTS_MAP: Record<string, TimeSlotId[]> = {
    'act_cf': ['Sat_Night'],
};

const WEEKDAY_DAYS = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

/** Remove evening slots made unavailable by the evening-study agreement. */
export const clearWeekdaySchedule = (schedule: Record<string, string> = {}): Record<string, string> =>
    Object.fromEntries(Object.entries(schedule).filter(([slotId]) => {
        const slot = SCHEDULE_SLOTS.find(candidate => candidate.id === slotId);
        return !slot || !WEEKDAY_DAYS.has(slot.day);
    }));

const SLOT_ORDER = new Map(SCHEDULE_SLOTS.map((slot, index) => [slot.id, index]));

/** Object insertion order depends on the order in which the player clicked slots. */
export const getOrderedScheduleEntries = (schedule: Record<string, string> = {}): Array<[string, string]> =>
    Object.entries(schedule).sort(([left], [right]) =>
        (SLOT_ORDER.get(left as TimeSlotId) ?? Number.MAX_SAFE_INTEGER)
        - (SLOT_ORDER.get(right as TimeSlotId) ?? Number.MAX_SAFE_INTEGER)
    );
