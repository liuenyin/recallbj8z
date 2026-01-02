
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Phase, GameState, GameEvent, SubjectKey, ExamResult, SubjectStats, GeneralStats, SUBJECT_NAMES, CompetitionResultData, Achievement, GameStatus } from './types';
import { PHASE_EVENTS, BASE_EVENTS, CHAINED_EVENTS, ACHIEVEMENTS, generateStudyEvent, generateRandomFlavorEvent, SCIENCE_FESTIVAL_EVENT, NEW_YEAR_GALA_EVENT, STATUSES } from './gameData';
import StatsPanel from './components/StatsPanel';
import ExamView from './components/ExamView';

// --- Constants & Helpers ---

const calculateProgress = (state: GameState) => {
  if (!state || state.totalWeeksInPhase === 0) return 0;
  return Math.min(100, (state.week / state.totalWeeksInPhase) * 100);
};

const INITIAL_SUBJECTS: Record<SubjectKey, SubjectStats> = {
  chinese: { aptitude: 0, level: 0 },
  math: { aptitude: 0, level: 0 },
  english: { aptitude: 0, level: 0 },
  physics: { aptitude: 0, level: 0 },
  chemistry: { aptitude: 0, level: 0 },
  biology: { aptitude: 0, level: 0 },
  history: { aptitude: 0, level: 0 },
  geography: { aptitude: 0, level: 0 },
  politics: { aptitude: 0, level: 0 },
};

const INITIAL_GENERAL: GeneralStats = {
  mindset: 50,
  experience: 10,
  luck: 50,
  romance: 10,
  health: 80,
  money: 20,
  efficiency: 10
};

const INITIAL_GAME_STATE: GameState = {
    isPlaying: false,
    eventQueue: [],
    phase: Phase.INIT,
    week: 0,
    totalWeeksInPhase: 0,
    subjects: INITIAL_SUBJECTS,
    general: INITIAL_GENERAL,
    selectedSubjects: [],
    competition: 'None',
    romancePartner: null,
    className: '待分班',
    log: [],
    currentEvent: null,
    chainedEvent: null,
    eventResult: null,
    history: [],
    examResult: null,
    competitionResults: [],
    popupCompetitionResult: null,
    triggeredEvents: [],
    isSick: false,
    isGrounded: false,
    debugMode: false,
    activeStatuses: [],
    unlockedAchievements: [],
    achievementPopup: null
};

// --- Main App Component ---

