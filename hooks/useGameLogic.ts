import { useState, useEffect, useCallback, useMemo } from 'react';
import { Phase, GameState, GameEvent, SubjectKey, ExamResult, SubjectStats, GeneralStats, CompetitionResultData, GameStatus, Difficulty, ClubId, WeekendActivity, OIStats, GameLogEntry, Talent, Item } from '../types';
import { DIFFICULTY_PRESETS, MECHANICS_CONFIG } from '../data/constants';
import { TALENTS, ACHIEVEMENTS, STATUSES, CLUBS, WEEKEND_ACTIVITIES } from '../data/mechanics';
import { PHASE_EVENTS, BASE_EVENTS, CHAINED_EVENTS, generateStudyEvent, generateRandomFlavorEvent, generateSummerLifeEvent, generateOIEvent, SCIENCE_FESTIVAL_EVENT, NEW_YEAR_GALA_EVENT } from '../data/events';
import { modifySub, modifyOI } from '../data/utils';

// --- Initial State Generators ---

const getInitialSubjects = (): Record<SubjectKey, SubjectStats> => ({
  chinese: { aptitude: 0, level: 0 },
  math: { aptitude: 0, level: 0 },
  english: { aptitude: 0, level: 0 },
  physics: { aptitude: 0, level: 0 },
  chemistry: { aptitude: 0, level: 0 },
  biology: { aptitude: 0, level: 0 },
  history: { aptitude: 0, level: 0 },
  geography: { aptitude: 0, level: 0 },
  politics: { aptitude: 0, level: 0 },
});

const getInitialGeneral = (): GeneralStats => ({
  mindset: 50, experience: 10, luck: 50, romance: 10, health: 80, money: 20, efficiency: 10
});

const getInitialOIStats = (): OIStats => ({
    dp: 0, ds: 0, math: 0, string: 0, graph: 0, misc: 0
});

const getInitialGameState = (): GameState => ({
    isPlaying: false,
    eventQueue: [],
    phase: Phase.INIT,
    week: 0,
    totalWeeksInPhase: 0,
    subjects: getInitialSubjects(),
    general: getInitialGeneral(),
    initialGeneral: getInitialGeneral(),
    oiStats: getInitialOIStats(),
    selectedSubjects: [],
    competition: 'None',
    club: null,
    romancePartner: null,
    className: '待分班',
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
    isWeekend: false,
    weekendActionPoints: 0,
    weekendProcessed: false,
    sleepCount: 0,
    rejectionCount: 0,
    talents: [],
    inventory: [],
    theme: 'light'
});

