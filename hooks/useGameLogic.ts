
import { useState, useEffect, useCallback } from 'react';
import { 
    GameState, Difficulty, GeneralStats, Talent, Challenge, AiConfig,
    Phase, GameStatus, SubjectKey, OIStats, GameEvent, 
    EventChoice, ExamResult, ClubId, Item, WeekendActivity, Project, GameLogEntry, StoryEntry
} from '../types';
import { DIFFICULTY_PRESETS, getDifficultyPreset } from '../data/constants';
import { PHASE_EVENTS, BASE_EVENTS, CHAINED_EVENTS, generateSummerLifeEvent, generateStudyEvent, generateOIEvent, generateRandomFlavorEvent, hasOIRandomEventsForPhase } from '../data/events';
import { WEEKEND_ACTIVITIES, STATUSES, ACHIEVEMENTS } from '../data/mechanics';
import { mapAiEventToGameEvent, modifyOI, modifySub, getLearningMultiplier, getRestRecoveryMultiplier, scalePositiveGeneralDeltas, scalePositiveSubjectDeltas, scalePositiveOIStatDeltas, isStudyBlocked, getShopPriceMultiplier } from '../data/utils';
import { getRandomWorldContext, CHARACTER_TEMPLATES } from '../data/world_context';
import { getHistoricalEventsForWeek, loadCityEvents } from '../data/historical_events';
import { OI_EVENTS_POOL } from '../data/events_oi';
import { SCHEDULE_SLOTS, BLOCKED_SLOTS_MAP } from '../data/timetable';
import { getActivityRepeatMultiplier } from '../data/balance';
import { getRandomRelationshipProfile } from '../data/relationships';
import { generateBatchGameEvents } from '../lib/gemini';
import { getAccountSaveKey } from '../lib/accounts';

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

const eventRef = (event: GameEvent | null) => event ? event.id : null;
const resolveEvent = (value: unknown): GameEvent | null => {
    const id = typeof value === 'string'
        ? value
        : value && typeof value === 'object' && 'id' in value && typeof value.id === 'string'
            ? value.id
            : null;
    return id ? EVENT_REGISTRY[id] || null : null;
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
    dp: 0, ds: 0, math: 0, string: 0, graph: 0, misc: 0
});

