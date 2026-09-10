
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
    GameState, Difficulty, GeneralStats, Talent, Challenge, AiConfig,
    Phase, GameStatus, SubjectKey, OIStats, GameEvent, 
    EventChoice, ExamResult, ClubId, Item, WeekendActivity, Project, GameLogEntry, StoryEntry
} from '../types';
import { DIFFICULTY_PRESETS, getDifficultyPreset } from '../data/constants';
import { PHASE_EVENTS, BASE_EVENTS, CHAINED_EVENTS, generateSummerLifeEvent, generateStudyEvent, generateOIEvent, generateRandomFlavorEvent, hasOIRandomEventsForPhase } from '../data/events';
import { WEEKEND_ACTIVITIES, STATUSES, ACHIEVEMENTS, CLUBS, TALENTS } from '../data/mechanics';
import { mapAiEventToGameEvent, modifyOI, modifySub, getLearningMultiplier, getRestRecoveryMultiplier, scalePositiveGeneralDeltas, scalePositiveSubjectDeltas, scalePositiveOIStatDeltas, isStudyBlocked, isHealthFatal, isStudyChoice, isLearningActivity, getShopPriceMultiplier, clampGameStateMetrics, getActivityBlockReason, normalizeActiveStatuses, getWeekendActivityUpdates } from '../data/utils';
import { getRandomWorldContext, CHARACTER_TEMPLATES, WORLD_REGIONS } from '../data/world_context';
import { getHistoricalEventsForWeek, loadCityEvents } from '../data/historical_events';
import { OI_EVENTS_POOL } from '../data/events_oi';
import { SCHEDULE_SLOTS, BLOCKED_SLOTS_MAP, ALLOWED_SLOTS_MAP, clearWeekdaySchedule, getOrderedScheduleEntries } from '../data/timetable';
import { getRandomRelationshipProfile } from '../data/relationships';
import { generateBatchGameEvents } from '../lib/gemini';
import { getAccountSaveKey } from '../lib/accounts';
import { restoreExamResult, restoreWorldContext, restoreFlags } from '../lib/save_validation';
import { hydrateProject } from '../data/project_effects';
import { PHASE_ORDER, getAcademicMaxScore, getPostEventFlow, isQueuedEventStillEligible } from '../data/game_flow';

const LEGACY_STORAGE_KEY = 'recall_save_v1';
const SAVE_VERSION = 3;
const ACHIEVEMENTS_KEY = 'recall_achievements_global'; // Global key for achievements

const PHASE_EVENT_REGISTRY = (Object.values(PHASE_EVENTS) as GameEvent[][])
    .flat()
    .reduce((acc, event) => ({ ...acc, [event.id]: event }), {} as Record<string, GameEvent>);

const EVENT_REGISTRY: Record<string, GameEvent> = {
    ...BASE_EVENTS,
    ...CHAINED_EVENTS,
    ...PHASE_EVENT_REGISTRY,
    ...OI_EVENTS_POOL.reduce((acc, event) => ({ ...acc, [event.id]: event }), {} as Record<string, GameEvent>)
};

const isProjectOverdue = (project: Project, phase: Phase, week: number): boolean => {
    const deadlineIndex = PHASE_ORDER.indexOf(project.deadlinePhase);
    const currentIndex = PHASE_ORDER.indexOf(phase);
    if (deadlineIndex < 0 || currentIndex < 0) return false;
    // The deadline is inclusive: the player may still use the weekend in the
    // declared deadline week. Failure is checked when the following week starts.
    return currentIndex > deadlineIndex || (currentIndex === deadlineIndex && week > project.deadlineWeek);
};

const eventRef = (event: GameEvent | null): unknown => {
    if (!event) return null;
    // AI events may legally reuse an authored ID. Prefer their serialized
    // payload so loading never silently swaps in a built-in event.
    const persisted = event.serialized || (EVENT_REGISTRY[event.id] ? event.id : null);
    if (!persisted || !event.queueContext) return persisted;
    return typeof persisted === 'string'
        ? { id: persisted, queueContext: event.queueContext }
        : { ...persisted, queueContext: event.queueContext };
};

const restoreQueueContext = (event: GameEvent, value: any): GameEvent => {
    const context = value?.queueContext;
    if (!context || typeof context !== 'object') return event;
    const phase = context.phase;
    const week = Number(context.week);
    const competition = context.competition;
    if (!Object.values(Phase).includes(phase) || !Number.isFinite(week)
        || !['None', 'OI', 'MO', 'PhO', 'ChO'].includes(competition)) return event;
    return { ...event, queueContext: { phase, week: Math.max(1, Math.floor(week)), competition } };
};

const VALID_LOG_TYPES = new Set<GameLogEntry['type']>(['info', 'success', 'warning', 'error', 'event']);

const restoreLogEntries = (value: unknown): GameLogEntry[] => {
    if (!Array.isArray(value)) return [];
    return value
        .filter((entry: any): entry is GameLogEntry => entry && typeof entry === 'object'
            && typeof entry.message === 'string'
            && VALID_LOG_TYPES.has(entry.type)
            && Number.isFinite(entry.timestamp))
        .map(entry => ({
            message: entry.message.trim().slice(0, 500),
            type: entry.type,
            timestamp: Math.max(0, Math.floor(entry.timestamp))
        }))
        .filter(entry => entry.message.length > 0)
        .slice(-1000);
};

const restoreStoryEntries = (value: unknown): StoryEntry[] => {
    if (!Array.isArray(value)) return [];
    const validPhases = new Set(Object.values(Phase));
    return value
        .filter((entry: any): entry is StoryEntry => entry && typeof entry === 'object'
            && validPhases.has(entry.phase)
            && Number.isFinite(entry.week)
            && typeof entry.eventTitle === 'string'
            && typeof entry.choiceText === 'string'
            && typeof entry.resultSummary === 'string'
            && Number.isFinite(entry.timestamp))
        .map(entry => ({
            week: Math.max(1, Math.floor(entry.week)),
            phase: entry.phase,
            eventTitle: entry.eventTitle.trim().slice(0, 120),
            choiceText: entry.choiceText.trim().slice(0, 240),
            resultSummary: entry.resultSummary.trim().slice(0, 500),
            timestamp: Math.max(0, Math.floor(entry.timestamp))
        }))
        .filter(entry => entry.eventTitle.length > 0 && entry.choiceText.length > 0)
        .slice(-1000);
};

const resolveEvent = (value: unknown): GameEvent | null => {
    if (value && typeof value === 'object' && (value as any).source === 'ai'
        && Array.isArray((value as any).choices)) {
        return restoreQueueContext(mapAiEventToGameEvent(value), value);
    }
    const id = typeof value === 'string'
        ? value
        : value && typeof value === 'object' && 'id' in value && typeof value.id === 'string'
            ? value.id
            : null;
    if (id && EVENT_REGISTRY[id]) return restoreQueueContext(EVENT_REGISTRY[id], value);
    if (value && typeof value === 'object' && Array.isArray((value as any).choices)
        && typeof (value as any).title === 'string' && typeof (value as any).description === 'string') {
        return restoreQueueContext(mapAiEventToGameEvent(value), value);
    }
    return null;
};

const shouldMarkEventTriggered = (event: GameEvent): boolean =>
    (event.once || event.triggerType === 'FIXED') && event.id !== 'debt_collection';

const markEventTriggered = (triggeredEvents: string[], event: GameEvent): string[] =>
    shouldMarkEventTriggered(event) && !triggeredEvents.includes(event.id)
        ? [...triggeredEvents, event.id]
        : triggeredEvents;

const trackRecentRandomEvent = (recentEventIds: string[], event: GameEvent): string[] => {
    if (event.triggerType !== 'RANDOM' || recentEventIds.includes(event.id)) return recentEventIds;
    return [...recentEventIds, event.id].slice(-4);
};

const addQueueContext = (events: GameEvent[], state: GameState): GameEvent[] => events.map(event => ({
    ...event,
    queueContext: event.queueContext || {
        phase: state.phase,
        week: state.week,
        competition: state.competition
    }
}));

const getHealthDeathMessage = (difficulty: Difficulty): string => {
    const threshold = getDifficultyPreset(difficulty).healthDeathThreshold;
    return threshold !== undefined && threshold > 0
        ? '【极限失败】健康值低于' + threshold + '，身体再也承受不住了……游戏结束。'
        : '【猝死】你的健康值降到了0，身体再也承受不住了……游戏结束。';
};

const getInitialSubjects = (): Record<SubjectKey, { aptitude: number; level: number }> => ({
    chinese: { aptitude: 0, level: 0 },
    math: { aptitude: 0, level: 0 },
    english: { aptitude: 0, level: 0 },
    physics: { aptitude: 0, level: 0 },
    chemistry: { aptitude: 0, level: 0 },
    biology: { aptitude: 0, level: 0 },
    history: { aptitude: 0, level: 0 },
    geography: { aptitude: 0, level: 0 },
    politics: { aptitude: 0, level: 0 }
});

const getInitialOIStats = (): OIStats => ({
    dp: 0, ds: 0, math: 0, string: 0, graph: 0, misc: 0,
    rating: 1200,
    history: []
});

