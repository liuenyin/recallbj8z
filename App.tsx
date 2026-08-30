
import React, { useState, useRef } from 'react';
import { AiConfig, Difficulty, GeneralStats, Talent, Phase, GameState, Challenge } from './types';
import { DIFFICULTY_PRESETS } from './data/constants';
import { CLUBS, SHOP_ITEMS, ACHIEVEMENTS, TALENTS } from './data/mechanics';
import { useGameLogic } from './hooks/useGameLogic';

// Component Imports
import StatsPanel from './components/StatsPanel';
import TimetableModal from './components/TimetableModal';
import ContestHistoryModal from './components/ContestHistoryModal';
import ExamView from './components/ExamView';
import HomeView from './components/HomeView';
import TalentView from './components/TalentView';
import EndingScreen from './components/EndingScreen';
import EventModal from './components/EventModal';
import FloatingTextLayer, { FloatingTextItem } from './components/FloatingTextLayer';
import RealityGuideModal from './components/RealityGuideModal';
import { loadAiConfig, saveAiConfig } from './lib/gemini';
import { getActiveAccountId, getAccounts, setActiveAccountId } from './lib/accounts';
import AccountModal from './components/AccountModal';

import { SUBJECT_NAMES, SubjectKey } from './types';

const App: React.FC = () => {
  const [isDevMode, setIsDevMode] = useState(false);

  // UI State (View Routing & Modals)
  const [view, setView] = useState<'HOME' | 'TALENTS' | 'GAME'>('HOME');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('NORMAL');
  const [customStats, setCustomStats] = useState<GeneralStats>({ mindset: 50, experience: 10, luck: 50, romance: 10, health: 80, money: 20, efficiency: 10, excitement: 40 });
  const [showClubSelection, setShowClubSelection] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showRealityGuide, setShowRealityGuide] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showContestHistory, setShowContestHistory] = useState(false);
  const [pendingChallenge, setPendingChallenge] = useState<Challenge | null>(null);
  const [aiConfig, setAiConfig] = useState<AiConfig>(() => loadAiConfig());
  const [activeAccountId, setAccountId] = useState(() => getActiveAccountId());
  const [showAccounts, setShowAccounts] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const [floatingTexts, setFloatingTexts] = useState<FloatingTextItem[]>([]);
  const spawnFloatingText = (text: string, x: number, y: number, type: string) => {
      let color = '#374151';
      if (type === 'mindset') color = '#3b82f6';
      else if (type === 'health') color = text.includes('+') ? '#10b981' : '#ef4444';
      else if (type === 'money') color = '#fbbf24';
      else if (type === 'efficiency') color = '#a855f7';
      else if (type === 'romance') color = '#f43f5e';
      else if (type === 'experience') color = '#f97316';
      else if (type === 'luck') color = '#8b5cf6';
      else if (type === 'excitement') color = '#f97316';
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
               const val = Math.round(delta * 10) / 10;
               if (val === 0) return;
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
      check('experience', '经验', 'experience');
      check('luck', '运气', 'luck');
      check('excitement', '兴奋', 'excitement');
      const fatigueDelta = newState.fatigue - oldState.fatigue;
      if (Math.abs(fatigueDelta) >= 1) {
          const val = Math.round(fatigueDelta * 10) / 10;
          const text = `疲劳 ${val > 0 ? '+' : ''}${val}`;
          diffs.push(text);
          setTimeout(() => spawnFloatingText(text, (x || window.innerWidth / 2) + (Math.random() * 40 - 20), (y || window.innerHeight / 2) + (Math.random() * 40 - 20), val > 0 ? 'health' : 'mindset'), diffs.length * 100);
      }
      return diffs;
  };

  const { 
      state, setState, hasSave, saveGame, loadGame,
      startGameState, handleChoice, handleEventConfirm, handleClubSelect, handleShopPurchase, 
      executeTimetable, handleExamFinish, closeCompetitionPopup, closeExamResult, closeMiniGame,
      weekendOptions 
  } = useGameLogic(aiConfig, activeAccountId);

  React.useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.log]);

  React.useEffect(() => {
      if (state.phase === Phase.SEMESTER_1 && state.week === 2 && !state.hasSelectedClub && !showClubSelection) {
          setShowClubSelection(true);
      }
  }, [state.phase, state.week, state.hasSelectedClub, showClubSelection]);

  const [availableTalents, setAvailableTalents] = useState<Talent[]>([]);
  const [selectedTalents, setSelectedTalents] = useState<Talent[]>([]);
  const [talentPoints, setTalentPoints] = useState(3);

  const prepareGame = (challenge?: Challenge) => {
      setShowClubSelection(false); setShowRealityGuide(false);
      setPendingChallenge(challenge || null);
      
      const pool = [...TALENTS];
      const buffs = pool.filter(t => t.cost > 0).sort(() => 0.5 - Math.random()).slice(0, 5);
      const debuffs = pool.filter(t => t.cost < 0).sort(() => 0.5 - Math.random()).slice(0, 4);
      setAvailableTalents([...buffs, ...debuffs].sort(() => 0.5 - Math.random()));
      setSelectedTalents([]);
      setTalentPoints(DIFFICULTY_PRESETS[selectedDifficulty as keyof typeof DIFFICULTY_PRESETS]?.talentPoints ?? (selectedDifficulty === 'HARD' ? 1 : ((selectedDifficulty === 'REALITY') ? 0 : 3)));
      setView('TALENTS');
  };

  const handleStartGame = () => {
      startGameState(selectedDifficulty, customStats, selectedTalents, pendingChallenge);
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

  const handleAiConfigChange = (config: AiConfig) => {
      setAiConfig(config);
      saveAiConfig(config);
  };

  const calculateProgress = () => state.totalWeeksInPhase === 0 ? 0 : Math.min(100, (state.week / state.totalWeeksInPhase) * 100);
  
  const getEndingData = () => {
     if (state.phase === Phase.WITHDRAWAL) {
         return { rank: "F", title: "退学离场", comment: "遗憾离场...", score: 0 };
     }

      // Calculate score from subject levels (main academic measure)
      const subjectAvg = (Object.values(state.subjects) as Array<{ level: number }>).reduce((sum, s) => sum + s.level, 0) / Object.keys(state.subjects).length;
      const projectCount = state.completedProjects.length;
      const oiPower = Object.entries(state.oiStats)
        .filter(([key]) => key !== 'history')
        .reduce((sum, [, value]) => sum + Number(value || 0), 0);
      // Academic performance remains the backbone, while completed experiences make
      // different routes matter in the final report.
      let score = subjectAvg * 1.5 + state.general.experience * 0.3 + state.general.efficiency * 0.4;
      score += Math.min(8, projectCount * 3);
      if (state.club && state.club !== 'none') score += 3;
      if (state.flags.rival_resolved) score += 3;
      // Exam performance bonus
      if (state.examResult?.totalScore) score += state.examResult.totalScore / 20;
      // Clamp to 0-100 range
      score = Math.min(100, Math.max(0, score));

     let noiMedal = state.flags.noi_medal;
     let provincialTeam = state.flags.provincial_team;
     const moContestResult = state.flags.mo_contest_result;
     const moSetter = state.flags.mo_setter === true;
     const oiSetter = state.flags.oi_setter === true;
     const oiProblemDrafted = state.flags.oi_problem_drafted === true;
     const oiSetterFollowup = state.flags.oi_setter_followup;
     const overworked = state.general.health <= 0 || (state.fatigue >= 90 && state.general.health < 35);
     const balancedLife = !!state.romancePartner && state.general.health >= 60 && state.fatigue <= 60;
     const clubOrganizer = !!state.club && state.club !== 'none' && state.general.experience >= 50;
     const projectFinisher = projectCount > 0;
     const rivalGrowth = !!state.flags.rival_resolved;

     let rank = 'C';
     let title = '普通高中生';
     let comment = '高一学年结束了。前面的路，以后再来探索吧。';

     if (noiMedal === 'GOLD') {
       rank = 'SSS';
       title = '清北保送生（国集）';
       comment = '你在最高荣誉殿堂 NOI 中斩获金牌！高一即保送清华北大，前面的路，以后再来探索吧。';
     } else if (noiMedal === 'SILVER') {
       rank = 'SS';
       title = '强基破格入围者';
       comment = '你在 NOI 中拿到银牌，获得了申请相关强基计划的竞争机会。前面的路，以后再来探索吧。';
     } else if (noiMedal === 'BRONZE' || (!noiMedal && provincialTeam)) {
       rank = 'S';
       title = '省队巨佬';
       comment = '你在校内资源有限的情况下冲入省队，留下了一笔少见而扎实的成绩。前面的路，以后再来探索吧。';
     } else if (noiMedal === 'PARTICIPANT') {
       rank = score >= 75 ? 'A' : 'B';
       title = 'NOI 参赛者';
       comment = '你走完了省队到 NOI 的赛程，但这次没有拿到奖牌。分数和名次都记下了，之后是否继续由你决定。';
     } else if (overworked) {
       rank = 'F';
       title = '过劳警告';
       comment = '你把太多时间交给了成绩，却没有给身体留下恢复的余地。学年结束时，健康和疲劳一起亮起了红灯。';
     } else if (balancedLife) {
       rank = score >= 75 ? 'A' : 'B';
       title = '平衡生活者';
       comment = `你在${state.romancePartner}的陪伴、学业和健康之间找到了自己的节奏。成绩不是唯一答案，但你确实把这一年过得很完整。`;
     } else if (state.competition === 'OI' && oiPower >= 12 && !oiProblemDrafted) {
       rank = score >= 75 ? 'A' : 'B';
       title = 'OI 探索者';
       comment = '你参加了训练、线上赛和复盘。暂时没有奖牌，但已经知道下一步要补哪些题。';
     } else if (state.competition === 'OI' && oiSetterFollowup === 'accepted') {
       rank = score >= 75 ? 'A' : 'B';
       title = 'OI 命题与竞赛实践者';
       comment = '你一边准备比赛，一边把题目交给别人验。你已经走过题面、数据和赛后讨论这一整套流程。';
     } else if (state.competition === 'OI' && oiSetter && oiProblemDrafted) {
       rank = score >= 75 ? 'A' : 'B';
       title = 'OI 出题实践者';
       comment = '你把一个算法想法写成了题面、样例和数据，别人真的拿它参加了比赛。';
     } else if (state.competition === 'MO' && moContestResult === 'medal') {
       rank = score >= 75 ? 'A' : 'B';
       title = '数学竞赛获奖者';
       comment = moSetter
         ? '你在数学竞赛中拿到奖项，也参与过命题和证明审稿。会解题，也会把严谨的想法交给别人检验。'
         : '你在数学竞赛中拿到奖项，把一张张草稿纸上的尝试变成了稳定的解题能力。下一道题还在等你。';
     } else if (state.competition === 'MO' && moSetter) {
       rank = score >= 75 ? 'A' : 'B';
       title = '数学命题实践者';
       comment = '你参与过命题、讨论难度，也为证明中的每一个关键步骤负责。竞赛之外，你留下了一套真正能被别人使用的数学表达。';
     } else if (state.competition === 'MO' && !!moContestResult) {
       rank = score >= 75 ? 'A' : 'B';
       title = '数学竞赛探索者';
       comment = '你沿着训练课、解题小组和正式赛场走了一遍。结果并不完美，但你已经知道自己想继续追哪一类问题。';
     } else if (clubOrganizer) {
       rank = score >= 75 ? 'A' : 'B';
       title = '社团组织者';
       comment = '你把时间投入到一群人和一件具体的事里，学会了组织、沟通，也留下了课堂分数之外的作品和记忆。';
     } else if (projectFinisher) {
       rank = score >= 75 ? 'A' : 'B';
       title = '项目完成者';
       comment = `你完成了${projectCount}个长期项目。真正的成长不是“想做什么”，而是把它推进到可以交付的那一天。`;
     } else if (rivalGrowth) {
       rank = score >= 75 ? 'A' : 'B';
       title = '竞争与成长';
       comment = '你没有把对手变成敌人，而是在一次次较量和和解里看见了自己的边界。有人同行，成长会更清晰。';
     } else if (score >= 90) {
       rank = 'S';
       title = '年级学神';
       comment = '凭借不可思议的学识与思维，你制霸了年级榜单。前面的路，以后再来探索吧。';
     } else if (score >= 75) {
       rank = 'A';
       title = '尖子生';
       comment = '你是老师眼中的好学生，985/211 如同探囊取物。前面的路，以后再来探索吧。';
     } else if (score >= 60) {
       rank = 'B';
       title = '中流砥柱';
       comment = '你稳扎稳打，处于年级中上游，一本重点大学稳操胜券。前面的路，以后再来探索吧。';
     } else if (score >= 40) {
       rank = 'C';
       title = '芸芸众生';
       comment = '你的成绩中规中矩，不过青春不只有分数。前面的路，以后再来探索吧。';
     } else if (score >= 20) {
       rank = 'D';
       title = '学业危机';
       comment = '你的学业似乎遇到了麻烦。如果不加倍努力，前路坎坷。前面的路，以后再来探索吧。';
     } else {
       rank = 'Z';
       title = '家里蹲预备役';
       comment = '这一年你彻底放飞了自我。前面的路，以后再来探索吧，或者现在就重开。';
     }

     return { rank, title, comment, score: Math.round(score) };
  };

  if (view === 'HOME') {
      return (
          <>
            <HomeView
              selectedDifficulty={selectedDifficulty} onDifficultyChange={setSelectedDifficulty}
              customStats={customStats} onCustomStatsChange={setCustomStats}
              onStart={prepareGame} hasSave={hasSave} onLoadGame={handleLoadGame}
              unlockedAchievements={state.unlockedAchievements}
              aiConfig={aiConfig} onAiConfigChange={handleAiConfigChange}
              account={getAccounts().find(account => account.id === activeAccountId) || getAccounts()[0]}
              onManageAccounts={() => setShowAccounts(true)}
            />
            {showAccounts && <AccountModal activeAccountId={activeAccountId} onClose={() => setShowAccounts(false)} onChanged={(id) => { setActiveAccountId(id); setAccountId(id); }} />}
          </>
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

  const isWarmMood = state.activeStatuses.some(status => status.id === 'in_love');
  const isDangerState = state.general.health <= 30 || state.fatigue >= 85;
  const isCriticalState = state.general.health <= 15 || state.fatigue >= 95;
  const isOverstimulated = (state.general.excitement ?? 0) >= 80;

  const getAtmosphereTheme = () => {
      if (isWarmMood) return "bg-gradient-to-br from-amber-50 via-rose-50 to-orange-100";
      if (state.phase === Phase.SUMMER || state.phase === Phase.SUMMER_BREAK || state.phase === Phase.MILITARY) return "bg-gradient-to-br from-green-100 to-emerald-200";
      if (state.phase === Phase.WINTER_BREAK) return "bg-gradient-to-br from-slate-100 to-blue-100";
      if (state.phase === Phase.SEMESTER_1) return state.week <= 8 ? "bg-gradient-to-br from-orange-50 to-amber-100" : "bg-gradient-to-br from-slate-100 to-blue-50";
      if (state.phase === Phase.SEMESTER_2) return state.week <= 10 ? "bg-gradient-to-br from-emerald-100 to-teal-50" : "bg-gradient-to-br from-green-50 to-emerald-100";
      return "bg-slate-100";
  };

  return (
    <div className={`h-[100dvh] transition-all duration-1000 ${getAtmosphereTheme()} ${state.general.mindset <= 20 ? 'grayscale-[0.9] contrast-125 transition-all duration-[3000ms]' : ''} flex flex-col md:flex-row p-2 md:p-4 gap-2 md:gap-4 overflow-hidden font-sans text-slate-900 relative`}>
            {showContestHistory && <ContestHistoryModal state={state} onClose={() => setShowContestHistory(false)} />}
      {isDangerState && <div className={`fixed inset-0 pointer-events-none z-[15] transition-opacity duration-1000 ${isCriticalState ? 'screen-danger-flicker' : 'screen-danger-vignette'}`} aria-hidden="true"></div>}
      {isWarmMood && <div className="fixed inset-0 pointer-events-none z-[15] screen-warm-glow" aria-hidden="true"></div>}
      {isOverstimulated && !isDangerState && <div className="fixed inset-0 pointer-events-none z-[15] bg-amber-300/5" aria-hidden="true"></div>}
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
      <div className="hidden md:block w-72 flex-shrink-0 z-20">
        <StatsPanel state={state} onShowGuide={() => setShowRealityGuide(true)} />
      </div>
      

      {/* Main Area */}
      <main className="flex-1 flex flex-col gap-2 md:gap-4 relative h-full overflow-hidden">
        
        {/* Mobile Toolbar */}
        <div className="flex md:hidden gap-2 overflow-x-auto pb-1 flex-shrink-0">
             <button onClick={() => setShowSchedule(true)} className="flex-shrink-0 bg-white border px-3 py-2 rounded-xl text-xs font-bold shadow-sm"><i className="fas fa-calendar-alt text-blue-500 mr-1"></i>时间表</button>
             <button onClick={() => setShowShop(true)} className="flex-shrink-0 bg-white border px-3 py-2 rounded-xl text-xs font-bold shadow-sm"><i className="fas fa-store text-emerald-500 mr-1"></i>小卖部</button>
             <button onClick={() => setShowAchievements(true)} className="flex-shrink-0 bg-white border px-3 py-2 rounded-xl text-xs font-bold shadow-sm"><i className="fas fa-trophy text-yellow-500 mr-1"></i>成就</button>
             <button onClick={() => setShowHistory(true)} className="flex-shrink-0 bg-white border px-3 py-2 rounded-xl text-xs font-bold shadow-sm"><i className="fas fa-archive text-indigo-500 mr-1"></i>历程</button>
             <button onClick={saveGame} className="flex-shrink-0 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl text-xs font-bold text-emerald-600 shadow-sm" disabled={!!state.currentEvent}>保存</button>
             <button onClick={() => setState(p => ({...p, phase: Phase.WITHDRAWAL}))} className="flex-shrink-0 bg-rose-50 border border-rose-100 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 shadow-sm" disabled={!!state.currentEvent}>提前退休</button>
        </div>

        {/* Header */}

        <header className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col gap-3 flex-shrink-0 z-20 relative">
               <div className="hidden md:flex absolute top-4 right-4 gap-2">
                  <button onClick={() => setShowSchedule(true)} className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-white hover:shadow transition-all"><i className="fas fa-calendar-alt text-blue-500 mr-1"></i>时间表</button>
                  <button onClick={() => setShowShop(true)} className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-white hover:shadow transition-all"><i className="fas fa-store text-emerald-500 mr-1"></i>小卖铺</button>
                  <button onClick={() => setShowAchievements(true)} className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-white hover:shadow transition-all"><i className="fas fa-trophy text-yellow-500 mr-1"></i>成就</button>
                  <button onClick={() => setShowHistory(true)} className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-white hover:shadow transition-all"><i className="fas fa-archive text-indigo-500 mr-1"></i>历程</button>
                  <button onClick={saveGame} disabled={!!state.currentEvent} className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-600 hover:bg-emerald-100 transition-all">保存</button>
                  <button onClick={() => setState(p => ({...p, phase: Phase.WITHDRAWAL}))} className="bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-100 transition-all">退休</button>
               </div>
               <div className="flex items-center justify-between mt-0 md:mt-8">
                   <div className="flex flex-col gap-1 w-full mr-4">
                       <h2 className="font-black text-slate-800 text-lg flex items-center gap-2 uppercase tracking-tight truncate">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${state.isSick ? 'bg-red-500 animate-pulse' : 'bg-indigo-500'}`}></span> {state.phase} 
                        </h2>
                        <div className="flex gap-2 items-center flex-wrap">
                            {state.activeStatuses.map(s => (
                                <div key={s.id} title={`${s.description}${s.effectDescription ? ` ${s.effectDescription}` : ''}`} className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold ${s.type === 'BUFF' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : s.type === 'DEBUFF' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
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
                      disabled={!!state.currentEvent || state.isWeekend }
                      className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex-shrink-0 flex items-center justify-center shadow-xl transition-all ${state.currentEvent || state.isWeekend  ? 'bg-slate-100 text-slate-300' : state.isPlaying ? 'bg-amber-400 text-white hover:bg-amber-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
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
        <div className="flex-1 bg-white/70 backdrop-blur-xl rounded-2xl p-4 md:p-6 shadow-sm border border-white/40 overflow-y-auto custom-scroll space-y-3 relative">
             {state.log.map((l, i) => (
                <div key={i} className={`p-3 rounded-xl border-l-4 animate-fadeIn ${l.type === 'event' ? 'bg-indigo-50 border-indigo-400' : l.type === 'success' ? 'bg-emerald-50 border-emerald-400' : l.type === 'error' ? 'bg-rose-50 border-rose-400' : l.type === 'warning' ? 'bg-amber-50 border-amber-400' : 'bg-slate-50 border-slate-300'}`}>
                   <p className="text-sm font-medium text-slate-800">{l.message}</p>
                </div>
             ))}
             <div ref={logEndRef} />
        </div>

        {/* --- Overlays & Modals --- */}

        {/* Timetable Menu */}
        {state.isWeekend && (
            <TimetableModal state={state} onConfirm={(schedule) => {
                executeTimetable(schedule);
            }} />
        )}
        {/* Timetable (View Mode) */}
        {showSchedule && !state.isWeekend && (
            <TimetableModal state={state} onConfirm={() => setShowSchedule(false)} />
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
        {(state.phase === Phase.PLACEMENT_EXAM || state.phase === Phase.FINAL_EXAM || state.phase === Phase.MIDTERM_EXAM || state.phase === Phase.MIDTERM_EXAM_2 || state.phase === Phase.FINAL_EXAM_2 || state.phase === Phase.CSP_EXAM || state.phase === Phase.NOIP_EXAM || state.phase === Phase.WC_EXAM || state.phase === Phase.PROVINCIAL_EXAM || state.phase === Phase.APIO_EXAM || state.phase === Phase.NOI_EXAM) && (
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
                        {state.popupExamResult.rank && state.popupExamResult.rank > 0 && (
                            <div className="text-xl font-bold text-slate-500 mb-4">年级排名: {state.popupExamResult.rank}</div>
                        )}
                        <div className="grid grid-cols-3 gap-2 mt-4 text-sm text-slate-700">
                            {Object.entries(state.popupExamResult.scores).map(([subj, score]) => (
                                <div key={subj} className="bg-white p-2 rounded border border-slate-200">
                                    <span className="font-bold text-slate-600">{
                                        {'chinese': '语文', 'math': '数学', 'english': '英语', 'physics': '物理', 'chemistry': '化学', 'biology': '生物', 'history': '历史', 'geography': '地理', 'politics': '政治'}[subj] || subj
                                    }: </span>
                                    <span className="text-indigo-600">{score}</span>
                                </div>
                            ))}
                        </div>
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
               <button disabled={state.selectedSubjects.length !== 3} onClick={() => setState(prev => {
                   const nextPhase = prev.phase === Phase.SELECTION ? Phase.PLACEMENT_EXAM : Phase.SEMESTER_1;
                   return { 
                       ...prev, 
                       phase: nextPhase, 
                       isPlaying: prev.phase === Phase.SUBJECT_RESELECTION,
                       totalWeeksInPhase: nextPhase === Phase.SEMESTER_1 ? 21 : 0
                   };
               })} className="bg-indigo-600 disabled:bg-slate-200 text-white px-12 py-4 rounded-2xl font-black text-xl shadow-xl">确认选择</button>
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
             <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-fadeIn" onClick={() => setShowShop(false)}>
                 <div className="bg-white rounded-3xl w-full max-w-2xl h-[90vh] md:h-auto md:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
                     <div className="flex-none p-6 md:p-8 border-b border-slate-100 bg-white z-10 flex justify-between items-center">
                         <div>
                             <h2 className="text-2xl font-black text-slate-800">小卖部</h2>
                             <p className="text-sm text-slate-500">持有金钱: <span className="text-yellow-600 font-bold">{state.general.money}</span></p>
                         </div>
                         <button onClick={() => setShowShop(false)} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
                             <i className="fas fa-times"></i>
                         </button>
                     </div>
                     <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-safe">
                             {SHOP_ITEMS.map(item => (
                                 <button key={item.id} onClick={() => handleShopPurchase(item, (oldState, newState) => calculateAndVisualizeDiff(oldState, newState, window.innerWidth / 2, window.innerHeight / 2))} disabled={state.general.money < item.price} className="p-4 rounded-xl border border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left flex items-center gap-4 group disabled:opacity-50 active:scale-95">
                                     <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:text-indigo-600"><i className={`fas ${item.icon} text-xl`}></i></div>
                                     <div className="flex-1"><div className="flex justify-between items-center"><span className="font-bold text-slate-800">{item.name}</span><span className="text-sm font-bold text-yellow-600">{item.price} G</span></div><p className="text-xs text-slate-400 mt-1">{item.description}</p></div>
                                 </button>
                             ))}
                        </div>
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
                onRestart={() => { localStorage.removeItem('recall_save_v1'); setView('HOME'); window.location.reload(); }}
                onViewHistory={() => setShowHistory(true)}
            />
        )}

      </main>
    </div>
  );
};

export default App;
