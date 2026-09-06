import React, { useState, useEffect } from 'react';
import { GameState, WeekendActivity } from '../types';
import { WEEKEND_ACTIVITIES } from '../data/mechanics';
import { SCHEDULE_SLOTS, TimeSlotId, BLOCKED_SLOTS_MAP, ALLOWED_SLOTS_MAP, clearWeekdaySchedule, getOrderedScheduleEntries } from '../data/timetable';
import { getDifficultyPreset } from '../data/constants';
import { clampGameStateMetrics, getLearningMultiplier, getRestRecoveryMultiplier, isStudyBlocked, isLearningActivity, getActivityBlockReason, scalePositiveGeneralDeltas, scalePositiveSubjectDeltas, scalePositiveOIStatDeltas, isHealthFatal } from '../data/utils';
import { getActivityRepeatMultiplier, getWeekendActivityFatigueDelta } from '../data/balance';

interface Props {
    state: GameState;
    onConfirm: (schedule: Record<string, string>) => void;
}

const TimetableModal: React.FC<Props> = ({ state, onConfirm }) => {
    // Evaluate activity conditions in a weekend context. The random pool is
    // only restrictive while planning; a weekday schedule view should still
    // be able to show activities that were planned last weekend.
    const activityState = state.isWeekend ? state : { ...state, isWeekend: true };
    const useRandomWeekendPool = state.isWeekend && state.availableWeekendActivityIds !== undefined;
    const offeredActivities = WEEKEND_ACTIVITIES.filter(a => {
        if (useRandomWeekendPool) {
            return state.availableWeekendActivityIds!.includes(a.id)
                && (!a.condition || a.condition(activityState))
                && !getActivityBlockReason(state, a);
        }
        return !a.condition || a.condition(activityState);
    });
    const activityById = new Map(WEEKEND_ACTIVITIES.map(activity => [activity.id, activity]));
    // A reusable plan is a commitment, not a snapshot of this week's random
    // menu. Keep valid previously scheduled activities visible even when they
    // are not offered this week; the executor will still re-check conditions
    // and report any activity that can no longer run.
    const lastSchedule = state.flags.joined_evening_study
        ? clearWeekdaySchedule(state.lastWeekSchedule || {})
        : (state.lastWeekSchedule || {});
    const retainedActivityIds = new Set(Object.values(lastSchedule));
    const availableActivities = WEEKEND_ACTIVITIES.filter(activity =>
        offeredActivities.includes(activity) || retainedActivityIds.has(activity.id)
    );

    const [schedule, setSchedule] = useState<Record<string, string>>(() => {
        const last = state.flags.joined_evening_study
            ? clearWeekdaySchedule(state.lastWeekSchedule || {})
            : (state.lastWeekSchedule || {});
        const valid: Record<string, string> = {};
        for (const [slot, actId] of Object.entries(last)) {
            const activityId = typeof actId === 'string' ? actId : null;
            if (SCHEDULE_SLOTS.some(candidate => candidate.id === slot) && activityId && activityById.has(activityId)) {
                valid[slot] = activityId;
            }
        }
        return valid;
    });

    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const difficultyPreset = getDifficultyPreset(state.difficulty);
    const hideDetails = state.difficulty === 'REALITY' || state.difficulty === 'HELL';
    const weekendStudyLimit = difficultyPreset.weekendStudyLimit;
    const studyBlocked = isStudyBlocked(state);

    // Simulate the same sequential blocking rules used by the executor. A
    // blocked slot is created only by an activity that is itself executable;
    // invalid or unavailable activities must not reserve time for others.
    const previewBlockedSlots = new Set<string>();
    const previewBlockers = new Map<string, string>();
    if (state.flags.joined_evening_study) {
        SCHEDULE_SLOTS.filter(slot => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(slot.day))
            .forEach(slot => {
                previewBlockedSlots.add(slot.id);
                previewBlockers.set(slot.id, '晚自习');
            });
    }
    let previewStudyCount = 0;
    let previewState = activityState;
    const previewRepeatCounts = new Map<string, number>();
    const executableSlotIds = new Set<string>();
    for (const [slotId, actId] of getOrderedScheduleEntries(schedule)) {
        if (previewBlockedSlots.has(slotId)) continue;
        const activity = availableActivities.find(a => a.id === actId);
        if (!activity) continue;
        const allowedSlots = ALLOWED_SLOTS_MAP[activity.id];
        if (allowedSlots && !allowedSlots.includes(slotId as TimeSlotId)) continue;
        if (activity.condition && !activity.condition(previewState)) continue;
        if (getActivityBlockReason(previewState, activity)) continue;
        const learningActivity = isLearningActivity(activity);
        if (learningActivity && isStudyBlocked(previewState)) continue;
        if (learningActivity && weekendStudyLimit !== undefined && previewStudyCount >= weekendStudyLimit) continue;
        executableSlotIds.add(slotId);
        if (learningActivity) previewStudyCount += 1;
        (BLOCKED_SLOTS_MAP[activity.id] || []).forEach(blockedSlot => {
            previewBlockedSlots.add(blockedSlot);
            previewBlockers.set(blockedSlot, activity.name);
        });

        // Mirror executeTimetable's positive-gain scaling and repeat penalty so
        // later slots see the same fatigue/status conditions as execution.
        const oldPreview = previewState;
        let updates = (activity.previewAction || activity.action)(oldPreview);
        if (learningActivity) {
            const multiplier = getLearningMultiplier(oldPreview);
            updates = {
                ...updates,
                general: scalePositiveGeneralDeltas(oldPreview, updates.general, multiplier),
                subjects: scalePositiveSubjectDeltas(oldPreview, updates.subjects, multiplier),
                oiStats: scalePositiveOIStatDeltas(oldPreview, updates.oiStats, multiplier)
            };
        } else if (activity.id === 'act_sport') {
            updates = { ...updates, general: scalePositiveGeneralDeltas(oldPreview, updates.general, getLearningMultiplier(oldPreview)) };
        } else if (activity.type === 'REST') {
            updates = { ...updates, general: scalePositiveGeneralDeltas(oldPreview, updates.general, getRestRecoveryMultiplier(oldPreview)) };
        }
        const repeatCount = (previewRepeatCounts.get(activity.id) || 0) + 1;
        previewRepeatCounts.set(activity.id, repeatCount);
        const repeatMultiplier = getActivityRepeatMultiplier(repeatCount);
        if (repeatMultiplier < 1) {
            const repeatedUpdates = { ...updates };
            if (updates.general) repeatedUpdates.general = scalePositiveGeneralDeltas(oldPreview, updates.general, repeatMultiplier);
            if (updates.subjects) repeatedUpdates.subjects = scalePositiveSubjectDeltas(oldPreview, updates.subjects, repeatMultiplier);
            if (updates.oiStats) repeatedUpdates.oiStats = scalePositiveOIStatDeltas(oldPreview, updates.oiStats, repeatMultiplier);
            updates = repeatedUpdates;
        }
        const fatigueDelta = getWeekendActivityFatigueDelta(
            activity,
            getRestRecoveryMultiplier(oldPreview),
            difficultyPreset.fatigueGainMultiplier
        );
        previewState = clampGameStateMetrics({
            ...oldPreview,
            ...updates,
            fatigue: Math.min(100, Math.max(0, (oldPreview.fatigue || 0) + fatigueDelta))
        });
        if (isHealthFatal(previewState.difficulty, previewState.general.health)) break;
    }

    const handleSlotClick = (slotId: string) => {
        // If blocked, ignore
        if (isSlotBlocked(slotId)) return;
        setSelectedSlot(selectedSlot === slotId ? null : slotId);
    };

    const handleActivitySelect = (actId: string) => {
        if (selectedSlot) {
            const newSchedule = { ...schedule, [selectedSlot]: actId };
            setSchedule(newSchedule);
            setSelectedSlot(null);
        }
    };

    const handleClearSlot = (slotId: string) => {
        const newSchedule = { ...schedule };
        delete newSchedule[slotId];
        setSchedule(newSchedule);
    }

    const isSlotBlocked = (slotId: string) => {
        return previewBlockedSlots.has(slotId);
    };

    const getBlocker = (slotId: string) => {
        return previewBlockers.get(slotId) || null;
    };

    // Mirror the execution rules so the preview never counts blocked slots or
    // study slots rejected by the HELL weekly limit.
    const executableEntries = getOrderedScheduleEntries(schedule)
        .filter(([slotId]) => executableSlotIds.has(slotId));
    const executableActivities = executableEntries
        .map(([, actId]) => activityById.get(actId))
        .filter((activity): activity is WeekendActivity => !!activity);
    const activityCounts = executableActivities.reduce<Record<string, number>>((counts, activity) => {
        counts[activity.id] = (counts[activity.id] || 0) + 1;
        return counts;
    }, {});
    const repeatedActivities = Object.entries(activityCounts)
        .filter(([, count]) => count > 1)
        .map(([id]) => activityById.get(id)?.name)
        .filter((name): name is string => !!name);
    const restMultiplier = getRestRecoveryMultiplier(state);
    const estimatedFatigueDelta = previewState.fatigue - state.fatigue;
    const projectedFatigue = previewState.fatigue;
    const fatigueRisk = projectedFatigue >= 90 ? '高' : projectedFatigue >= 75 ? '中' : '低';
    const hasSleepActivity = executableActivities.some(activity => activity.id === 'w_sleep' || activity.name.includes('睡'));

    return (
        <div className="absolute inset-0 z-[60] flex justify-center items-center bg-slate-900/60 backdrop-blur-sm p-2 md:p-4 animate-fadeIn">
            <div className="bg-slate-50 rounded-[24px] md:rounded-[32px] max-w-6xl w-full h-[95vh] md:h-[90vh] shadow-2xl flex flex-col md:flex-row overflow-hidden border border-slate-200">
                {/* Left: Timetable Grid */}
                <div className="flex-1 p-4 md:p-6 flex flex-col min-h-0 overflow-y-auto custom-scroll md:border-r border-b md:border-b-0 border-slate-200 bg-white">
                    <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight mb-1 md:mb-2">周计划时间表</h2>
                    <p className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">规划你放学后和周末的时间。合理安排，劳逸结合。</p>
                    
                    <div className="grid grid-cols-1 gap-2 md:gap-4">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                            <div key={day} className="flex flex-col gap-1 md:gap-2 p-2 md:p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <h3 className="font-bold text-slate-700 text-sm md:text-base">{day}</h3>
                                <div className="flex flex-wrap gap-1.5 md:gap-2">
                                    {SCHEDULE_SLOTS.filter(s => s.day === day).map(slot => {
                                        const isBlocked = isSlotBlocked(slot.id);
                                        const blocker = getBlocker(slot.id);
                                                                                 const actId = schedule[slot.id];
                                                                                 const act = activityById.get(actId);
                                                                                 const isRetained = !!act && useRandomWeekendPool && !offeredActivities.some(activity => activity.id === act.id);
                                                                                 const isSelected = selectedSlot === slot.id;
                                        
                                        return (
                                            <div 
                                                key={slot.id} 
                                                onClick={() => handleSlotClick(slot.id)}
                                                className={`relative flex flex-col p-2 md:p-3 border-2 rounded-xl cursor-pointer transition-all w-24 md:w-32 h-16 md:h-20 ${
                                                    isBlocked ? 'bg-slate-200 border-slate-300 opacity-50 cursor-not-allowed' :
                                                    isSelected ? 'border-indigo-500 bg-indigo-50' : 
                                                    act ? 'border-blue-300 bg-blue-50 hover:border-blue-400' : 
                                                    'border-slate-200 bg-white hover:border-slate-300'
                                                }`}
                                            >
                                                <span className="text-[9px] md:text-[10px] font-bold text-slate-400 mb-0.5 md:mb-1">{slot.label}</span>
                                                {isBlocked ? (
                                                    <span className="text-[10px] md:text-xs text-rose-500 font-bold leading-tight">被占用 ({blocker})</span>
                                                ) : act ? (
                                                    <div className="flex justify-between items-start">
                                                         <span className="text-[10px] md:text-xs font-bold text-blue-800 leading-tight">{act.name}{isRetained && <span className="block text-[9px] text-slate-500 font-medium">计划保留</span>}</span>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleClearSlot(slot.id); }}
                                                            className="text-slate-400 hover:text-rose-500"
                                                        ><i className="fas fa-times-circle"></i></button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] md:text-xs text-slate-300 font-bold">空闲</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Activity Selection */}
                <div className="w-full md:w-80 bg-slate-100 p-4 md:p-6 flex flex-col min-h-[200px] md:h-full shrink-0">
                    <div className="mb-3 md:mb-4 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-500">计划预览</span>
                            <span className="text-xs font-bold text-slate-600">{executableActivities.length} 项可执行</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold">
                            <span className={`rounded-full px-2 py-1 ${fatigueRisk === '高' ? 'bg-rose-100 text-rose-600' : fatigueRisk === '中' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                疲劳风险 {fatigueRisk}
                            </span>
                            {!hideDetails && (
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-500">
                                    预计 {estimatedFatigueDelta > 0 ? '+' : ''}{Math.round(estimatedFatigueDelta)}
                                </span>
                            )}
                            {repeatedActivities.length > 0 && (
                                <span className="rounded-full bg-orange-100 px-2 py-1 text-orange-600">重复收益递减</span>
                            )}
                        </div>
                        {state.activeChallengeId === 'c_sleep_king' && !hasSleepActivity && (
                            <p className="mt-2 text-[10px] font-bold leading-relaxed text-rose-500">睡神挑战：本周必须安排补觉。</p>
                        )}
                        {repeatedActivities.length > 0 && (
                            <p className="mt-2 text-[10px] leading-relaxed text-slate-500">{repeatedActivities.join('、')}重复安排后，正向收益会逐次减少。</p>
                        )}
                    </div>
                    {selectedSlot ? (
                        <>
                            <h3 className="text-base md:text-lg font-bold text-slate-800 mb-3 md:mb-4">选择活动 <span className="text-xs md:text-sm font-normal text-slate-500">({SCHEDULE_SLOTS.find(s=>s.id === selectedSlot)?.label})</span></h3>
                            <div className="flex-1 overflow-y-auto custom-scroll space-y-2 pr-1 md:pr-2 max-h-[30vh] md:max-h-none">
                                <div 
                                    onClick={() => {
                                        const newS = {...schedule};
                                        delete newS[selectedSlot];
                                        setSchedule(newS);
                                        setSelectedSlot(null);
                                    }}
                                    className="p-2 md:p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all text-center text-slate-500 font-bold text-sm"
                                >
                                    清空此时间段
                                </div>
                                 {offeredActivities.map(act => {
                                    const MAX_SLOTS: Record<string, number> = { 'act_cf': 1, 'w_cf': 1, 'w_atc': 1, 'w_game_late': 1, 'w_game': 2 };
                                    const maxSlots = MAX_SLOTS[act.id] || 3;
                                    const currentCount = Object.values(schedule).filter(v => v === act.id).length;
                                    
                                    const allowedSlots = ALLOWED_SLOTS_MAP[act.id];
                                    const isAllowedSlot = !allowedSlots || allowedSlots.includes(selectedSlot as TimeSlotId);
                                    
                                    const currentSlotActivity = activityById.get(schedule[selectedSlot as string]);
                                    const currentSlotIsStudy = !!currentSlotActivity && isLearningActivity(currentSlotActivity);
                                    const currentSlotIsExecutableStudy = currentSlotIsStudy && executableSlotIds.has(selectedSlot);
                                    // Count only activities that will actually run. A
                                    // study entry already blocked by CF or a previous
                                    // activity must not consume the HELL weekly limit.
                                    const studyCountAfterReplacingSlot = previewStudyCount - (currentSlotIsExecutableStudy ? 1 : 0);
                                    const isStudyLimit = isLearningActivity(act) && weekendStudyLimit !== undefined && studyCountAfterReplacingSlot >= weekendStudyLimit;
                                    const isActivityStudyBlocked = isLearningActivity(act) && studyBlocked;
                                    const activityBlockReason = getActivityBlockReason(state, act);
                                    const isAtLimit = currentCount >= maxSlots || !isAllowedSlot || isStudyLimit || isActivityStudyBlocked || !!activityBlockReason;
                                    
                                    return (
                                    <div 
                                        key={act.id}
                                        onClick={() => !isAtLimit && handleActivitySelect(act.id)}
                                        className={`p-3 md:p-4 bg-white border rounded-xl transition-all group ${
                                            isAtLimit 
                                                ? 'border-slate-100 opacity-40 cursor-not-allowed' 
                                                : 'border-slate-200 cursor-pointer hover:border-indigo-500 hover:shadow-md'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 md:gap-3 mb-1">
                                            <i className={`fas ${act.icon} text-indigo-500 group-hover:scale-110 transition-transform`}></i>
                                            <span className="font-bold text-slate-800 text-sm md:text-base">{act.name}</span>
                                            {currentCount > 0 && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{currentCount}/{maxSlots}</span>}
                                            {!isAllowedSlot && <span className="text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">时间不符</span>}
                                            {isStudyLimit && <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">本周已达学习上限</span>}
                                            {isActivityStudyBlocked && <span className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full">当前状态不能学习</span>}
                                            {activityBlockReason && <span className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full">{activityBlockReason}</span>}
                                        </div>
                                        <p className="text-[10px] text-slate-500 leading-relaxed">{act.description}</p>
                                    </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center py-4 md:py-0">
                            <i className="fas fa-hand-pointer text-3xl md:text-4xl mb-3 md:mb-4 opacity-50"></i>
                            <p className="font-bold text-sm md:text-base">点击上方的时间段<br/>安排活动</p>
                        </div>
                    )}
                    {state.isWeekend ? (
                    <button 
                        onClick={() => onConfirm(schedule)}
                        className="w-full mt-4 md:mt-6 py-3 md:py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-base md:text-lg shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95"
                    >
                        执行本周计划 <i className="fas fa-play ml-2"></i>
                    </button>
                ) : (
                    <button 
                        onClick={() => onConfirm(schedule)}
                        className="w-full mt-4 md:mt-6 py-3 md:py-4 bg-slate-600 hover:bg-slate-700 text-white rounded-2xl font-black text-base md:text-lg shadow-lg transition-all active:scale-95"
                    >
                        关闭 <i className="fas fa-times ml-2"></i>
                    </button>
                )}
                </div>
            </div>
        </div>
    );
};

export default TimetableModal;