export const useGameLogic = () => {
    const [state, setState] = useState<GameState>(getInitialGameState());
    
    // Weekend Result State (UI related but tied to logic flow)
    const [weekendResult, setWeekendResult] = useState<{
        activity: WeekendActivity;
        diff: string[];
        resultText: string;
        newState: GameState;
    } | null>(null);

    const [hasSave, setHasSave] = useState(false);

    // --- Persistence & Initialization ---
    useEffect(() => {
        const savedAchievements = localStorage.getItem('bz_sim_achievements');
        const saveGame = localStorage.getItem('bz_sim_save_v1');

        if (savedAchievements) {
            setState(prev => ({ ...prev, unlockedAchievements: JSON.parse(savedAchievements) }));
        }
        if (saveGame) {
            setHasSave(true);
        }
        
        // Force light mode cleanup
        document.body.classList.remove('dark');
    }, []);

    const saveGame = useCallback(() => {
        if (state.currentEvent || state.eventQueue.length > 0) return;
        localStorage.setItem('bz_sim_save_v1', JSON.stringify(state));
        setHasSave(true);
        setState(prev => ({
            ...prev,
            log: [...prev.log, { message: "游戏进度已保存。", type: 'success', timestamp: Date.now() }]
        }));
    }, [state]);

    const loadGame = useCallback(() => {
        const saved = localStorage.getItem('bz_sim_save_v1');
        if (!saved) return false;
        try {
            const loadedState = JSON.parse(saved) as GameState;
            setState({ ...loadedState, isPlaying: false });
            return true;
        } catch (e) {
            console.error("Load failed", e);
            return false;
        }
    }, []);

    const unlockAchievement = useCallback((id: string) => {
        setState(prev => {
            if (prev.difficulty !== 'REALITY') return prev;
            if (prev.unlockedAchievements.includes(id)) return prev;
            
            const newUnlocked = [...prev.unlockedAchievements, id];
            localStorage.setItem('bz_sim_achievements', JSON.stringify(newUnlocked));
            const ach = ACHIEVEMENTS[id];
            
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            
            return {
                ...prev,
                unlockedAchievements: newUnlocked,
                achievementPopup: ach || null,
                log: [...prev.log, { message: `【成就解锁】${ach?.title || id}`, type: 'success', timestamp: Date.now() }]
            };
        });
        setTimeout(() => {
            setState(prev => ({ ...prev, achievementPopup: null }));
        }, 3000);
    }, []);

    // --- Dynamic Logic ---
    const weekendOptions = useMemo(() => {
        if (!state.isWeekend) return [];
        let candidates = WEEKEND_ACTIVITIES.filter(a => !a.condition || a.condition(state));

        if (state.difficulty === 'REALITY') {
            const mandatory = candidates.filter(a => a.type === 'LOVE' || a.type === 'OI');
            let pool = candidates.filter(a => a.type !== 'LOVE' && a.type !== 'OI');

            if (state.general.health < 30 || state.general.mindset < 30 || state.general.efficiency < 0) {
                pool = pool.filter(a => a.type !== 'STUDY');
            }

            pool = pool.sort(() => 0.5 - Math.random());
            const slotsNeeded = Math.max(0, 6 - mandatory.length);
            const selectedPool = pool.slice(0, slotsNeeded);
            candidates = [...mandatory, ...selectedPool];
        }

        return candidates.sort((a, b) => {
             const aPriority = (a.type === 'LOVE' || a.type === 'OI') ? 1 : 0;
             const bPriority = (b.type === 'LOVE' || b.type === 'OI') ? 1 : 0;
             return bPriority - aPriority;
        });
    }, [state.isWeekend, state.week, state.difficulty, state.general, state.romancePartner, state.competition]);

    // --- Time Loop ---
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (state.isPlaying && !state.currentEvent && state.eventQueue.length === 0 && !state.popupCompetitionResult && !state.popupExamResult && state.phase !== Phase.ENDING && state.phase !== Phase.WITHDRAWAL && !state.isWeekend && !weekendResult) {
            interval = setInterval(() => {
                processWeekStep();
            }, 1500);
        }
        return () => clearInterval(interval);
    }, [state.isPlaying, state.currentEvent, state.eventQueue, state.popupCompetitionResult, state.popupExamResult, state.phase, state.isWeekend, weekendResult]);

    // --- Event Queue ---
    useEffect(() => {
        if (!state.currentEvent && state.eventQueue.length > 0 && !state.popupCompetitionResult && !state.isWeekend && !weekendResult) {
            const nextEvent = state.eventQueue[0];
            setState(prev => ({
                ...prev,
                currentEvent: nextEvent,
                eventQueue: prev.eventQueue.slice(1),
                isPlaying: false
            }));
        }
    }, [state.eventQueue, state.currentEvent, state.popupCompetitionResult, state.isWeekend, weekendResult]);


    // --- Core Game Functions ---

    const processWeekStep = () => {
        setState(prev => {
            // Critical Check
            if (prev.general.health <= 0 || prev.general.mindset <= 0) {
                return { ...prev, phase: Phase.WITHDRAWAL, isPlaying: false, currentEvent: null, eventQueue: [], log: [...prev.log, { message: "你的身心状态已达极限，被迫休学...", type: 'error', timestamp: Date.now() }] };
            }

            // Achievement Checks
            if (prev.general.money >= 200) unlockAchievement('rich');
            if (prev.general.money <= -250) unlockAchievement('in_debt');
            if (prev.general.health < 10 && prev.phase === Phase.SEMESTER_1) unlockAchievement('survival');
            if (prev.general.romance >= 150) unlockAchievement('romance_master');
            if (prev.rejectionCount >= 5) unlockAchievement('nice_person');

            let nextPhase = prev.phase;
            let nextWeek = prev.week + 1;
            let nextTotal = prev.totalWeeksInPhase;
            let eventsToAdd: GameEvent[] = [];
            let forcePause = false;
            let triggerClubSelection = false;
            let newLogs: GameLogEntry[] = [];

            // Stats Regression
            let nextGeneral = { ...prev.general };
            let nextSubjects = { ...prev.subjects };
            let nextOIStats = { ...prev.oiStats };
            
            (['mindset', 'experience', 'luck', 'romance', 'health'] as (keyof GeneralStats)[]).forEach(k => {
                 const diff = nextGeneral[k] - prev.initialGeneral[k];
                 nextGeneral[k] -= diff * MECHANICS_CONFIG.GENERAL_REGRESSION_RATE;
            });
            const effDiff = nextGeneral.efficiency - prev.initialGeneral.efficiency;
            nextGeneral.efficiency -= effDiff * MECHANICS_CONFIG.EFFICIENCY_REGRESSION_RATE;
            
            (Object.keys(nextSubjects) as SubjectKey[]).forEach(k => {
                if (nextSubjects[k].level > 0) nextSubjects[k] = { ...nextSubjects[k], level: nextSubjects[k].level * (1 - MECHANICS_CONFIG.SUBJECT_DECAY_RATE) };
            });

            // Phase Transitions
            if (prev.phase === Phase.SUMMER && prev.week >= 8) { nextPhase = Phase.MILITARY; nextWeek = 1; nextTotal = 2; }
            else if (prev.phase === Phase.MILITARY && prev.week >= 2) { nextPhase = Phase.SELECTION; nextWeek = 0; forcePause = true; }
            else if (prev.phase === Phase.SEMESTER_1) {
                if (prev.week === 2 && !prev.club) triggerClubSelection = true;
                if (prev.competition === 'OI' && prev.week === 10) { nextPhase = Phase.CSP_EXAM; forcePause = true; }
                else if (prev.week === 11) { nextPhase = Phase.MIDTERM_EXAM; forcePause = true; } 
                else if (prev.competition === 'OI' && prev.week === 18) { nextPhase = Phase.NOIP_EXAM; forcePause = true; }
                else if (prev.week >= 21) { nextPhase = Phase.FINAL_EXAM; nextWeek = 0; forcePause = true; }
            }

            // We handle showClubSelection by passing a flag in state, or App observing it.
            // Let's assume App observes state changes or we add a one-off flag.
            // For simplicity, we just pause here. The App component will check `if (state.phase === SEMESTER_1 && state.week === 2 && !state.club)`
            
            if (nextPhase !== prev.phase || triggerClubSelection) {
                return { ...prev, phase: nextPhase, week: nextWeek, totalWeeksInPhase: nextTotal, isPlaying: false };
            }

            // Weekend Logic
            if (prev.phase === Phase.SEMESTER_1 && !prev.isWeekend && !prev.weekendProcessed && prev.week > 0) {
                 let ap = 2; 
                 let logs: GameLogEntry[] = [];
                 
                 if (prev.competition === 'OI') {
                     ap -= 1;
                     logs.push({ message: "【周末】参加了竞赛课，OI能力略微提升。", type: 'info', timestamp: Date.now() });
                     nextOIStats.misc += 0.5;
                 }
                 if (prev.club && prev.club !== 'none' && prev.week % 4 === 0) {
                     ap -= 1;
                     const clubData = CLUBS.find(c => c.id === prev.club);
                     if (clubData) {
                         logs.push({ message: `【周末】参加了${clubData.name}活动。`, type: 'info', timestamp: Date.now() });
                         const updates = clubData.action(prev);
                         if (updates.general) nextGeneral = { ...nextGeneral, ...updates.general };
                         if (updates.subjects) nextSubjects = { ...nextSubjects, ...updates.subjects }; 
                     }
                 }
                 
                 if (ap > 0) {
                     return { ...prev, general: nextGeneral, subjects: nextSubjects, oiStats: nextOIStats, isWeekend: true, weekendActionPoints: ap, isPlaying: false, log: [...prev.log, ...logs, { message: "周末到了，自由支配时间。", type: 'info', timestamp: Date.now() }] };
                 } else {
                     logs.push({ message: "周末行程排满，无自由活动时间。", type: 'warning', timestamp: Date.now() });
                     newLogs.push(...logs);
                 }
            }

            // Regular Week
            let activeStatuses = prev.activeStatuses.map(s => ({ ...s, duration: s.duration - 1 })).filter(s => s.duration > 0);
            nextGeneral.health = Math.max(0, nextGeneral.health - 0.8);
            nextGeneral.money += 2;

            if (nextGeneral.money < 0 && Math.random() < 0.3 && !activeStatuses.find(s => s.id === 'debt')) {
                eventsToAdd.unshift(BASE_EVENTS['debt_collection']);
                activeStatuses.push({ ...STATUSES['debt'], duration: 1 });
            }

            // Status triggers
            if (nextGeneral.romance >= 25 && !prev.romancePartner) {
                if (Math.random() < 0.2 && !activeStatuses.find(s => s.id === 'crush_pending')) activeStatuses.push({ ...STATUSES['crush_pending'], duration: 3 });
                if (nextGeneral.romance >= 35 && Math.random() < 0.15 && !activeStatuses.find(s => s.id === 'crush')) activeStatuses.push({ ...STATUSES['crush'], duration: 4 });
            }
            if (nextGeneral.health < 30 && !activeStatuses.find(s => s.id === 'exhausted') && Math.random() < 0.4) activeStatuses.push({ ...STATUSES['exhausted'], duration: 3 });
            if (nextGeneral.efficiency > 15 && nextGeneral.mindset > 70 && !activeStatuses.find(s => s.id === 'focused') && Math.random() < 0.15) activeStatuses.push({ ...STATUSES['focused'], duration: 2 });

            activeStatuses.forEach(s => {
                if (s.id === 'anxious') nextGeneral.mindset -= 1.5;
                if (s.id === 'exhausted') nextGeneral.health -= 1.5;
                if (s.id === 'focused') nextGeneral.efficiency += 0.5;
                if (s.id === 'in_love') nextGeneral.mindset += 2;
                if (s.id === 'heartbroken') { nextGeneral.mindset -= 3; nextGeneral.efficiency -= 1; }
                if (s.id === 'debt') { nextGeneral.mindset -= 2; nextGeneral.romance -= 0.5; }
                if (s.id === 'crush_pending') { nextGeneral.luck += 0.5; nextGeneral.experience += 0.5; }
                if (s.id === 'crush') { nextGeneral.efficiency -= 0.4; nextGeneral.romance += 0.5; }
            });

            // Event Generation
            if (nextPhase === Phase.SUMMER && prev.week > 1) {
                if (Math.random() < 0.7) eventsToAdd.push(generateSummerLifeEvent(prev));
                if (prev.competition === 'OI' && Math.random() < 0.5) eventsToAdd.push(generateOIEvent(prev));
            }
            if (nextPhase === Phase.SEMESTER_1) {
                eventsToAdd.push(generateStudyEvent(prev));
                eventsToAdd.push(generateRandomFlavorEvent(prev));
                if (nextWeek === 15) eventsToAdd.push(SCIENCE_FESTIVAL_EVENT);
                if (nextWeek === 19) {
                    let gala = { ...NEW_YEAR_GALA_EVENT };
                    if (prev.romancePartner) {
                        // @ts-ignore
                        gala.choices = [{ text: `和${prev.romancePartner}溜出去逛街`, action: (s) => ({ general: { ...s.general, romance: s.general.romance + 30, mindset: s.general.mindset + 20, money: s.general.money - 50 }, activeStatuses: [...s.activeStatuses, { ...STATUSES['in_love'], duration: 5 }] }) }, ...(gala.choices || [])];
                    }
                    eventsToAdd.push(gala);
                }
            }

            const phaseEvents = PHASE_EVENTS[nextPhase] || [];
            const eligible = phaseEvents.filter(e => e.triggerType !== 'FIXED' && (!e.once || !prev.triggeredEvents.includes(e.id)) && (!e.condition || e.condition(prev)));
            const fixedWeekEvents = phaseEvents.filter(e => e.triggerType === 'FIXED' && e.fixedWeek === nextWeek);
            eventsToAdd.push(...fixedWeekEvents);
            
            let eventProb = nextPhase === Phase.SUMMER ? 0.4 : (nextPhase === Phase.MILITARY ? 1.0 : 0.4);
            if (eligible.length > 0 && Math.random() < eventProb) {
                eventsToAdd.push(eligible[Math.floor(Math.random() * eligible.length)]);
            }

            return {
                ...prev, phase: nextPhase, week: nextWeek, totalWeeksInPhase: nextTotal,
                general: nextGeneral, subjects: nextSubjects, activeStatuses, oiStats: nextOIStats,
                eventQueue: [...prev.eventQueue, ...eventsToAdd],
                log: [...prev.log, ...newLogs, { message: `Week ${nextWeek}`, type: 'info', timestamp: Date.now() }],
                weekendProcessed: false
            };
        });
    };

    const startGameState = (difficulty: Difficulty, customStats: GeneralStats, selectedTalents: Talent[]) => {
        const rolledSubjects = getInitialSubjects();
        (Object.keys(rolledSubjects) as SubjectKey[]).forEach(k => {
            rolledSubjects[k] = { aptitude: Math.floor(Math.random() * 40 + 60), level: Math.floor(Math.random() * 10 + 5) };
            if (difficulty === 'NORMAL') { rolledSubjects[k].aptitude += 15; rolledSubjects[k].level += 5; }
        });

        let initialGeneral = difficulty === 'CUSTOM' ? { ...customStats } : { ...DIFFICULTY_PRESETS[difficulty].stats };
        let initialStatuses: GameStatus[] = [];
        if (difficulty === 'REALITY') {
            initialStatuses.push({ ...STATUSES['anxious'], duration: 4 });
            initialStatuses.push({ ...STATUSES['debt'], duration: 2 });
        }

        let tempState: GameState = {
            ...getInitialGameState(),
            subjects: rolledSubjects,
            general: initialGeneral,
            initialGeneral: { ...initialGeneral },
            activeStatuses: initialStatuses,
            talents: selectedTalents,
            oiStats: getInitialOIStats(),
            difficulty
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
        setState(prev => ({
            ...tempState,
            unlockedAchievements: prev.unlockedAchievements,
            phase: Phase.SUMMER,
            week: 1,
            totalWeeksInPhase: 8,
            currentEvent: firstEvent || null,
            triggeredEvents: firstEvent ? [firstEvent.id] : [],
            log: [{ message: "八中模拟器启动。", type: 'success', timestamp: Date.now() }],
            isPlaying: false
        }));
        setTimeout(() => unlockAchievement('first_blood'), 100);
    };

    const handleChoice = (choice: any, visualsCallback?: (oldS: GameState, newS: GameState) => string[]) => {
        if (navigator.vibrate) navigator.vibrate(10);
        setState(prev => {
            const updates = choice.action(prev);
            const newState = { ...prev, ...updates };
            if (updates.general) newState.general = { ...prev.general, ...updates.general };
            
            const diffs = visualsCallback ? visualsCallback(prev, newState) : [];
            if (updates.sleepCount) diffs.push("睡觉次数+1");
            if (updates.rejectionCount) diffs.push("好人卡+1");
            if (diffs.length === 0) diffs.push("无明显变化");

            return { 
                ...newState, 
                eventResult: { choice, diff: diffs },
                history: [{ week: prev.week, phase: prev.phase, eventTitle: prev.currentEvent?.title || '', choiceText: choice.text, resultSummary: diffs.join(' | '), timestamp: Date.now() }, ...prev.history] 
            };
        });
    };

    const handleEventConfirm = () => {
        setState(s => {
            let nextEvent: GameEvent | null = null;
            if (s.eventResult?.choice.nextEventId) {
                 const allEvents = [...Object.values(PHASE_EVENTS).flat(), ...Object.values(CHAINED_EVENTS), ...Object.values(BASE_EVENTS)];
                 nextEvent = allEvents.find(e => e.id === s.eventResult?.choice.nextEventId) || null;
            }
            if (s.chainedEvent) nextEvent = s.chainedEvent;
            
            if (nextEvent) {
                return { ...s, currentEvent: nextEvent, chainedEvent: null, eventResult: null, triggeredEvents: [...s.triggeredEvents, nextEvent.id], isPlaying: false };
            }
            return { ...s, currentEvent: null, eventResult: null, isPlaying: true };
        });
    };

    const handleClubSelect = (clubId: ClubId) => {
        setState(prev => ({
            ...prev, club: clubId, isPlaying: true,
            log: [...prev.log, { message: `你加入了${CLUBS.find(c => c.id === clubId)?.name || '无社团'}。`, type: 'success', timestamp: Date.now() }]
        }));
    };

    const handleShopPurchase = (item: Item, visualsCallback?: () => void) => {
        setState(prev => {
            if (prev.general.money < item.price) return prev;
            if (visualsCallback) visualsCallback();
            const updates = item.effect(prev);
            return {
                ...prev, ...updates,
                general: { ...prev.general, ...updates.general },
                inventory: [...prev.inventory, item.id],
                log: [...prev.log, { message: `购买了${item.name}，消费${item.price}元。`, type: 'success', timestamp: Date.now() }]
            };
        });
    };

    const handleWeekendActivityClick = (activity: WeekendActivity, visualsCallback: (oldS: GameState, newS: GameState) => string[]) => {
        if (navigator.vibrate) navigator.vibrate(10);
        const updates = activity.action(state);
        const newState = { ...state, ...updates, general: { ...state.general, ...(updates.general || {}) } };
        if (updates.subjects) newState.subjects = { ...state.subjects, ...updates.subjects };
        if (updates.oiStats) newState.oiStats = { ...state.oiStats, ...updates.oiStats };
        
        const diffs = visualsCallback(state, newState);
        const resultText = typeof activity.resultText === 'function' ? activity.resultText(state) : activity.resultText;
        setWeekendResult({ activity, diff: diffs, resultText, newState });
    };

    const confirmWeekendActivity = () => {
        if (!weekendResult) return;
        setState(prev => {
            const nextAP = prev.weekendActionPoints - 1;
            const isFinished = nextAP <= 0;
            return {
                ...weekendResult.newState,
                weekendActionPoints: nextAP,
                isWeekend: !isFinished,
                isPlaying: isFinished,
                weekendProcessed: isFinished,
                log: [...prev.log, { message: `周末活动：${weekendResult.activity.name}`, type: 'info', timestamp: Date.now() }]
            };
        });
        setWeekendResult(null);
    };

    const handleExamFinish = (result: ExamResult) => {
        setState(prev => {
            // Exam Logic moved from App.tsx
            let nextPhase = prev.phase;
            let className = prev.className;
            let efficiencyMod = 0;
            let popupResult: CompetitionResultData | null = null;
            let popupExamResult = null;
            let triggeredEvent = prev.currentEvent;
            let logMsg = '';
            let nextTotalWeeks = prev.totalWeeksInPhase;
            let midtermRank = prev.midtermRank;
  
            let rank = 0;
            const totalStudents = 633; 
            const subjectsTaken = Object.keys(result.scores);
            let maxPossible = (prev.phase === Phase.CSP_EXAM || prev.phase === Phase.NOIP_EXAM) ? 400 : subjectsTaken.reduce((acc, sub) => acc + (['chinese', 'math', 'english'].includes(sub) ? 150 : 100), 0);
  
            if (result.totalScore >= maxPossible) { rank = 1; } 
            else {
                const ratio = maxPossible > 0 ? result.totalScore / maxPossible : 0;
                const percentile = 1 / (1 + Math.exp(-1.702 * ((ratio - 0.68) / 0.15)));
                rank = Math.max(1, Math.floor(totalStudents * (1 - percentile)) + 1);
            }
            
            if (rank === 1) unlockAchievement('top_rank');
            if (rank > totalStudents * 0.98) unlockAchievement('bottom_rank');
            if (prev.sleepCount >= 20 && rank <= 50) unlockAchievement('sleep_god');
            
            let perfectScore = false;
            Object.entries(result.scores).forEach(([sub, score]) => {
                const max = ['chinese', 'math', 'english'].includes(sub) ? 150 : 100;
                if (!['CSP_EXAM', 'NOIP_EXAM'].includes(prev.phase) && score >= max) perfectScore = true;
            });
            if (perfectScore) unlockAchievement('nerd');
  
            let hasFailed = false;
            Object.entries(result.scores).forEach(([sub, score]) => {
                 const max = ['chinese', 'math', 'english'].includes(sub) ? 150 : 100;
                 if (score / max <= 0.6) hasFailed = true;
            });
            if (hasFailed) triggeredEvent = BASE_EVENTS['exam_fail_talk'];
  
            if (prev.phase === Phase.PLACEMENT_EXAM) {
                if (result.totalScore > 540) { className = "一类实验班"; efficiencyMod = 4; }
                else if (result.totalScore > 480) { className = "二类实验班"; efficiencyMod = 2; }
                else { className = "普通班"; }
                nextPhase = Phase.SEMESTER_1; nextTotalWeeks = 21;
                logMsg = `分班考试结束，你被分配到了【${className}】。`;
            } else if (prev.phase === Phase.MIDTERM_EXAM) {
                nextPhase = Phase.SUBJECT_RESELECTION; midtermRank = rank;
                logMsg = `期中考试结束，年级排名: ${rank}。`;
            } else if (prev.phase === Phase.CSP_EXAM) {
                const award = result.totalScore >= 170 ? "一等奖" : result.totalScore >= 140 ? "二等奖" : "三等奖";
                popupResult = { title: "CSP-J/S 2026", score: result.totalScore, award };
            } else if (prev.phase === Phase.NOIP_EXAM) {
                const award = result.totalScore >= 144 ? "省一等奖" : result.totalScore >= 112 ? "省二等奖" : "省三等奖";
                popupResult = { title: "NOIP 2026", score: result.totalScore, award };
                if (award === "省一等奖") unlockAchievement('oi_god');
            } else if (prev.phase === Phase.FINAL_EXAM) {
                nextPhase = Phase.ENDING;
            }

            // For normal exams, show result popup then proceed
            if (!popupResult && prev.phase !== Phase.ENDING) {
                popupExamResult = { ...result, rank, totalStudents, nextPhase };
            }

            return {
                ...prev, className,
                general: { ...prev.general, efficiency: prev.general.efficiency + efficiencyMod },
                phase: popupResult ? prev.phase : (popupExamResult ? prev.phase : nextPhase), // If popup, stay to show it
                totalWeeksInPhase: nextTotalWeeks,
                examResult: { ...result, rank, totalStudents },
                midtermRank, currentEvent: triggeredEvent,
                popupCompetitionResult: popupResult,
                popupExamResult,
                log: [...prev.log, { message: logMsg || `${prev.phase} 结束。`, type: 'info', timestamp: Date.now() }]
            };
        });
    };

    const closeCompetitionPopup = () => {
        setState(prev => ({
            ...prev, popupCompetitionResult: null,
            competitionResults: prev.popupCompetitionResult ? [...prev.competitionResults, prev.popupCompetitionResult] : prev.competitionResults,
            phase: Phase.SEMESTER_1, isPlaying: true
        }));
    };

    const closeExamResult = () => {
        setState(prev => {
             if (!prev.popupExamResult) return prev;
             return { ...prev, popupExamResult: null, phase: prev.popupExamResult.nextPhase || prev.phase, isPlaying: true };
        });
    };

    return {
        state, setState, weekendResult, setWeekendResult, hasSave, saveGame, loadGame, unlockAchievement,
        startGameState, processWeekStep, handleChoice, handleEventConfirm, handleClubSelect, 
        handleShopPurchase, handleWeekendActivityClick, confirmWeekendActivity, 
        handleExamFinish, closeCompetitionPopup, closeExamResult, weekendOptions
    };
};