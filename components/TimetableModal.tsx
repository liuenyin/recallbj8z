import { useLanguage } from '../lib/i18n';
import React, { useState } from 'react';
import { GameState, WeekendActivity } from '../types';
import { WEEKEND_ACTIVITIES } from '../data/mechanics';
import { SCHEDULE_SLOTS, TimeSlotId, BLOCKED_SLOTS_MAP, ALLOWED_SLOTS_MAP, clearWeekdaySchedule, getOrderedScheduleEntries, getActivityMaxSlots } from '../data/timetable';
import { getDifficultyPreset } from '../data/constants';
import { clampGameStateMetrics, isStudyBlocked, isLearningActivity, getActivityBlockReason, isHealthFatal, getWeekendActivityUpdates } from '../data/utils';
import { recommendWeekend } from '../data/weekend_recommendations';
import { getProjectSessionsLeft } from '../data/project_effects';
import { getWeekendInvitationText, isWeekendInvitationId } from '../data/weekend_invites';

interface Props {
    state: GameState;
    onConfirm: (schedule: Record<string, string>) => void;
    onClose?: () => void;
    quickStart?: boolean;
}

const TimetableModal: React.FC<Props> = ({ state, onConfirm, onClose, quickStart = false }) => {
    const { t: tr } = useLanguage();
    // Evaluate activity conditions in a weekend context. The random pool is
    // only restrictive while planning; a weekday schedule view should still
    // be able to show activities that were planned last weekend.
    const activityState = state.isWeekend ? state : { ...state, isWeekend: true };
    const useRandomWeekendPool = state.isWeekend && state.difficulty === 'REALITY'
        && state.availableWeekendActivityIds !== undefined;
    const offeredActivities = WEEKEND_ACTIVITIES.filter(a => {
        if (isWeekendInvitationId(a.id)) return state.isWeekend && !!a.condition?.(activityState) && !getActivityBlockReason(state, a);
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
    const retainedActivityIds = new Set(getOrderedScheduleEntries(lastSchedule).map(([, id]) => id));
    const availableActivities = WEEKEND_ACTIVITIES.filter(activity =>
        offeredActivities.includes(activity) || retainedActivityIds.has(activity.id)
    );

    const [initialSchedule] = useState<Record<string, string>>(() => {
        const last = state.flags.joined_evening_study
            ? clearWeekdaySchedule(state.lastWeekSchedule || {})
            : (state.lastWeekSchedule || {});
        const valid: Record<string, string> = {};
        for (const [slot, actId] of getOrderedScheduleEntries(last)) {
            const activityId = typeof actId === 'string' ? actId : null;
            if (SCHEDULE_SLOTS.some(candidate => candidate.id === slot) && activityId && activityById.has(activityId) && !isWeekendInvitationId(activityId)) {
                valid[slot] = activityId;
            }
        }
        return valid;
    });

    const [schedule, setSchedule] = useState(initialSchedule);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [showGrid, setShowGrid] = useState(!quickStart);
    const [invitationId, setInvitationId] = useState<string>();
    const difficultyPreset = getDifficultyPreset(state.difficulty);
    const hideDetails = state.difficulty === 'REALITY' || state.difficulty === 'HELL';
    const weekendStudyLimit = difficultyPreset.weekendStudyLimit;

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
    let selectedSlotState = activityState;
    const previewRepeatCounts = new Map<string, number>();
    const executableSlotIds = new Set<string>();
    const skippedReasons = new Map<string, string>();
    for (const { id: slotId } of SCHEDULE_SLOTS) {
        if (slotId === selectedSlot) selectedSlotState = previewState;
        const actId = schedule[slotId];
        if (!actId) continue;
        const activity = availableActivities.find(a => a.id === actId);
        const allowedSlots = activity && ALLOWED_SLOTS_MAP[activity.id];
        const learningActivity = !!activity && isLearningActivity(activity);
        const notOfferedThisWeek = !!activity && useRandomWeekendPool && !isWeekendInvitationId(activity.id) && !offeredActivities.includes(activity);
        const repeatCountBefore = activity ? (previewRepeatCounts.get(activity.id) || 0) : 0;
        const reason = previewBlockedSlots.has(slotId) ? `被${previewBlockers.get(slotId)}占用`
            : !activity ? '活动已不再提供'
            : repeatCountBefore >= getActivityMaxSlots(activity.id) ? `每周最多安排 ${getActivityMaxSlots(activity.id)} 次`
            : allowedSlots && !allowedSlots.includes(slotId as TimeSlotId) ? '这个时间不适合该活动'
            : activity.condition && !activity.condition(previewState) ? '本周不满足活动条件'
            : notOfferedThisWeek ? '本周未刷出该活动'
            : getActivityBlockReason(previewState, activity)
            || (learningActivity && isStudyBlocked(previewState) ? '状态不适合学习，试试先休息' : '')
            || (learningActivity && weekendStudyLimit !== undefined && previewStudyCount >= weekendStudyLimit ? '本周学习安排已达上限' : '');
        if (reason) { skippedReasons.set(slotId, reason); continue; }
        if (!activity) continue;
        executableSlotIds.add(slotId);
        if (learningActivity) previewStudyCount += 1;
        (BLOCKED_SLOTS_MAP[activity.id] || []).forEach(blockedSlot => {
            previewBlockedSlots.add(blockedSlot);
            previewBlockers.set(blockedSlot, activity.name);
        });

        const repeatCount = repeatCountBefore + 1;
        previewRepeatCounts.set(activity.id, repeatCount);
        previewState = clampGameStateMetrics({
            ...previewState,
            ...getWeekendActivityUpdates(previewState, activity, repeatCount, true)
        });
        if (isHealthFatal(previewState.difficulty, previewState.general.health)) {
            for (const slot of SCHEDULE_SLOTS.slice(SCHEDULE_SLOTS.findIndex(slot => slot.id === slotId) + 1)) {
                if (schedule[slot.id]) skippedReasons.set(slot.id, '预计健康耗尽，后续安排无法执行');
            }
            break;
        }
    }

    const recommendation = state.isWeekend ? recommendWeekend(activityState, offeredActivities, invitationId) : null;
    const currentProject = state.activeProjects[0];
    const plannedProject = currentProject && previewState.activeProjects.find(project => project.id === currentProject.id);

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

    const estimatedHealthDelta = Math.round(previewState.general.health - state.general.health);
    const estimatedMindsetDelta = Math.round(previewState.general.mindset - state.general.mindset);
    const estimatedEffDelta = Math.round((previewState.general.efficiency - state.general.efficiency) * 10) / 10;
    const projectedFatigue = previewState.fatigue;
    const fatigueRisk = projectedFatigue >= 90 ? '高' : projectedFatigue >= 75 ? '中' : '低';
    const hasSleepActivity = executableActivities.some(activity => activity.id === 'w_sleep' || activity.name.includes('睡'));

    if (state.isWeekend && !showGrid && recommendation) {
        const invitations = offeredActivities.filter(activity => isWeekendInvitationId(activity.id));
        const recommendedEntries = getOrderedScheduleEntries(recommendation.schedule);
        const invitationBlocked = !!invitationId && recommendation.schedule.Sat_Aft !== invitationId;
        const cost = Math.round(state.general.money - recommendation.projected.general.money);
        const projectedProject = currentProject && recommendation.projected.activeProjects.find(project => project.id === currentProject.id);
        return (
            <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={tr("周末安排")}>
                <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl">
                    <div className="overflow-y-auto px-5 pb-4 pt-6 sm:px-7">
                        <h2 className="text-2xl font-black text-slate-900">{tr("周末安排")}</h2>
                        {invitations.length > 0 && (
                            <fieldset className="mt-4 space-y-2">
                                <legend className="mb-1 text-sm font-bold text-slate-800">{tr("周六下午的邀约")}</legend>
                                {invitations.map(activity => (
                                    <button type="button" key={activity.id} aria-pressed={invitationId === activity.id} onClick={() => setInvitationId(invitationId === activity.id ? undefined : activity.id)}
                                        className={`block w-full rounded-xl border px-3 py-2 text-left ${invitationId === activity.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}>
                                        <strong className="block text-sm text-slate-900">{tr(activity.name)}</strong>
                                        <span className="text-xs leading-relaxed text-slate-600">{tr(getWeekendInvitationText(state, activity.id))}</span>
                                    </button>
                                ))}
                            </fieldset>
                        )}
                        {invitationBlocked && <p role="status" className="mt-3 text-sm text-rose-700">{tr("当前状态无法安排这项邀约。可以另选一项或手动调整。")}</p>}
                        {recommendation.note && <p className="mt-3 text-sm text-slate-600">{tr(recommendation.note)}</p>}
                        <ul className="mt-4 divide-y divide-slate-200 rounded-xl bg-slate-50 px-3 text-sm" aria-label={tr("推荐安排")}>
                            {recommendedEntries.map(([slot, id]) => (
                                <li key={slot} className="grid grid-cols-[6rem_1fr] gap-2 py-2.5">
                                    <span className="text-slate-600">{tr(SCHEDULE_SLOTS.find(candidate => candidate.id === slot)?.label)}</span>
                                    <strong className="text-slate-900">{tr(activityById.get(id)?.name)}</strong>
                                </li>
                            ))}
                            {recommendedEntries.length === 0 && <li className="py-3 text-slate-600">{tr("这个周末留空。")}</li>}
                        </ul>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                            {!hideDetails && Math.round(state.fatigue) !== Math.round(recommendation.projected.fatigue) && (
                                <span>{tr("疲劳 ")}{Math.round(state.fatigue)} → {Math.round(recommendation.projected.fatigue)}</span>
                            )}
                            {cost > 0 && <span>{tr("预计花费 ")}{cost} {tr("元")}</span>}
                            {currentProject && (
                                <span className="text-indigo-800">《{tr(currentProject.title)}》{tr(projectedProject
                                    ? `执行后剩 ${getProjectSessionsLeft(projectedProject)} 次，第 ${currentProject.deadlineWeek} 周截止。`
                                    : '本周可完成。')}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 border-t border-slate-100 p-4 sm:px-7">
                        <button type="button" onClick={() => { setShowGrid(true); if (invitationId) setSchedule(recommendation.schedule); }} className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">{tr("手动安排")}</button>
                        <button type="button" disabled={invitationBlocked} onClick={() => onConfirm(recommendation.schedule)} className="flex-1 rounded-xl bg-indigo-700 px-3 py-3 text-sm font-bold text-white hover:bg-indigo-800 disabled:opacity-40">{tr(recommendedEntries.length > 0 ? '执行推荐' : '继续到下周')}</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[70] flex justify-center items-center bg-slate-900/60 backdrop-blur-sm p-2 md:p-4 animate-fadeIn" onClick={() => !state.isWeekend && onClose?.()} role="dialog" aria-modal="true" aria-label={tr("周计划时间表")}>
            <div className="bg-slate-50 rounded-[24px] md:rounded-[32px] max-w-6xl w-full h-[min(95dvh,54rem)] md:h-[90dvh] shadow-2xl flex flex-col md:flex-row overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
                {/* Left: Timetable Grid */}
                <div className={`${selectedSlot ? 'hidden md:flex' : 'flex'} flex-1 p-4 md:p-6 flex-col min-h-0 overflow-y-auto custom-scroll md:border-r border-b md:border-b-0 border-slate-200 bg-white`}>
                    <div className="flex justify-between items-start gap-2 mb-1 md:mb-2">
                        <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{tr("周计划时间表")}</h2>
                        {quickStart && <button type="button" onClick={() => { setShowGrid(false); setSelectedSlot(null); }} className="rounded-lg px-2 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-50">{tr("返回周末安排")}</button>}
                        {!state.isWeekend && onClose && (
                            <button type="button" onClick={onClose} aria-label={tr("关闭")} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors shrink-0">
                                <i className="fas fa-times"></i>
                            </button>
                        )}
                    </div>
                    <p className="text-xs md:text-sm text-slate-500 mb-3 md:mb-4">{tr(Object.keys(initialSchedule).length ? '已带入上次安排，可以逐项调整。' : '点选时间段来安排活动。')}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                        {recommendation && Object.keys(recommendation.schedule).length > 0 && (
                            <button type="button" onClick={() => { setSchedule(recommendation.schedule); setSelectedSlot(null); }} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700">{tr("采用本周推荐")}</button>
                        )}
                        <button type="button" onClick={() => { setSchedule({}); setSelectedSlot(null); }} disabled={!Object.keys(schedule).length} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-40">{tr("清空安排")}</button>
                        <button type="button" onClick={() => { setSchedule({ ...initialSchedule }); setSelectedSlot(null); }} disabled={!Object.keys(initialSchedule).length} className="px-3 py-1.5 rounded-lg border border-indigo-100 text-xs font-bold text-indigo-600 hover:bg-indigo-50 disabled:opacity-40">{tr("恢复上次")}</button>
                    </div>
                    {recommendation?.note && <p className="mb-3 text-xs text-slate-600">{tr(recommendation.note)}</p>}
                    {skippedReasons.size > 0 && (
                        <div className="mb-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-900" role="status">
                            <p className="font-bold mb-2">{tr("有 ")}{skippedReasons.size} {tr("项安排无法执行。")}</p>
                            <ul className="space-y-1">
                                {[...skippedReasons].map(([slotId, reason]) => <li key={slotId}>
                                    {tr(SCHEDULE_SLOTS.find(slot => slot.id === slotId)?.label)} · {tr(activityById.get(schedule[slotId])?.name)}：{tr(reason)}
                                </li>)}
                            </ul>
                            <button type="button" className="mt-2 underline font-bold" onClick={() => {
                                setSchedule(Object.fromEntries(Object.entries(schedule).filter(([slot]) => !skippedReasons.has(slot))));
                                setSelectedSlot(null);
                            }}>{tr("清除这些安排")}</button>
                        </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 md:gap-3">
                        {['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                            <div key={day} className={`flex flex-col gap-2 p-2 md:p-3 rounded-xl border ${day === 'Sat' || day === 'Sun' ? 'col-span-full bg-indigo-50/40 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                                <h3 className="font-bold text-slate-700 text-sm md:text-base">{tr({ Mon: '周一', Tue: '周二', Wed: '周三', Thu: '周四', Fri: '周五', Sat: '周六', Sun: '周日' }[day])}</h3>
                                <div className={`grid gap-2 ${day === 'Sat' ? 'grid-cols-2 sm:grid-cols-4' : day === 'Sun' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1'}`}>
                                    {SCHEDULE_SLOTS.filter(s => s.day === day).map(slot => {
                                        const isBlocked = isSlotBlocked(slot.id);
                                        const blocker = getBlocker(slot.id);
                                        const actId = schedule[slot.id];
                                        const act = activityById.get(actId);
                                        const isRetained = !!act && useRandomWeekendPool && !offeredActivities.some(activity => activity.id === act.id);
                                        const isSelected = selectedSlot === slot.id;
                                        const willSkip = !!act && !isBlocked && !executableSlotIds.has(slot.id);
                                        
                                        return (
                                            <div key={slot.id} className="relative min-w-0">
                                                <button
                                                    type="button"
                                                    disabled={isBlocked}
                                                    aria-pressed={isSelected}
                                                    onClick={() => handleSlotClick(slot.id)}
                                                    className={`flex flex-col text-left p-2 md:p-3 border-2 rounded-xl cursor-pointer transition-all w-full min-h-20 ${act && !isBlocked ? 'pr-8 md:pr-8' : ''} ${
                                                        isBlocked ? 'bg-slate-200 border-slate-300 opacity-50 cursor-not-allowed' :
                                                        isSelected ? 'border-indigo-500 bg-indigo-50' :
                                                        willSkip ? 'border-amber-200 bg-amber-50' :
                                                        act ? 'border-blue-300 bg-blue-50 hover:border-blue-400' :
                                                        'border-slate-200 bg-white hover:border-slate-300'
                                                    }`}
                                                >
                                                    <span className="text-xs font-bold text-slate-500 mb-1">{tr(slot.label)}</span>
                                                    {isBlocked ? (
                                                        <span className="text-xs text-slate-600 font-bold leading-tight">{tr("被占用 (")}{tr(blocker)})</span>
                                                    ) : act ? (
                                                        <span className="text-xs font-bold text-blue-800 leading-tight">{tr(act.name)}{willSkip && <span className="block text-amber-700 font-medium">{tr("暂不可执行")}</span>}{isRetained && <span className="block text-slate-500 font-medium">{tr("计划保留")}</span>}</span>
                                                    ) : (
                                                        <span className="text-xs text-slate-500">{tr("＋ 安排活动")}</span>
                                                    )}
                                                </button>
                                                {act && !isBlocked && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleClearSlot(slot.id)}
                                                        aria-label={tr(`移除${slot.label}的${act.name}`)}
                                                        className="absolute top-6 right-1 flex size-7 items-center justify-center rounded-md text-slate-500 hover:text-rose-600 focus-visible:ring-2 focus-visible:ring-indigo-600"
                                                    ><i className="fas fa-times-circle" aria-hidden="true" /></button>
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
                <div className={`w-full md:w-80 bg-slate-100 p-4 md:p-6 flex flex-col md:h-full ${selectedSlot ? 'flex-1 min-h-0 md:flex-none' : 'shrink-0'}`}>
                    <div className={`${selectedSlot ? 'hidden md:block' : ''} md:mb-4 rounded-xl border border-slate-200 bg-white px-3 py-2.5`} aria-live="polite">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-500">{tr("计划预览")}</span>
                            <span className="text-xs font-bold text-slate-600">{executableActivities.length} {tr("项可执行")}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold">
                            <span className={`rounded-full px-2 py-1 ${fatigueRisk === '高' ? 'bg-rose-100 text-rose-600' : fatigueRisk === '中' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                {tr("疲劳风险 ")}{tr(fatigueRisk)}
                            </span>
                            {!hideDetails && (
                                <>
                                    <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-500">
                                        {tr("疲劳 ")}{Math.round(state.fatigue)} → {Math.round(projectedFatigue)}
                                    </span>
                                    {estimatedHealthDelta !== 0 && (
                                        <span className={`rounded-full px-2 py-1 ${estimatedHealthDelta > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {tr("健康 ")}{tr(estimatedHealthDelta > 0 ? '+' : '')}{estimatedHealthDelta}
                                        </span>
                                    )}
                                    {estimatedMindsetDelta !== 0 && (
                                        <span className={`rounded-full px-2 py-1 ${estimatedMindsetDelta > 0 ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                                            {tr("心态 ")}{tr(estimatedMindsetDelta > 0 ? '+' : '')}{estimatedMindsetDelta}
                                        </span>
                                    )}
                                    {estimatedEffDelta !== 0 && (
                                        <span className={`rounded-full px-2 py-1 ${estimatedEffDelta > 0 ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-600'}`}>
                                            {tr("效率 ")}{tr(estimatedEffDelta > 0 ? '+' : '')}{estimatedEffDelta}
                                        </span>
                                    )}
                                </>
                            )}
                            {repeatedActivities.length > 0 && (
                                <span className="rounded-full bg-orange-100 px-2 py-1 text-orange-600">{tr("重复收益递减")}</span>
                            )}
                        </div>
                        {currentProject && (
                            <p aria-label={tr("课题进度预览")} className="mt-2 text-xs text-indigo-800">
                                《{tr(currentProject.title)}》{tr(plannedProject
                                    ? `还需整理 ${getProjectSessionsLeft(plannedProject)} 次，第 ${currentProject.deadlineWeek} 周截止。`
                                    : '按当前计划，本周可以完成。')}
                            </p>
                        )}
                        {state.activeChallengeId === 'c_sleep_king' && !hasSleepActivity && (
                            <p className="mt-2 text-[10px] font-bold leading-relaxed text-rose-500">{tr("睡神挑战：本周必须安排补觉。")}</p>
                        )}
                        {repeatedActivities.length > 0 && (
                            <p className="mt-2 text-[10px] leading-relaxed text-slate-500">{tr(repeatedActivities.join('、'))}{tr("重复安排后，正向收益会逐次减少。")}</p>
                        )}
                    </div>
                    {selectedSlot ? (
                        <>
                            <div className="flex items-center gap-3 mb-3 md:mb-4">
                                <button type="button" onClick={() => setSelectedSlot(null)} className="md:hidden shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700">
                                    <i className="fas fa-arrow-left mr-1.5" aria-hidden="true" /> {tr("返回计划")}</button>
                                <h3 className="text-base md:text-lg font-bold text-slate-800">{tr("选择活动 ")}<span className="text-xs md:text-sm font-normal text-slate-600">({tr(SCHEDULE_SLOTS.find(s => s.id === selectedSlot)?.label)})</span></h3>
                            </div>
                            <div className="flex-1 min-h-0 overflow-y-auto custom-scroll space-y-2 pr-1 md:pr-2">
                                <button type="button"
                                    onClick={() => {
                                        const newS = {...schedule};
                                        delete newS[selectedSlot];
                                        setSchedule(newS);
                                        setSelectedSlot(null);
                                    }}
                                    className="w-full p-2 md:p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all text-center text-slate-600 font-bold text-sm"
                                >
                                    {tr("清空此时间段")}</button>
                                 {offeredActivities.map(act => {
                                    const maxSlots = getActivityMaxSlots(act.id);
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
                                    const isActivityStudyBlocked = isLearningActivity(act) && isStudyBlocked(selectedSlotState);
                                    const activityBlockReason = getActivityBlockReason(selectedSlotState, act);
                                    const countOutsideSelectedSlot = currentCount - (schedule[selectedSlot] === act.id ? 1 : 0);
                                    const isAtLimit = countOutsideSelectedSlot >= maxSlots || !isAllowedSlot || isStudyLimit || isActivityStudyBlocked || !!activityBlockReason;
                                    
                                    return (
                                    <button
                                        type="button"
                                        key={act.id}
                                        disabled={isAtLimit}
                                        onClick={() => handleActivitySelect(act.id)}
                                        className={`w-full text-left p-3 md:p-4 bg-white border rounded-xl transition-all group ${
                                            isAtLimit 
                                                ? 'border-slate-100 opacity-40 cursor-not-allowed' 
                                                : 'border-slate-200 cursor-pointer hover:border-indigo-500 hover:shadow-md'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 md:gap-3 mb-1">
                                            <i className={`fas ${act.icon} text-indigo-500 group-hover:scale-110 transition-transform`}></i>
                                            <span className="font-bold text-slate-800 text-sm md:text-base">{tr(act.name)}</span>
                                            {currentCount > 0 && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{currentCount}/{maxSlots}</span>}
                                            {!isAllowedSlot && <span className="text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">{tr("时间不符")}</span>}
                                            {isStudyLimit && <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">{tr("本周已达学习上限")}</span>}
                                            {isActivityStudyBlocked && <span className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full">{tr("当前状态不能学习")}</span>}
                                            {activityBlockReason && <span className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full">{tr(activityBlockReason)}</span>}
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed">{tr(isWeekendInvitationId(act.id) ? getWeekendInvitationText(state, act.id) : act.description)}</p>
                                    </button>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 hidden md:flex flex-col items-center justify-center text-slate-400 text-center">
                            <i className="fas fa-hand-pointer text-3xl md:text-4xl mb-3 md:mb-4 opacity-50"></i>
                            <p className="font-bold text-sm md:text-base">{tr("选择一个时间段")}<br/>{tr("安排这一周的小事")}</p>
                        </div>
                    )}
                    {state.isWeekend ? (
                    <button type="button"
                        onClick={() => onConfirm(schedule)}
                        className={`${selectedSlot ? 'hidden md:block' : ''} w-full mt-3 md:mt-6 py-3 md:py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-base md:text-lg shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95`}
                    >
                        {tr("执行本周计划 ")}<i className="fas fa-play ml-2"></i>
                    </button>
                ) : (
                    <div className={`${selectedSlot ? 'hidden md:flex' : 'flex'} gap-2 mt-3 md:mt-6`}>
                        {onClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-3 md:py-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl font-bold text-sm md:text-base transition-all"
                            >
                                {tr("取消")}</button>
                        )}
                        <button type="button"
                            onClick={() => onConfirm(schedule)}
                            className="flex-1 py-3 md:py-4 bg-slate-600 hover:bg-slate-700 text-white rounded-2xl font-black text-base md:text-lg shadow-lg transition-all active:scale-95"
                        >
                            {tr("保存安排 ")}<i className="fas fa-check ml-2"></i>
                        </button>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
};

export default TimetableModal;