const App: React.FC = () => {
  const [view, setView] = useState<'HOME' | 'GAME'>('HOME');
  
  // Game State
  const [state, setState] = useState<GameState>(INITIAL_GAME_STATE);
  const [showHistory, setShowHistory] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.log]);

  // Load Achievements
  useEffect(() => {
      const saved = localStorage.getItem('bz_sim_achievements');
      if (saved) {
          setState(prev => ({ ...prev, unlockedAchievements: JSON.parse(saved) }));
      }
  }, []);

  const unlockAchievement = useCallback((id: string) => {
      setState(prev => {
          if (prev.unlockedAchievements.includes(id)) return prev;
          const newUnlocked = [...prev.unlockedAchievements, id];
          localStorage.setItem('bz_sim_achievements', JSON.stringify(newUnlocked));
          const ach = ACHIEVEMENTS[id];
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

  // --- Core Game Loop: Time Flow ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (state.isPlaying && !state.currentEvent && state.eventQueue.length === 0 && !state.popupCompetitionResult && state.phase !== Phase.ENDING && state.phase !== Phase.WITHDRAWAL) {
        interval = setInterval(() => {
            processWeekStep();
        }, 1500); // 1.5s per week
    }
    return () => clearInterval(interval);
  }, [state.isPlaying, state.currentEvent, state.eventQueue, state.popupCompetitionResult, state.phase]);

  // --- Core Game Loop: Queue Processing ---
  useEffect(() => {
      if (!state.currentEvent && state.eventQueue.length > 0 && !state.popupCompetitionResult) {
          const nextEvent = state.eventQueue[0];
          setState(prev => ({
              ...prev,
              currentEvent: nextEvent,
              eventQueue: prev.eventQueue.slice(1),
              isPlaying: false // Pause for event
          }));
      }
  }, [state.eventQueue, state.currentEvent, state.popupCompetitionResult]);


  const startGame = () => {
    const rolledSubjects = { ...INITIAL_SUBJECTS };
    (Object.keys(rolledSubjects) as SubjectKey[]).forEach(k => {
      rolledSubjects[k] = {
        aptitude: Math.floor(Math.random() * 40 + 60),
        level: Math.floor(Math.random() * 10 + 5)
      };
    });
    const firstEvent = PHASE_EVENTS[Phase.SUMMER].find(e => e.id === 'sum_goal_selection');
    unlockAchievement('first_blood');
    setState(prev => ({
      ...prev,
      phase: Phase.SUMMER,
      week: 1,
      totalWeeksInPhase: 5,
      subjects: rolledSubjects,
      currentEvent: firstEvent || null,
      triggeredEvents: firstEvent ? [firstEvent.id] : [],
      log: [{ message: "北京八中模拟器启动。", type: 'success', timestamp: Date.now() }],
      activeStatuses: [],
      className: '待分班',
      isPlaying: false,
      eventQueue: [],
      general: {
        mindset: Math.floor(Math.random() * 40 + 30),
        experience: Math.floor(Math.random() * 10 + 5),
        luck: Math.floor(Math.random() * 60 + 20),
        romance: Math.floor(Math.random() * 30 + 20), // Increased initial romance base from 10 to 20
        health: Math.floor(Math.random() * 30 + 70),
        money: Math.floor(Math.random() * 50 + 10),
        efficiency: 10
      }
    }));
    setView('GAME');
  };

  const endGame = () => {
      setState(prev => ({ ...prev, phase: Phase.WITHDRAWAL, isPlaying: false, currentEvent: null }));
  };

  const processWeekStep = () => {
      setState(prev => {
          // Check critical failures
          if (prev.general.health <= 0 || prev.general.mindset <= 0) return { ...prev, phase: Phase.WITHDRAWAL, isPlaying: false };
          if (prev.general.money >= 200) unlockAchievement('rich');
          if (prev.general.health < 10 && prev.phase === Phase.SEMESTER_1) unlockAchievement('survival');

          // Logic to Determine Next State
          let nextPhase = prev.phase;
          let nextWeek = prev.week + 1;
          let nextTotal = prev.totalWeeksInPhase;
          let eventsToAdd: GameEvent[] = [];
          let forcePause = false;

          // --- Phase Transition Logic ---
          if (prev.phase === Phase.SUMMER && prev.week >= 5) { 
              nextPhase = Phase.MILITARY; nextWeek = 1; nextTotal = 1; 
          } else if (prev.phase === Phase.MILITARY && prev.week >= 1) { 
              nextPhase = Phase.SELECTION; nextWeek = 0; forcePause = true;
          } else if (prev.phase === Phase.SEMESTER_1) {
              if (prev.competition === 'OI' && prev.week === 10) { nextPhase = Phase.CSP_EXAM; forcePause = true; }
              else if (prev.week === 11) { nextPhase = Phase.MIDTERM_EXAM; forcePause = true; } 
              else if (prev.competition === 'OI' && prev.week === 18) { nextPhase = Phase.NOIP_EXAM; forcePause = true; }
              else if (prev.week >= 21) { nextPhase = Phase.FINAL_EXAM; nextWeek = 0; forcePause = true; }
          }

          // If Phase Changed due to exams/selection, stop timer and return
          if (nextPhase !== prev.phase) {
              return {
                  ...prev,
                  phase: nextPhase,
                  week: nextWeek,
                  totalWeeksInPhase: nextTotal,
                  isPlaying: false
              };
          }

          // --- Weekly Logic (Same Phase) ---

          // 1. Decay & Status Effects
          let activeStatuses = prev.activeStatuses.map(s => ({ ...s, duration: s.duration - 1 })).filter(s => s.duration > 0);
          
          // Money Allowance
          let updatedGeneral = { ...prev.general, health: Math.max(0, prev.general.health - 0.8), money: prev.general.money + 2 };

          // Debt Check Logic (Condition-based status)
          if (updatedGeneral.money <= 0) {
             if (!activeStatuses.find(s => s.id === 'debt')) {
                 activeStatuses.push({ ...STATUSES['debt'], duration: 1 }); // Re-adds every week if condition met
             } else {
                 // Refresh duration
                 activeStatuses = activeStatuses.map(s => s.id === 'debt' ? { ...s, duration: 1 } : s);
             }
          } else {
             // Remove debt if money positive
             activeStatuses = activeStatuses.filter(s => s.id !== 'debt');
          }

          // Crush Pending Logic
          if (updatedGeneral.romance >= 25 && !prev.romancePartner) {
              if (Math.random() < 0.2 && !activeStatuses.find(s => s.id === 'crush_pending')) {
                   activeStatuses.push({ ...STATUSES['crush_pending'], duration: 3 });
              }
          }

          // Apply Status Effects
          activeStatuses.forEach(s => {
              if (s.id === 'anxious') updatedGeneral.mindset -= 2;
              if (s.id === 'exhausted') updatedGeneral.health -= 2;
              if (s.id === 'focused') updatedGeneral.efficiency += 2;
              if (s.id === 'in_love') updatedGeneral.mindset += 5;
              if (s.id === 'debt') { updatedGeneral.mindset -= 5; updatedGeneral.romance -= 3; }
              if (s.id === 'crush_pending') { updatedGeneral.luck += 2; updatedGeneral.experience += 2; }
          });

          // 2. Generate Events for this week
          
          // A. Study Event (Always happens in Semester 1)
          if (nextPhase === Phase.SEMESTER_1) {
              eventsToAdd.push(generateStudyEvent(prev));
              
              // B. Random Flavor Event
              eventsToAdd.push(generateRandomFlavorEvent(prev));

              // C. Fixed Events
              if (nextWeek === 15) eventsToAdd.push(SCIENCE_FESTIVAL_EVENT);
              if (nextWeek === 19) {
                  // If in love, enhance the New Year event description or options via logic, 
                  // but here we just push the generic wrapper which handles it via conditional choices in data or just flavor text
                  let gala = { ...NEW_YEAR_GALA_EVENT };
                  if (prev.romancePartner) {
                      gala.choices = [
                          { 
                            text: `和${prev.romancePartner}溜出去逛街`, 
                            action: (s) => ({ 
                                general: { ...s.general, romance: s.general.romance + 30, mindset: s.general.mindset + 20, money: s.general.money - 50 },
                                activeStatuses: [...s.activeStatuses, { ...STATUSES['in_love'], duration: 5 }] 
                            }) 
                          },
                          ...(gala.choices || [])
                      ];
                  }
                  eventsToAdd.push(gala);
              }
          }

          // D. Phase specific random events (Summer/Military)
          const phaseEvents = PHASE_EVENTS[nextPhase] || [];
          const eligible = phaseEvents.filter(e => e.triggerType !== 'FIXED' && (!e.once || !prev.triggeredEvents.includes(e.id)) && (!e.condition || e.condition(prev)));
          
          // INCREASED PROBABILITY FOR SUMMER/MILITARY as requested
          let eventProb = 0.4;
          if (nextPhase === Phase.SUMMER || nextPhase === Phase.MILITARY) {
              eventProb = 0.8; 
          }

          if (eligible.length > 0 && Math.random() < eventProb) {
              eventsToAdd.push(eligible[Math.floor(Math.random() * eligible.length)]);
          }

          return {
            ...prev,
            phase: nextPhase, 
            week: nextWeek, 
            totalWeeksInPhase: nextTotal,
            general: updatedGeneral,
            activeStatuses,
            eventQueue: [...prev.eventQueue, ...eventsToAdd],
            log: [...prev.log, { message: `Week ${nextWeek}`, type: 'info', timestamp: Date.now() }]
          };
      });
  };

  const handleChoice = (choice: any) => {
    setState(prev => {
      const updates = choice.action(prev);
      const diff: string[] = [];

      // Diff Logic (Simplified for brevity, same as before)
      if (updates.general) {
          const newG = updates.general as GeneralStats;
          const oldG = prev.general;
          if (Math.floor(newG.mindset) !== Math.floor(oldG.mindset)) diff.push(`心态 ${newG.mindset - oldG.mindset > 0 ? '+' : ''}${Math.floor(newG.mindset - oldG.mindset)}`);
          if (Math.floor(newG.health) !== Math.floor(oldG.health)) diff.push(`健康 ${newG.health - oldG.health > 0 ? '+' : ''}${Math.floor(newG.health - oldG.health)}`);
          if (Math.floor(newG.money) !== Math.floor(oldG.money)) diff.push(`金钱 ${newG.money - oldG.money > 0 ? '+' : ''}${Math.floor(newG.money - oldG.money)}`);
          if (Math.floor(newG.romance) !== Math.floor(oldG.romance)) diff.push(`魅力 ${newG.romance - oldG.romance > 0 ? '+' : ''}${Math.floor(newG.romance - oldG.romance)}`);
      }
      if (updates.subjects) diff.push("学科能力变动");
      if (updates.activeStatuses) diff.push("状态更新");
      if (diff.length === 0) diff.push("无明显变化");

      return { 
          ...prev, 
          ...updates, 
          eventResult: { choice, diff }, 
          history: [{ 
              week: prev.week, 
              phase: prev.phase, 
              eventTitle: prev.currentEvent?.title || '', 
              choiceText: choice.text, 
              resultSummary: diff.join(' | '), 
              timestamp: Date.now() 
          }, ...prev.history] 
      };
    });
  };

  const handleEventConfirm = () => {
    setState(s => {
        let nextEvent: GameEvent | null = null;
        if (s.eventResult?.choice.nextEventId) {
            nextEvent = [...Object.values(PHASE_EVENTS).flat(), ...Object.values(CHAINED_EVENTS), ...Object.values(BASE_EVENTS)].find(e => e.id === s.eventResult?.choice.nextEventId) || null;
        }
        if (s.chainedEvent) nextEvent = s.chainedEvent;

        if (nextEvent) {
             // If chained, process immediately, queue stays same
             return { ...s, currentEvent: nextEvent, chainedEvent: null, eventResult: null, triggeredEvents: [...s.triggeredEvents, nextEvent.id] };
        }
        
        // No chain, clear current, effect will pick up next in queue
        return { ...s, currentEvent: null, eventResult: null };
    });
  };

  const handleExamFinish = (result: ExamResult) => {
      setState(prev => {
          let nextPhase = prev.phase;
          let className = prev.className;
          let efficiencyMod = 0;
          let popupResult: CompetitionResultData | null = null;
          let triggeredEvent = prev.currentEvent;
          let logMsg = '';
          let nextTotalWeeks = prev.totalWeeksInPhase;

          // Rank Check
          let rank = 0;
          let totalStudents = 633; // Approx grade size
          // Simulate rank based on total score ratio. 
          // Max score approx: 1050 (for 6 subs) + bonus. 
          // Let's simplified logic: 
          const maxPossible = (result.totalScore / 1050) > 1 ? result.totalScore : 1050; // Dynamic cap
          const ratio = result.totalScore / maxPossible;
          // Normal distribution-ish rank
          rank = Math.max(1, Math.floor(totalStudents * (1 - Math.pow(ratio, 2))));
          
          if (rank === 1) unlockAchievement('top_rank');
          if (rank > totalStudents * 0.98) unlockAchievement('bottom_rank');

          // Achievement Check: Nerd (Perfect Score)
          let perfectScore = false;
          Object.entries(result.scores).forEach(([sub, score]) => {
              const max = ['chinese', 'math', 'english'].includes(sub) ? 150 : 100;
              if (score >= max) perfectScore = true;
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
              nextPhase = Phase.SEMESTER_1;
              nextTotalWeeks = 21;
              logMsg = `分班考试结束，你被分配到了【${className}】。`;

          } else if (prev.phase === Phase.MIDTERM_EXAM) {
              nextPhase = Phase.SUBJECT_RESELECTION;
              logMsg = "期中考试结束，请重新审视你的选科。";
          } else if (prev.phase === Phase.CSP_EXAM) {
              const award = result.totalScore >= 155 ? "一等奖" : result.totalScore >= 100 ? "二等奖" : "三等奖";
              popupResult = { title: "CSP-J/S 2025", score: result.totalScore, award };
              return { ...prev, popupCompetitionResult: popupResult, examResult: result };
          } else if (prev.phase === Phase.NOIP_EXAM) {
              const award = result.totalScore >= 145 ? "省一等奖" : result.totalScore >= 115 ? "省二等奖" : "省三等奖";
              popupResult = { title: "NOIP 2025", score: result.totalScore, award };
              if (award === "省一等奖") unlockAchievement('oi_god');
              return { ...prev, popupCompetitionResult: popupResult, examResult: result };
          } else if (prev.phase === Phase.FINAL_EXAM) {
              nextPhase = Phase.ENDING;
          }

          return {
              ...prev,
              className,
              general: { ...prev.general, efficiency: prev.general.efficiency + efficiencyMod },
              phase: nextPhase,
              totalWeeksInPhase: nextTotalWeeks,
              examResult: { ...result, rank, totalStudents },
              currentEvent: triggeredEvent,
              log: [...prev.log, { message: logMsg || `${prev.phase} 结束。`, type: 'info', timestamp: Date.now() }]
          };
      });
  };

  const closeCompetitionPopup = () => {
      setState(prev => {
          if (!prev.popupCompetitionResult) return prev;
          const newHistory = [...prev.competitionResults, prev.popupCompetitionResult];
          return {
              ...prev,
              popupCompetitionResult: null,
              competitionResults: newHistory,
              phase: Phase.SEMESTER_1,
              isPlaying: true, // Resume play after popup
              log: [...prev.log, { message: "竞赛征程暂时告一段落。", type: 'success', timestamp: Date.now() }]
          };
      });
  };

  if (view === 'HOME') {
      return (
          <div className="h-screen bg-white flex flex-col items-center justify-center p-10 font-sans relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                 <div className="absolute top-10 left-10 text-9xl font-black rotate-12">8</div>
                 <div className="absolute bottom-10 right-10 text-9xl font-black -rotate-12">OI</div>
             </div>
             <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl mb-8 transform -rotate-6 z-10">
                <i className="fas fa-school text-white text-5xl"></i>
             </div>
             <h1 className="text-6xl font-black text-slate-800 mb-4 tracking-tighter z-10">八中重开模拟器</h1>
             <p className="text-slate-400 mb-10 text-xl font-medium z-10">Made by lg37,致谢:OI重开模拟器</p>
             <button onClick={startGame} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-black text-xl shadow-xl transition-all hover:scale-105 flex items-center gap-3"><i className="fas fa-play"></i> 开启模拟</button>
          </div>
      );
  }

  // --- GAME VIEW ---
  return (
    <div className="h-screen bg-slate-100 flex p-4 gap-4 overflow-hidden font-sans text-slate-900 relative">
      {/* Toast */}
      {state.achievementPopup && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[60] bg-slate-800 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-fadeIn border border-slate-700">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-slate-900 text-xl shadow-lg border-2 border-white"><i className={`fas ${state.achievementPopup.icon}`}></i></div>
              <div>
                  <div className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">Achievement Unlocked</div>
                  <div className="font-black text-lg">{state.achievementPopup.title}</div>
              </div>
          </div>
      )}

      {/* Sidebar */}
      <aside className="w-80 flex-shrink-0 flex flex-col gap-4">
          <StatsPanel state={state} />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setShowHistory(true)} className="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center font-bold text-slate-600">
              <i className="fas fa-archive text-indigo-500 mb-1"></i><span className="text-xs">历程</span>
            </button>
            <button onClick={() => setShowAchievements(true)} className="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center font-bold text-slate-600 relative">
                 <i className="fas fa-trophy text-yellow-500 mb-1"></i><span className="text-xs">成就</span>
                 <span className="absolute top-2 right-2 bg-slate-100 text-[9px] px-1.5 rounded-full">{state.unlockedAchievements.length}</span>
            </button>
            <button onClick={endGame} className="col-span-2 bg-rose-100 hover:bg-rose-200 p-2 rounded-xl text-xs font-bold text-rose-600 transition-colors">提前退休（结束游戏）</button>
          </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col gap-4 relative">
        <header className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col gap-3">
               <div className="flex items-center justify-between">
                   <div className="flex flex-col gap-1">
                       <h2 className="font-black text-slate-800 text-lg flex items-center gap-2 uppercase tracking-tight">
                            <span className={`w-2 h-2 rounded-full ${state.isSick ? 'bg-red-500 animate-pulse' : 'bg-indigo-500'}`}></span> {state.phase} 
                        </h2>
                        {/* Status Bar Fix: Explicit Height & Layout */}
                        <div className="flex gap-2 min-h-[24px] items-center flex-wrap">
                            {state.activeStatuses.length > 0 ? state.activeStatuses.map(s => (
                                <div key={s.id} className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold shadow-sm ${s.type === 'BUFF' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : s.type === 'DEBUFF' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                                    <i className={`fas ${s.icon}`}></i> {s.name} ({s.duration}w)
                                </div>
                            )) : <span className="text-[10px] text-slate-300 font-medium italic">无特殊状态</span>}
                        </div>
                   </div>
                   
                   {/* Play/Pause Control */}
                   <button 
                      onClick={() => setState(p => ({ ...p, isPlaying: !p.isPlaying }))} 
                      disabled={!!state.currentEvent}
                      className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all ${state.currentEvent ? 'bg-slate-100 text-slate-300' : state.isPlaying ? 'bg-amber-400 text-white hover:bg-amber-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                   >
                      <i className={`fas ${state.isPlaying ? 'fa-pause' : 'fa-play'} text-xl`}></i>
                   </button>
               </div>
               <div className="flex items-center gap-2 w-full">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${calculateProgress(state)}%` }}></div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">Week {state.week}/{state.totalWeeksInPhase || '-'}</span>
               </div>
        </header>

        {/* Log Area */}
        <div className="flex-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 overflow-y-auto custom-scroll space-y-3">
             {state.log.map((l, i) => (
                <div key={i} className={`p-3 rounded-xl border-l-4 animate-fadeIn ${l.type === 'event' ? 'bg-indigo-50 border-indigo-400' : l.type === 'success' ? 'bg-emerald-50 border-emerald-400' : l.type === 'error' ? 'bg-rose-50 border-rose-400' : 'bg-slate-50 border-slate-300'}`}>
                   <p className="text-sm font-medium">{l.message}</p>
                </div>
             ))}
             <div ref={logEndRef} />
        </div>

        {/* Event Modal Overlay */}
        {state.currentEvent && (
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-8 z-20 animate-fadeIn">
               <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-xl w-full border border-slate-200">
                  {!state.eventResult ? (
                    <>
                      <div className="flex justify-between items-start mb-4">
                          <h2 className="text-2xl font-black text-slate-800">{state.currentEvent.title}</h2>
                          {state.eventQueue.length > 0 && <span className="bg-rose-100 text-rose-600 text-[10px] font-bold px-2 py-1 rounded-full">+{state.eventQueue.length} 更多事件</span>}
                      </div>
                      <p className="text-slate-600 mb-8 text-lg leading-relaxed">{state.currentEvent.description}</p>
                      <div className="space-y-3">
                         {state.currentEvent.choices?.map((c, i) => (
                           <button key={i} onClick={() => handleChoice(c)} className="w-full text-left p-4 rounded-2xl bg-slate-50 hover:bg-indigo-600 hover:text-white border border-slate-200 transition-all font-bold group flex justify-between items-center">
                              {c.text}
                              <i className="fas fa-chevron-right opacity-0 group-hover:opacity-100 transition-all"></i>
                           </button>
                         ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl"><i className="fas fa-check"></i></div>
                      <h2 className="text-xl font-black text-slate-800 mb-2 italic">"{state.eventResult.choice.text}"</h2>
                      {state.eventResult.diff.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2 mb-8 mt-4">
                           {state.eventResult.diff.map((d, i) => (
                             <span key={i} className={`px-3 py-1 rounded-full text-xs font-bold ${d.includes('+') ? 'bg-emerald-50 text-emerald-700' : d.includes('-') ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'}`}>{d}</span>
                           ))}
                        </div>
                      )}
                      <button onClick={handleEventConfirm} className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-lg hover:bg-indigo-700 shadow-xl">
                           {(state.chainedEvent || state.eventResult.choice.nextEventId) ? '继续...' : '确认结果'}
                      </button>
                    </div>
                  )}
               </div>
            </div>
        )}
        
        {/* Exams / Selection / Endings */}
        {(state.phase === Phase.SELECTION || state.phase === Phase.SUBJECT_RESELECTION) && (
            <div className="absolute inset-0 bg-white rounded-3xl z-30 p-10 flex flex-col items-center justify-center">
               <h2 className="text-3xl font-black mb-4">高一选科</h2>
               <div className="grid grid-cols-3 gap-4 mb-10 w-full max-w-lg">
                  {(['physics', 'chemistry', 'biology', 'history', 'geography', 'politics'] as SubjectKey[]).map(s => (
                    <button key={s} onClick={() => setState(prev => ({ ...prev, selectedSubjects: prev.selectedSubjects.includes(s) ? prev.selectedSubjects.filter(x => x !== s) : (prev.selectedSubjects.length < 3 ? [...prev.selectedSubjects, s] : prev.selectedSubjects) }))}
                      className={`p-4 rounded-2xl border-2 transition-all font-bold ${state.selectedSubjects.includes(s) ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                      {SUBJECT_NAMES[s]}
                    </button>
                  ))}
               </div>
               <button disabled={state.selectedSubjects.length !== 3} onClick={() => setState(prev => ({ ...prev, phase: prev.phase === Phase.SELECTION ? Phase.PLACEMENT_EXAM : Phase.SEMESTER_1 }))} className="bg-indigo-600 disabled:bg-slate-200 text-white px-12 py-4 rounded-2xl font-black text-xl shadow-xl">确认选择</button>
            </div>
        )}
        
        {(state.phase === Phase.PLACEMENT_EXAM || state.phase === Phase.FINAL_EXAM || state.phase === Phase.MIDTERM_EXAM || state.phase === Phase.CSP_EXAM || state.phase === Phase.NOIP_EXAM) && (
             <div className="absolute inset-0 z-40">
                 <ExamView 
                    title={state.phase === Phase.PLACEMENT_EXAM ? "分班考试" : state.phase === Phase.CSP_EXAM ? "CSP 认证" : "期末考试"} 
                    state={state} 
                    onFinish={handleExamFinish} 
                 />
             </div>
        )}

        {/* Final Settlement Overlay */}
        {(state.phase === Phase.ENDING || state.phase === Phase.WITHDRAWAL) && (
            <div className="absolute inset-0 z-50 bg-slate-900 text-white flex flex-col items-center justify-center p-10 animate-fadeIn">
                <h1 className="text-4xl font-black mb-6 tracking-tight text-center">
                    {state.phase === Phase.WITHDRAWAL ? 'BAD ENDING' : 'GAME OVER'}
                </h1>
                <p className="text-xl mb-10 text-slate-300 text-center max-w-xl">
                    {state.phase === Phase.WITHDRAWAL ? "你的高一生活因故提前结束了。也许休息一下，重新开始会更好。" : "你完成了北京八中高一上学期的全部挑战。这是一段难忘的旅程。"}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl mb-10">
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                        <h3 className="text-slate-400 font-bold mb-4 uppercase text-xs tracking-widest border-b border-slate-700 pb-2">最终属性</h3>
                        <div className="space-y-3 font-mono text-sm">
                            <div className="flex justify-between"><span>心态</span><span className={state.general.mindset > 80 ? 'text-emerald-400' : 'text-indigo-400'}>{state.general.mindset.toFixed(0)}</span></div>
                            <div className="flex justify-between"><span>健康</span><span className={state.general.health > 80 ? 'text-emerald-400' : state.general.health < 30 ? 'text-rose-400' : 'text-indigo-400'}>{state.general.health.toFixed(0)}</span></div>
                            <div className="flex justify-between"><span>金钱</span><span className="text-yellow-400">{state.general.money.toFixed(0)}</span></div>
                            <div className="flex justify-between"><span>综合效率</span><span className="text-blue-400">{state.general.efficiency.toFixed(0)}</span></div>
                        </div>
                    </div>
                     <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                        <h3 className="text-slate-400 font-bold mb-4 uppercase text-xs tracking-widest border-b border-slate-700 pb-2">学业成就</h3>
                        <div className="space-y-3 text-sm">
                             <div className="flex justify-between"><span>最终班级</span><span className="font-bold">{state.className}</span></div>
                             <div className="flex justify-between"><span>选择竞赛</span><span className="font-bold">{state.competition}</span></div>
                             <div className="flex justify-between"><span>解锁成就</span><span className="text-yellow-400 font-bold">{state.unlockedAchievements.length} 个</span></div>
                             {state.examResult?.rank && <div className="flex justify-between"><span>最终排名</span><span className="text-indigo-400 font-bold">#{state.examResult.rank} / {state.examResult.totalStudents}</span></div>}
                        </div>
                    </div>
                </div>

                <button onClick={() => setView('HOME')} className="bg-white text-slate-900 px-12 py-4 rounded-full font-black text-lg hover:scale-105 transition-transform shadow-lg hover:shadow-white/20">
                    <i className="fas fa-redo mr-2"></i> 重开模拟
                </button>
            </div>
        )}

        {state.popupCompetitionResult && (
             <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md animate-fadeIn">
                <div className="bg-white rounded-[40px] p-12 text-center max-w-lg shadow-2xl relative border-4 border-yellow-400">
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg border-4 border-white"><i className="fas fa-trophy text-white text-4xl"></i></div>
                    <h3 className="text-3xl font-black text-slate-800 mt-6 mb-2">{state.popupCompetitionResult.title}</h3>
                    <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
                        <div className="text-4xl font-black text-indigo-600 mb-2">{state.popupCompetitionResult.score} pts</div>
                        <div className="text-2xl font-bold text-yellow-600">{state.popupCompetitionResult.award}</div>
                    </div>
                    <button onClick={closeCompetitionPopup} className="bg-indigo-600 text-white px-12 py-4 rounded-2xl font-black text-xl hover:bg-indigo-700 shadow-xl">收入囊中</button>
                </div>
             </div>
        )}

        {showAchievements && (
             <div className="absolute inset-0 z-[60] flex justify-center items-center bg-slate-900/50 backdrop-blur-sm animate-fadeIn" onClick={() => setShowAchievements(false)}>
                <div className="bg-white rounded-[40px] p-8 max-w-4xl w-full h-3/4 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6">
                         <h2 className="text-3xl font-black text-slate-800">成就墙</h2>
                         <button onClick={() => setShowAchievements(false)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"><i className="fas fa-times"></i></button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scroll grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.values(ACHIEVEMENTS).map(ach => (
                            <div key={ach.id} className={`p-4 rounded-2xl border flex items-center gap-4 ${state.unlockedAchievements.includes(ach.id) ? 'bg-indigo-50 border-indigo-200' : 'opacity-50 grayscale'}`}>
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow"><i className={`fas ${ach.icon} text-indigo-500`}></i></div>
                                <div><h4 className="font-bold">{ach.title}</h4><p className="text-xs">{ach.description}</p></div>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
        )}

        {showHistory && (
             <div className="absolute inset-0 z-[60] flex justify-end bg-slate-900/40 backdrop-blur-sm animate-fadeIn" onClick={() => setShowHistory(false)}>
                <div className="w-96 bg-white h-full shadow-2xl p-8 flex flex-col animate-slideInRight" onClick={e => e.stopPropagation()}>
                   <div className="flex justify-between items-center mb-8 border-b pb-4">
                      <h2 className="text-2xl font-black text-slate-800 tracking-tight">故事线存档</h2>
                      <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-800 text-xl"><i className="fas fa-times"></i></button>
                   </div>
                   <div className="flex-1 overflow-y-auto custom-scroll space-y-6">
                      {state.history.length === 0 ? <div className="text-slate-300 text-center py-20 italic">尚未开启故事...</div> : 
                        state.history.map((h, i) => (
                          <div key={i} className="relative pl-6 border-l-2 border-indigo-100">
                             <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white shadow-sm"></div>
                             <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{h.phase} | Week {h.week}</div>
                             <h4 className="font-black text-slate-800 mt-1">{h.eventTitle}</h4>
                             <p className="text-xs text-slate-600 mt-1">决策：{h.choiceText}</p>
                             <div className="mt-2 text-[10px] font-bold text-slate-400 bg-slate-50 p-2 rounded-lg">{h.resultSummary}</div>
                          </div>
                        ))}
                   </div>
                </div>
             </div>
        )}
      </main>
    </div>
  );
};

export default App;
