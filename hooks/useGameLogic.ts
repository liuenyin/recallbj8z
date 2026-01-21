
import { useState, useEffect, useCallback } from 'react';
import { 
    GameState, Difficulty, GeneralStats, Talent, Challenge, 
    Phase, GameStatus, SubjectKey, OIStats, GameEvent, 
    EventChoice, ExamResult, ClubId, Item, WeekendActivity
} from '../types';
import { DIFFICULTY_PRESETS } from '../data/constants';
import { PHASE_EVENTS, generateSummerLifeEvent, generateStudyEvent, generateOIEvent, generateRandomFlavorEvent } from '../data/events';
import { WEEKEND_ACTIVITIES, STATUSES, ACHIEVEMENTS } from '../data/mechanics';
import { modifyOI, modifySub } from '../data/utils';

const STORAGE_KEY = 'recall_save_v1';

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

const getInitialGameState = (): GameState => ({
    isPlaying: false,
    eventQueue: [],
    phase: Phase.INIT,
    week: 1,
    totalWeeksInPhase: 0,
    subjects: getInitialSubjects(),
    general: { mindset: 50, experience: 0, luck: 50, romance: 0, health: 100, money: 0, efficiency: 10 },
    initialGeneral: { mindset: 50, experience: 0, luck: 50, romance: 0, health: 100, money: 0, efficiency: 10 },
    oiStats: getInitialOIStats(),
    selectedSubjects: [],
    competition: 'None',
    club: null,
    hasSelectedClub: false,
    romancePartner: null,
    className: '', // Initial empty, waiting for placement exam
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
    weekendActionPoints: 0,
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

export const useGameLogic = () => {
    const [state, setState] = useState<GameState>(getInitialGameState());
    const [weekendResult, setWeekendResult] = useState<{ activity: WeekendActivity; resultText: string; diff: string[] } | null>(null);
    const [hasSave, setHasSave] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setHasSave(true);
    }, []);

    const advancePhase = useCallback(() => {
        setState(prev => {
            let nextPhase = Phase.SEMESTER_1; 
            let weeks = 21; // Default Semester length
            const currentPhase = prev.phase;

            switch (currentPhase) {
                case Phase.INIT: nextPhase = Phase.SUMMER; weeks = 8; break;
                case Phase.SUMMER: nextPhase = Phase.MILITARY; weeks = 2; break; // Military 2 weeks
                case Phase.MILITARY: nextPhase = Phase.SELECTION; weeks = 0; break; 
                case Phase.SELECTION: nextPhase = Phase.PLACEMENT_EXAM; weeks = 0; break;
                case Phase.PLACEMENT_EXAM: nextPhase = Phase.SEMESTER_1; weeks = 21; break; // Semester 21 weeks
                // Midterm handled inside loop, no phase break needed in linear flow usually, but we keep phase concept for UI
                // If coming from Midterm, we don't use advancePhase usually, but if we do:
                case Phase.MIDTERM_EXAM: nextPhase = Phase.SUBJECT_RESELECTION; weeks = 0; break;
                case Phase.SUBJECT_RESELECTION: nextPhase = Phase.SEMESTER_1; weeks = 21; break; // Resume or restart?
                case Phase.SEMESTER_1: 
                    // If we finished 21 weeks
                    nextPhase = Phase.FINAL_EXAM; weeks = 0; 
                    break;
                case Phase.CSP_EXAM: nextPhase = Phase.SEMESTER_1; weeks = prev.totalWeeksInPhase; break; // Return
                case Phase.NOIP_EXAM: nextPhase = Phase.SEMESTER_1; weeks = prev.totalWeeksInPhase; break;
                case Phase.FINAL_EXAM: nextPhase = Phase.ENDING; weeks = 0; break;
                default: nextPhase = Phase.ENDING; weeks = 0;
            }
            
            return {
                ...prev,
                phase: nextPhase,
                week: 1,
                totalWeeksInPhase: weeks,
                isPlaying: nextPhase !== Phase.ENDING && nextPhase !== Phase.SELECTION,
                log: [...prev.log, { message: `进入新阶段: ${nextPhase}`, type: 'info', timestamp: Date.now() }]
            };
        });
    }, []);

    // --- MAIN GAME LOOP ---
    useEffect(() => {
        if (!state.isPlaying || state.currentEvent || state.isWeekend || state.weekendProcessed) return;

        const processTurn = () => {
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

            // 2. Special Fixed Trigger: Midterm at Week 11
            if (state.phase === Phase.SEMESTER_1 && state.week === 11 && !state.midtermRank) {
                setState(prev => ({
                    ...prev,
                    phase: Phase.MIDTERM_EXAM,
                    isPlaying: false
                }));
                return;
            }

            // 3. Generate Week's Events
            let weekEvents: GameEvent[] = [];
            const phasePool = PHASE_EVENTS[state.phase] || [];

            // 3a. Fixed Events in current Phase/Week
            const pendingFixed = phasePool.filter(e => 
                e.triggerType === 'FIXED' && 
                e.fixedWeek === state.week && 
                !state.triggeredEvents.includes(e.id)
            );
            weekEvents.push(...pendingFixed);

            // 3b. Conditional Events (Prioritized)
            // e.g., Confession if romance > 20
            const conditionalEvents = phasePool.filter(e => 
                e.triggerType === 'CONDITIONAL' &&
                (!e.once || !state.triggeredEvents.includes(e.id)) &&
                e.condition && e.condition(state)
            );
            
            // To prevent spam, pick 1 conditional event max per week if not fixed
            if (conditionalEvents.length > 0) {
                 const picked = conditionalEvents[Math.floor(Math.random() * conditionalEvents.length)];
                 // Only add if not already added by fixed logic
                 if (!weekEvents.find(ev => ev.id === picked.id)) {
                     weekEvents.push(picked);
                 }
            }

            // 3c. Regular Events (Phase Specific Randoms)
            const randomPhaseEvents = phasePool.filter(e => 
                e.triggerType === 'RANDOM' &&
                (!e.once || !state.triggeredEvents.includes(e.id)) &&
                (!e.condition || e.condition(state))
            );

            // 3d. Generation Logic
            if (state.phase === Phase.SUMMER) {
                 // Summer has specific logic in previous code, but let's mix it
                 weekEvents.push(generateSummerLifeEvent(state));
            } else if (state.phase === Phase.MILITARY) {
                 if (randomPhaseEvents.length > 0) {
                     weekEvents.push(randomPhaseEvents[Math.floor(Math.random() * randomPhaseEvents.length)]);
                 }
            } else if (state.phase === Phase.SEMESTER_1) {
                // FIXED: Semester 1 has Weekly Study + 1-2 Random Events
                weekEvents.push(generateStudyEvent(state));
                
                // Try to pick a specific semester event first
                if (randomPhaseEvents.length > 0 && Math.random() < 0.3) {
                     weekEvents.push(randomPhaseEvents[Math.floor(Math.random() * randomPhaseEvents.length)]);
                } else {
                    // Fallback to generic flavor
                    weekEvents.push(generateRandomFlavorEvent(state));
                }
                
                // Chance for 2nd flavor event
                if (Math.random() < 0.4) { 
                    weekEvents.push(generateRandomFlavorEvent(state));
                }

                // OI Events Override/Add
                if (state.competition === 'OI' && Math.random() < 0.3) {
                     weekEvents.push(generateOIEvent(state));
                }
            } else {
                 // Fallback for other phases
                 weekEvents.push(Math.random() < 0.7 ? generateStudyEvent(state) : generateRandomFlavorEvent(state));
            }

            // Mark fixed/conditional events as triggered
            const eventsToMark = weekEvents.filter(e => e.once || e.triggerType === 'FIXED').map(e => e.id);

            // Set the first event and queue the rest
            const [first, ...rest] = weekEvents;
            
            if (first) {
                setState(prev => ({
                    ...prev,
                    currentEvent: first,
                    eventQueue: rest,
                    triggeredEvents: [...prev.triggeredEvents, ...eventsToMark],
                    isPlaying: false
                }));
            } else {
                startWeekend();
            }
        };

        const timer = setTimeout(processTurn, 1000); 
        return () => clearTimeout(timer);
    }, [state.isPlaying, state.currentEvent, state.isWeekend, state.week, state.phase, state.eventQueue.length, state.midtermRank, advancePhase, state.competition, state.triggeredEvents]);

    const startWeekend = () => {
        setState(prev => {
            // Reality Mode: Restrict weekend activities
            let availableIds = undefined;
            if (prev.difficulty === 'REALITY') {
                // IMPORTANT: Filter valid activities FIRST, then pick 6
                // This ensures we don't pick invalid ones that get hidden later
                const validActivities = WEEKEND_ACTIVITIES.filter(a => !a.condition || a.condition(prev));
                let validIds = validActivities.map(a => a.id);
                
                // Fisher-Yates shuffle
                for (let i = validIds.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [validIds[i], validIds[j]] = [validIds[j], validIds[i]];
                }
                
                availableIds = validIds.slice(0, 6);
            }

            return {
                ...prev,
                currentEvent: null, // CRITICAL FIX: Ensure previous event is cleared to prevent infinite loop
                eventResult: null,  // CRITICAL FIX: Ensure previous result is cleared
                isWeekend: true,
                isPlaying: false,
                weekendActionPoints: 2,
                availableWeekendActivityIds: availableIds
            };
        });
    };

    const saveGame = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setHasSave(true);
        setState(s => ({ ...s, log: [...s.log, { message: "游戏进度已保存。", type: 'success', timestamp: Date.now() }] }));
    };

    const loadGame = (): boolean => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const loaded = JSON.parse(saved);
                setState(loaded);
                return true;
            } catch (e) {
                console.error("Failed to load save", e);
                return false;
            }
        }
        return false;
    };

    const startGameState = (difficulty: Difficulty, customStats: GeneralStats, selectedTalents: Talent[], activeChallenge?: Challenge | null) => {
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
            initialStatuses.push({ ...STATUSES['debt'], duration: 2 });
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
            if (effectiveDifficulty === 'NORMAL') { rolledSubjects[k].aptitude += 15; rolledSubjects[k].level += 5; }
        });

        let tempState: GameState = {
            ...getInitialGameState(),
            subjects: rolledSubjects,
            general: initialGeneral,
            initialGeneral: { ...initialGeneral },
            activeStatuses: initialStatuses,
            talents: selectedTalents,
            oiStats: getInitialOIStats(),
            difficulty: effectiveDifficulty,
            activeChallengeId: activeChallenge ? activeChallenge.id : null,
            hasSleptThisWeek: false
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
            unlockedAchievements: state.unlockedAchievements, 
            phase: Phase.SUMMER,
            week: 1,
            totalWeeksInPhase: 8,
            currentEvent: firstEvent || null,
            triggeredEvents: firstEvent ? [firstEvent.id] : [],
            log: [{ message: "八中模拟器启动。", type: 'success', timestamp: Date.now() }],
            isPlaying: false
        });
        
        if (!activeChallenge && !state.unlockedAchievements.includes('first_blood')) {
            setTimeout(() => {
                setState(prev => ({
                    ...prev,
                    unlockedAchievements: [...prev.unlockedAchievements, 'first_blood'],
                    achievementPopup: ACHIEVEMENTS['first_blood']
                }));
                setTimeout(() => setState(prev => ({ ...prev, achievementPopup: null })), 3000);
            }, 100);
        }
    };

    const handleChoice = (choice: EventChoice, visualizer?: (oldS: GameState, newS: GameState) => string[]) => {
        const oldState = { ...state };
        let updates = choice.action(state);
        
        if (state.activeChallengeId === 'c_sleep_king' && (choice.text.includes('睡') || choice.text.includes('梦') || choice.text.includes('补觉'))) {
             updates = { ...updates, hasSleptThisWeek: true };
        }

        const newState = { ...state, ...updates };
        const diff = visualizer ? visualizer(oldState, newState) : [];
        
        setState(prev => ({ ...prev, ...updates, eventResult: { choice, diff } }));
    };

    const handleEventConfirm = () => {
        // 1. Handle Chained Event Immediate Trigger
        if (state.chainedEvent) {
            setState(prev => ({ ...prev, currentEvent: prev.chainedEvent, chainedEvent: null, eventResult: null }));
            return;
        }
        
        // 2. Handle Event Queue
        if (state.eventQueue.length > 0) {
             setState(prev => {
                 const [next, ...rest] = prev.eventQueue;
                 return { ...prev, currentEvent: next, eventQueue: rest, eventResult: null };
             });
             return;
        }

        // 3. Skip weekend for Summer/Military to streamline flow
        const skipWeekend = state.phase === Phase.SUMMER || state.phase === Phase.MILITARY;
        if (skipWeekend) {
             setState(prev => ({ 
                 ...prev, 
                 currentEvent: null, 
                 eventResult: null,
                 isWeekend: false, 
                 week: prev.week + 1, 
                 hasSleptThisWeek: false, 
                 isPlaying: true 
            }));
            return;
        }

        // 4. Go to Weekend
        startWeekend();
    };
    
    const handleClubSelect = (id: ClubId | 'none') => {
        setState(prev => ({ 
            ...prev, 
            club: id === 'none' ? null : id,
            hasSelectedClub: true // Flag to stop the prompt
        }));
    };
    
    const handleShopPurchase = (item: Item, effectVisualizer: () => void) => {
        const updates = item.effect(state);
        setState(prev => ({ ...prev, ...updates }));
        effectVisualizer();
    };

    const handleWeekendActivityClick = (activity: WeekendActivity, visualizer?: (oldS: GameState, newS: GameState) => string[]) => {
        if (state.weekendActionPoints <= 0) return;
        
        const oldState = { ...state };
        let updates = activity.action(state);
        let resultText = typeof activity.resultText === 'function' ? activity.resultText(state) : activity.resultText;

        if (state.activeChallengeId === 'c_sleep_king' && (activity.id === 'w_sleep' || activity.name.includes('睡'))) {
            updates = { 
                ...updates, hasSleptThisWeek: true,
                general: { ...updates.general, health: (updates.general?.health || oldState.general.health || 0) + 5, mindset: (updates.general?.mindset || oldState.general.mindset || 0) + 3 } as GeneralStats
            };
            
            const roll = Math.random();
            if (roll < 0.15) {
                resultText = "梦里那个公式... e^(π√163) 居然是整数？你的数学直觉大幅提升！";
                updates.oiStats = modifyOI(oldState, { math: 15, misc: 10 });
                // @ts-ignore
                updates.subjects = modifySub(oldState, ['math'], 10);
            } else if (roll < 0.3) {
                resultText = "不知是庄周做梦变成了蝴蝶，还是蝴蝶做梦变成了庄周。你感悟到了生命的真谛。";
                // @ts-ignore
                updates.general.mindset += 15; updates.general.efficiency += 5;
            } else if (roll < 0.45 && !oldState.dreamtExam) {
                resultText = "【预知梦】你好像梦到了期末考试的压轴题！虽然醒来只记得大概，但足够了！(考试运大幅提升)";
                // @ts-ignore
                updates.general.luck += 20; updates.dreamtExam = true;
            } else if (roll < 0.6) {
                resultText = "你在梦里又睡着了，进入了第二层梦境。在这里，一小时等于现实的一天。你利用这漫长的时间复习了全科内容。";
                // @ts-ignore
                updates.subjects = modifySub(oldState, ['math', 'chinese', 'english', 'physics'], 3);
            } else if (roll < 0.75 && oldState.romancePartner) {
                resultText = `梦里，${oldState.romancePartner}和你在一起啦。醒来时嘴角还挂着口水。`;
                // @ts-ignore
                updates.general.romance += 10; updates.general.mindset += 10;
            }else if (roll<0.65){
                resultText = `嘿嘿嘿嘿嘿嘿嘿三月七~ 啊喂，怎么醒来时有点湿，一定是太热了流太多汗了，对吧……`;
                // @ts-ignore
                updates.general.romance += 10; updates.general.mindset += 10;
            } else {
                resultText = "这一觉睡得天昏地暗，感觉整个人都升华了（S属性大爆发）。";
            }
        }

        const newState = { ...state, ...updates };
        const diff = visualizer ? visualizer(oldState, newState) : [];
        
        setWeekendResult({ activity, resultText, diff });
        setState(prev => ({ ...prev, ...updates }));
    };

    const confirmWeekendActivity = () => {
        setWeekendResult(null);
        setState(prev => {
             const newPoints = prev.weekendActionPoints - 1;
             if (newPoints <= 0) {
                 // Challenge check
                 if (prev.activeChallengeId === 'c_sleep_king' && !prev.hasSleptThisWeek) {
                     return { ...prev, weekendActionPoints: 0, isWeekend: false, isPlaying: false, phase: Phase.ENDING, log: [...prev.log, { message: "你这周没有睡觉，困死了！！！(挑战失败)", type: 'error', timestamp: Date.now() }] };
                 }
                 return { ...prev, weekendActionPoints: 0, isWeekend: false, isPlaying: true, week: prev.week + 1, hasSleptThisWeek: false };
             }
             return { ...prev, weekendActionPoints: newPoints };
        });
    };
    
    // Rank Calculation Helper
    const calculateRank = (score: number, phase: Phase) => {
        // Correct Max Score Logic
        let maxScore = 750;
        // Adjust for OI Exams which have different max scores (usually 400 for CSP/NOIP)
        if (phase === Phase.CSP_EXAM || phase === Phase.NOIP_EXAM) {
            maxScore = 400; 
        }
        
        const percentage = score / maxScore;
        const totalStudents = 633;
        
        // Z-score simulation: Mean = 0.68, Std = 0.15
        const mean = 0.68;
        const std = 0.10;
        const z = (percentage - mean) / std;
        
        // Approx percentile from Z
        let percentile = 0.5 * (1 + Math.sign(z) * Math.sqrt(1 - Math.exp(-2 * z * z / Math.PI)));
        
        if (percentage < 0.1) percentile = 0; 
        
        // Fix: Ensure 100% score gets Rank 1
        if (score >= maxScore * 0.99) percentile = 1;
        else if (percentage > 0.999) percentile = 0.999;
        
        const rank = Math.max(1, Math.floor(totalStudents * (1 - percentile)));
        return rank;
    };

    const handleExamFinish = (result: ExamResult) => {
        const rank = calculateRank(result.totalScore, state.phase);
        const resultWithRank = { ...result, rank };
        
        let newClassName = state.className;
        if (state.phase === Phase.PLACEMENT_EXAM) {
             if (rank <= 180) newClassName = "一类实验班";
             else if (rank <= 400) newClassName = "二类实验班";
             else newClassName = "普通班";
        }

        setState(prev => ({ 
            ...prev, 
            examResult: resultWithRank, 
            popupExamResult: resultWithRank,
            midtermRank: state.phase === Phase.MIDTERM_EXAM ? rank : prev.midtermRank,
            className: newClassName
        }));
    };
    
    const closeCompetitionPopup = () => setState(prev => ({ ...prev, popupCompetitionResult: null }));
    
    const closeExamResult = () => {
        setState(prev => {
            const nextState = { ...prev, popupExamResult: null };
            
            // Logic to return from Exam Phases
            if (prev.phase === Phase.MIDTERM_EXAM) {
                 // Return to Semester 1, continue from week 11
                 return { ...nextState, phase: Phase.SEMESTER_1, week: 12, isPlaying: true };
            }
            if (prev.phase === Phase.PLACEMENT_EXAM) {
                 return { ...nextState, phase: Phase.SEMESTER_1, week: 1, totalWeeksInPhase: 21, isPlaying: true };
            }
            if (prev.phase === Phase.FINAL_EXAM) {
                 return { ...nextState, phase: Phase.ENDING, isPlaying: false };
            }
            
            // For other exams (CSP/NOIP) that happen mid-semester or separate phases
            if ([Phase.CSP_EXAM, Phase.NOIP_EXAM].includes(prev.phase)) {
                // If it was an interrupt, we might need to go back
                // But simplified logic usually just advances
                 return { ...nextState, phase: Phase.SEMESTER_1, isPlaying: true };
            }

            return { ...nextState, isPlaying: true };
        });
    };

    const closeMiniGame = (res: Partial<GameState>) => setState(prev => ({ ...prev, activeMiniGame: null, ...res }));
    
    // Filter weekend options based on Reality Mode
    const weekendOptions = WEEKEND_ACTIVITIES.filter(a => {
        if (state.availableWeekendActivityIds) {
            return state.availableWeekendActivityIds.includes(a.id) && (!a.condition || a.condition(state));
        }
        return !a.condition || a.condition(state);
    });

    return {
        state, setState, weekendResult, setWeekendResult, hasSave, saveGame, loadGame,
        startGameState, handleChoice, handleEventConfirm, handleClubSelect, handleShopPurchase, 
        handleWeekendActivityClick, confirmWeekendActivity, handleExamFinish, closeCompetitionPopup, closeExamResult, closeMiniGame,
        weekendOptions
    };
};
