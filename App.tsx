import React, { useState, useRef } from 'react';
import { Difficulty, GeneralStats, Talent, Phase, GameState } from './types';
import { DIFFICULTY_PRESETS } from './data/constants';
import { CLUBS, SHOP_ITEMS, ACHIEVEMENTS, TALENTS } from './data/mechanics';
import { useGameLogic } from './hooks/useGameLogic';

// Component Imports
import StatsPanel from './components/StatsPanel';
import ExamView from './components/ExamView';
import HomeView from './components/HomeView';
import TalentView from './components/TalentView';
import EndingScreen from './components/EndingScreen';
import EventModal from './components/EventModal';
import FloatingTextLayer, { FloatingTextItem } from './components/FloatingTextLayer';
import RealityGuideModal from './components/RealityGuideModal';
import { SUBJECT_NAMES, SubjectKey } from './types';

const App: React.FC = () => {
  // UI State (View Routing & Modals)
  const [view, setView] = useState<'HOME' | 'TALENTS' | 'GAME'>('HOME');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('NORMAL');
  const [customStats, setCustomStats] = useState<GeneralStats>({ mindset: 50, experience: 10, luck: 50, romance: 10, health: 80, money: 20, efficiency: 10 });
  const [showClubSelection, setShowClubSelection] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showRealityGuide, setShowRealityGuide] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Floating Text Visuals
  const [floatingTexts, setFloatingTexts] = useState<FloatingTextItem[]>([]);
  const spawnFloatingText = (text: string, x: number, y: number, type: string) => {
      let color = '#374151';
      if (type === 'mindset') color = '#3b82f6';
      else if (type === 'health') color = text.includes('+') ? '#10b981' : '#ef4444';
      else if (type === 'money') color = '#fbbf24';
      else if (type === 'efficiency') color = '#a855f7';
      else if (type === 'romance') color = '#f43f5e';
      else if (type === 'oi') color = '#6366f1';
      
      const newText: FloatingTextItem = { id: Date.now() + Math.random(), text, x, y, color };
      setFloatingTexts(prev => [...prev, newText]);
      setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== newText.id)), 1500);
  };

  const calculateAndVisualizeDiff = (oldState: GameState, newState: GameState, x?: number, y?: number) => {
      const diffs: string[] = [];
      const check = (key: keyof GeneralStats, label: string, colorType: string) => {
           const delta = newState.general[key] - oldState.general[key];
           if (Math.abs(delta) >= 1) {
               const val = Math.floor(delta);
               const text = `${label} ${val > 0 ? '+' : ''}${val}`;
               diffs.push(text);
               setTimeout(() => spawnFloatingText(text, (x || window.innerWidth/2) + (Math.random() * 40 - 20), (y || window.innerHeight/2) + (Math.random() * 40 - 20), colorType), diffs.length * 100);
           }
       };
       check('mindset', '心态', 'mindset');
       check('health', '健康', 'health');
       check('money', '金钱', 'money');
       check('romance', '魅力', 'romance');
       check('efficiency', '效率', 'efficiency');
       return diffs;
  };

  // --- Logic Hook ---
  const { 
      state, setState, weekendResult, setWeekendResult, hasSave, saveGame, loadGame,
      startGameState, handleChoice, handleEventConfirm, handleClubSelect, handleShopPurchase, 
      handleWeekendActivityClick, confirmWeekendActivity, handleExamFinish, closeCompetitionPopup, closeExamResult,
      weekendOptions 
  } = useGameLogic();

  // Scroll Log Effect
  React.useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.log]);

  // Check for Club Selection Trigger from Logic
  React.useEffect(() => {
      if (state.phase === Phase.SEMESTER_1 && state.week === 2 && !state.club && !showClubSelection) {
          setShowClubSelection(true);
      }
  }, [state.phase, state.week, state.club]);

  // --- Talent & Start Logic ---
  const [availableTalents, setAvailableTalents] = useState<Talent[]>([]);
  const [selectedTalents, setSelectedTalents] = useState<Talent[]>([]);
  const [talentPoints, setTalentPoints] = useState(3);

  const prepareGame = () => {
      setWeekendResult(null); setShowClubSelection(false); setShowRealityGuide(false);
      const pool = [...TALENTS]; // Assumes import
      const buffs = pool.filter(t => t.cost > 0).sort(() => 0.5 - Math.random()).slice(0, 5);
      const debuffs = pool.filter(t => t.cost < 0).sort(() => 0.5 - Math.random()).slice(0, 4);
      setAvailableTalents([...buffs, ...debuffs].sort(() => 0.5 - Math.random()));
      setSelectedTalents([]);
      setTalentPoints(selectedDifficulty === 'HARD' ? 1 : (selectedDifficulty === 'REALITY' ? 0 : 3));
      setView('TALENTS');
  };

  const handleStartGame = () => {
      startGameState(selectedDifficulty, customStats, selectedTalents);
      setView('GAME');
  };

  const handleTalentToggle = (talent: Talent) => {
      if (selectedTalents.find(t => t.id === talent.id)) {
          setTalentPoints(p => p + talent.cost);
          setSelectedTalents(prev => prev.filter(t => t.id !== talent.id));
      } else {
          if (selectedTalents.length >= 5) return;
          setTalentPoints(p => p - talent.cost);
          setSelectedTalents(prev => [...prev, talent]);
      }
  };

  const handleLoadGame = () => {
      if (loadGame()) setView('GAME');
  };

  // --- Helper for Render ---
  const calculateProgress = () => state.totalWeeksInPhase === 0 ? 0 : Math.min(100, (state.week / state.totalWeeksInPhase) * 100);
  
  const getEndingData = () => {
     // Simplified ending calculation for display (Move logic to hook if needed for complexity)
     const score = state.general.mindset + state.general.health + state.general.efficiency * 5 + state.unlockedAchievements.length * 50;
     let rank = "B";
     if (state.phase === Phase.WITHDRAWAL) return { rank: "F", title: "遗憾离场", comment: "身体是革命的本钱。", score };
     if (score > 1000) rank = "SSS"; else if (score > 800) rank = "S"; else if (score > 600) rank = "A";
     return { rank, title: "高中毕业生", comment: "你的高中生活结束了。", score };
  };

  // --- Views ---

  if (view === 'HOME') {
      return (
          <HomeView 
            selectedDifficulty={selectedDifficulty} onDifficultyChange={setSelectedDifficulty}
            customStats={customStats} onCustomStatsChange={setCustomStats}
            onStart={prepareGame} hasSave={hasSave} onLoadGame={handleLoadGame}
            unlockedAchievements={state.unlockedAchievements}
          />
      );
  }

  if (view === 'TALENTS') {
      return (
          <TalentView 
            availableTalents={availableTalents} selectedTalents={selectedTalents} talentPoints={talentPoints}
            onToggleTalent={handleTalentToggle} onConfirm={handleStartGame} onBack={() => setView('HOME')}
          />
      )
  }

  return (
    <div className="h-[100dvh] bg-slate-100 flex flex-col md:flex-row p-2 md:p-4 gap-2 md:gap-4 overflow-hidden font-sans text-slate-900 relative">
      <div className={`fixed inset-0 pointer-events-none z-[50] transition-all duration-1000 ${state.general.health < 30 ? 'opacity-100' : 'opacity-0'}`} style={{ boxShadow: 'inset 0 0 100px rgba(255, 0, 0, 0.3)' }}></div>
      <FloatingTextLayer items={floatingTexts} />
      {showRealityGuide && <RealityGuideModal onClose={() => setShowRealityGuide(false)} />}
      
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
      <aside className="w-full md:w-80 flex-shrink-0 flex flex-col gap-2 md:gap-4 max-h-[30vh] md:max-h-full overflow-y-auto md:overflow-visible custom-scroll">
          <StatsPanel state={state} onShowGuide={() => setShowRealityGuide(true)} />
          <div className="hidden md:grid grid-cols-2 gap-2">
            <button onClick={() => setShowShop(true)} className="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center font-bold text-slate-600 active:scale-95">
                 <i className="fas fa-store text-emerald-500 mb-1"></i><span className="text-xs">小卖部</span>
            </button>
            <button onClick={() => setShowHistory(true)} className="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center font-bold text-slate-600 active:scale-95">
              <i className="fas fa-archive text-indigo-500 mb-1"></i><span className="text-xs">历程</span>
            </button>
            <button onClick={() => setShowAchievements(true)} className="col-span-2 bg-white border border-slate-200 p-3 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center font-bold text-slate-600 relative active:scale-95">
                 <i className="fas fa-trophy text-yellow-500 mb-1"></i><span className="text-xs">成就</span>
                 <span className="absolute top-2 right-2 bg-slate-100 text-[9px] px-1.5 rounded-full">{state.unlockedAchievements.length}</span>
            </button>
            <button onClick={saveGame} className="col-span-1 bg-emerald-100 hover:bg-emerald-200 p-2 rounded-xl text-xs font-bold text-emerald-600 transition-colors disabled:opacity-50 active:scale-95" disabled={!!state.currentEvent}>保存进度</button>
            <button onClick={() => setState(p => ({...p, phase: Phase.WITHDRAWAL}))} className="col-span-1 bg-rose-100 hover:bg-rose-200 p-2 rounded-xl text-xs font-bold text-rose-600 transition-colors active:scale-95">提前退休</button>
          </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col gap-2 md:gap-4 relative h-full overflow-hidden">
        {/* Mobile Toolbar */}
        <div className="flex md:hidden gap-2 overflow-x-auto pb-1 flex-shrink-0">
             <button onClick={() => setShowShop(true)} className="flex-shrink-0 bg-white border px-3 py-2 rounded-xl text-xs font-bold shadow-sm"><i className="fas fa-store text-emerald-500 mr-1"></i>小卖部</button>
             <button onClick={() => setShowAchievements(true)} className="flex-shrink-0 bg-white border px-3 py-2 rounded-xl text-xs font-bold shadow-sm"><i className="fas fa-trophy text-yellow-500 mr-1"></i>成就</button>
             <button onClick={() => setShowHistory(true)} className="flex-shrink-0 bg-white border px-3 py-2 rounded-xl text-xs font-bold shadow-sm"><i className="fas fa-archive text-indigo-500 mr-1"></i>历程</button>
             <button onClick={saveGame} className="flex-shrink-0 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl text-xs font-bold text-emerald-600 shadow-sm" disabled={!!state.currentEvent}>保存</button>
        </div>

        {/* Header */}
        <header className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col gap-3 flex-shrink-0 z-20 relative">
               <div className="flex items-center justify-between">
                   <div className="flex flex-col gap-1 w-full mr-4">
                       <h2 className="font-black text-slate-800 text-lg flex items-center gap-2 uppercase tracking-tight truncate">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${state.isSick ? 'bg-red-500 animate-pulse' : 'bg-indigo-500'}`}></span> {state.phase} 
                        </h2>
                        <div className="flex gap-2 items-center flex-wrap">
                            {state.activeStatuses.map(s => (
                                <div key={s.id} className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold ${s.type === 'BUFF' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : s.type === 'DEBUFF' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                                    <i className={`fas ${s.icon}`}></i> {s.name} ({s.duration}w)
                                </div>
                            ))}
                            {state.talents.map(t => (
                                <div key={t.id} className="flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold bg-purple-50 border-purple-200 text-purple-700">
                                     <i className="fas fa-star"></i> {t.name}
                                </div>
                            ))}
                        </div>
                   </div>
                   <button 
                      onClick={() => setState(p => ({ ...p, isPlaying: !p.isPlaying }))} 
                      disabled={!!state.currentEvent || state.isWeekend || !!weekendResult}
                      className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex-shrink-0 flex items-center justify-center shadow-xl transition-all ${state.currentEvent || state.isWeekend || weekendResult ? 'bg-slate-100 text-slate-300' : state.isPlaying ? 'bg-amber-400 text-white hover:bg-amber-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                   >
                      <i className={`fas ${state.isPlaying ? 'fa-pause' : 'fa-play'} text-xl`}></i>
                   </button>
               </div>
               <div className="flex items-center gap-2 w-full">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${calculateProgress()}%` }}></div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">Week {state.week}/{state.totalWeeksInPhase || '-'}</span>
               </div>
        </header>

        {/* Log */}
        <div className="flex-1 bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 overflow-y-auto custom-scroll space-y-3 relative">
             {state.log.map((l, i) => (
                <div key={i} className={`p-3 rounded-xl border-l-4 animate-fadeIn ${l.type === 'event' ? 'bg-indigo-50 border-indigo-400' : l.type === 'success' ? 'bg-emerald-50 border-emerald-400' : l.type === 'error' ? 'bg-rose-50 border-rose-400' : 'bg-slate-50 border-slate-300'}`}>
                   <p className="text-sm font-medium text-slate-800">{l.message}</p>
                </div>
             ))}
             <div ref={logEndRef} />
        </div>

        {/* --- Overlays & Modals --- */}
        
        {/* Weekend Menu */}
        {state.isWeekend && !weekendResult && (
             <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-30 flex items-center justify-center p-4 md:p-8 animate-fadeIn">
                 <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-w-xl w-full border border-slate-200 max-h-[90vh] overflow-y-auto custom-scroll">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-black text-slate-800"><i className="fas fa-coffee text-amber-500 mr-2"></i>周末自由活动</h2>
                        <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold text-xs">剩余: {state.weekendActionPoints}</div>
                    </div>
                    <div className="space-y-3">
                       {weekendOptions.map(activity => (
                           <button key={activity.id} onClick={(e) => handleWeekendActivityClick(activity, (oldS, newS) => calculateAndVisualizeDiff(oldS, newS, e.clientX, e.clientY))}
                               className="w-full text-left p-4 rounded-2xl bg-slate-50 hover:bg-indigo-600 hover:text-white border border-slate-200 transition-all group flex justify-between items-center active:scale-95"
                           >
                               <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-lg shadow-sm flex-shrink-0 ${activity.type === 'OI' ? 'bg-indigo-500 group-hover:bg-white group-hover:text-indigo-600' : activity.type === 'LOVE' ? 'bg-rose-500 group-hover:bg-white group-hover:text-rose-600' : 'bg-slate-400 group-hover:bg-white group-hover:text-slate-600'}`}>
                                      <i className={`fas ${activity.icon}`}></i>
                                  </div>
                                  <div className="flex flex-col">
                                      <span className="font-bold text-base">{activity.name}</span>
                                      <span className="text-[10px] opacity-60 font-normal">{activity.description}</span>
                                  </div>
                               </div>
                               <i className="fas fa-chevron-right opacity-0 group-hover:opacity-100 transition-all"></i>
                           </button>
                       ))}
                    </div>
                 </div>
             </div>
        )}

        {/* Weekend Result */}
        {weekendResult && (
             <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-40 flex items-center justify-center p-4 animate-fadeIn">
                 <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center border-t-8 border-indigo-500">
                     <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl text-white shadow-lg ${weekendResult.activity.type === 'OI' ? 'bg-indigo-500' : weekendResult.activity.type === 'LOVE' ? 'bg-rose-500' : 'bg-amber-400'}`}>
                         <i className={`fas ${weekendResult.activity.icon}`}></i>
                     </div>
                     <h3 className="text-2xl font-black text-slate-800 mb-2">{weekendResult.activity.name}</h3>
                     <p className="text-slate-600 mb-6 leading-relaxed text-lg">{weekendResult.resultText}</p>
                     <div className="flex flex-wrap justify-center gap-2 mb-8">
                         {weekendResult.diff.map((d, i) => (
                           <span key={i} className={`px-3 py-1 rounded-full text-xs font-bold ${d.includes('+') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{d}</span>
                         ))}
                     </div>
                     <button onClick={confirmWeekendActivity} className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-lg hover:bg-indigo-700 shadow-xl transition-all active:scale-95">确定</button>
                 </div>
             </div>
        )}

        {/* Event Modal */}
        {state.currentEvent && (
            <EventModal 
                event={state.currentEvent} state={state} eventResult={state.eventResult}
                onChoice={(c, e) => handleChoice(c, (oldS, newS) => calculateAndVisualizeDiff(oldS, newS, e.clientX, e.clientY))} 
                onConfirm={handleEventConfirm}
            />
        )}

        {/* Exams */}
        {(state.phase === Phase.PLACEMENT_EXAM || state.phase === Phase.FINAL_EXAM || state.phase === Phase.MIDTERM_EXAM || state.phase === Phase.CSP_EXAM || state.phase === Phase.NOIP_EXAM) && (
             <div className="absolute inset-0 z-40 rounded-2xl overflow-hidden">
                 <ExamView title={state.phase} state={state} onFinish={handleExamFinish} />
             </div>
        )}

        {/* Popup Results (Competitions/Exams) */}
        {state.popupCompetitionResult && (
             <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md animate-fadeIn p-4">
                <div className="bg-white rounded-[40px] p-8 md:p-12 text-center max-w-lg w-full shadow-2xl relative border-4 border-yellow-400">
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg border-4 border-white"><i className="fas fa-trophy text-white text-4xl"></i></div>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-800 mt-6 mb-2">{state.popupCompetitionResult.title}</h3>
                    <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
                        <div className="text-4xl font-black text-indigo-600 mb-2">{state.popupCompetitionResult.score} pts</div>
                        <div className="text-2xl font-bold text-yellow-600">{state.popupCompetitionResult.award}</div>
                    </div>
                    <button onClick={closeCompetitionPopup} className="bg-indigo-600 text-white px-12 py-4 rounded-2xl font-black text-xl hover:bg-indigo-700 shadow-xl w-full">收入囊中</button>
                </div>
             </div>
        )}

        {state.popupExamResult && (
             <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md animate-fadeIn p-4">
                <div className="bg-white rounded-[40px] p-8 md:p-12 text-center max-w-lg w-full shadow-2xl relative border-4 border-yellow-400">
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg border-4 border-white"><i className="fas fa-file-alt text-white text-4xl"></i></div>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-800 mt-6 mb-2">{state.popupExamResult.title}</h3>
                    <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
                        <div className="text-4xl font-black text-indigo-600 mb-2">{state.popupExamResult.totalScore}</div>
                        <div className="text-xl font-bold text-slate-500">年级排名: {state.popupExamResult.rank}</div>
                    </div>
                    <button onClick={closeExamResult} className="bg-indigo-600 text-white px-12 py-4 rounded-2xl font-black text-xl hover:bg-indigo-700 shadow-xl w-full">继续</button>
                </div>
             </div>
        )}

        {/* Selection */}
        {(state.phase === Phase.SELECTION || state.phase === Phase.SUBJECT_RESELECTION) && (
            <div className="absolute inset-0 bg-white/95 z-30 p-4 md:p-10 flex flex-col items-center justify-center rounded-2xl">
               <h2 className="text-3xl font-black mb-4">高一选科</h2>
               <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-10 w-full max-w-lg">
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

        {/* Club Selection */}
        {showClubSelection && (
             <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                 <div className="bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl">
                     <h2 className="text-3xl font-black text-center mb-2">百团大战</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto custom-scroll p-2">
                         {CLUBS.map(club => (
                             <button key={club.id} onClick={() => { handleClubSelect(club.id); setShowClubSelection(false); }}
                                 className="p-4 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left flex flex-col gap-2 group active:scale-95"
                             >
                                 <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-indigo-500"><i className={`fas ${club.icon}`}></i></div>
                                     <span className="font-bold text-lg text-slate-800">{club.name}</span>
                                 </div>
                                 <p className="text-xs text-slate-500">{club.description}</p>
                                 <div className="mt-auto pt-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit">{club.effectDescription}</div>
                             </button>
                         ))}
                         <button onClick={() => { handleClubSelect('none'); setShowClubSelection(false); }} className="p-4 rounded-2xl border-2 border-slate-100 hover:border-slate-400 hover:bg-slate-50 transition-all text-left flex flex-col justify-center items-center gap-2 text-slate-400 active:scale-95">
                             <span className="font-bold">不参加社团</span>
                         </button>
                     </div>
                 </div>
             </div>
        )}

        {/* Shop */}
        {showShop && (
             <div className="absolute inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={() => setShowShop(false)}>
                 <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl relative" onClick={e => e.stopPropagation()}>
                     <div className="flex justify-between items-center mb-6">
                         <div><h2 className="text-2xl font-black text-slate-800">八中小卖部</h2><p className="text-sm text-slate-500">持有金钱: <span className="text-yellow-600 font-bold">{state.general.money}</span></p></div>
                         <button onClick={() => setShowShop(false)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center z-[105] text-slate-500"><i className="fas fa-times"></i></button>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto custom-scroll p-1 mb-4">
                         {SHOP_ITEMS.map(item => (
                             <button key={item.id} onClick={() => handleShopPurchase(item, () => spawnFloatingText(`-${item.price}`, window.innerWidth/2, window.innerHeight/2, 'money'))} disabled={state.general.money < item.price} className="p-4 rounded-xl border border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left flex items-center gap-4 group disabled:opacity-50">
                                 <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:text-indigo-600"><i className={`fas ${item.icon} text-xl`}></i></div>
                                 <div className="flex-1"><div className="flex justify-between items-center"><span className="font-bold text-slate-800">{item.name}</span><span className="text-sm font-bold text-yellow-600">{item.price} G</span></div><p className="text-xs text-slate-400 mt-1">{item.description}</p></div>
                             </button>
                         ))}
                     </div>
                 </div>
             </div>
        )}

        {/* History */}
        {showHistory && (
             <div className="absolute inset-0 z-[60] flex justify-end bg-slate-900/40 backdrop-blur-sm animate-fadeIn" onClick={() => setShowHistory(false)}>
                <div className="w-full md:w-96 bg-white h-full shadow-2xl p-6 md:p-8 flex flex-col animate-slideInRight" onClick={e => e.stopPropagation()}>
                   <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
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

        {/* Achievements */}
        {showAchievements && (
             <div className="absolute inset-0 z-[60] flex justify-center items-center bg-slate-900/50 backdrop-blur-sm animate-fadeIn p-4" onClick={() => setShowAchievements(false)}>
                <div className="bg-white rounded-[40px] p-6 md:p-8 max-w-4xl w-full h-3/4 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6">
                         <div><h2 className="text-3xl font-black text-slate-800">成就墙</h2></div>
                         <button onClick={() => setShowAchievements(false)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><i className="fas fa-times"></i></button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scroll grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.values(ACHIEVEMENTS).map(ach => (
                            <div key={ach.id} className={`p-4 rounded-2xl border flex items-center gap-4 ${state.unlockedAchievements.includes(ach.id) ? 'bg-indigo-50 border-indigo-200' : 'opacity-50 grayscale'}`}>
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow flex-shrink-0"><i className={`fas ${ach.icon} text-indigo-500`}></i></div>
                                <div><h4 className="font-bold text-sm md:text-base text-slate-800">{ach.title}</h4><p className="text-[10px] md:text-xs text-slate-500">{ach.description}</p></div>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
        )}
        
        {/* Ending */}
        {(state.phase === Phase.ENDING || state.phase === Phase.WITHDRAWAL) && (
            <EndingScreen 
                state={state}
                endingData={getEndingData()}
                onRestart={() => setView('HOME')}
                onViewHistory={() => setShowHistory(true)}
            />
        )}

      </main>
    </div>
  );
};

export default App;