// Helper to get global achievements
const getGlobalAchievements = (): string[] => {
    try {
        const stored = localStorage.getItem(ACHIEVEMENTS_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    } catch (e) {
        console.error("Error loading global achievements", e);
        return [];
    }
};

const getInitialGameState = (): GameState => ({
    activeProjects: [],
    completedProjects: [],
    flags: {},
    isPlaying: false,
     
    eventQueue: [],
     // Init AI Buffer
    recentEventIds: [], // Init Repetition Buffer
    phase: Phase.INIT,
    week: 1,
    totalWeeksInPhase: 0,
    subjects: getInitialSubjects(),
    general: { mindset: 50, experience: 0, luck: 50, romance: 0, health: 100, money: 0, efficiency: 10, excitement: 30 },
    fatigue: 20,
    initialGeneral: { mindset: 50, experience: 0, luck: 50, romance: 0, health: 100, money: 0, efficiency: 10, excitement: 30 },
    oiStats: getInitialOIStats(),
    selectedSubjects: [],
    subjectReselectionReturnPhase: null,
    competition: 'None',
    club: null,
    hasSelectedClub: false,
    romancePartner: null,
    relationshipProfileId: null,
    className: '', 
    log: [],
    currentEvent: null,
    chainedEvent: null,
    eventResult: null,
    history: [],
    examResult: null,
    midtermRank: null,
    popupExamResult: null,
    triggeredEvents: [],
    isSick: false,
    isGrounded: false,
    debugMode: false,
    activeStatuses: [],
    unlockedAchievements: [],
    achievementPopup: null,
    difficulty: 'NORMAL',
    activeChallengeId: null,
    isWeekend: false,
    lastWeekSchedule: {},
    sleepCount: 0,
    rejectionCount: 0,
    talents: [],
    inventory: [],
    theme: 'light',
    hasSleptThisWeek: false,
    dreamtExam: false,
    availableWeekendActivityIds: undefined
});

export const useGameLogic = (aiConfig?: AiConfig, accountId = 'guest') => {
    const STORAGE_KEY = getAccountSaveKey(accountId);
    // Initialize state with global achievements merged in
    const [state, setState] = useState<GameState>(() => {
        const initial = getInitialGameState();
        const globalAchievements = getGlobalAchievements();
        return {
            ...initial,
            unlockedAchievements: globalAchievements
        };
    });

    
    const [hasSave, setHasSave] = useState(false);
    const latestStateRef = useRef(state);
    const aiRequestToken = useRef(0);
    const aiAbortController = useRef<AbortController | null>(null);
    // React may batch two clicks before the next render. Remember the state
    // object each transition consumed so the same snapshot cannot be applied
    // twice (the next render produces a new object and unlocks the action).
    const eventActionStateRef = useRef<GameState | null>(null);
    const shopActionStateRef = useRef<GameState | null>(null);
    const timetableActionStateRef = useRef<GameState | null>(null);
    latestStateRef.current = state;

    const cancelAiGeneration = useCallback(() => {
        aiRequestToken.current += 1;
        aiAbortController.current?.abort();
        aiAbortController.current = null;
    }, []);

    useEffect(() => {
        cancelAiGeneration();
        // Account changes must never retain the previous account's in-memory
        // game. The player can explicitly load the selected account's save
        // from the home screen after this reset.
        let saved: string | null = null;
        try {
            saved = localStorage.getItem(STORAGE_KEY)
                || (accountId === 'guest' ? localStorage.getItem(LEGACY_STORAGE_KEY) : null);
        } catch (error) {
            console.error('Failed to read save metadata', error);
        }
        setHasSave(!!saved);
        const initial = getInitialGameState();
        setState(prev => ({ ...initial, unlockedAchievements: prev.unlockedAchievements }));
    }, [STORAGE_KEY, accountId, cancelAiGeneration]);

    useEffect(() => () => cancelAiGeneration(), [cancelAiGeneration]);

    useEffect(() => {
        if (!state.isAiGenerating) return;
        if (state.isPlaying && state.phase !== Phase.ENDING && state.phase !== Phase.WITHDRAWAL) return;
        cancelAiGeneration();
        setState(prev => ({ ...prev, isAiGenerating: false }));
    }, [state.isAiGenerating, state.isPlaying, state.phase, cancelAiGeneration]);

    useEffect(() => {
        if (isHealthFatal(state.difficulty, state.general.health) && state.phase !== Phase.ENDING && state.phase !== Phase.WITHDRAWAL) {
            setState(prev => ({
                ...prev,
                phase: Phase.ENDING,
                currentEvent: null,
                eventQueue: [],
                isPlaying: false,
                isWeekend: false,
                log: [...prev.log, { message: getHealthDeathMessage(prev.difficulty), type: 'error', timestamp: Date.now() }]
            }));
        }
    }, [state.difficulty, state.general.health, state.phase]);

    const advancePhase = useCallback(() => {
        setState(prev => {
            let nextPhase = Phase.SEMESTER_1; 
            let weeks = 21; 
            const currentPhase = prev.phase;

            switch (currentPhase) {
                case Phase.INIT: nextPhase = Phase.SUMMER; weeks = 8; break;
                case Phase.SUMMER: nextPhase = Phase.MILITARY; weeks = 2; break; 
                case Phase.MILITARY: nextPhase = Phase.SELECTION; weeks = 0; break; 
                case Phase.SELECTION: nextPhase = Phase.PLACEMENT_EXAM; weeks = 0; break;
                case Phase.PLACEMENT_EXAM: nextPhase = Phase.SEMESTER_1; weeks = 21; break; 
                case Phase.MIDTERM_EXAM: nextPhase = Phase.SUBJECT_RESELECTION; weeks = 0; break;
                case Phase.SUBJECT_RESELECTION: nextPhase = Phase.SEMESTER_1; weeks = 21; break; 
                case Phase.SEMESTER_1: nextPhase = Phase.FINAL_EXAM; weeks = 0; break;
                case Phase.FINAL_EXAM: nextPhase = Phase.WINTER_BREAK; weeks = 5; break;
                case Phase.WINTER_BREAK: nextPhase = Phase.SEMESTER_2; weeks = 21; break;
                case Phase.MIDTERM_EXAM_2: nextPhase = Phase.SEMESTER_2; weeks = 21; break;
                case Phase.SEMESTER_2: nextPhase = Phase.FINAL_EXAM_2; weeks = 0; break;
                case Phase.FINAL_EXAM_2: nextPhase = Phase.SUMMER_BREAK; weeks = 8; break;
                case Phase.SUMMER_BREAK: nextPhase = Phase.ENDING; weeks = 0; break;
                default: nextPhase = Phase.ENDING; weeks = 0;
            }
            
            return {
                ...prev,
                phase: nextPhase,
                week: 1,
                totalWeeksInPhase: weeks,
                availableWeekendActivityIds: undefined,
                isPlaying: nextPhase !== Phase.ENDING && nextPhase !== Phase.SELECTION && nextPhase !== Phase.SUBJECT_RESELECTION && nextPhase !== Phase.FINAL_EXAM && nextPhase !== Phase.FINAL_EXAM_2 && nextPhase !== Phase.PLACEMENT_EXAM,
                log: [...prev.log, { message: `进入新阶段: ${nextPhase}`, type: 'info', timestamp: Date.now() }]
            };
        });
    }, []);

    // --- Achievement Check Effect ---
    useEffect(() => {
        // STRICT MODE CHECK
        const isEligibleMode = state.difficulty === 'REALITY' || !!state.activeChallengeId;
        if (!isEligibleMode) return;

        const newUnlocked: string[] = [];
        const add = (id: string) => { 
            if (!state.unlockedAchievements.includes(id) && !newUnlocked.includes(id)) {
                newUnlocked.push(id);
            }
        };

        if (state.general.money >= 200) add('rich');
        if (state.general.money <= -250) add('in_debt');
        if (state.sleepCount >= 10) add('sleep_god');
        if (state.rejectionCount >= 5) add('nice_person');
        if (state.general.health < 10 && state.phase === Phase.SEMESTER_1 && state.week > 10) add('survival');
        if (state.general.health >= 100) add('sports_star');
        if (state.general.mindset <= 0) add('emotional_damage');
        if (state.general.romance >= 80) add('popular');
        if (state.romancePartner) add('romance_master');
        if (state.flags.noip_score && state.flags.noip_score >= 195) add('oi_god');

        // Academic Achievements Check
        if (state.examResult) {
            // Check if it's an Academic Exam, NOT a Competition
            const isAcademic = state.examResult.type === 'ACADEMIC';
            
            if (isAcademic) {
                if (state.examResult.rank === 1) add('top_rank');
                if (state.examResult.totalStudents && state.examResult.rank === state.examResult.totalStudents) add('bottom_rank');
                
                const isFullScore = Object.entries(state.examResult.scores).some(([subj, score]) => {
                    const max = ['chinese', 'math', 'english'].includes(subj) ? 150 : 100;
                    return (score as number) >= max;
                });
                if (isFullScore) add('nerd');
            }
        }

        if (newUnlocked.length > 0) {
            const lastId = newUnlocked[newUnlocked.length - 1];
            
            // Persist to Global Storage
            const globalAch = getGlobalAchievements();
            const merged = Array.from(new Set([...globalAch, ...newUnlocked]));
                try {
                    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(merged));
                } catch (error) {
                    console.error('Failed to persist achievements', error);
                }

            setState(prev => ({
                ...prev,
                unlockedAchievements: merged,
                achievementPopup: ACHIEVEMENTS[lastId]
            }));
            
            setTimeout(() => setState(prev => ({ ...prev, achievementPopup: null })), 3000);
        }
    }, [state.general, state.sleepCount, state.rejectionCount, state.examResult, state.difficulty, state.unlockedAchievements, state.phase, state.activeChallengeId, state.romancePartner]);


    // --- MAIN GAME LOOP ---
    useEffect(() => {
        if (!state.isPlaying || state.currentEvent || state.isWeekend || state.isAiGenerating
            || state.phase === Phase.SUBJECT_RESELECTION || state.phase === Phase.SELECTION
            || state.phase === Phase.ENDING || state.phase === Phase.WITHDRAWAL) return;

        const processTurn = async () => {
            // Check Project Deadlines
            let failedProjects: Project[] = [];
            let activeProjects = [...state.activeProjects];
            activeProjects = activeProjects.filter(p => {
                if (isProjectOverdue(p, state.phase, state.week)) {
                    if (p.progress < p.requiredProgress) {
                        failedProjects.push(p);
                        return false;
                    }
                }
                return true;
            });

            if (failedProjects.length > 0) {
                let updates: Partial<GameState> = { activeProjects };
                let logs: GameLogEntry[] = [];
                let mergedGeneral: GeneralStats | undefined;
                failedProjects.forEach(p => {
                    if (p.onFail) {
                        const failEffects = p.onFail(state);
                        updates = { ...updates, ...failEffects };
                        if (failEffects.general) {
                            if (!mergedGeneral) mergedGeneral = { ...state.general };
                            (Object.keys(state.general) as Array<keyof GeneralStats>).forEach(key => {
                                const nextValue = failEffects.general?.[key];
                                if (typeof nextValue === 'number') {
                                    mergedGeneral![key] += nextValue - state.general[key];
                                }
                            });
                        }
                    }
                    logs.push({ message: `【课题失败】${p.title} 截止日期已过，未能完成。`, type: 'error', timestamp: Date.now() });
                });
                if (mergedGeneral) updates.general = mergedGeneral;
                setState(prev => clampGameStateMetrics({ ...prev, ...updates, log: [...prev.log, ...logs] }));
                return; // Let the state update and re-enter loop
            }

            // 0. Handle Queue first
            if (state.eventQueue.length > 0) {
                setState(prev => {
                    const eligibleQueue = prev.eventQueue.filter(event => isQueuedEventStillEligible(event, prev));
                    const [next, ...rest] = eligibleQueue;
                    return {
                        ...prev,
                        currentEvent: next || null,
                        eventQueue: rest,
                        triggeredEvents: next ? markEventTriggered(prev.triggeredEvents, next) : prev.triggeredEvents,
                        recentEventIds: next ? trackRecentRandomEvent(prev.recentEventIds, next) : prev.recentEventIds,
                        // If all queued conditional events became invalid, run
                        // the normal phase/weekly flow on the next tick instead
                        // of leaving the game paused with an empty screen.
                        isPlaying: true
                    };
                });
                return;
            }

            // 1. Check Phase Progression
            if (state.totalWeeksInPhase > 0 && state.week > state.totalWeeksInPhase) {
                advancePhase();
                return;
            }

            // 2. Fixed Triggers (Exams)
            if (state.phase === Phase.SEMESTER_1 && state.week === 7 && state.competition === 'OI' && !state.triggeredEvents.includes('csp_exam_trigger')) {
                setState(prev => ({ ...prev, phase: Phase.CSP_EXAM, isPlaying: false, triggeredEvents: [...prev.triggeredEvents, 'csp_exam_trigger'] }));
                return;
            }
            if (state.phase === Phase.SEMESTER_2 && state.week === 11 && state.midtermRank !== 'SEMESTER_2_DONE') {
                setState(prev => ({ ...prev, phase: Phase.MIDTERM_EXAM_2, isPlaying: false }));
                return;
            }
            if (state.phase === Phase.SEMESTER_1 && state.week === 11 && state.midtermRank !== 'SEMESTER_1_DONE') {
                setState(prev => ({ ...prev, phase: Phase.MIDTERM_EXAM, isPlaying: false }));
                return;
            }
            if (state.phase === Phase.SEMESTER_1 && state.week === 13 && state.competition === 'OI' && !state.triggeredEvents.includes('noip_exam_trigger')) {
                 setState(prev => ({ ...prev, phase: Phase.NOIP_EXAM, isPlaying: false, triggeredEvents: [...prev.triggeredEvents, 'noip_exam_trigger'] }));
                return;
            }

            // 3. Generate Week's Events
            let weekEvents: GameEvent[] = [];
            const phasePool = PHASE_EVENTS[state.phase] || [];

            // Historical Events
            const historicalEvents = getHistoricalEventsForWeek(state);
            if (historicalEvents.length > 0 && state.week % 3 === 0) {
                 let newEvents = historicalEvents.filter(he => !state.triggeredEvents.includes(he.id));
                 if (newEvents.length > 0) {
                     newEvents = newEvents.sort(() => 0.5 - Math.random()).slice(0, 1);
                     weekEvents.push(newEvents[0]);
                 }
            }

            // 3a. Fixed Events in current Phase/Week (Priority)
            const pendingFixed = phasePool.filter(e => 
                e.triggerType === 'FIXED' && 
                (!e.fixedPhase || e.fixedPhase === state.phase) &&
                e.fixedWeek === state.week && 
                (!e.condition || e.condition(state)) &&
                !state.triggeredEvents.includes(e.id)
            );
            weekEvents.push(...pendingFixed);
            
            // 3a.2 Global Negative Triggers (Debt Event)
            if (state.general.money < 0) {
                 const debt = Math.abs(state.general.money);
                 const prob = Math.min(1, Math.sqrt(debt) / 30);
                 if (Math.random() < prob && !state.recentEventIds.includes('debt_collection')) {
                     const evt = BASE_EVENTS['debt_collection'];
                     if (evt) weekEvents.push(evt);
                 }
            }

            // AI Branch Logic has been moved to offline pre-generation.

            // 3b. Conditional Events
            const conditionalEvents = phasePool.filter(e => 
                e.triggerType === 'CONDITIONAL' &&
                (!e.once || !state.triggeredEvents.includes(e.id)) &&
                e.condition && e.condition(state)
            );
            let deferredConditionalEvents: GameEvent[] = [];
            if (conditionalEvents.length > 0) {
                 const remainingPrioritySlots = Math.max(0, 2 - weekEvents.length);
                 weekEvents.push(...conditionalEvents.slice(0, remainingPrioritySlots));
                 deferredConditionalEvents = conditionalEvents.slice(remainingPrioritySlots);
            }

            // 3c. Regular Events (Phase Specific Randoms)
            // First: independently evaluate romance events (they have their own probability gating)
            const romancePool = phasePool.filter(e =>
                e.triggerType === 'RANDOM' &&
                e.id.startsWith('romance_') &&
                (!e.once || !state.triggeredEvents.includes(e.id)) &&
                (!e.condition || e.condition(state)) &&
                !state.recentEventIds.includes(e.id)
            );
            if (romancePool.length > 0) {
                // Romance events already have probability checks in their conditions, so just pick one
                weekEvents.push(romancePool[Math.floor(Math.random() * romancePool.length)]);
            }

            // Remember which events were selected before random/AI filler is
            // added, so deferred conditional events can retain their priority.
            const priorityEventIds = new Set(weekEvents.map(event => event.id));
            let aiEventsGenerated = false;
            if (weekEvents.length === 0 || (weekEvents.length <= 1 && weekEvents[0]?.id?.startsWith('romance_'))) {
                if (aiConfig?.enabled && weekEvents.length === 0) {
                    const requestId = ++aiRequestToken.current;
                    aiAbortController.current?.abort();
                    const controller = new AbortController();
                    aiAbortController.current = controller;
                    const requestPhase = state.phase;
                    const requestWeek = state.week;
                    const requestCompetition = state.competition;
                    setState(prev => ({
                        ...prev,
                        isAiGenerating: true,
                        log: [...prev.log, { message: 'AI 正在根据本周状态编写事件...', type: 'info', timestamp: Date.now() }]
                    }));
                    try {
                        const generatedEvents = await generateBatchGameEvents(state, aiConfig, controller.signal);
                        const latest = latestStateRef.current;
                        if (requestId !== aiRequestToken.current
                            || latest.phase !== requestPhase
                            || latest.week !== requestWeek
                            || latest.competition !== requestCompetition
                            || !latest.isPlaying
                            || !!latest.currentEvent
                            || latest.isWeekend) return;
                        weekEvents.push(...generatedEvents.map(mapAiEventToGameEvent));
                        aiEventsGenerated = generatedEvents.length > 0;
                    } catch (error) {
                        if (requestId === aiRequestToken.current && !controller.signal.aborted) {
                            const message = error instanceof Error ? error.message : '未知错误';
                            setState(prev => ({
                                ...prev,
                                log: [...prev.log, { message: `AI 事件生成失败，已使用离线事件：${message}`, type: 'warning', timestamp: Date.now() }]
                            }));
                        } else {
                            return;
                        }
                    } finally {
                        if (requestId === aiRequestToken.current) {
                            aiAbortController.current = null;
                            setState(prev => ({ ...prev, isAiGenerating: false }));
                        }
                    }
                }

                // AI events replace the random filler for this week. Fixed,
                // conditional and romance events keep their normal priority.
                if (!aiEventsGenerated) {
                  // Filter out recently triggered events to prevent repetition
                  const validRandoms = phasePool.filter(e =>
                    e.triggerType === 'RANDOM' &&
                    !e.id.startsWith('romance_') && // already handled above
                    (!e.once || !state.triggeredEvents.includes(e.id)) &&
                    (!e.condition || e.condition(state)) &&
                    !state.recentEventIds.includes(e.id) // Anti-repetition check
                );

                  if (state.phase === Phase.SUMMER) {
                     // 50% chance for specific Summer events (like hot day), 50% for generator
                     if (state.competition === 'OI' && hasOIRandomEventsForPhase(state.phase) && Math.random() < 0.35) {
                         weekEvents.push(generateOIEvent(state));
                     } else if (validRandoms.length > 0 && Math.random() < 0.5) {
                         weekEvents.push(validRandoms[Math.floor(Math.random() * validRandoms.length)]);
                     } else {
                         weekEvents.push(generateSummerLifeEvent(state));
                     }
                  } else if (state.phase === Phase.MILITARY) {
                     if (validRandoms.length > 0) weekEvents.push(validRandoms[Math.floor(Math.random() * validRandoms.length)]);
                  } else if (state.phase === Phase.SEMESTER_1 || state.phase === Phase.SEMESTER_2) {
                    const eventCount = Math.floor(Math.random() * 3) + 1; // 1 to 3 events

                    if (state.competition === 'OI') {
                        const oiCount = Math.floor(Math.random() * 3); // 0 to 2
                        const normalCount = Math.floor(Math.random() * 3); // 0 to 2
                        const total = Math.max(1, oiCount + normalCount); 
                        
                        for (let i=0; i<oiCount; i++) {
                            weekEvents.push(generateOIEvent(state));
                        }
                        for (let i=0; i<total - oiCount; i++) {
                            const roll = Math.random();
                            if (validRandoms.length > 0 && roll < 0.3) weekEvents.push(validRandoms[Math.floor(Math.random() * validRandoms.length)]);
                            else if (roll < 0.6) weekEvents.push(generateRandomFlavorEvent(state));
                            else weekEvents.push(generateStudyEvent(state));
                        }
                    } else {
                        for (let i=0; i<eventCount; i++) {
                            const roll = Math.random();
                            if (validRandoms.length > 0 && roll < 0.3) weekEvents.push(validRandoms[Math.floor(Math.random() * validRandoms.length)]);
                            else if (roll < 0.6) weekEvents.push(generateRandomFlavorEvent(state));
                            else weekEvents.push(generateStudyEvent(state));
                        }
                    }

                    if (state.flags?.joined_evening_study && Math.random() < 0.5) {
                         const eveningEvents = validRandoms.filter(e => e.id.includes('evening_'));
                         if (eveningEvents.length > 0) weekEvents.push(eveningEvents[Math.floor(Math.random() * eveningEvents.length)]);
                    }
                  } else {
                     if (state.competition === 'OI' && hasOIRandomEventsForPhase(state.phase) && Math.random() < 0.35) {
                         weekEvents.push(generateOIEvent(state));
                     } else {
                         weekEvents.push(Math.random() < 0.7 ? generateStudyEvent(state) : generateRandomFlavorEvent(state));
                     }
                  }
                }
            }

            // AI Branch Logic has been moved to offline pre-generation.

            // Generated and authored pools can contain the same event more
            // than once. Keep the first occurrence so a single week cannot
            // show duplicate cards or mark one ID multiple times.
            const seenEventIds = new Set<string>();
            weekEvents = weekEvents.filter(event => {
                if (seenEventIds.has(event.id)) return false;
                seenEventIds.add(event.id);
                return true;
            });
            const priorityEvents = weekEvents.filter(event => priorityEventIds.has(event.id));
            const fillerEvents = weekEvents.filter(event => !priorityEventIds.has(event.id));
            const orderedWeekEvents = [...priorityEvents, ...fillerEvents];

            const [first, ...rest] = orderedWeekEvents;
            
            if (first) {
                // Keep deferred conditional events ahead of random filler while
                // preserving the priority events already selected this week.
                const priorityCount = Math.min(rest.length, Math.max(0, priorityEvents.length - 1));
                const queuedRest = [
                    ...rest.slice(0, priorityCount),
                    ...deferredConditionalEvents,
                    ...rest.slice(priorityCount)
                ];
                applyWeeklyUpdates(first, queuedRest);
            } else if (state.phase === Phase.SUMMER || state.phase === Phase.MILITARY) {
                // Summer and military weeks do not have a weekend planning
                // step. This branch is reachable when every military random
                // event is temporarily held by the repetition buffer. It must
                // still run the same weekly settlement as an eventful week.
                setState(prev => {
                    const sleepChallengeFailed = prev.activeChallengeId === 'c_sleep_king' && !prev.hasSleptThisWeek;
                    if (sleepChallengeFailed) {
                        return {
                            ...prev,
                            phase: Phase.ENDING,
                            isPlaying: false,
                            currentEvent: null,
                            eventResult: null,
                            isWeekend: false,
                            log: [...prev.log, { message: '你这周没有睡觉，挑战失败。', type: 'error' as const, timestamp: Date.now() }]
                        };
                    }
                    const { updatedGeneral, updatedStatuses, updatedSubjects, updatedFatigue } = calculateWeeklyUpdates(prev);
                    const weeklyState = clampGameStateMetrics({
                        ...prev,
                        general: updatedGeneral,
                        activeStatuses: updatedStatuses,
                        subjects: updatedSubjects,
                        fatigue: updatedFatigue
                    });
                    if (isHealthFatal(weeklyState.difficulty, weeklyState.general.health)) {
                        return {
                            ...weeklyState,
                            phase: Phase.ENDING,
                            isPlaying: false,
                            currentEvent: null,
                            eventResult: null,
                            isWeekend: false,
                            log: [...weeklyState.log, { message: getHealthDeathMessage(weeklyState.difficulty), type: 'error' as const, timestamp: Date.now() }]
                        };
                    }
                    return {
                        ...weeklyState,
                        week: weeklyState.week + 1,
                        isPlaying: true,
                        hasSleptThisWeek: false,
                        currentEvent: null,
                        eventResult: null,
                        isWeekend: false
                    };
                });
            } else {
                startWeekend();
            }
        };

        const timer = setTimeout(processTurn, 1000); 
        return () => clearTimeout(timer);
    }, [state.isPlaying, state.currentEvent, state.isWeekend, state.week, state.phase, state.eventQueue.length, state.midtermRank, state.activeProjects, advancePhase, state.competition, state.triggeredEvents, state.isAiGenerating, state.recentEventIds, aiConfig]);

    const calculateWeeklyUpdates = (prevState: GameState) => {
        let moneyChange = 1; // Base weekly money (reduced from 2)
        if (prevState.activeChallengeId === 'c_debt_king') {
            moneyChange -= 25; // Debt King Challenge: -25 money per week
        }

        const currentMoney = prevState.general.money;
        let debtLevel = 0;
        if (currentMoney < -800) debtLevel = 5;
        else if(currentMoney < -350)debtLevel=4;
        else if (currentMoney < -180) debtLevel = 3;
        else if (currentMoney < -80) debtLevel = 2;
        else if (currentMoney < 0) debtLevel = 1;

        const dynamicStatusConditions: Record<string, (gameState: GameState) => boolean> = {
            fatigued: gameState => gameState.fatigue >= 75,
            overstimulated: gameState => (gameState.general.excitement ?? 0) >= 80,
            low_morale: gameState => gameState.general.mindset <= 25
        };
        const statusById = new Map<string, GameStatus>();
        prevState.activeStatuses.filter(status => {
            if (status.id.startsWith('debt_')) return false;
            const condition = dynamicStatusConditions[status.id];
            return !condition || condition(prevState);
        }).forEach(status => {
            const existing = statusById.get(status.id);
            if (!existing || status.duration > existing.duration) statusById.set(status.id, status);
        });
        const activeStatuses = Array.from(statusById.values());
        const newStatuses: GameStatus[] = [];
        let penaltyMindset = 0;
        let penaltyRomance = 0;

        // Apply status effects once per week, then advance their duration. Statuses
        // added by the current event therefore take effect on the following week.
        const statusEffects = new Map<string, (general: GeneralStats) => void>([
            ['focused', general => { general.efficiency += 2; }],
            ['anxious', general => { general.mindset -= 2; }],
            ['crush', general => { general.efficiency -= 2; general.romance += 2; }],
            ['in_love', general => { general.mindset += 5; }],
            ['heartbroken', general => { general.mindset -= 3; general.efficiency -= 1; }],
            ['crush_pending', general => { general.luck += 2; general.experience += 2; }],
            ['fatigued', general => { general.mindset -= 1; general.efficiency -= 1; }],
            ['overstimulated', general => { general.efficiency -= 1; }],
            ['low_morale', general => { general.efficiency -= 1; }]
        ]);

        if (debtLevel > 0) {
            if (debtLevel === 1) { penaltyMindset = 5; penaltyRomance = 3; }
            if (debtLevel === 2) { penaltyMindset = 10; penaltyRomance = 6; }
            if (debtLevel === 3) { penaltyMindset = 20; penaltyRomance = 12; }
            if (debtLevel === 4) { penaltyMindset = 40; penaltyRomance = 24; }
            if (debtLevel === 5) { penaltyMindset = 80; penaltyRomance = 48; }
        }

        // Weekly fatigue: school pressure is intentionally much harsher in the
        // upper difficulties, so rest and study choices have a real opportunity cost.
        const difficultyPreset = getDifficultyPreset(prevState.difficulty);
        const healthDrain = prevState.phase === Phase.SEMESTER_1 || prevState.phase === Phase.SEMESTER_2 ? 2 : 1;
        const basePhaseFatigue = prevState.phase === Phase.SEMESTER_1 || prevState.phase === Phase.SEMESTER_2 ? 8 : 4;
        const phaseFatigue = Math.max(1, Math.round(basePhaseFatigue * difficultyPreset.fatigueGainMultiplier));
        const fatiguePenalty = prevState.fatigue >= 90 ? 8 : prevState.fatigue >= 75 ? 3 : 0;

        const updatedGeneral: GeneralStats = {
            ...prevState.general,
            money: prevState.general.money + moneyChange, 
            romance: Math.max(0, prevState.general.romance - penaltyRomance),
            health: Math.max(0, prevState.general.health - healthDrain - fatiguePenalty),
            mindset: Math.max(0, prevState.general.mindset - penaltyMindset - (prevState.fatigue >= 75 ? 2 : 0)),
            excitement: Math.min(100, Math.max(0, (prevState.general.excitement ?? 0) - 5))
        };
        const healthBeforeRegression = updatedGeneral.health;
        const updatedFatigue = Math.min(100, Math.max(0, prevState.fatigue + phaseFatigue + (prevState.fatigue >= 75 ? Math.ceil(2 * difficultyPreset.fatigueGainMultiplier) : 0)));

        activeStatuses.forEach(status => {
            statusEffects.get(status.id)?.(updatedGeneral);
            if (status.duration === 999 || status.duration > 1) {
                newStatuses.push({ ...status, duration: status.duration === 999 ? 999 : status.duration - 1 });
            }
        });

        // These three states are derived from the existing meters. They are
        // deliberately mild: the player can recover from them without a new
        // subsystem, while still seeing the consequences of their rhythm.
        Object.entries(dynamicStatusConditions).forEach(([id, condition]) => {
            if (condition({ ...prevState, general: updatedGeneral, fatigue: updatedFatigue }) && !newStatuses.some(status => status.id === id)) {
                newStatuses.push({ ...STATUSES[id], duration: 999 });
            }
        });

        // Gradual regression toward baseline values each week
        const regress = (val: number, baseline: number, rate: number = 0.05) => {
            const diff = val - baseline;
            return Math.min(150, Math.max(0, val - diff * rate));
        };
        updatedGeneral.mindset = regress(updatedGeneral.mindset, 50);
        const regressedHealth = isHealthFatal(prevState.difficulty, healthBeforeRegression)
            ? Math.max(0, healthBeforeRegression)
            : regress(updatedGeneral.health, 60); // baseline lowered from 70 to 60
        updatedGeneral.health = activeStatuses.some(status => status.id === 'exhausted')
            ? Math.min(healthBeforeRegression, regressedHealth)
            : regressedHealth;
        updatedGeneral.romance = Math.min(150, Math.max(0, updatedGeneral.romance));
        updatedGeneral.luck = regress(updatedGeneral.luck, 50, 0.02);
        updatedGeneral.efficiency = Math.min(30, Math.max(0, regress(updatedGeneral.efficiency, 10, 0.03)));
        updatedGeneral.mindset = Math.min(150, Math.max(0, updatedGeneral.mindset));
        updatedGeneral.health = Math.min(150, Math.max(0, updatedGeneral.health));
        updatedGeneral.experience = Math.max(0, updatedGeneral.experience);
        updatedGeneral.excitement = Math.min(100, Math.max(0, regress(updatedGeneral.excitement ?? 0, 25, 0.12)));

        // Subject level decay: unattended subjects slowly lose level
        const updatedSubjects = { ...prevState.subjects };
        for (const key of Object.keys(updatedSubjects)) {
            const sub = updatedSubjects[key as keyof typeof updatedSubjects];
            if (sub && sub.level > 5) {
                updatedSubjects[key as keyof typeof updatedSubjects] = {
                    ...sub,
                    level: sub.level - 0.3 // Weekly decay of 0.3
                };
            }
        }

        if (debtLevel > 0) {
            newStatuses.push({ ...STATUSES[`debt_${debtLevel}`], duration: 1 });
        }

        return { updatedGeneral, updatedStatuses: newStatuses, updatedSubjects, updatedFatigue };
    };

    const applyWeeklyUpdates = (currentEvent: GameEvent, nextQueue: GameEvent[] = []) => {
        setState(prev => {
            const { updatedGeneral, updatedStatuses, updatedSubjects, updatedFatigue } = calculateWeeklyUpdates(prev);

            const dynamicStatusMessages: Record<string, string> = {
                fatigued: '你开始感到疲惫，接下来硬撑会更吃力。',
                overstimulated: '你的兴奋值过高，注意力变得有些飘忽。',
                low_morale: '你最近有些低落，先找回一点掌控感。'
            };
            const previousStatusIds = new Set(prev.activeStatuses.map(status => status.id));
            const statusLogs: GameLogEntry[] = updatedStatuses
                .filter(status => dynamicStatusMessages[status.id] && !previousStatusIds.has(status.id))
                .map(status => ({ message: dynamicStatusMessages[status.id], type: 'warning', timestamp: Date.now() }));
            
            // Update Anti-Repetition Buffer
            let newRecentIds = [...prev.recentEventIds];
            // Only track RANDOM events for repetition prevention, ignore generated/fixed
            newRecentIds = trackRecentRandomEvent(newRecentIds, currentEvent);

            // Death check: health <= 0 means game over (猝死)
            if (isHealthFatal(prev.difficulty, updatedGeneral.health)) {
                return {
                    ...prev,
                    general: updatedGeneral,
                    fatigue: updatedFatigue,
                    phase: Phase.ENDING,
                    currentEvent: null,
                    eventQueue: [],
                    isPlaying: false,
                    log: [...prev.log, ...statusLogs, { message: getHealthDeathMessage(prev.difficulty), type: 'error', timestamp: Date.now() }]
                };
            }

            return {
                ...prev,
                activeStatuses: updatedStatuses,
                general: updatedGeneral,
                fatigue: updatedFatigue,
                subjects: updatedSubjects,
                currentEvent: currentEvent,
                eventQueue: addQueueContext(nextQueue, prev),
                triggeredEvents: markEventTriggered(prev.triggeredEvents, currentEvent),
                recentEventIds: newRecentIds,
                isPlaying: false,
                log: [...prev.log, ...statusLogs]
            };
        });
    };

    const getAvailableWeekendActivityIds = (snapshot: GameState): string[] | undefined => {
        if (snapshot.difficulty !== 'REALITY') return undefined;
        // Conditions are evaluated for the planning context. In particular,
        // Codeforces is only valid while the weekend planner is open.
        const weekendSnapshot = { ...snapshot, isWeekend: true };
        const validIds = WEEKEND_ACTIVITIES
            .filter(activity => (!activity.condition || activity.condition(weekendSnapshot))
                && !getActivityBlockReason(weekendSnapshot, activity))
            .map(activity => activity.id);
        for (let i = validIds.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [validIds[i], validIds[j]] = [validIds[j], validIds[i]];
        }
        // Always leave a recovery option in the random pool so a bad draw
        // cannot make a reality-mode week unwinnable by construction.
        const guaranteed = validIds.includes('w_sleep') ? ['w_sleep'] : [];
        return Array.from(new Set([...guaranteed, ...validIds])).slice(0, 6);
    };

    const startWeekend = () => {
        const snapshot = latestStateRef.current;
        if (snapshot.phase === Phase.ENDING || snapshot.phase === Phase.WITHDRAWAL) return;
        const availableIds = getAvailableWeekendActivityIds(snapshot);
        setState(prev => {
            // Do not reopen a weekend if another action advanced the game
            // between computing the snapshot and committing this update.
            if (prev.phase !== snapshot.phase || prev.week !== snapshot.week) return prev;
            return {
                ...prev,
                currentEvent: null,
                eventResult: null,
                isWeekend: true,
                isPlaying: false,
                                availableWeekendActivityIds: availableIds
            };
        });
    };

    const saveGame = () => {
        const snapshot = latestStateRef.current;
        const unstable = !!snapshot.currentEvent
            || !!snapshot.chainedEvent
            || snapshot.eventQueue.length > 0
            || !!snapshot.isAiGenerating
            || getPostEventFlow(snapshot.phase) === 'BLOCKED_PHASE';
        if (unstable) {
            setState(prev => ({
                ...prev,
                log: [...prev.log, { message: '当前流程尚未结算，暂时不能保存。', type: 'warning', timestamp: Date.now() }]
            }));
            return;
        }
        const serializableState = {
            ...snapshot,
            isAiGenerating: false,
            currentEvent: eventRef(snapshot.currentEvent),
            chainedEvent: eventRef(snapshot.chainedEvent),
            eventQueue: snapshot.eventQueue.map(event => eventRef(event)),
            activeProjects: snapshot.activeProjects.map(({ onComplete, onFail, ...project }) => project),
            talents: snapshot.talents.map(({ effect, ...talent }) => talent),
            eventResult: snapshot.eventResult ? {
                choiceText: snapshot.eventResult.choice.text,
                diff: snapshot.eventResult.diff
            } : null
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SAVE_VERSION, state: serializableState }));
            setHasSave(true);
            setState(s => ({ ...s, log: [...s.log, { message: "游戏进度已保存。", type: 'success', timestamp: Date.now() }] }));
        } catch (error) {
            console.error('Failed to save game', error);
            setState(s => ({ ...s, log: [...s.log, { message: '存档失败：浏览器存储空间不可用或已满。', type: 'error', timestamp: Date.now() }] }));
        }
    };

    const loadGame = (): boolean => {
        cancelAiGeneration();
        let saved: string | null = null;
        let saveKeyUsed: string | null = null;
        try {
            saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                saveKeyUsed = STORAGE_KEY;
            } else if (accountId === 'guest') {
                saved = localStorage.getItem(LEGACY_STORAGE_KEY);
                if (saved) saveKeyUsed = LEGACY_STORAGE_KEY;
            }
        } catch (error) {
            console.error('Failed to read save', error);
            setHasSave(false);
            return false;
        }
        if (saved) {
            try {
                const payload = JSON.parse(saved);
                const loaded = payload && payload.state ? payload.state : payload;
                if (!loaded || typeof loaded !== 'object' || !loaded.general || !loaded.subjects || !loaded.phase) {
                    throw new Error('Invalid save structure');
                }
                const globalAchievements = getGlobalAchievements();
                // Merge persisted global achievements with saved state to ensure no loss
                const mergedAchievements = Array.from(new Set([...(Array.isArray(loaded.unlockedAchievements) ? loaded.unlockedAchievements : []), ...globalAchievements]));
                const restoredEvent = resolveEvent(loaded.currentEvent);
                const restoredChain = resolveEvent(loaded.chainedEvent);
                const restoredResult = loaded.eventResult && restoredEvent
                    ? (() => {
                        const choice = restoredEvent.choices?.find(candidate => candidate.text === loaded.eventResult.choiceText);
                        return choice ? { choice, diff: Array.isArray(loaded.eventResult.diff) ? loaded.eventResult.diff.filter((line: unknown) => typeof line === 'string') : [] } : null;
                    })()
                    : null;
                const restoredQueue = Array.isArray(loaded.eventQueue)
                    ? loaded.eventQueue.map((entry: unknown) => resolveEvent(entry)).filter((event): event is GameEvent => !!event)
                    : [];
                const initialState = getInitialGameState();
                const loadedSubjects = loaded.subjects && typeof loaded.subjects === 'object' && !Array.isArray(loaded.subjects) ? loaded.subjects : {};
                const restoredSubjects = (Object.keys(initialState.subjects) as SubjectKey[]).reduce((subjects, key) => {
                    const raw = loadedSubjects[key];
                    subjects[key] = raw && typeof raw === 'object'
                        ? { ...initialState.subjects[key], ...raw }
                        : initialState.subjects[key];
                    return subjects;
                }, {} as GameState['subjects']);
                const validPhases = new Set(Object.values(Phase));
                const validDifficulties = new Set<Difficulty>(['CUSTOM', 'NORMAL', 'HARD', 'REALITY', 'HELL']);
                const validCompetitions = new Set(['None', 'OI', 'MO', 'PhO', 'ChO']);
                const validSubjectKeys = new Set(Object.keys(initialState.subjects));
                const validClubIds = new Set(CLUBS.map(club => club.id));
                const restoredPhase = validPhases.has(loaded.phase) && loaded.phase !== Phase.INIT
                    ? loaded.phase as Phase
                    : null;
                if (!restoredPhase) throw new Error('Invalid save phase');
                const rawOiStats = loaded.oiStats && typeof loaded.oiStats === 'object' && !Array.isArray(loaded.oiStats)
                    ? loaded.oiStats
                    : {};
                const restoredContestHistory = Array.isArray(rawOiStats.history)
                    ? rawOiStats.history.filter((record: any) => record && typeof record.name === 'string'
                        && Number.isFinite(record.date) && Number.isFinite(record.perf)
                        && Number.isFinite(record.ratingChange) && Number.isFinite(record.newRating))
                        .slice(-100)
                    : [];
                const restoredActiveStatuses = normalizeActiveStatuses(loaded.activeStatuses);
                const validScheduleSlots = new Set<string>(SCHEDULE_SLOTS.map(slot => slot.id));
                const validActivityIds = new Set<string>(WEEKEND_ACTIVITIES.map(activity => activity.id));
                const rawSchedule = loaded.lastWeekSchedule && typeof loaded.lastWeekSchedule === 'object' && !Array.isArray(loaded.lastWeekSchedule)
                    ? loaded.lastWeekSchedule
                    : {};
                const restoredSchedule = Object.fromEntries(Object.entries(rawSchedule)
                    .filter(([slotId, activityId]) => validScheduleSlots.has(slotId) && typeof activityId === 'string' && validActivityIds.has(activityId)));
                const restoredState = clampGameStateMetrics({
                    ...initialState,
                    ...loaded,
                    phase: restoredPhase,
                    worldContext: restoreWorldContext(loaded.worldContext, WORLD_REGIONS, CHARACTER_TEMPLATES),
                    className: typeof loaded.className === 'string' ? loaded.className.slice(0, 80) : '',
                    examResult: restoreExamResult(loaded.examResult),
                    popupExamResult: (() => {
                        const result = restoreExamResult(loaded.popupExamResult);
                        return result ? { ...result, nextPhase: validPhases.has(loaded.popupExamResult.nextPhase) ? loaded.popupExamResult.nextPhase : undefined } : null;
                    })(),
                    achievementPopup: null,
                    sleepCount: Number.isFinite(loaded.sleepCount) ? Math.max(0, Math.floor(loaded.sleepCount)) : 0,
                    rejectionCount: Number.isFinite(loaded.rejectionCount) ? Math.max(0, Math.floor(loaded.rejectionCount)) : 0,
                    midtermRank: Number.isFinite(loaded.midtermRank) || ['SEMESTER_1_DONE', 'SEMESTER_2_DONE'].includes(loaded.midtermRank) ? loaded.midtermRank : null,
                    theme: loaded.theme === 'dark' ? 'dark' : 'light',
                    difficulty: validDifficulties.has(loaded.difficulty) ? loaded.difficulty : 'NORMAL',
                    competition: validCompetitions.has(loaded.competition) ? loaded.competition : 'None',
                    activeChallengeId: loaded.activeChallengeId === 'c_debt_king' || loaded.activeChallengeId === 'c_sleep_king'
                        ? loaded.activeChallengeId
                        : null,
                    isPlaying: loaded.isPlaying === true,
                    isWeekend: loaded.isWeekend === true,
                    isSick: loaded.isSick === true,
                    isGrounded: loaded.isGrounded === true,
                    hasSelectedClub: loaded.hasSelectedClub === true,
                    debugMode: loaded.debugMode === true,
                    hasSleptThisWeek: loaded.hasSleptThisWeek === true,
                    dreamtExam: loaded.dreamtExam === true,
                    club: typeof loaded.club === 'string' && validClubIds.has(loaded.club) && loaded.club !== 'none'
                        ? loaded.club as ClubId
                        : null,
                    romancePartner: typeof loaded.romancePartner === 'string' && loaded.romancePartner.trim()
                        ? loaded.romancePartner.trim().slice(0, 24)
                        : null,
                    week: Number.isFinite(loaded.week) ? Math.max(1, Math.floor(loaded.week)) : 1,
                    totalWeeksInPhase: Number.isFinite(loaded.totalWeeksInPhase) ? Math.max(0, Math.floor(loaded.totalWeeksInPhase)) : 0,
                    general: { ...initialState.general, ...(loaded.general && typeof loaded.general === 'object' ? loaded.general : {}) },
                    initialGeneral: { ...initialState.initialGeneral, ...(loaded.initialGeneral && typeof loaded.initialGeneral === 'object' ? loaded.initialGeneral : loaded.general && typeof loaded.general === 'object' ? loaded.general : {}) },
                    subjects: restoredSubjects,
                    oiStats: { ...initialState.oiStats, ...rawOiStats, history: restoredContestHistory },
                    fatigue: typeof loaded.fatigue === 'number' ? Math.min(100, Math.max(0, loaded.fatigue)) : 20,
                    flags: restoreFlags(loaded.flags),
                    selectedSubjects: Array.isArray(loaded.selectedSubjects)
                        ? Array.from(new Set(loaded.selectedSubjects.filter((key: unknown): key is SubjectKey => typeof key === 'string' && validSubjectKeys.has(key) && !['chinese', 'math', 'english'].includes(key)))).slice(0, 3)
                        : [],
                    subjectReselectionReturnPhase: loaded.subjectReselectionReturnPhase === Phase.SEMESTER_1 || loaded.subjectReselectionReturnPhase === Phase.SEMESTER_2
                        ? loaded.subjectReselectionReturnPhase
                        : null,
                    relationshipProfileId: typeof loaded.relationshipProfileId === 'string' ? loaded.relationshipProfileId : null,
                    currentEvent: restoredEvent,
                    chainedEvent: restoredChain,
                    eventQueue: restoredQueue,
                    eventResult: restoredResult,
                    activeProjects: Array.isArray(loaded.activeProjects)
                        ? loaded.activeProjects
                            .filter((project: any) => project && typeof project.id === 'string' && typeof project.title === 'string'
                                && validPhases.has(project.deadlinePhase) && Number.isFinite(project.deadlineWeek)
                                && Number.isFinite(project.progress) && Number.isFinite(project.requiredProgress))
                            .map((project: Project) => hydrateProject(project))
                        : [],
                    completedProjects: Array.isArray(loaded.completedProjects)
                        ? Array.from(new Set(loaded.completedProjects.filter((id: unknown): id is string => typeof id === 'string').map(id => id.slice(0, 80))))
                        : [],
                    activeStatuses: restoredActiveStatuses,
                    log: restoreLogEntries(loaded.log),
                    history: restoreStoryEntries(loaded.history),
                    triggeredEvents: Array.isArray(loaded.triggeredEvents)
                        ? loaded.triggeredEvents.filter((id: unknown): id is string => typeof id === 'string')
                        : [],
                    recentEventIds: Array.isArray(loaded.recentEventIds)
                        ? loaded.recentEventIds.filter((id: unknown): id is string => typeof id === 'string')
                        : [],
                    unlockedAchievements: mergedAchievements,
                    talents: Array.isArray(loaded.talents)
                        ? TALENTS.filter(talent => loaded.talents.some((raw: any) => raw?.id === talent.id))
                        : [],
                    inventory: Array.isArray(loaded.inventory) ? loaded.inventory.filter((item: unknown): item is string => typeof item === 'string') : [],
                    lastWeekSchedule: restoredSchedule,
                    availableWeekendActivityIds: Array.isArray(loaded.availableWeekendActivityIds)
                        ? loaded.availableWeekendActivityIds.filter((id: unknown): id is string => typeof id === 'string' && validActivityIds.has(id))
                        : undefined,
                    isAiGenerating: false
                } as GameState);
                if (loaded.currentEvent && !restoredEvent) {
                    restoredState.isPlaying = true;
                    restoredState.log = [...restoredState.log, { message: '存档中的临时事件已失效，已继续下一周。', type: 'warning', timestamp: Date.now() }];
                }
                if (!restoredState.currentEvent && !restoredState.isWeekend && restoredState.eventQueue.length > 0) {
                    if (getPostEventFlow(restoredState.phase) === 'BLOCKED_PHASE') {
                        restoredState.eventQueue = [];
                    } else {
                        restoredState.isPlaying = true;
                    }
                }
                if (restoredState.worldContext) {
                    void loadCityEvents(restoredState.worldContext.code, restoredState.worldContext.region);
                }
                setState(restoredState);
                return true;
            } catch (e) {
                console.error("Failed to load save", e);
                // Preserve the original bytes before removing an unusable save so the home
                // screen does not advertise a dead "continue" button after
                // a refresh. Keep this scoped to the exact key we read.
                if (saveKeyUsed) {
                    try {
                        localStorage.setItem(saveKeyUsed + '_corrupt_backup', saved);
                        localStorage.removeItem(saveKeyUsed);
                    } catch (removeError) {
                        console.error('Failed to remove malformed save', removeError);
                    }
                }
                setHasSave(false);
                return false;
            }
        }
        return false;
    };

    const startGameState = (difficulty: Difficulty, customStats: GeneralStats, selectedTalents: Talent[], activeChallenge?: Challenge | null) => {
        cancelAiGeneration();
        try {
            localStorage.removeItem(STORAGE_KEY);
            if (accountId === 'guest') localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch (error) {
            console.error('Failed to remove previous save', error);
        }
        setHasSave(false);
        let initialGeneral = { ...DIFFICULTY_PRESETS['NORMAL'].stats };
        const effectiveDifficulty = activeChallenge ? 'REALITY' : (difficulty === 'CUSTOM' ? 'NORMAL' : difficulty);
        
        if (difficulty === 'CUSTOM' && !activeChallenge) {
            initialGeneral = { ...customStats };
        } else {
             initialGeneral = { ...DIFFICULTY_PRESETS[effectiveDifficulty].stats };
        }
        
        let initialStatuses: GameStatus[] = [];
        if (effectiveDifficulty === 'REALITY') {
            initialStatuses.push({ ...STATUSES['anxious'], duration: 4 });
        }
        
        if (activeChallenge) {
             if (activeChallenge.conditions.initialStats) {
                 initialGeneral = { ...initialGeneral, ...activeChallenge.conditions.initialStats };
             }
             if (activeChallenge.id === 'c_sleep_king') {
                 initialStatuses.push({ ...STATUSES['sleep_compulsion'], duration: 999 });
             }
        }

        const rolledSubjects = getInitialSubjects();
        (Object.keys(rolledSubjects) as SubjectKey[]).forEach(k => {
            rolledSubjects[k] = { aptitude: Math.floor(Math.random() * 40 + 60), level: Math.floor(Math.random() * 10 + 5) };
            const difficultyPreset = getDifficultyPreset(effectiveDifficulty);
            rolledSubjects[k].aptitude = Math.max(20, rolledSubjects[k].aptitude + difficultyPreset.subjectAptitudeDelta);
            rolledSubjects[k].level = Math.max(1, rolledSubjects[k].level + difficultyPreset.subjectLevelDelta);
        });

        // Ensure achievements are carried over to new game
        const globalAchievements = getGlobalAchievements();

        // Generate V2 World Context
        const worldContext = getRandomWorldContext();
        const relationshipProfile = getRandomRelationshipProfile();
        void loadCityEvents(worldContext.code, worldContext.region);
        const charTemplate = CHARACTER_TEMPLATES.find(t => t.id === worldContext.characterTemplateId);
        
        if (charTemplate && charTemplate.baseStatsModifier) {
            Object.keys(charTemplate.baseStatsModifier).forEach(key => {
                const k = key as keyof GeneralStats;
                initialGeneral[k] = (initialGeneral[k] || 0) + (charTemplate.baseStatsModifier[k] || 0);
            });
        }

        let tempState: GameState = {
            ...getInitialGameState(),
            worldContext,
            subjects: rolledSubjects,
            general: initialGeneral,
            initialGeneral: { ...initialGeneral },
            activeStatuses: initialStatuses,
            relationshipProfileId: relationshipProfile.id,
            flags: {
                relationship_name: relationshipProfile.name,
                relationship_role: relationshipProfile.role,
                relationship_personality: relationshipProfile.personality,
                relationship_route_hint: relationshipProfile.routeHint,
                ta_favorability: 0
            },
            talents: selectedTalents,
            oiStats: getInitialOIStats(),
            // Preserve CUSTOM in saved state and UI; its mechanics still use
            // the normal preset fallback through getDifficultyPreset.
            difficulty: activeChallenge ? 'REALITY' : difficulty,
            activeChallengeId: activeChallenge ? activeChallenge.id : null,
            hasSleptThisWeek: false,
            unlockedAchievements: globalAchievements // Keep existing achievements
        };
        
        selectedTalents.forEach(t => {
            if (t.effect) {
                const updates = t.effect(tempState);
                if(updates.general) tempState.general = { ...tempState.general, ...updates.general };
                if(updates.subjects) tempState.subjects = { ...tempState.subjects, ...updates.subjects }; 
                if(updates.oiStats) tempState.oiStats = { ...tempState.oiStats, ...updates.oiStats };
            }
        });
        tempState = clampGameStateMetrics(tempState);
        tempState.initialGeneral = { ...tempState.general };

        const firstEvent = PHASE_EVENTS[Phase.SUMMER].find(e => e.id === 'sum_goal_selection');
        setState({
            ...tempState,
            unlockedAchievements: tempState.unlockedAchievements, 
            phase: Phase.SUMMER,
            week: 1,
            totalWeeksInPhase: 8,
            currentEvent: firstEvent || null,
            triggeredEvents: firstEvent ? [firstEvent.id] : [],
            log: [{ message: "八中模拟器启动。", type: 'success', timestamp: Date.now() }],
            isPlaying: false
        });
        
        // Only grant First Blood if eligible
        if (!activeChallenge && !tempState.unlockedAchievements.includes('first_blood') && difficulty === 'REALITY') {
            setTimeout(() => {
                setState(prev => ({
                    ...prev,
                    unlockedAchievements: [...prev.unlockedAchievements, 'first_blood'],
                    achievementPopup: ACHIEVEMENTS['first_blood']
                }));
                // Persist new achievement immediately
                const currentGlobals = getGlobalAchievements();
                try {
                    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify([...currentGlobals, 'first_blood']));
                } catch (error) {
                    console.error('Failed to persist achievement', error);
                }

                setTimeout(() => setState(prev => ({ ...prev, achievementPopup: null })), 3000);
            }, 100);
        }
    };

    const handleChoice = (choice: EventChoice, visualizer?: (oldS: GameState, newS: GameState) => string[]) => {
        const prev = latestStateRef.current;
        if (prev.eventResult || eventActionStateRef.current === prev) return;
        eventActionStateRef.current = prev;
        const oldState = prev;
        const choiceTags = choice.tags || [];
        const isSleepChoice = choiceTags.includes('sleep') || /睡|梦|补觉/.test(choice.text);
        const isRestChoice = isSleepChoice || choiceTags.includes('rest') || /休息|放松|躺平/.test(choice.text);
        const isHardWorkChoice = isStudyChoice(choice);
        let updates: Partial<GameState>;
        if (isHardWorkChoice && isStudyBlocked(prev)) {
            updates = {
                log: [...prev.log, { message: '【极限难度】当前心态或疲劳状态不允许学习。', type: 'warning', timestamp: Date.now() }]
            };
        } else {
            updates = choice.action(prev);
            if (Array.isArray(updates.eventQueue)) {
                // Choices add follow-up events; they must not discard events
                // already queued for this week (for example an exam result).
                updates = { ...updates, eventQueue: [...prev.eventQueue, ...addQueueContext(updates.eventQueue, prev)] };
            }
            if (choice.nextEventId && CHAINED_EVENTS[choice.nextEventId]) {
                updates = { ...updates, chainedEvent: CHAINED_EVENTS[choice.nextEventId] };
            }
        }
        const actionFatigue = typeof updates.fatigue === 'number' ? updates.fatigue : prev.fatigue;
        if (isRestChoice) {
            if (updates.general) {
                updates = { ...updates, general: scalePositiveGeneralDeltas(prev, updates.general, getRestRecoveryMultiplier(prev)) };
            }
            const recoveryMultiplier = getRestRecoveryMultiplier(prev);
            const explicitFatigueDelta = actionFatigue - prev.fatigue;
            const fatigueTarget = typeof updates.fatigue === 'number'
                ? prev.fatigue + (explicitFatigueDelta < 0 ? explicitFatigueDelta * recoveryMultiplier : explicitFatigueDelta)
                : prev.fatigue - 20 * recoveryMultiplier;
            updates = { ...updates, fatigue: fatigueTarget };
            if (isSleepChoice && prev.activeChallengeId === 'c_sleep_king') updates.hasSleptThisWeek = true;
        } else if (isHardWorkChoice && !isStudyBlocked(prev)) {
            const difficulty = getDifficultyPreset(prev.difficulty);
            const excitementFactor = 1 - Math.min(100, Math.max(0, prev.general.excitement ?? 0)) / 300;
            updates = {
                ...updates,
                general: scalePositiveGeneralDeltas(prev, updates.general, getLearningMultiplier(prev)),
                subjects: scalePositiveSubjectDeltas(prev, updates.subjects, getLearningMultiplier(prev)),
                oiStats: scalePositiveOIStatDeltas(prev, updates.oiStats, getLearningMultiplier(prev)),
                fatigue: actionFatigue + Math.max(4, Math.round(8 * difficulty.fatigueGainMultiplier * excitementFactor))
            };
        } else if ((choiceTags.includes('sport') || /跑步|运动|体育|1000米|打球/.test(choice.text)) && updates.general) {
            updates = { ...updates, general: scalePositiveGeneralDeltas(prev, updates.general, getLearningMultiplier(prev)) };
        }
        // Scaling an untouched stat group returns undefined; preserve its current value.
        let newState = clampGameStateMetrics({
            ...prev, ...updates,
            general: updates.general ?? prev.general,
            subjects: updates.subjects ?? prev.subjects,
            oiStats: updates.oiStats ?? prev.oiStats
        });
        if (isHealthFatal(prev.difficulty, newState.general.health)) {
            newState = {
                ...newState,
                phase: Phase.ENDING,
                currentEvent: null,
                eventQueue: [],
                isPlaying: false,
                log: [...newState.log, { message: getHealthDeathMessage(prev.difficulty), type: 'error', timestamp: Date.now() }]
            };
        }
        const diff = visualizer ? visualizer(oldState, newState) : [];
        const entry: StoryEntry = {
            week: prev.week,
            phase: prev.phase,
            eventTitle: prev.currentEvent?.title || '未知事件',
            choiceText: choice.text,
            resultSummary: choice.resultDescription || '无',
            timestamp: Date.now()
        };
        setState({ ...newState, history: [...prev.history, entry], eventResult: { choice, diff } });
    };

    const handleEventConfirm = () => {
        const snapshot = latestStateRef.current;
        if (eventActionStateRef.current === snapshot) return;
        eventActionStateRef.current = snapshot;
        // Resolve every branch from the same functional snapshot. Choices can
        // change phase (notably OI arrival events), so the render-time `state`
        // closure is not safe here.
        setState(prev => {
            const flow = getPostEventFlow(prev.phase);
            let remainingQueue = prev.eventQueue;

            if (flow === 'BLOCKED_PHASE') {
                return {
                    ...prev,
                    currentEvent: null,
                    chainedEvent: null,
                    eventResult: null,
                    isWeekend: false,
                    isPlaying: false,
                    eventQueue: []
                };
            }

            if (prev.chainedEvent) {
                return { ...prev, currentEvent: prev.chainedEvent, chainedEvent: null, eventResult: null };
            }

            if (prev.eventQueue.length > 0) {
                const eligibleQueue = prev.eventQueue.filter(event => isQueuedEventStillEligible(event, prev));
                if (eligibleQueue.length > 0) {
                    const [next, ...rest] = eligibleQueue;
                    return {
                        ...prev,
                        currentEvent: next,
                        eventQueue: rest,
                        eventResult: null,
                        triggeredEvents: markEventTriggered(prev.triggeredEvents, next),
                        recentEventIds: trackRecentRandomEvent(prev.recentEventIds, next)
                    };
                }
                remainingQueue = [];
            }

            if (flow === 'ADVANCE_WITHOUT_WEEKEND') {
                const sleepChallengeFailed = prev.activeChallengeId === 'c_sleep_king' && !prev.hasSleptThisWeek;
                return {
                    ...prev,
                    ...(sleepChallengeFailed
                        ? {
                            phase: Phase.ENDING,
                            isPlaying: false,
                            log: [...prev.log, { message: '你这周没有睡觉，挑战失败。', type: 'error' as const, timestamp: Date.now() }]
                        }
                        : {
                            week: prev.week + 1,
                            isPlaying: true,
                            hasSleptThisWeek: false
                        }),
                    currentEvent: null,
                    eventResult: null,
                    isWeekend: false,
                    eventQueue: remainingQueue
                };
            }

            return {
                ...prev,
                currentEvent: null,
                eventResult: null,
                isWeekend: true,
                isPlaying: false,
                eventQueue: remainingQueue,
                availableWeekendActivityIds: getAvailableWeekendActivityIds(prev)
            };
        });
    };
    
    const handleClubSelect = (id: ClubId | 'none') => {
        setState(prev => ({ 
            ...prev, 
            club: id === 'none' ? null : id,
            hasSelectedClub: true,
            // The club dialog pauses the loop while it is open. Resume only
            // when no event is waiting underneath it.
            isPlaying: prev.phase === Phase.SEMESTER_1
                && prev.week === 2
                && !prev.currentEvent
                && prev.eventQueue.length === 0
                ? true
                : prev.isPlaying
        }));
    };
    
    const handleShopPurchase = (item: Item, effectVisualizer?: (oldState: GameState, newState: GameState) => void) => {
        const prev = latestStateRef.current;
        if (shopActionStateRef.current === prev) return;
        if (prev.currentEvent || prev.isAiGenerating || getPostEventFlow(prev.phase) === 'BLOCKED_PHASE') return;
        const price = item.price * getShopPriceMultiplier(prev);
        shopActionStateRef.current = prev;
        if (prev.general.money < price) {
            setState(current => current === prev ? {
                ...current,
                log: [...current.log, { message: `买不起${item.name}，还差 ${Math.ceil(price - current.general.money)} G。`, type: 'warning', timestamp: Date.now() }]
            } : current);
            return;
        }
        const baseUpdates = item.effect(prev);
        const updates = baseUpdates.general
            ? { ...baseUpdates, general: { ...baseUpdates.general, money: prev.general.money - price } }
            : { ...baseUpdates, general: { ...prev.general, money: prev.general.money - price } };
        let newState = clampGameStateMetrics({ ...prev, ...updates });
        if (isHealthFatal(prev.difficulty, newState.general.health)) {
            newState = { ...newState, phase: Phase.ENDING, isPlaying: false, currentEvent: null, isWeekend: false, log: [...newState.log, { message: getHealthDeathMessage(prev.difficulty), type: 'error', timestamp: Date.now() }] };
        }
        effectVisualizer?.(prev, newState);
        setState(current => current === prev ? newState : current);
    };

    const executeTimetable = (schedule: Record<string, string>) => {
        const snapshot = latestStateRef.current;
        if (timetableActionStateRef.current === snapshot || !snapshot.isWeekend) return;
        timetableActionStateRef.current = snapshot;
        let currentState = { ...snapshot };
        const results: string[] = [];
        let hasSlept = Boolean(currentState.hasSleptThisWeek);
        let weekendStudyCount = 0;
        const activityRepeatCounts = new Map<string, number>();
        const difficultyPreset = getDifficultyPreset(snapshot.difficulty);

        // Pre-build activity lookup map for O(1) access
        const activityMap = new Map(WEEKEND_ACTIVITIES.map(a => [a.id, a]));
        const batchLogs: typeof state.log = [];
        const blockedSlots = new Set<string>();
        if (snapshot.flags.joined_evening_study) {
            SCHEDULE_SLOTS.filter(slot => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(slot.day)).forEach(slot => blockedSlots.add(slot.id));
        }

        // Apply activities sequentially
        const orderedSchedule = getOrderedScheduleEntries(schedule);
        for (const [slotId, actId] of orderedSchedule) {
            if (blockedSlots.has(slotId)) continue;
            const activity = activityMap.get(actId);
            if (!activity) continue;
            const allowedSlots = ALLOWED_SLOTS_MAP[activity.id];
            if (allowedSlots && !allowedSlots.includes(slotId as any)) {
                batchLogs.push({ message: `【计划跳过】${activity.name}：只能安排在指定时间段。`, type: 'warning', timestamp: Date.now() });
                continue;
            }
            const activityBlockReason = getActivityBlockReason(currentState, activity);
            if ((activity.condition && !activity.condition(currentState)) || activityBlockReason) {
                batchLogs.push({ message: `【计划跳过】${activity.name}：${activityBlockReason || '当前条件已不满足'}。`, type: 'warning', timestamp: Date.now() });
                continue;
            }

            const learningActivity = isLearningActivity(activity);
            if (learningActivity && isStudyBlocked(currentState)) {
                batchLogs.push({ message: '【极限难度】当前心态或疲劳状态不允许学习型周末活动。', type: 'warning', timestamp: Date.now() });
                continue;
            }
            if (learningActivity && difficultyPreset.weekendStudyLimit !== undefined && weekendStudyCount >= difficultyPreset.weekendStudyLimit) {
                batchLogs.push({ message: `【地狱难度】本周最多安排 ${difficultyPreset.weekendStudyLimit} 次学习型周末活动。`, type: 'warning', timestamp: Date.now() });
                continue;
            }

            // A blocking activity reserves its follow-up slots only after all
            // conditions and limits above have accepted the activity.
            (BLOCKED_SLOTS_MAP[activity.id] || []).forEach(blockedSlot => blockedSlots.add(blockedSlot));

            const oldS = { ...currentState };
            const repeatCount = (activityRepeatCounts.get(activity.id) || 0) + 1;
            activityRepeatCounts.set(activity.id, repeatCount);
            if (learningActivity) weekendStudyCount += 1;
            let updates = getWeekendActivityUpdates(oldS, activity, repeatCount);
            const resultText = typeof activity.resultText === 'function' ? activity.resultText(oldS) : activity.resultText;

            if (currentState.activeChallengeId === 'c_sleep_king' && (activity.id === 'w_sleep' || activity.name.includes('睡'))) {
                updates = { ...updates, hasSleptThisWeek: true };
                hasSlept = true;
            }

            // Extract logs from updates before merging
            if (updates.log) {
                const previousLogEntries = new Set(oldS.log || []);
                batchLogs.push(...updates.log.filter(entry => !previousLogEntries.has(entry)));
                delete updates.log;
            }
            currentState = clampGameStateMetrics({ ...currentState, ...updates });
            const trackedOiActivities = new Set(['w_luogu', 'w_cf', 'w_atc', 'w_oi_wiki', 'act_cf']);
            if (currentState.competition === 'OI' && trackedOiActivities.has(activity.id)) {
                const practiceSessions = Number(currentState.flags.oi_practice_sessions || 0) + 1;
                currentState.flags = {
                    ...currentState.flags,
                    oi_practice_sessions: practiceSessions,
                    ...(activity.id === 'act_cf' ? { oi_cf_sessions: Number(currentState.flags.oi_cf_sessions || 0) + 1 } : {})
                };
            }
            if (isHealthFatal(currentState.difficulty, currentState.general.health)) {
                currentState.phase = Phase.ENDING;
                currentState.isPlaying = false;
                currentState.isWeekend = false;
                currentState.log = [...(currentState.log || []), { message: getHealthDeathMessage(currentState.difficulty), type: 'error', timestamp: Date.now() }];
                break;
            }
            if (resultText) {
                const repeatNote = repeatCount > 1 ? '（重复安排，收益递减）' : '';
                results.push(`[${SCHEDULE_SLOTS.find(slot => slot.id === slotId)?.label || slotId}] ${resultText}${repeatNote}`);
            }
        }
        // Apply batch logs once
        currentState.log = [...(currentState.log || []), ...batchLogs];

        // Keep a compact, readable record of the plan instead of dropping the
        // collected result text on the floor. Individual activity logs remain
        // available for events that need their own detailed message.
        const summaryItems = results.slice(0, 4);
        if (results.length > 4) summaryItems.push(`还有 ${results.length - 4} 项活动未展开`);
        currentState.log = [...(currentState.log || []), {
            message: summaryItems.length > 0 ? `【本周计划】${summaryItems.join('；')}` : '【本周计划】本周没有安排可执行的活动。',
            type: 'info',
            timestamp: Date.now()
        }];

        // Challenge Check
        if (currentState.activeChallengeId === 'c_sleep_king' && currentState.phase !== Phase.ENDING && !hasSlept) {
            currentState.phase = Phase.ENDING;
            currentState.isPlaying = false;
            currentState.log = [...(currentState.log || []), { message: "你这周没有睡觉，困死了！！！(挑战失败)", type: 'error', timestamp: Date.now() }];
            results.push("挑战失败：你这周没有睡觉！");
        } else if (currentState.phase !== Phase.ENDING && currentState.phase !== Phase.WITHDRAWAL) {
            currentState.week += 1;
            currentState.isPlaying = true;
            currentState.hasSleptThisWeek = false;
        }

        currentState.lastWeekSchedule = currentState.flags.joined_evening_study
            ? clearWeekdaySchedule(schedule)
            : schedule;
        currentState.isGrounded = false;
        currentState.isWeekend = false; // Turn off planning UI
        currentState.availableWeekendActivityIds = undefined;
        
        setState(currentState);
        
        // Return results to display maybe? We can set it to a new state `timetableResult` if we want a summary popup
    };

    const calculateRank = (score: number, phase: Phase, maxScore = 750) => {
        const ALL_OI_PHASES = [Phase.CSP_EXAM, Phase.NOIP_EXAM, Phase.WC_EXAM, Phase.PROVINCIAL_EXAM, Phase.APIO_EXAM, Phase.NOI_EXAM];
        // OI exams don't have school rankings
        if (ALL_OI_PHASES.includes(phase)) return -1;

        const percentage = score / maxScore;
        const totalStudents = 633;
        
        const mean = getDifficultyPreset(state.difficulty).peerAverage;
        const std = 0.15;
        const z = (percentage - mean) / std;
        
        let percentile = 0.5 * (1 + Math.sign(z) * Math.sqrt(1 - Math.exp(-2 * z * z / Math.PI)));
        
        if (percentage < 0.1) percentile = 0; 
        
        if (score >= maxScore * 0.99) percentile = 1;
        else if (percentage > 0.999) percentile = 0.999;
        
        const rank = Math.max(1, Math.floor(totalStudents * (1 - percentile)));
        return rank;
    };

    const handleExamFinish = (result: ExamResult) => {
        const ALL_OI_PHASES = [Phase.CSP_EXAM, Phase.NOIP_EXAM, Phase.WC_EXAM, Phase.PROVINCIAL_EXAM, Phase.APIO_EXAM, Phase.NOI_EXAM];
        const isOI = ALL_OI_PHASES.includes(state.phase);
        const academicMaxScore = getAcademicMaxScore(Object.keys(result.scores));
        const rank = calculateRank(result.totalScore, state.phase, academicMaxScore || 750);
        const resultWithRank: ExamResult = { ...result, rank: isOI ? undefined : rank, type: isOI ? 'COMPETITION' : 'ACADEMIC' };

        const oiContestNames: Partial<Record<Phase, string>> = {
            [Phase.CSP_EXAM]: 'CSP-S',
            [Phase.NOIP_EXAM]: 'NOIP-S',
            [Phase.WC_EXAM]: 'NOIWC',
            [Phase.PROVINCIAL_EXAM]: '联合省选',
            [Phase.APIO_EXAM]: 'APIO',
            [Phase.NOI_EXAM]: 'NOI'
        };
        const oiHistoryRecord = isOI
            ? {
                name: oiContestNames[state.phase] || state.phase,
                date: state.week,
                perf: result.totalScore,
                ratingChange: 0,
                newRating: state.oiStats.rating ?? 1200
            }
            : null;
        
        let newClassName = state.className;
        if (state.phase === Phase.PLACEMENT_EXAM) {
             if (rank <= 160) newClassName = "一类实验班"; // Updated threshold from 40
             else if (rank <= 380) newClassName = "二类实验班"; // Updated threshold from 80
             else newClassName = "普通班";
        }

        let newFlags = { ...state.flags };
        if (state.phase === Phase.CSP_EXAM) newFlags.csp_score = result.totalScore;
        else if (state.phase === Phase.NOIP_EXAM) newFlags.noip_score = result.totalScore;
        else if (state.phase === Phase.WC_EXAM) newFlags.wc_score = result.totalScore;
        else if (state.phase === Phase.PROVINCIAL_EXAM) newFlags.provincial_score = result.totalScore;
        else if (state.phase === Phase.APIO_EXAM) newFlags.apio_score = result.totalScore;
        else if (state.phase === Phase.NOI_EXAM) newFlags.noi_score = result.totalScore;

        setState(prev => ({ 
            ...prev,
            examResult: resultWithRank, 
            popupExamResult: resultWithRank,
            midtermRank: state.phase === Phase.MIDTERM_EXAM ? 'SEMESTER_1_DONE' : (state.phase === Phase.MIDTERM_EXAM_2 ? 'SEMESTER_2_DONE' : prev.midtermRank),
            className: newClassName,
            flags: { ...prev.flags, ...newFlags },
            oiStats: oiHistoryRecord
                ? {
                    ...prev.oiStats,
                    history: (() => {
                        const history = prev.oiStats.history || [];
                        const alreadyRecorded = history.some(record =>
                            record.name === oiHistoryRecord.name && record.date === oiHistoryRecord.date
                        );
                        return alreadyRecorded ? history : [...history, { ...oiHistoryRecord, newRating: prev.oiStats.rating ?? 1200 }].slice(-100);
                    })()
                }
                : prev.oiStats
        }));
    };
    
    const closeExamResult = () => {
        setState(prev => {
            const nextState = { ...prev, popupExamResult: null };
            
            if (prev.phase === Phase.MIDTERM_EXAM) {
                 // The selection overlay owns this phase. Resume only after the
                 // player confirms subjects, otherwise the main loop can spawn
                 // an unrelated event underneath it.
                 return {
                     ...nextState,
                     phase: Phase.SUBJECT_RESELECTION,
                     subjectReselectionReturnPhase: Phase.SEMESTER_1,
                     week: 11,
                     isPlaying: false
                 };
            }
            if (prev.phase === Phase.PLACEMENT_EXAM) {
                 return { ...nextState, phase: Phase.SEMESTER_1, week: 1, totalWeeksInPhase: 21, isPlaying: true };
            }
            if (prev.phase === Phase.FINAL_EXAM) {
                 return { ...nextState, phase: Phase.WINTER_BREAK, week: 1, totalWeeksInPhase: 5, isPlaying: true };
            }
            if (prev.phase === Phase.MIDTERM_EXAM_2) {
                 return { ...nextState, phase: Phase.SEMESTER_2, week: 12, isPlaying: true };
            }
            if (prev.phase === Phase.FINAL_EXAM_2) {
                 return { ...nextState, phase: Phase.SUMMER_BREAK, week: 1, totalWeeksInPhase: 8, isPlaying: true };
            }
            if ([Phase.CSP_EXAM, Phase.NOIP_EXAM].includes(prev.phase)) {
                 return { ...nextState, phase: Phase.SEMESTER_1, week: prev.week + 1, totalWeeksInPhase: 21, isPlaying: true };
            }
            if (prev.phase === Phase.WC_EXAM) {
                 // Push wc_result event and stop playing so the event pops up
                 const resultEvent = OI_EVENTS_POOL.find((e: GameEvent) => e.id === 'oi_wc_result') as GameEvent;
                 return { ...nextState, phase: Phase.WINTER_BREAK, week: prev.week + 1, totalWeeksInPhase: 5, isPlaying: true, eventQueue: resultEvent ? [...prev.eventQueue, resultEvent] : prev.eventQueue };
            }
            if ([Phase.PROVINCIAL_EXAM, Phase.APIO_EXAM].includes(prev.phase)) {
                 const resultEventId = prev.phase === Phase.PROVINCIAL_EXAM ? 'oi_provincial_result' : 'oi_apio_result';
                 const resultEvent = OI_EVENTS_POOL.find((e: GameEvent) => e.id === resultEventId) as GameEvent;
                 return { ...nextState, phase: Phase.SEMESTER_2, week: prev.week + 1, totalWeeksInPhase: 21, isPlaying: true, eventQueue: resultEvent ? [...prev.eventQueue, resultEvent] : prev.eventQueue };
            }
            if (prev.phase === Phase.NOI_EXAM) {
                 const socialPractice = OI_EVENTS_POOL.find((e: GameEvent) => e.id === 'oi_noi_social_practice') as GameEvent;
                 return { ...nextState, phase: Phase.SUMMER_BREAK, week: prev.week + 1, totalWeeksInPhase: 8, isPlaying: true, eventQueue: socialPractice ? [...prev.eventQueue, socialPractice] : prev.eventQueue };
            }
            return { ...nextState, isPlaying: true };
        });
    };

    const weekendContext = state.isWeekend ? state : { ...state, isWeekend: true };
    const weekendOptions = WEEKEND_ACTIVITIES.filter(a => {
        if (state.isWeekend && state.availableWeekendActivityIds) {
            return state.availableWeekendActivityIds.includes(a.id)
                && (!a.condition || a.condition(weekendContext))
                && !getActivityBlockReason(state, a);
        }
        return (!a.condition || a.condition(weekendContext)) && !getActivityBlockReason(state, a);
    });

    return {
        state, setState, hasSave, saveGame, loadGame,
        startGameState, handleChoice, handleEventConfirm, handleClubSelect, handleShopPurchase, 
        executeTimetable, handleExamFinish, closeExamResult,
        weekendOptions
    };
};
