import type { GameState, SubjectKey, WeekendActivity } from '../types';
import { getDifficultyPreset } from './constants';
import { ALLOWED_SLOTS_MAP, BLOCKED_SLOTS_MAP, getActivityMaxSlots, type TimeSlotId } from './timetable';
import { clampGameStateMetrics, getActivityBlockReason, getWeekendActivityUpdates, isHealthFatal, isLearningActivity, isStudyBlocked } from './utils';
import { isWeekendInvitationId } from './weekend_invites';

const suggestedSlots: TimeSlotId[] = ['Sat_Morn', 'Sat_Aft', 'Sun_Aft'];
const oiSkills = ['dp', 'ds', 'graph', 'math', 'string', 'misc'] as const;

const needsRest = (state: GameState) =>
    state.fatigue >= 70 || state.general.health <= 45 || state.general.mindset <= 30 || isStudyBlocked(state);

export const recommendWeekend = (state: GameState, offered: WeekendActivity[], invitationId?: string) => {
    const schedule: Record<string, string> = {};
    const blockedSlots = new Set<TimeSlotId>();
    const subjectKeys: SubjectKey[] = [...new Set<SubjectKey>(['chinese', 'math', 'english', ...state.selectedSubjects])];
    const bestSubject = Math.max(...subjectKeys.map(key => state.subjects[key].level));
    const studyLimit = Math.min(2, getDifficultyPreset(state.difficulty).weekendStudyLimit ?? 2);
    const startingProject = state.activeProjects[0];
    const urgentProject = startingProject?.deadlinePhase === state.phase && startingProject.deadlineWeek - state.week <= 2;
    const invitation = offered.find(activity => activity.id === invitationId && isWeekendInvitationId(activity.id));
    const inviteNeedsStudy = !!invitation && isLearningActivity(invitation);
    let remainingStudy = studyLimit;
    let projected = state;

    for (const slot of suggestedSlots) {
        if (blockedSlots.has(slot)) continue;
        const recovering = needsRest(projected);
        const project = projected.activeProjects[0];
        const alreadyScheduled = Object.values(schedule);
        const mustSleep = state.activeChallengeId === 'c_sleep_king' && !state.hasSleptThisWeek && !alreadyScheduled.includes('w_sleep');
        let best: { activity: WeekendActivity; score: number; state: GameState } | undefined;

        for (const activity of offered) {
            if (slot === 'Sat_Aft' && invitation && activity !== invitation) continue;
            if (isWeekendInvitationId(activity.id) && activity !== invitation) continue;
            const repeats = alreadyScheduled.filter(id => id === activity.id).length;
            if (repeats >= getActivityMaxSlots(activity.id)) continue;
            if (repeats && !(recovering && activity.id === 'w_sleep') && !(urgentProject && activity.id === 'w_project_work')) continue;
            const allowedSlots = ALLOWED_SLOTS_MAP[activity.id];
            if (allowedSlots && !allowedSlots.includes(slot)) continue;
            if ((activity.condition && !activity.condition(projected)) || getActivityBlockReason(projected, activity)) continue;
            const learning = isLearningActivity(activity);
            if (learning && (remainingStudy === 0 || isStudyBlocked(projected))) continue;
            if (learning && slot === 'Sat_Morn' && inviteNeedsStudy && remainingStudy === 1) continue;

            const next = clampGameStateMetrics({ ...projected, ...getWeekendActivityUpdates(projected, activity, repeats + 1, true) });
            const cost = Math.max(0, projected.general.money - next.general.money);
            if (cost > Math.max(0, projected.general.money) || isHealthFatal(next.difficulty, next.general.health)) continue;
            const recovery = projected.fatigue - next.fatigue;
            const health = next.general.health - projected.general.health;
            const mindset = next.general.mindset - projected.general.mindset;
            if (recovering && activity !== invitation && (recovery < 0 || health < 0)) continue;

            const schoolGain = subjectKeys.reduce((sum, key) => {
                const gap = Math.min(1, (bestSubject - state.subjects[key].level) / 10);
                return sum + (next.subjects[key].level - projected.subjects[key].level) * (1 + gap);
            }, 0);
            const contestGain = state.competition === 'OI'
                ? oiSkills.reduce((sum, key) => sum + next.oiStats[key] - projected.oiStats[key], 0) * 6
                : state.competition === 'MO' && activity.id === 'w_mo_training' ? 5 : 0;
            const projectGain = project && activity.id === 'w_project_work' ? (urgentProject ? 24 : 13) : 0;
            const schoolWeight = projected.general.health > 55 && projected.fatigue < 55 ? 5 : 3;
            const restGain = recovery * (recovering ? 1.8 : 0.45) + health * (recovering ? 1.4 : 0.35) + mindset * (recovering ? 1.2 : 0.55);
            const stimulationCost = Math.max(0, next.general.excitement - projected.general.excitement) * (recovering ? 0.7 : 0.18);
            const sleepBonus = mustSleep && activity.id === 'w_sleep' ? 100 : 0;
            const clubBonus = activity.id === 'w_club_activity' ? 5 : 0;
            const score = schoolGain * schoolWeight + contestGain + projectGain + restGain + sleepBonus + clubBonus
                + (next.general.efficiency - projected.general.efficiency) * 3
                + (next.general.experience - projected.general.experience) * 0.35 - stimulationCost - cost * 0.35;
            if (activity === invitation || score > (best?.score ?? 0)) best = { activity, score, state: next };
        }

        if (!best) continue;
        schedule[slot] = best.activity.id;
        (BLOCKED_SLOTS_MAP[best.activity.id] || []).forEach(id => blockedSlots.add(id));
        if (isLearningActivity(best.activity)) remainingStudy -= 1;
        projected = best.state;
    }

    const ids = Object.values(schedule);
    const first = offered.find(activity => activity.id === ids[0]);
    const note = first?.type === 'REST' && needsRest(state) ? `先安排${first.name}，恢复状态。` : '';
    return { schedule, note, projected };
};