// Helper to get global achievements
const getGlobalAchievements = (): string[] => {
    try {
        const stored = localStorage.getItem(ACHIEVEMENTS_KEY);
        return stored ? JSON.parse(stored) : [];
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
    pendingHistoricalEvents: [],
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
    competitionResults: [],
    popupCompetitionResult: null,
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
    lastHistoricalWeek: -3,
    weekendProcessed: false,
    activeMiniGame: null,
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
    const [cityEventsReady, setCityEventsReady] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY) || (accountId === 'guest' ? localStorage.getItem(LEGACY_STORAGE_KEY) : null);
        setHasSave(!!saved);
        if (!saved) {
            const initial = getInitialGameState();
            setState(prev => ({ ...initial, unlockedAchievements: prev.unlockedAchievements }));
        }
    }, [STORAGE_KEY, accountId]);

    useEffect(() => {
        const threshold = getDifficultyPreset(state.difficulty).healthDeathThreshold;
        if (threshold !== undefined && state.general.health < threshold && state.phase !== Phase.ENDING && state.phase !== Phase.WITHDRAWAL) {
            setState(prev => ({
                ...prev,
                phase: Phase.ENDING,
                currentEvent: null,
                eventQueue: [],
                isPlaying: false,
                isWeekend: false,
                log: [...prev.log, { message: `【极限失败】健康值低于${threshold}，游戏结束。`, type: 'error', timestamp: Date.now() }]
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
                isPlaying: nextPhase !== Phase.ENDING && nextPhase !== Phase.SELECTION && nextPhase !== Phase.FINAL_EXAM && nextPhase !== Phase.FINAL_EXAM_2 && nextPhase !== Phase.PLACEMENT_EXAM,
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
            localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(merged));

            setState(prev => ({
                ...prev,
                unlockedAchievements: merged,
                achievementPopup: ACHIEVEMENTS[lastId]
            }));
            
            setTimeout(() => setState(prev => ({ ...prev, achievementPopup: null })), 3000);
        }
    }, [state.general, state.sleepCount, state.rejectionCount, state.examResult, state.difficulty, state.unlockedAchievements, state.phase, state.activeChallengeId]);


    // --- MAIN GAME LOOP ---
    useEffect(() => {
        if (!state.isPlaying || !cityEventsReady || state.currentEvent || state.isWeekend || state.weekendProcessed || state.isAiGenerating) return;

        const processTurn = async () => {
            // Check Project Deadlines
            let failedProjects: Project[] = [];
            let activeProjects = [...state.activeProjects];
            activeProjects = activeProjects.filter(p => {
                if (p.deadlinePhase === state.phase && p.deadlineWeek === state.week) {
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
                failedProjects.forEach(p => {
                    if (p.onFail) {
                        const failEffects = p.onFail(state);
                        updates = { ...updates, ...failEffects };
                    }
                    logs.push({ message: `【课题失败】${p.title} 截止日期已过，未能完成。`, type: 'error', timestamp: Date.now() });
                });
                setState(prev => ({ ...prev, ...updates, log: [...prev.log, ...logs] }));
                return; // Let the state update and re-enter loop
            }

            // 0. Handle Queue first
            if (state.eventQueue.length > 0) {
                const [next, ...rest] = state.eventQueue;
                setState(prev => ({ ...prev, currentEvent: next, eventQueue: rest, isPlaying: false }));
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
            if (conditionalEvents.length > 0) {
                 weekEvents.push(...conditionalEvents);
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

            let aiEventsGenerated = false;
            if (weekEvents.length === 0 || (weekEvents.length <= 1 && weekEvents[0]?.id?.startsWith('romance_'))) {
                if (aiConfig?.enabled && weekEvents.length === 0) {
                    setState(prev => ({
                        ...prev,
                        isAiGenerating: true,
                        log: [...prev.log, { message: 'AI 正在根据本周状态编写事件...', type: 'info', timestamp: Date.now() }]
                    }));
                    try {
                        const generatedEvents = await generateBatchGameEvents(state, aiConfig);
                        weekEvents.push(...generatedEvents.map(mapAiEventToGameEvent));
                        aiEventsGenerated = generatedEvents.length > 0;
                    } catch (error) {
                        const message = error instanceof Error ? error.message : '未知错误';
                        setState(prev => ({
                            ...prev,
                            log: [...prev.log, { message: `AI 事件生成失败，已使用离线事件：${message}`, type: 'warning', timestamp: Date.now() }]
                        }));
                    } finally {
                        setState(prev => ({ ...prev, isAiGenerating: false }));
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

            const eventsToMark = weekEvents
                .filter(e => (e.once || e.triggerType === 'FIXED') && e.id !== 'debt_collection')
                .map(e => e.id);

            const [first, ...rest] = weekEvents;
            
            if (first) {
                applyWeeklyUpdates(first, rest, eventsToMark);
            } else {
                startWeekend();
            }
        };

        const timer = setTimeout(processTurn, 1000); 
        return () => clearTimeout(timer);
    }, [state.isPlaying, cityEventsReady, state.currentEvent, state.isWeekend, state.week, state.phase, state.eventQueue.length, state.midtermRank, advancePhase, state.competition, state.triggeredEvents, state.isAiGenerating, state.recentEventIds, aiConfig]);

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
        updatedGeneral.health = regress(updatedGeneral.health, 60); // baseline lowered from 70 to 60
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

    const applyWeeklyUpdates = (currentEvent: GameEvent, nextQueue: GameEvent[] = [], newTriggeredEvents: string[] = []) => {
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
            if (currentEvent.triggerType === 'RANDOM') {
                newRecentIds.push(currentEvent.id);
                if (newRecentIds.length > 4) newRecentIds.shift(); // Keep last 4
            }

            // Death check: health <= 0 means game over (猝死)
            const healthThreshold = getDifficultyPreset(prev.difficulty).healthDeathThreshold || 0;
            if (updatedGeneral.health < healthThreshold) {
                return {
                    ...prev,
                    general: updatedGeneral,
                    fatigue: updatedFatigue,
                    phase: Phase.ENDING,
                    currentEvent: null,
                    eventQueue: [],
                    isPlaying: false,
                    log: [...prev.log, ...statusLogs, { message: healthThreshold > 0 ? `【极限失败】健康值低于${healthThreshold}，身体再也承受不住了……游戏结束。` : '【猝死】你的健康值降到了0以下，身体再也承受不住了...游戏结束。', type: 'error', timestamp: Date.now() }]
                };
            }

            return {
                ...prev,
                activeStatuses: updatedStatuses,
                general: updatedGeneral,
                fatigue: updatedFatigue,
                subjects: updatedSubjects,
                currentEvent: currentEvent,
                eventQueue: nextQueue,
                triggeredEvents: [...prev.triggeredEvents, ...newTriggeredEvents],
                recentEventIds: newRecentIds,
                isPlaying: false,
                log: [...prev.log, ...statusLogs]
            };
        });
    };

    const startWeekend = () => {
        if (state.phase === Phase.ENDING || state.phase === Phase.WITHDRAWAL) return;
        setState(prev => {
            let availableIds = undefined;
            if (prev.difficulty === 'REALITY') {
                const validActivities = WEEKEND_ACTIVITIES.filter(a => !a.condition || a.condition(prev));
                let validIds = validActivities.map(a => a.id);
                for (let i = validIds.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [validIds[i], validIds[j]] = [validIds[j], validIds[i]];
                }
                availableIds = validIds.slice(0, 6);
            }

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
        const serializableState = {
            ...state,
            currentEvent: eventRef(state.currentEvent),
            chainedEvent: eventRef(state.chainedEvent),
            eventQueue: state.eventQueue.map(event => event.id),
            activeProjects: state.activeProjects.map(({ onComplete, onFail, ...project }) => project),
            talents: state.talents.map(({ effect, ...talent }) => talent),
            eventResult: state.eventResult ? {
                choiceText: state.eventResult.choice.text,
                diff: state.eventResult.diff
            } : null
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SAVE_VERSION, state: serializableState }));
        setHasSave(true);
        setState(s => ({ ...s, log: [...s.log, { message: "游戏进度已保存。", type: 'success', timestamp: Date.now() }] }));
    };

    const loadGame = (): boolean => {
        const saved = localStorage.getItem(STORAGE_KEY) || (accountId === 'guest' ? localStorage.getItem(LEGACY_STORAGE_KEY) : null);
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
                        return choice ? { choice, diff: Array.isArray(loaded.eventResult.diff) ? loaded.eventResult.diff : [] } : null;
                    })()
                    : null;
                const restoredQueue = Array.isArray(loaded.eventQueue)
                    ? loaded.eventQueue.map((entry: unknown) => typeof entry === 'string' ? resolveEvent(entry) : null).filter((event): event is GameEvent => !!event)
                    : [];
                const restoredState: GameState = {
                    ...getInitialGameState(),
                    ...loaded,
                    general: { ...getInitialGameState().general, ...(loaded.general || {}) },
                    initialGeneral: { ...getInitialGameState().initialGeneral, ...(loaded.initialGeneral || loaded.general || {}) },
                    fatigue: typeof loaded.fatigue === 'number' ? Math.min(100, Math.max(0, loaded.fatigue)) : 20,
                    relationshipProfileId: typeof loaded.relationshipProfileId === 'string' ? loaded.relationshipProfileId : null,
                    currentEvent: restoredEvent,
                    chainedEvent: restoredChain,
                    eventQueue: restoredQueue,
                    eventResult: restoredResult,
                    activeProjects: Array.isArray(loaded.activeProjects) ? loaded.activeProjects : [],
                    completedProjects: Array.isArray(loaded.completedProjects) ? loaded.completedProjects : [],
                    activeStatuses: Array.isArray(loaded.activeStatuses) ? loaded.activeStatuses : [],
                    log: Array.isArray(loaded.log) ? loaded.log : [],
                    history: Array.isArray(loaded.history) ? loaded.history : [],
                    triggeredEvents: Array.isArray(loaded.triggeredEvents) ? loaded.triggeredEvents : [],
                    recentEventIds: Array.isArray(loaded.recentEventIds) ? loaded.recentEventIds : [],
                    unlockedAchievements: mergedAchievements
                };
                if (loaded.currentEvent && !restoredEvent) {
                    restoredState.isPlaying = true;
                    restoredState.log = [...restoredState.log, { message: '存档中的临时事件已失效，已继续下一周。', type: 'warning', timestamp: Date.now() }];
                }
                if (restoredState.worldContext) {
                    setCityEventsReady(false);
                    void loadCityEvents(restoredState.worldContext.code, restoredState.worldContext.region).finally(() => setCityEventsReady(true));
                }
                setState(restoredState);
                return true;
            } catch (e) {
                console.error("Failed to load save", e);
                setHasSave(false);
                return false;
            }
        }
        return false;
    };

    const startGameState = (difficulty: Difficulty, customStats: GeneralStats, selectedTalents: Talent[], activeChallenge?: Challenge | null) => {
        localStorage.removeItem(STORAGE_KEY);
        setHasSave(false);
        let initialGeneral = { ...DIFFICULTY_PRESETS['NORMAL'].stats };
        const effectiveDifficulty = activeChallenge ? 'REALITY' : (difficulty === 'CUSTOM' ? 'NORMAL' : difficulty);
        
        if (difficulty === 'CUSTOM' && !activeChallenge) {
            initialGeneral = { ...customStats };
        } else if (false) {
             initialGeneral = DIFFICULTY_PRESETS['AI_STORY'] ? { ...DIFFICULTY_PRESETS['AI_STORY'].stats } : { ...DIFFICULTY_PRESETS['NORMAL'].stats };
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
        setCityEventsReady(false);
        void loadCityEvents(worldContext.code, worldContext.region).finally(() => setCityEventsReady(true));
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
            difficulty: difficulty, 
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
                localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify([...currentGlobals, 'first_blood']));

                setTimeout(() => setState(prev => ({ ...prev, achievementPopup: null })), 3000);
            }, 100);
        }
    };

    const handleChoice = (choice: EventChoice, visualizer?: (oldS: GameState, newS: GameState) => string[]) => {
        setState(prev => {
            const oldState = { ...prev };
            let updates = choice.action(prev);
            if (choice.nextEventId && CHAINED_EVENTS[choice.nextEventId]) {
                updates = { ...updates, chainedEvent: CHAINED_EVENTS[choice.nextEventId] };
            }
            const choiceTags = choice.tags || [];
            const isSleepChoice = choiceTags.includes('sleep') || /睡|梦|补觉|休息|放松|躺平/.test(choice.text);
            const isHardWorkChoice = choiceTags.includes('study') || /学习|刷题|复习|通宵|熬夜|集训|肝|认真听/.test(choice.text);
            const actionFatigue = typeof updates.fatigue === 'number' ? updates.fatigue : prev.fatigue;
            if (isHardWorkChoice && isStudyBlocked(prev)) {
                updates = {
                    log: [...prev.log, { message: '【极限难度】当前心态或疲劳状态不允许学习。', type: 'warning', timestamp: Date.now() }]
                };
            }
            if (isSleepChoice) {
                if (updates.general) {
                    updates = { ...updates, general: scalePositiveGeneralDeltas(prev, updates.general, getRestRecoveryMultiplier(prev)) };
                }
                const recoveryMultiplier = getRestRecoveryMultiplier(prev);
                const explicitFatigueDelta = actionFatigue - prev.fatigue;
                const fatigueTarget = typeof updates.fatigue === 'number'
                    ? prev.fatigue + (explicitFatigueDelta < 0 ? explicitFatigueDelta * recoveryMultiplier : explicitFatigueDelta)
                    : prev.fatigue - 20 * recoveryMultiplier;
                updates = { ...updates, fatigue: Math.min(100, Math.max(0, fatigueTarget)) };
                if (prev.activeChallengeId === 'c_sleep_king') updates.hasSleptThisWeek = true;
            } else if (isHardWorkChoice && !isStudyBlocked(prev)) {
                const difficulty = getDifficultyPreset(prev.difficulty);
                const excitementFactor = 1 - Math.min(100, Math.max(0, prev.general.excitement ?? 0)) / 300;
                updates = {
                    ...updates,
                    general: scalePositiveGeneralDeltas(prev, updates.general, getLearningMultiplier(prev)),
                    subjects: scalePositiveSubjectDeltas(prev, updates.subjects, getLearningMultiplier(prev))
                };
                updates = { ...updates, fatigue: Math.min(100, actionFatigue + Math.max(4, Math.round(8 * difficulty.fatigueGainMultiplier * excitementFactor))) };
            } else if ((choiceTags.includes('sport') || /跑步|运动|体育|1000米|打球/.test(choice.text)) && updates.general) {
                updates = { ...updates, general: scalePositiveGeneralDeltas(prev, updates.general, getLearningMultiplier(prev)) };
            }
            let newState = { ...prev, ...updates };
            const healthThreshold = getDifficultyPreset(prev.difficulty).healthDeathThreshold;
            if (healthThreshold !== undefined && newState.general.health < healthThreshold) {
                newState = {
                    ...newState,
                    phase: Phase.ENDING,
                    currentEvent: null,
                    eventQueue: [],
                    isPlaying: false,
                    log: [...newState.log, { message: `【极限失败】健康值低于${healthThreshold}，游戏结束。`, type: 'error', timestamp: Date.now() }]
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
            return { ...newState, history: [...prev.history, entry], eventResult: { choice, diff } };
        });
    };

    const handleEventConfirm = () => {
        const miniGameId = state.currentEvent?.miniGameId;

        if (state.chainedEvent) {
            setState(prev => ({ ...prev, currentEvent: prev.chainedEvent, chainedEvent: null, eventResult: null }));
            return;
        }
        
        if (state.eventQueue.length > 0) {
             setState(prev => {
                 const [next, ...rest] = prev.eventQueue;
                 return { ...prev, currentEvent: next, eventQueue: rest, eventResult: null, activeMiniGame: miniGameId || prev.activeMiniGame };
             });
             return;
        }

        const skipWeekend = state.phase === Phase.SUMMER || state.phase === Phase.MILITARY;
        if (skipWeekend) {
             setState(prev => ({ 
                 ...prev, 
                 currentEvent: null, 
                 eventResult: null,
                 isWeekend: false, 
                 week: prev.week + 1, 
                 hasSleptThisWeek: false, 
                 isPlaying: !miniGameId,
                 activeMiniGame: miniGameId || prev.activeMiniGame
            }));
            return;
        }
        
        if (miniGameId) {
            setState(prev => ({ ...prev, currentEvent: null, eventResult: null, isPlaying: false, activeMiniGame: miniGameId }));
            return;
        }

        startWeekend();
    };
    
    const handleClubSelect = (id: ClubId | 'none') => {
        setState(prev => ({ 
            ...prev, 
            club: id === 'none' ? null : id,
            hasSelectedClub: true 
        }));
    };
    
    const handleShopPurchase = (item: Item, effectVisualizer?: (oldState: GameState, newState: GameState) => void) => {
        setState(prev => {
            const price = item.price * getShopPriceMultiplier(prev);
            if (prev.general.money < price) return {
                ...prev,
                log: [...prev.log, { message: `买不起${item.name}，还差 ${Math.ceil(price - prev.general.money)} G。`, type: 'warning', timestamp: Date.now() }]
            };
            const baseUpdates = item.effect(prev);
            const updates = baseUpdates.general
                ? { ...baseUpdates, general: { ...baseUpdates.general, money: prev.general.money - price } }
                : { ...baseUpdates, general: { ...prev.general, money: prev.general.money - price } };
            let newState = { ...prev, ...updates };
            const healthThreshold = getDifficultyPreset(prev.difficulty).healthDeathThreshold;
            if (healthThreshold !== undefined && newState.general.health < healthThreshold) {
                newState = { ...newState, phase: Phase.ENDING, isPlaying: false, currentEvent: null, isWeekend: false, log: [...newState.log, { message: `【极限失败】健康值低于${healthThreshold}，游戏结束。`, type: 'error', timestamp: Date.now() }] };
            }
            effectVisualizer?.(prev, newState);
            return newState;
        });
    };

    const executeTimetable = (schedule: Record<string, string>) => {
        let currentState = { ...state };
        const results: string[] = [];
        let hasSlept = false;
        let weekendStudyCount = 0;
        const activityRepeatCounts = new Map<string, number>();
        const difficultyPreset = getDifficultyPreset(state.difficulty);

        // Pre-build activity lookup map for O(1) access
        const activityMap = new Map(WEEKEND_ACTIVITIES.map(a => [a.id, a]));
        const batchLogs: typeof state.log = [];
        const blockedSlots = new Set<string>();
        if (state.flags.joined_evening_study) {
            SCHEDULE_SLOTS.filter(slot => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(slot.day)).forEach(slot => blockedSlots.add(slot.id));
        }

        // Apply activities sequentially
        for (const [slotId, actId] of Object.entries(schedule)) {
            const blockedByOtherActivity = Object.entries(schedule).some(([otherSlot, otherActivityId]) =>
                otherSlot !== slotId && (BLOCKED_SLOTS_MAP[otherActivityId] || []).includes(slotId as any)
            );
            if (blockedSlots.has(slotId) || blockedByOtherActivity) continue;
            const activity = activityMap.get(actId);
            if (!activity) continue;

            if (activity.type === 'STUDY' && isStudyBlocked(currentState)) {
                batchLogs.push({ message: '【极限难度】当前心态或疲劳状态不允许学习型周末活动。', type: 'warning', timestamp: Date.now() });
                continue;
            }
            if (activity.type === 'STUDY' && difficultyPreset.weekendStudyLimit !== undefined && weekendStudyCount >= difficultyPreset.weekendStudyLimit) {
                batchLogs.push({ message: `【地狱难度】本周最多安排 ${difficultyPreset.weekendStudyLimit} 次学习型周末活动。`, type: 'warning', timestamp: Date.now() });
                continue;
            }

            const oldS = { ...currentState };
            let updates = activity.action(oldS);
            let resultText = typeof activity.resultText === 'function' ? activity.resultText(oldS) : activity.resultText;
            const repeatCount = (activityRepeatCounts.get(activity.id) || 0) + 1;
            activityRepeatCounts.set(activity.id, repeatCount);
            const repeatMultiplier = getActivityRepeatMultiplier(repeatCount);

            if (activity.type === 'STUDY') {
                weekendStudyCount += 1;
                updates = {
                    ...updates,
                    general: scalePositiveGeneralDeltas(oldS, updates.general, getLearningMultiplier(oldS)),
                    subjects: scalePositiveSubjectDeltas(oldS, updates.subjects, getLearningMultiplier(oldS))
                };
            } else if (activity.id === 'act_sport') {
                const sportMultiplier = getLearningMultiplier(oldS);
                updates = { ...updates, general: scalePositiveGeneralDeltas(oldS, updates.general, sportMultiplier) };
            } else if (activity.type === 'REST') {
                updates = { ...updates, general: scalePositiveGeneralDeltas(oldS, updates.general, getRestRecoveryMultiplier(oldS)) };
            }

            // Repeating the same activity in one week still works, but each
            // repetition contributes less positive progress. Costs and
            // negative effects remain unchanged so the trade-off stays clear.
            if (repeatMultiplier < 1) {
                const scaledGeneral = scalePositiveGeneralDeltas(oldS, updates.general, repeatMultiplier);
                if (scaledGeneral && updates.general && typeof oldS.general.excitement === 'number' && typeof updates.general.excitement === 'number' && updates.general.excitement > oldS.general.excitement) {
                    scaledGeneral.excitement = oldS.general.excitement + (updates.general.excitement - oldS.general.excitement) * repeatMultiplier;
                }
                const repeatedUpdates = { ...updates };
                if (updates.general) repeatedUpdates.general = scaledGeneral;
                if (updates.subjects) repeatedUpdates.subjects = scalePositiveSubjectDeltas(oldS, updates.subjects, repeatMultiplier);
                if (updates.oiStats) repeatedUpdates.oiStats = scalePositiveOIStatDeltas(oldS, updates.oiStats, repeatMultiplier);
                updates = repeatedUpdates;
            }
            
            if (currentState.activeChallengeId === 'c_sleep_king' && (activity.id === 'w_sleep' || activity.name.includes('睡'))) {
                updates = { ...updates, hasSleptThisWeek: true };
                hasSlept = true;
            }

            const restMultiplier = getRestRecoveryMultiplier(oldS);
            const fatigueDelta = activity.id === 'w_sleep'
                ? -35 * restMultiplier
                : activity.type === 'REST'
                    ? -10 * restMultiplier
                    : activity.type === 'SOCIAL' || activity.type === 'LOVE'
                        ? 4
                        : activity.type === 'OI'
                            ? 14
                            : 10 * difficultyPreset.fatigueGainMultiplier;

            // Extract logs from updates before merging
            if (updates.log) {
                const previousLogEntries = new Set(oldS.log || []);
                batchLogs.push(...updates.log.filter(entry => !previousLogEntries.has(entry)));
                delete updates.log;
            }
            currentState = { ...currentState, ...updates };
            const trackedOiActivities = new Set(['w_luogu', 'w_cf', 'w_atc', 'w_oi_wiki', 'act_cf']);
            if (currentState.competition === 'OI' && trackedOiActivities.has(activity.id)) {
                const practiceSessions = Number(currentState.flags.oi_practice_sessions || 0) + 1;
                currentState.flags = {
                    ...currentState.flags,
                    oi_practice_sessions: practiceSessions,
                    ...(activity.id === 'act_cf' ? { oi_cf_sessions: Number(currentState.flags.oi_cf_sessions || 0) + 1 } : {})
                };
            }
            currentState.fatigue = Math.min(100, Math.max(0, (currentState.fatigue || 0) + fatigueDelta));
            const healthThreshold = difficultyPreset.healthDeathThreshold;
            if (healthThreshold !== undefined && currentState.general.health < healthThreshold) {
                currentState.phase = Phase.ENDING;
                currentState.isPlaying = false;
                currentState.isWeekend = false;
                currentState.log = [...(currentState.log || []), { message: `【极限失败】健康值低于${healthThreshold}，游戏结束。`, type: 'error', timestamp: Date.now() }];
                break;
            }
            if (resultText) {
                const repeatNote = repeatCount > 1 ? '（重复安排，收益递减）' : '';
                results.push(`[${slotId}] ${resultText}${repeatNote}`);
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
        if (currentState.activeChallengeId === 'c_sleep_king' && !hasSlept) {
            currentState.phase = Phase.ENDING;
            currentState.isPlaying = false;
            currentState.log = [...(currentState.log || []), { message: "你这周没有睡觉，困死了！！！(挑战失败)", type: 'error', timestamp: Date.now() }];
            results.push("挑战失败：你这周没有睡觉！");
        } else {
            currentState.week += 1;
            currentState.isPlaying = true;
            currentState.hasSleptThisWeek = false;
        }

        currentState.lastWeekSchedule = schedule;
        currentState.isWeekend = false; // Turn off planning UI
        
        setState(prev => ({ ...prev, ...currentState }));
        
        // Return results to display maybe? We can set it to a new state `timetableResult` if we want a summary popup
    };

    const calculateRank = (score: number, phase: Phase) => {
        const ALL_OI_PHASES = [Phase.CSP_EXAM, Phase.NOIP_EXAM, Phase.WC_EXAM, Phase.PROVINCIAL_EXAM, Phase.APIO_EXAM, Phase.NOI_EXAM];
        // OI exams don't have school rankings
        if (ALL_OI_PHASES.includes(phase)) return -1;
        
        let maxScore = 750;
        
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
        const rank = calculateRank(result.totalScore, state.phase);
        const isOI = ALL_OI_PHASES.includes(state.phase);
        const resultWithRank: ExamResult = { ...result, rank: isOI ? undefined : rank, type: isOI ? 'COMPETITION' : 'ACADEMIC' };
        
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
            flags: newFlags
        }));
    };
    
    const closeCompetitionPopup = () => setState(prev => ({ ...prev, popupCompetitionResult: null }));
    
    const closeExamResult = () => {
        setState(prev => {
            const nextState = { ...prev, popupExamResult: null };
            
            if (prev.phase === Phase.MIDTERM_EXAM) {
                 return { ...nextState, phase: Phase.SUBJECT_RESELECTION, week: 11, isPlaying: true };
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
                 return { ...nextState, phase: Phase.WINTER_BREAK, week: prev.week + 1, totalWeeksInPhase: 5, isPlaying: true, eventQueue: [...prev.eventQueue, resultEvent] };
            }
            if ([Phase.PROVINCIAL_EXAM, Phase.APIO_EXAM].includes(prev.phase)) {
                 const resultEventId = prev.phase === Phase.PROVINCIAL_EXAM ? 'oi_provincial_result' : 'oi_apio_result';
                 const resultEvent = OI_EVENTS_POOL.find((e: GameEvent) => e.id === resultEventId) as GameEvent;
                 return { ...nextState, phase: Phase.SEMESTER_2, week: prev.week + 1, totalWeeksInPhase: 21, isPlaying: true, eventQueue: [...prev.eventQueue, resultEvent] };
            }
            if (prev.phase === Phase.NOI_EXAM) {
                 const socialPractice = OI_EVENTS_POOL.find((e: GameEvent) => e.id === 'oi_noi_social_practice') as GameEvent;
                 return { ...nextState, phase: Phase.SUMMER_BREAK, week: prev.week + 1, totalWeeksInPhase: 8, isPlaying: true, eventQueue: [...prev.eventQueue, socialPractice] };
            }
            return { ...nextState, isPlaying: true };
        });
    };

    const closeMiniGame = (res?: Partial<GameState>) => {
        setState(prev => {
            const next = { ...prev, activeMiniGame: null, ...res };
            const skipWeekend = next.phase === Phase.SUMMER || next.phase === Phase.MILITARY;
            if (skipWeekend) {
                return { ...next, week: next.week + 1, isPlaying: true };
            }
            // Trigger startWeekend logic inline because we can't easily call startWeekend() inside setState callback cleanly if startWeekend uses setState itself, but wait, startWeekend uses setState, so we can just call it AFTER.
            return next;
        });
        
        // Wait, startWeekend uses setState. So we can just call it here based on phase!
        if (state.phase !== Phase.SUMMER && state.phase !== Phase.MILITARY) {
            setTimeout(() => startWeekend(), 0);
        }
    };
    
    const weekendOptions = WEEKEND_ACTIVITIES.filter(a => {
        if (state.availableWeekendActivityIds) {
            return state.availableWeekendActivityIds.includes(a.id) && (!a.condition || a.condition(state));
        }
        return !a.condition || a.condition(state);
    });

    return {
        state, setState, hasSave, saveGame, loadGame,
        startGameState, handleChoice, handleEventConfirm, handleClubSelect, handleShopPurchase, 
        executeTimetable, handleExamFinish, closeCompetitionPopup, closeExamResult, closeMiniGame,
        weekendOptions
    };
};
