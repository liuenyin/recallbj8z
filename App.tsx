
import React, { useState, useRef } from 'react';
import { AiConfig, Difficulty, GeneralStats, Talent, Phase, GameState, Challenge } from './types';
import { DIFFICULTY_PRESETS } from './data/constants';
import { getShopPriceMultiplier } from './data/utils';
import { getEndingData } from './data/ending';
import { clubFairIllustration } from './data/event_art';
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
import { getActiveAccountId } from './lib/accounts';
import AccountModal from './components/AccountModal';
import { getAcademicMaxScore, getSubjectReselectionReturnPhase, isExamPhase, getPhaseLabel, formatStoryDiary } from './data/game_flow';
import { clearEveningStudySchedule } from './data/timetable';
import { OI_EVENTS } from './data/events_oi';
import { getProjectSessionsLeft } from './data/project_effects';
import { isSoundMuted, setSoundMuted, playSound } from './lib/sound';
import { LanguageProvider, useLanguage, type Language } from './lib/i18n';
import { formatCampusText } from './data/campus_names';

import { SUBJECT_NAMES, SubjectKey } from './types';

const PHASE_TRANSITION_NOTES: Partial<Record<Phase, string>> = {
  [Phase.MILITARY]: '迷彩服发下来了，操场上的哨声比闹钟更早响起。',
  [Phase.SEMESTER_1]: '新课表贴在黑板旁，高一上学期正式开始。',
  [Phase.WINTER_BREAK]: '期末卷子收进抽屉，窗外迎来了短促的冬日清晨。',
  [Phase.SEMESTER_2]: '新学期第一天的早自习，走廊里还留着寒假前的粉笔灰。',
  [Phase.SUMMER_BREAK]: '高一的最后一张考卷交上去了，楼道忽然安静下来。'
};

const hasUpcomingOiInvite = (state: GameState, id: string): boolean =>
    !state.triggeredEvents.includes(id) && OI_EVENTS.some(event => event.id === id && event.condition?.(state));

const getMilestoneCountdown = (state: GameState): { label: string; urgent: boolean } | null => {
  if (state.phase === Phase.SUMMER) {
    const left = Math.max(0, state.totalWeeksInPhase - state.week);
    return { label: left <= 1 ? '下阶段：高一军训' : `距军训入校约 ${left} 周`, urgent: left <= 1 };
  }
  if (state.phase === Phase.MILITARY) {
    return { label: '下阶段：分班摸底与选科意向', urgent: true };
  }
  if (state.phase === Phase.SEMESTER_1) {
    if (state.competition === 'OI' && state.week <= 7 && !state.triggeredEvents.includes('csp_exam_trigger')) {
      const left = Math.max(0, 7 - state.week);
      return { label: left === 0 ? '本周节点：CSP-S 认证考' : `距 CSP-S 认证考还有 ${left} 周`, urgent: left <= 1 };
    }
    if (state.week <= 11 && state.midtermRank !== 'SEMESTER_1_DONE') {
      const left = Math.max(0, 11 - state.week);
      return { label: left === 0 ? '本周节点：高一上期中考试' : `距高一上期中考试还有 ${left} 周`, urgent: left <= 2 };
    }
    if (state.competition === 'OI' && state.week <= 13 && !state.triggeredEvents.includes('noip_exam_trigger')) {
      const left = Math.max(0, 13 - state.week);
      return { label: left === 0 ? '本周节点：NOIP 联赛' : `距 NOIP 还有 ${left} 周`, urgent: left <= 2 };
    }
    const left = Math.max(0, 21 - state.week);
    return { label: left === 0 ? '本周节点：高一上期末考试' : `距高一上期末考试还有 ${left} 周`, urgent: left <= 2 };
  }
  if (state.phase === Phase.WINTER_BREAK) {
    if (state.competition === 'OI' && state.week <= 2 && (state.flags.csp_score || 0) > 280) {
      return { label: '冬令营节点：关注 NOIWC 报到通知', urgent: state.week === 2 };
    }
    const left = Math.max(0, state.totalWeeksInPhase - state.week);
    return { label: left === 0 ? '即将进入高一下学期' : `距春季开学还有 ${left} 周`, urgent: left <= 1 };
  }
  if (state.phase === Phase.SEMESTER_2) {
    if (state.week <= 4 && hasUpcomingOiInvite(state, 'oi_provincial_invite')) {
      return { label: `距联合省选窗口还有 ${Math.max(0, 4 - state.week)} 周`, urgent: true };
    }
    if (state.week <= 11 && state.midtermRank !== 'SEMESTER_2_DONE') {
      const left = Math.max(0, 11 - state.week);
      return { label: left === 0 ? '本周节点：高一下期中考试' : `距高一下期中考试还有 ${left} 周`, urgent: left <= 2 };
    }
    if (state.week <= 12 && hasUpcomingOiInvite(state, 'oi_apio_invite')) {
      return { label: `距 APIO 线上赛窗口还有 ${Math.max(0, 12 - state.week)} 周`, urgent: state.week >= 11 };
    }
    if (state.week <= 19) {
      return { label: `距学业水平测试还有 ${Math.max(0, 19 - state.week)} 周`, urgent: state.week >= 18 };
    }
    const left = Math.max(0, 21 - state.week);
    return { label: left === 0 ? '本周节点：高一下期末考试' : `距高一下期末考试还有 ${left} 周`, urgent: left <= 2 };
  }
  if (state.phase === Phase.SUMMER_BREAK) {
    return state.competition === 'OI' && state.flags.provincial_team && state.week <= 2
      ? { label: `距 NOI 全国赛出征还有 ${Math.max(0, 2 - state.week)} 周`, urgent: true }
      : { label: '高一学年收尾期：留意结业与分班结算', urgent: false };
  }
  return null;
};

const GameApp: React.FC = () => {
  // UI State (View Routing & Modals)
  const [view, setView] = useState<'HOME' | 'TALENTS' | 'GAME'>('HOME');
  const { language, setLanguage, t: tr } = useLanguage();
  const [autoContinueEnabled, setAutoContinueEnabled] = useState(() => {
      try { return localStorage.getItem('recall_auto_continue_v1') !== 'false'; } catch { return true; }
  });
  const toggleAutoContinue = () => {
      const next = !autoContinueEnabled;
      setAutoContinueEnabled(next);
      try { localStorage.setItem('recall_auto_continue_v1', String(next)); } catch { /* Still applies this session. */ }
  };
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('NORMAL');
  const [customStats, setCustomStats] = useState<GeneralStats>({ mindset: 50, experience: 10, luck: 50, romance: 10, health: 80, money: 20, efficiency: 10, excitement: 40 });
  const [showClubSelection, setShowClubSelection] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showRealityGuide, setShowRealityGuide] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showContestHistory, setShowContestHistory] = useState(false);
  const [showMobileStats, setShowMobileStats] = useState(false);
  const [showGameActions, setShowGameActions] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | 'withdraw' | 'load_manual'>(null);
  const [pendingChallenge, setPendingChallenge] = useState<Challenge | null>(null);
  const [aiConfig, setAiConfig] = useState<AiConfig>(() => loadAiConfig());
  const [soundMuted, setSoundMutedState] = useState<boolean>(() => isSoundMuted());
  const toggleSoundMute = () => {
      const next = !soundMuted;
      setSoundMutedState(next);
      setSoundMuted(next);
  };
  const prevPhaseRef = useRef<Phase | null>(null);
  const [phaseBanner, setPhaseBanner] = useState<{ title: string; note: string } | null>(null);
  const [activeAccountId, setAccountId] = useState(() => getActiveAccountId());
  const [showAccounts, setShowAccounts] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const talentActionStateRef = useRef<Talent[] | null>(null);
  const startGameSubmittedRef = useRef(false);

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
      const hideDetails = newState.difficulty === 'REALITY';
      const addDiff = (text: string, color: string) => {
          diffs.push(text);
          if (x === undefined || y === undefined || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
          setTimeout(() => spawnFloatingText(text, x, y, color), diffs.length * 100);
      };
      const check = (key: keyof GeneralStats, label: string, colorType: string) => {
           const delta = newState.general[key] - oldState.general[key];
           if (Math.abs(delta) >= 1) {
               const val = Math.round(delta * 10) / 10;
               if (val === 0) return;
               const text = hideDetails
                 ? `${label}${val > 0 ? '上升' : '下降'}`
                 : `${label} ${val > 0 ? '+' : ''}${val}`;
               addDiff(text, colorType);
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
      (Object.keys(oldState.subjects) as SubjectKey[]).forEach(subject => {
          const delta = newState.subjects[subject].level - oldState.subjects[subject].level;
          if (Math.abs(delta) >= 0.1) {
              const val = Math.round(delta * 10) / 10;
              const text = hideDetails
                ? `${SUBJECT_NAMES[subject]}能力${val > 0 ? '上升' : '下降'}`
                : `${SUBJECT_NAMES[subject]} ${val > 0 ? '+' : ''}${val}`;
              addDiff(text, 'experience');
          }
      });
      (['dp', 'ds', 'math', 'string', 'graph', 'misc'] as const).forEach(key => {
          const delta = (newState.oiStats[key] || 0) - (oldState.oiStats[key] || 0);
          if (Math.abs(delta) >= 0.1) {
              const val = Math.round(delta * 10) / 10;
              const text = hideDetails
                ? `OI ${key.toUpperCase()}${val > 0 ? '提升' : '下降'}`
                : `OI ${key.toUpperCase()} ${val > 0 ? '+' : ''}${val}`;
              addDiff(text, 'oi');
          }
      });
      const fatigueDelta = newState.fatigue - oldState.fatigue;
      if (Math.abs(fatigueDelta) >= 1) {
          const val = Math.round(fatigueDelta * 10) / 10;
          const text = hideDetails
            ? `疲劳${val > 0 ? '增加' : '降低'}`
            : `疲劳 ${val > 0 ? '+' : ''}${val}`;
          addDiff(text, val > 0 ? 'health' : 'mindset');
      }
      return diffs;
  };

  const { 
      state, setState, hasSave, hasManualSave, saveGame, loadGame, saveNotice,
      startGameState, resetGame, handleChoice, handleEventConfirm, handleClubSelect, handleShopPurchase, 
      executeTimetable, handleExamFinish, closeExamResult,
      weekendOptions 
  } = useGameLogic(aiConfig, activeAccountId, language);

  const activeGameOverlaysRef = useRef(new Set<React.Dispatch<React.SetStateAction<boolean>>>());
  const resumeAfterOverlayRef = useRef(false);
  const openGameOverlay = (open: React.Dispatch<React.SetStateAction<boolean>>) => {
      if (activeGameOverlaysRef.current.has(open)) return;

      if (activeGameOverlaysRef.current.size === 0) {
          resumeAfterOverlayRef.current = state.isPlaying;
          if (state.isPlaying) setState(prev => ({ ...prev, isPlaying: false }));
      }
      activeGameOverlaysRef.current.add(open);
      open(true);
  };
  const closeGameOverlay = (close: React.Dispatch<React.SetStateAction<boolean>>) => {
      close(false);
      if (!activeGameOverlaysRef.current.delete(close)) return;

      if (activeGameOverlaysRef.current.size === 0 && resumeAfterOverlayRef.current) {
          setState(prev => ({ ...prev, isPlaying: true }));
          resumeAfterOverlayRef.current = false;
      }
  };

  React.useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, [state.log]);

  React.useEffect(() => {
    if (view !== 'GAME') {
      prevPhaseRef.current = null;
      setPhaseBanner(null);
      return;
    }
    if (prevPhaseRef.current === state.phase) return;
    const previous = prevPhaseRef.current;
    prevPhaseRef.current = state.phase;
    if (state.phase !== Phase.INIT && state.phase !== Phase.ENDING) playSound('transition');
    const note = PHASE_TRANSITION_NOTES[state.phase];
    if (previous !== null && note && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhaseBanner({ title: getPhaseLabel(state.phase), note });
      const timer = setTimeout(() => setPhaseBanner(null), 1100);
      return () => clearTimeout(timer);
    }
    setPhaseBanner(null);
  }, [view, state.phase]);

  React.useEffect(() => {
    if (state.popupExamResult) playSound('exam');
  }, [state.popupExamResult]);

  React.useEffect(() => {
    if (state.achievementPopup) playSound('achievement');
  }, [state.achievementPopup]);

  React.useEffect(() => {
      if (state.phase === Phase.SEMESTER_1 && state.week === 2 && !state.hasSelectedClub && !showClubSelection) {
          setShowClubSelection(true);
          setState(prev => prev.isPlaying ? { ...prev, isPlaying: false } : prev);
      }
  }, [state.phase, state.week, state.hasSelectedClub, showClubSelection]);

  const [availableTalents, setAvailableTalents] = useState<Talent[]>([]);
  const [selectedTalents, setSelectedTalents] = useState<Talent[]>([]);
  const [talentPoints, setTalentPoints] = useState(3);

  const rollAvailableTalents = () => {
      const pool = [...TALENTS];
      const buffs = pool.filter(t => t.cost > 0).sort(() => 0.5 - Math.random()).slice(0, 5);
      const debuffs = pool.filter(t => t.cost < 0).sort(() => 0.5 - Math.random()).slice(0, 4);
      setAvailableTalents([...buffs, ...debuffs].sort(() => 0.5 - Math.random()));
  };

  const prepareGame = (challenge?: Challenge) => {
      if (hasSave && !window.confirm(tr('开启新学期会覆盖当前的自动存档。要继续吗？'))) return;
      setShowClubSelection(false); setShowRealityGuide(false);
      setPendingChallenge(challenge || null);
      talentActionStateRef.current = null;
      startGameSubmittedRef.current = false;
      
      if (availableTalents.length === 0) rollAvailableTalents();
      setSelectedTalents([]);
      const baseDifficulty = challenge ? 'REALITY' : selectedDifficulty;
      setTalentPoints(DIFFICULTY_PRESETS[baseDifficulty as keyof typeof DIFFICULTY_PRESETS]?.talentPoints ?? (baseDifficulty === 'HARD' ? 1 : (baseDifficulty === 'REALITY' ? 0 : 3)));
      setView('TALENTS');
  };

  const handleStartGame = () => {
      if (startGameSubmittedRef.current) return;
      startGameSubmittedRef.current = true;
      startGameState(selectedDifficulty, customStats, selectedTalents, pendingChallenge);
      setAvailableTalents([]);
      setView('GAME');
  };

  const handleTalentToggle = (talent: Talent) => {
      if (talentActionStateRef.current === selectedTalents) return;
      if (selectedTalents.find(t => t.id === talent.id)) {
          talentActionStateRef.current = selectedTalents;
          setTalentPoints(p => p + talent.cost);
          setSelectedTalents(prev => prev.filter(t => t.id !== talent.id));
      } else {
          if (selectedTalents.length >= 5) return;
          talentActionStateRef.current = selectedTalents;
          setTalentPoints(p => p - talent.cost);
          setSelectedTalents(prev => [...prev, talent]);
      }
  };

  const handleLoadGame = () => {
      if (loadGame()) setView('GAME');
  };

  const handleAiConfigChange = (config: AiConfig) => {
      saveAiConfig(config);
      setAiConfig(config);
  };

  const downloadDiary = () => {
      const url = URL.createObjectURL(new Blob(['\uFEFF', formatStoryDiary(state, tr)], { type: 'text/plain;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = tr('八中校园手记.txt');
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  React.useEffect(() => {
      if (view !== 'GAME') return;
      const onKeyDown = (e: KeyboardEvent) => {
          if (e.key !== 'Escape') return;
          if (confirmAction) setConfirmAction(null);
          else if (showHistory) closeGameOverlay(setShowHistory);
          else if (showMobileStats) closeGameOverlay(setShowMobileStats);
          else if (showContestHistory) closeGameOverlay(setShowContestHistory);
          else if (showRealityGuide) closeGameOverlay(setShowRealityGuide);
          else if (showAchievements) closeGameOverlay(setShowAchievements);
          else if (showShop) closeGameOverlay(setShowShop);
          else if (showSchedule && !state.isWeekend) closeGameOverlay(setShowSchedule);
          else if (showGameActions) closeGameOverlay(setShowGameActions);
      };
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
  }, [view, confirmAction, showHistory, showMobileStats, showContestHistory, showRealityGuide, showAchievements, showShop, showSchedule, showGameActions, state.isWeekend]);

  const calculateProgress = () => state.totalWeeksInPhase === 0 ? 0 : Math.min(100, (state.week / state.totalWeeksInPhase) * 100);
  const displayedWeek = state.totalWeeksInPhase > 0 ? Math.min(state.week, state.totalWeeksInPhase) : state.week;
  const previousAcademicRank = state.academicExamHistory.at(-2)?.rank;
  const examRank = state.popupExamResult?.type === 'ACADEMIC' ? state.popupExamResult.rank : undefined;
  const rankDelta = previousAcademicRank && examRank ? previousAcademicRank - examRank : null;
  
  if (view === 'HOME') {
      return (
          <>
            <HomeView
              selectedDifficulty={selectedDifficulty} onDifficultyChange={setSelectedDifficulty}
              customStats={customStats} onCustomStatsChange={setCustomStats}
              onStart={prepareGame} hasSave={hasSave} onLoadGame={handleLoadGame}
              hasManualSave={hasManualSave} onLoadManual={() => { if (loadGame('manual')) setView('GAME'); }}
              unlockedAchievements={state.unlockedAchievements}
              aiConfig={aiConfig} onAiConfigChange={handleAiConfigChange}
              onManageAccounts={() => setShowAccounts(true)}
            />
            {showAccounts && <AccountModal activeAccountId={activeAccountId} onClose={() => setShowAccounts(false)} onChanged={setAccountId} />}
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
  const statusIds = new Set(state.activeStatuses.map(status => status.id));
  const moodEffect = isWarmMood ? 'screen-warm-glow'
      : statusIds.has('homework_fog') || statusIds.has('late_night_lag') || statusIds.has('fatigued') ? 'screen-tired-glow'
      : statusIds.has('anxious') || statusIds.has('heartbroken') || statusIds.has('low_morale') ? 'screen-low-mood-glow'
      : statusIds.has('focused') ? 'screen-focused-glow'
      : isOverstimulated ? 'screen-stimulated-glow'
      : '';
  const isHealthWarning = state.isSick || state.general.health <= 30;
  const interactionLocked = !!state.currentEvent
      || !!state.chainedEvent
      || state.eventQueue.length > 0
      || !!state.isAiGenerating
      || isExamPhase(state.phase)
      || state.phase === Phase.SELECTION
      || state.phase === Phase.SUBJECT_RESELECTION;
  const toolbarLocked = interactionLocked || state.isWeekend;

  const getAtmosphereTheme = () => {
      if (isWarmMood) return "bg-gradient-to-br from-rose-50 via-amber-50/70 to-orange-50";
      if (state.phase === Phase.SUMMER || state.phase === Phase.SUMMER_BREAK) return "bg-gradient-to-br from-stone-50 via-sky-50 to-indigo-50/80";
      if (state.phase === Phase.MILITARY) return "bg-gradient-to-br from-amber-50/70 via-stone-100 to-emerald-50/80";
      if (state.phase === Phase.WINTER_BREAK) return "bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-50";
      if (state.phase === Phase.SEMESTER_1) return state.week <= 9 ? "bg-gradient-to-br from-amber-50/50 via-slate-50 to-stone-100" : "bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50";
      if (state.phase === Phase.SEMESTER_2) return state.week <= 11 ? "bg-gradient-to-br from-sky-50 via-slate-50 to-teal-50/60" : "bg-gradient-to-br from-indigo-50/60 via-slate-50 to-sky-50";
      return "bg-slate-100";
  };
  const milestone = getMilestoneCountdown(state);
  const currentProject = state.activeProjects[0];

  return (
    <div className={`h-[100dvh] transition-all duration-1000 motion-reduce:transition-none ${getAtmosphereTheme()} ${state.general.mindset <= 20 ? 'grayscale-[0.9] contrast-125 transition-all duration-[3000ms]' : ''} ${isDangerState ? 'ring-1 ring-inset ring-rose-300/60' : ''} flex flex-col md:flex-row p-2 md:p-4 gap-2 md:gap-4 overflow-hidden font-sans text-slate-900 relative`}>
      {phaseBanner && (
        <div className="pointer-events-none fixed inset-x-0 top-6 z-[60] flex justify-center px-4" aria-live="polite">
          <div className="max-w-md rounded-2xl border border-slate-700/80 bg-slate-900/90 px-5 py-3 text-center text-white shadow-xl backdrop-blur-md">
            <div className="text-[11px] font-bold uppercase tracking-widest text-indigo-300">{tr(phaseBanner.title)}</div>
            <p className="mt-1 text-xs leading-relaxed text-slate-200">{tr(phaseBanner.note)}</p>
          </div>
        </div>
      )}
            {showContestHistory && <ContestHistoryModal state={state} onClose={() => closeGameOverlay(setShowContestHistory)} />}
      {isDangerState && <div className={`fixed inset-0 pointer-events-none z-[15] transition-opacity duration-1000 motion-reduce:animate-none ${isCriticalState ? 'screen-danger-flicker' : 'screen-danger-vignette'}`} aria-hidden="true"></div>}
      {moodEffect && !isDangerState && <div className={`fixed inset-0 pointer-events-none z-[15] motion-reduce:animate-none ${moodEffect}`} aria-hidden="true" />}
      <FloatingTextLayer items={floatingTexts} />
      
      {showRealityGuide && <RealityGuideModal onClose={() => closeGameOverlay(setShowRealityGuide)} />}
      
      
      {/* Toast */}
      {state.achievementPopup && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[60] bg-slate-800 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-fadeIn border border-slate-700">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-slate-900 text-xl shadow-lg border-2 border-white"><i className={`fas ${state.achievementPopup.icon}`}></i></div>
              <div>
                  <div className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">{tr("成就解锁")}</div>
                  <div className="font-black text-lg">{tr(state.achievementPopup.title)}</div>
              </div>
          </div>
      )}

      {/* Sidebar */}
      <div className="hidden md:block w-72 flex-shrink-0 z-20">
        <StatsPanel state={state} onShowGuide={() => openGameOverlay(setShowRealityGuide)} onShowContestHistory={() => openGameOverlay(setShowContestHistory)} />
      </div>
      

      {/* Main Area */}
      <main className="flex-1 flex flex-col gap-2 md:gap-4 relative h-full overflow-hidden">
        <nav aria-label={tr("游戏工具")} className="relative z-20 flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1 text-sm font-medium text-slate-700">
          <button type="button" onClick={() => openGameOverlay(setShowMobileStats)} className="rounded-lg px-3 py-2 hover:bg-slate-100 md:hidden">{tr("状态")}</button>
          <button type="button" onClick={() => openGameOverlay(setShowHistory)} className="rounded-lg px-3 py-2 hover:bg-slate-100">{tr("历程")}</button>
          <span role="status" className={`ml-auto min-w-0 truncate text-xs ${saveNotice.includes('失败') ? 'text-rose-700' : 'text-slate-500'}`}>{tr(saveNotice)}</span>
          <div className="relative" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) closeGameOverlay(setShowGameActions); }}>
            <button type="button" aria-expanded={showGameActions} aria-controls="game-actions" onClick={() => showGameActions ? closeGameOverlay(setShowGameActions) : openGameOverlay(setShowGameActions)} className="rounded-lg px-3 py-2 hover:bg-slate-100">{tr("更多 ")}<i className="fas fa-chevron-down ml-1 text-[10px]" aria-hidden="true" /></button>
            {showGameActions && (
              <div id="game-actions" onClick={() => closeGameOverlay(setShowGameActions)} className="absolute right-0 top-full z-10 mt-1 grid w-48 max-h-[72dvh] overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg [&_button]:rounded-lg [&_button]:px-3 [&_button]:py-2 [&_button]:text-left [&_button:not(:disabled):hover]:bg-slate-100 [&_button:disabled]:opacity-40">
                <button type="button" onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')} lang={language === 'zh' ? 'en' : 'zh-CN'}>{language === 'zh' ? 'English' : '简体中文'}</button>
                <button type="button" onClick={() => openGameOverlay(setShowSchedule)} disabled={toolbarLocked}>{tr("时间表")}</button>
                <button type="button" onClick={() => openGameOverlay(setShowShop)} disabled={toolbarLocked}>{tr("小卖部")}</button>
                <button type="button" onClick={() => openGameOverlay(setShowAchievements)}>{tr("成就")}</button>
                {state.competition === 'OI' && <button type="button" onClick={() => openGameOverlay(setShowContestHistory)} disabled={toolbarLocked}>{tr("OI 履历")}</button>}
                <button type="button" onClick={() => openGameOverlay(setShowRealityGuide)}>{tr("难度说明")}</button>
                <button type="button" onClick={toggleAutoContinue} aria-pressed={autoContinueEnabled}>{tr("日常自动继续")} {tr(autoContinueEnabled ? '开' : '关')}</button>
                <button type="button" onClick={toggleSoundMute}>{tr(soundMuted ? '开启音效' : '关闭音效')}</button>
                <button type="button" onClick={saveGame} disabled={interactionLocked}>{tr("保存")}</button>
                {hasManualSave && <button type="button" onClick={() => setConfirmAction('load_manual')}>{tr("读取手动存档")}</button>}
                <button type="button" onClick={() => setConfirmAction('withdraw')} disabled={interactionLocked} className="text-rose-700">{tr("提前离校")}</button>
              </div>
            )}
          </div>
        </nav>

        <header className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col gap-3 flex-shrink-0 relative">
               <div className="flex items-center justify-between">
                   <div className="flex flex-col gap-1 w-full mr-4">
                       <div className="flex items-center gap-2 flex-wrap">
                           <h2 className="font-black text-slate-800 text-lg flex items-center gap-2 uppercase tracking-tight truncate">
                                <span title={tr(isHealthWarning ? '健康状态需要注意' : '状态正常')} className={`w-2 h-2 rounded-full flex-shrink-0 ${isHealthWarning ? 'bg-red-500 animate-pulse' : 'bg-indigo-500'}`}></span> {tr(getPhaseLabel(state.phase))}
                           </h2>
                           {state.isAiGenerating && (
                               <span className="md:hidden inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold border border-indigo-100 animate-pulse">
                                   <i className="fas fa-robot"></i> {tr("AI 生成事件中...")}</span>
                           )}
                       </div>
                        <div className="flex gap-2 items-center flex-wrap">
                            {state.activeStatuses.map(s => (
                                <div key={s.id} title={[tr(s.description), tr(s.effectDescription)].filter(Boolean).join(' ')} className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold ${s.type === 'BUFF' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : s.type === 'DEBUFF' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                                    <i className={`fas ${s.icon}`}></i> {tr(s.name)} {tr(`(${s.duration} 周)`)}</div>
                            ))}
                            {state.talents.map(t => (
                                <div key={t.id} title={tr(t.description)} className="flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold bg-purple-50 border-purple-200 text-purple-700">
                                     <i className="fas fa-star"></i> {tr(t.name)}
                                </div>
                            ))}
                        </div>
                   </div>
                   <button 
                      type="button"
                      aria-label={tr(state.isPlaying ? '暂停推进' : '继续推进')}
                      title={tr(state.isPlaying ? '暂停推进' : '继续推进')}
                      onClick={() => setState(p => ({ ...p, isPlaying: !p.isPlaying }))} 
                      disabled={interactionLocked || state.isWeekend }
                      className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex-shrink-0 flex items-center justify-center shadow-xl transition-all ${interactionLocked || state.isWeekend ? 'bg-slate-100 text-slate-300' : state.isPlaying ? 'bg-amber-400 text-white hover:bg-amber-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                   >
                      <i className={`fas ${state.isPlaying ? 'fa-pause' : 'fa-play'} text-xl`}></i>
                   </button>
               </div>
               <div className="flex items-center justify-end gap-2 w-full">
                    {state.totalWeeksInPhase > 0 && <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${calculateProgress()}%` }}></div>
                    </div>}
                    <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">{tr(state.totalWeeksInPhase > 0 ? `第 ${displayedWeek} / ${state.totalWeeksInPhase} 周` : `第 ${displayedWeek} 周`)}</span>
               </div>
               {(milestone || currentProject || isDangerState || state.general.mindset <= 30) && (
                 <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px]">
                   {milestone && (
                     <span className={`font-bold flex items-center gap-1.5 ${milestone.urgent ? 'text-amber-700' : 'text-slate-500'}`}>
                       <i className={`fas ${milestone.urgent ? 'fa-hourglass-half text-amber-500' : 'fa-calendar-check text-indigo-400'}`} />
                       {tr(milestone.label)}
                     </span>
                   )}
                   {currentProject && (
                     <span className="font-bold text-indigo-700">{tr(`《${currentProject.title}》还需整理 ${getProjectSessionsLeft(currentProject)} 次`)}</span>
                   )}
                   {(isDangerState || state.general.mindset <= 30) && (
                     <span className="font-bold text-rose-600 flex items-center gap-1">
                       <i className="fas fa-heart-pulse" />
                       {tr(state.general.health <= 30 ? '健康偏低' : state.fatigue >= 85 ? '疲劳偏高' : '心态偏低')}
                     </span>
                   )}
                 </div>
               )}
        </header>

        {/* Log */}
        <div className="flex-1 bg-white/70 backdrop-blur-xl rounded-2xl p-4 md:p-6 shadow-sm border border-white/40 overflow-y-auto custom-scroll space-y-3 relative">
             {state.log.map((l, i) => (
                <div key={i} className={`p-3 rounded-xl border-l-4 animate-fadeIn ${l.type === 'event' ? 'bg-indigo-50 border-indigo-400' : l.type === 'success' ? 'bg-emerald-50 border-emerald-400' : l.type === 'error' ? 'bg-rose-50 border-rose-400' : l.type === 'warning' ? 'bg-amber-50 border-amber-400' : 'bg-slate-50 border-slate-300'}`}>
                   <p className="text-sm font-medium text-slate-800">{tr(l.message)}</p>
                   {l.details?.length > 0 && <details className="mt-2 text-sm text-slate-600">
                     <summary className="cursor-pointer font-bold text-indigo-600">{tr("展开安排与跳过原因（")}{l.details.length} {tr("条）")}</summary>
                     <ul className="mt-2 space-y-2">{l.details.map((line, index) => <li key={index}>{tr(line)}</li>)}</ul>
                   </details>}
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
            <TimetableModal state={state} onClose={() => closeGameOverlay(setShowSchedule)} onConfirm={(schedule) => {
                // The view-mode planner is also the place to adjust the next
                // week's reusable schedule. Respect the evening-study lock.
                setState(prev => ({
                    ...prev,
                    lastWeekSchedule: clearEveningStudySchedule(schedule, prev)
                }));
                closeGameOverlay(setShowSchedule);
            }} />
        )}
        {/* Event Modal */}
        {state.currentEvent && (
            <EventModal 
                event={state.currentEvent} state={state} eventResult={state.eventResult}
                onChoice={c => handleChoice(c, calculateAndVisualizeDiff)}
                onConfirm={handleEventConfirm}
                autoContinueEnabled={autoContinueEnabled}
                onToggleAutoContinue={toggleAutoContinue}
                paused={showHistory || showAchievements || showRealityGuide || showContestHistory || showSchedule || showShop || showClubSelection || showMobileStats || !!confirmAction}
            />
        )}

        {/* Exams */}
        {(state.phase === Phase.PLACEMENT_EXAM || state.phase === Phase.FINAL_EXAM || state.phase === Phase.MIDTERM_EXAM || state.phase === Phase.MIDTERM_EXAM_2 || state.phase === Phase.FINAL_EXAM_2 || state.phase === Phase.CSP_EXAM || state.phase === Phase.NOIP_EXAM || state.phase === Phase.WC_EXAM || state.phase === Phase.PROVINCIAL_EXAM || state.phase === Phase.APIO_EXAM || state.phase === Phase.NOI_EXAM) && (
             <div className="absolute inset-0 z-40 rounded-2xl overflow-hidden">
                 <ExamView title={tr(getPhaseLabel(state.phase))} state={state} onFinish={handleExamFinish} />
             </div>
        )}

        {state.popupExamResult && (
             <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md animate-fadeIn p-4">
                <div className="bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-10 text-center max-w-lg w-full max-h-[90vh] overflow-y-auto custom-scroll shadow-2xl relative border-4 border-yellow-400">
                    <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-3 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg border-4 border-white"><i className="fas fa-file-alt text-white text-3xl md:text-4xl"></i></div>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-800 mb-2">{tr(state.popupExamResult.title)}</h3>
                    <div className="bg-slate-50 rounded-2xl p-5 mb-6 border border-slate-100">
                        <div className="text-3xl md:text-4xl font-black text-indigo-600 mb-2">
                            {`${state.popupExamResult.totalScore} / ${state.popupExamResult.type === 'COMPETITION'
                                ? Object.keys(state.popupExamResult.scores).length * 100
                                : getAcademicMaxScore(Object.keys(state.popupExamResult.scores))}`}
                        </div>
                        {state.popupExamResult.rank && state.popupExamResult.rank > 0 && (
                            <div className="text-xl font-bold text-slate-500 mb-4">
                                {tr(`年级排名: ${state.popupExamResult.rank}`)}
                            </div>
                        )}
                        {state.phase === Phase.PLACEMENT_EXAM && state.className && (
                            <div className="mb-3">
                                <p className="font-bold text-indigo-700">{tr(`你被分到${state.className}。`)}</p>
                                <p className="mt-1 text-xs leading-relaxed text-slate-600">{tr('这是游戏里的编班结果，由这次分班考的年级排名决定。')}</p>
                            </div>
                        )}
                        {rankDelta !== null && (
                            <p className={`text-xs font-bold ${rankDelta > 0 ? 'text-emerald-700' : rankDelta < 0 ? 'text-amber-800' : 'text-slate-600'}`}>
                                {tr(rankDelta > 0 ? `比上次文化课考试前进 ${rankDelta} 名`
                                    : rankDelta < 0 ? `比上次文化课考试后退 ${Math.abs(rankDelta)} 名`
                                    : '和上次文化课考试的名次相同')}
                            </p>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 text-sm text-slate-700">
                            {Object.entries(state.popupExamResult.scores).map(([subj, score]) => {
                                const oiMatch = subj.match(/^oi_prob_(\d+)$/);
                                const label = oiMatch
                                    ? `第 ${oiMatch[1]} 题`
                                    : ({'chinese': '语文', 'math': '数学', 'english': '英语', 'physics': '物理', 'chemistry': '化学', 'biology': '生物', 'history': '历史', 'geography': '地理', 'politics': '政治'}[subj] || subj);
                                return (
                                    <div key={subj} className="bg-white p-2 rounded border border-slate-200">
                                        <span className="font-bold text-slate-600">{tr(label)}: </span>
                                        <span className="text-indigo-600">{score}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <button onClick={closeExamResult} className="bg-indigo-600 text-white px-12 py-4 rounded-2xl font-black text-xl hover:bg-indigo-700 shadow-xl w-full">{tr("继续")}</button>
                </div>
             </div>
        )}

        {/* Selection */}
        {(state.phase === Phase.SELECTION || state.phase === Phase.SUBJECT_RESELECTION) && (
            <div className="absolute inset-0 bg-white/95 z-30 p-4 md:p-10 flex flex-col items-center rounded-2xl overflow-y-auto">
              <div className="my-auto flex w-full flex-col items-center">
               <h2 className="text-2xl md:text-3xl font-black mb-2">{tr(state.phase === Phase.SUBJECT_RESELECTION ? '重新选科' : '高一选科')}</h2>
               {state.phase === Phase.SELECTION && (
                   <p className="mb-2 max-w-lg text-center text-sm leading-relaxed text-slate-600">
                       {tr('选 3 门科目，和语文、数学、英语一起计入分班考、期中和期末。合格考有单独的科目清单。')}
                   </p>
               )}
               <p className="mb-5 text-xs text-slate-500">{tr(`已选 ${state.selectedSubjects.length}/3 门`)}</p>
               <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8 w-full max-w-lg">
                  {(['physics', 'chemistry', 'biology', 'history', 'geography', 'politics'] as SubjectKey[]).map(s => {
                    const hideStats = state.difficulty === 'REALITY';
                    const info = state.subjects[s];
                    const selected = state.selectedSubjects.includes(s);
                    return (
                    <button key={s} onClick={() => setState(prev => ({ ...prev, selectedSubjects: prev.selectedSubjects.includes(s) ? prev.selectedSubjects.filter(x => x !== s) : (prev.selectedSubjects.length < 3 ? [...prev.selectedSubjects, s] : prev.selectedSubjects) }))}
                      className={`p-4 rounded-2xl border-2 transition-all font-bold text-left ${selected ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'}`}>
                      <div className="text-base">{tr(SUBJECT_NAMES[s])}</div>
                      <div className={`text-[11px] mt-1 font-medium ${selected ? 'text-indigo-500' : 'text-slate-400'}`}>
                          {tr(hideStats ? `水平 ${info.level >= 40 ? '较高' : info.level >= 15 ? '一般' : '偏弱'}` : `天赋 ${info.aptitude} · 水平 ${info.level.toFixed(1)}`)}
                      </div>
                    </button>
                    );
                  })}
                </div>
                <button disabled={state.selectedSubjects.length !== 3} onClick={() => setState(prev => {
                    if (prev.phase !== Phase.SELECTION && prev.phase !== Phase.SUBJECT_RESELECTION) return prev;
                    const nextPhase = prev.phase === Phase.SELECTION
                      ? Phase.PLACEMENT_EXAM
                      : getSubjectReselectionReturnPhase(prev);
                   const nextWeek = prev.phase === Phase.SUBJECT_RESELECTION
                     ? (nextPhase === Phase.SEMESTER_1 ? Math.max(12, prev.week + 1) : Math.min(21, prev.week + 1))
                     : prev.week;
                   return { 
                       ...prev, 
                       phase: nextPhase, 
                       week: nextWeek,
                       isPlaying: prev.phase === Phase.SUBJECT_RESELECTION,
                       totalWeeksInPhase: nextPhase === Phase.PLACEMENT_EXAM ? 0 : 21,
                       subjectReselectionReturnPhase: null
                   };
               })} className="bg-indigo-600 disabled:bg-slate-200 text-white px-12 py-4 rounded-2xl font-black text-xl shadow-xl">{tr("确认选择")}</button>
              </div>
            </div>
        )}

        {/* Club Selection */}
        {showClubSelection && (
             <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                 <div role="dialog" aria-modal="true" aria-label={tr("百团大战")} className="bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl">
                     <img src={clubFairIllustration} alt="" width={720} height={480} decoding="async"
                          className="mb-3 h-28 w-full shrink-0 rounded-xl object-cover sm:h-36" />
                     <h2 className="text-3xl font-black text-center mb-2">{tr("百团大战")}</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto custom-scroll p-2">
                         {CLUBS.map(club => (
                             <button key={club.id} onClick={() => { handleClubSelect(club.id); setShowClubSelection(false); }}
                                 className="p-4 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left flex flex-col gap-2 group active:scale-95"
                             >
                                 <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-indigo-500"><i className={`fas ${club.icon}`}></i></div>
                                     <span className="font-bold text-lg text-slate-800">{tr(club.name)}</span>
                                 </div>
                                 <p className="text-xs text-slate-500">{tr(club.description)}</p>
                                 <div className="mt-auto pt-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit">{tr(club.effectDescription)}</div>
                             </button>
                         ))}
                         <button onClick={() => { handleClubSelect('none'); setShowClubSelection(false); }} className="p-4 rounded-2xl border-2 border-slate-100 hover:border-slate-400 hover:bg-slate-50 transition-all text-left flex flex-col justify-center items-center gap-2 text-slate-400 active:scale-95">
                             <span className="font-bold">{tr("不参加社团")}</span>
                         </button>
                     </div>
                 </div>
             </div>
        )}

        {/* Shop */}
        {showShop && (() => {
             const shopWeekKey = `${state.phase}_${state.week}`;
             const boughtCount = state.flags.shop_week_key === shopWeekKey ? Number(state.flags.shop_week_count || 0) : 0;
             const shopCapReached = boughtCount >= 3;
             return (
             <div className="fixed inset-0 z-[90] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-fadeIn" onClick={() => closeGameOverlay(setShowShop)} role="dialog" aria-modal="true" aria-label={tr("小卖部")}>
                 <div className="bg-white rounded-3xl w-full max-w-2xl h-[90vh] md:h-auto md:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
                     <div className="flex-none p-6 md:p-8 border-b border-slate-100 bg-white z-10 flex justify-between items-center">
                         <div>
                             <h2 className="text-2xl font-black text-slate-800">{tr("小卖部")}</h2>
                             <p className="text-sm text-slate-500">
                                 {tr("资金状况: ")}<span className="text-yellow-600 font-bold">{Number(state.general.money.toFixed(2))}</span>
                                 <span className="ml-3 text-xs font-bold text-slate-500">{tr("本周限购：")}{boughtCount} / 3</span>
                             </p>
                         </div>
                         <button type="button" aria-label={tr("关闭")} onClick={() => closeGameOverlay(setShowShop)} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
                             <i className="fas fa-times"></i>
                         </button>
                     </div>
                     <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
                             {SHOP_ITEMS.map(item => (
                                  <button key={item.id} onClick={() => handleShopPurchase(item, (oldState, newState) => calculateAndVisualizeDiff(oldState, newState, window.innerWidth / 2, window.innerHeight / 2))} disabled={shopCapReached || !!state.currentEvent || !!state.chainedEvent || state.eventQueue.length > 0 || !!state.isAiGenerating || isExamPhase(state.phase) || state.general.money < item.price * getShopPriceMultiplier(state)} className="p-4 rounded-xl border border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left flex items-center gap-4 group disabled:opacity-50 active:scale-95">
                                     <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:text-indigo-600"><i className={`fas ${item.icon} text-xl`}></i></div>
                                      <div className="flex-1"><div className="flex justify-between items-center"><span className="font-bold text-slate-800">{tr(item.name)}</span><span className="text-sm font-bold text-yellow-700">{item.price * getShopPriceMultiplier(state)} G</span></div><p className="text-xs text-slate-500 mt-1">{tr(item.description)}</p></div>
                                 </button>
                             ))}
                        </div>
                     </div>
                 </div>
             </div>
             );
        })()}

        {/* History */}
        {showHistory && (
             <div className="fixed inset-0 z-[110] flex justify-end bg-slate-900/40 backdrop-blur-sm animate-fadeIn" onClick={() => closeGameOverlay(setShowHistory)} role="dialog" aria-modal="true" aria-label={tr("校园手记")}>
                <div className="w-full md:w-96 bg-white h-full shadow-2xl p-6 md:p-8 flex flex-col animate-slideInRight" onClick={e => e.stopPropagation()}>
                   <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                      <h2 className="text-2xl font-black text-slate-800 tracking-tight">{tr("校园手记")}</h2>
                      <button type="button" aria-label={tr("关闭")} onClick={() => closeGameOverlay(setShowHistory)} className="text-slate-500 hover:text-slate-800 text-xl"><i className="fas fa-times"></i></button>
                   </div>
                   <button type="button" onClick={downloadDiary} disabled={!state.history.length} className="mb-5 py-2 rounded-xl border border-indigo-100 bg-indigo-50 text-sm font-bold text-indigo-600 hover:bg-indigo-100 disabled:opacity-40"><i className="fas fa-file-arrow-down mr-2"></i>{tr("导出这段经历")}</button>
                   <div className="flex-1 overflow-y-auto custom-scroll space-y-6">
                      {state.history.length === 0 ? <div className="text-slate-400 text-center py-20 italic">{tr("尚未开启故事...")}</div> :
                        state.history.map((h, i) => {
                          const partner = state.flags.relationship_name || state.romancePartner;
                          return (
                          <div key={i} className="relative pl-6 border-l-2 border-indigo-100">
                             <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white shadow-sm"></div>
                             <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{tr(getPhaseLabel(h.phase))} {tr("· 第 ")}{h.week} {tr("周")}</div>
                             <h4 className="font-black text-slate-800 mt-1">{tr(formatCampusText(h.eventTitle, partner))}</h4>
                             <p className="text-xs text-slate-600 mt-1">{tr("决策：")}{tr(formatCampusText(h.choiceText, partner))}</p>
                             <div className="mt-2 text-[10px] font-bold text-slate-500 bg-slate-50 p-2 rounded-lg">{tr(formatCampusText(h.resultSummary, partner))}</div>
                          </div>
                          );
                        })}
                   </div>
                </div>
             </div>
        )}

        {/* Achievements */}
        {showAchievements && (
             <div className="fixed inset-0 z-[90] flex justify-center items-center bg-slate-900/50 backdrop-blur-sm animate-fadeIn p-4" onClick={() => closeGameOverlay(setShowAchievements)} role="dialog" aria-modal="true" aria-label={tr("成就墙")}>
                <div className="bg-white rounded-[40px] p-6 md:p-8 max-w-4xl w-full h-3/4 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6">
                         <div>
                             <h2 className="text-3xl font-black text-slate-800">{tr("成就墙")}</h2>
                             <p className="text-sm text-slate-500 mt-1">{tr("已解锁 ")}<span className="text-indigo-600 font-bold">{state.unlockedAchievements.length}</span> / {Object.keys(ACHIEVEMENTS).length}</p>
                         </div>
                         <button type="button" aria-label={tr("关闭")} onClick={() => closeGameOverlay(setShowAchievements)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><i className="fas fa-times"></i></button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scroll grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.values(ACHIEVEMENTS).map(ach => (
                            <div key={ach.id} className={`p-4 rounded-2xl border flex items-center gap-4 ${state.unlockedAchievements.includes(ach.id) ? 'bg-indigo-50 border-indigo-200' : 'opacity-50 grayscale'}`}>
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow flex-shrink-0"><i className={`fas ${ach.icon} text-indigo-500`}></i></div>
                                <div><h4 className="font-bold text-sm md:text-base text-slate-800">{tr(ach.title)}</h4><p className="text-[10px] md:text-xs text-slate-500">{tr(ach.description)}</p></div>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
        )}

        {/* Mobile Stats Drawer */}
        {showMobileStats && (
             <div className="fixed inset-0 z-[90] bg-slate-900/50 backdrop-blur-sm flex justify-start animate-fadeIn md:hidden" onClick={() => closeGameOverlay(setShowMobileStats)} role="dialog" aria-modal="true" aria-label={tr("个人状态与学科")}>
                 <div className="w-[88vw] max-w-sm h-full bg-slate-50 p-3 flex flex-col gap-2 shadow-2xl" onClick={e => e.stopPropagation()}>
                     <div className="flex justify-between items-center px-2 py-1">
                         <span className="font-black text-slate-700 text-sm">{tr("个人状态与学科档案")}</span>
                         <button type="button" aria-label={tr("关闭")} onClick={() => closeGameOverlay(setShowMobileStats)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                             <i className="fas fa-times" />
                         </button>
                     </div>
                     <div className="flex-1 min-h-0">
                         <StatsPanel
                             state={state}
                             onShowGuide={() => { closeGameOverlay(setShowMobileStats); openGameOverlay(setShowRealityGuide); }}
                             onShowContestHistory={() => { closeGameOverlay(setShowMobileStats); openGameOverlay(setShowContestHistory); }}
                         />
                     </div>
                 </div>
             </div>
        )}

        {/* Confirmation Dialog for Destructive Actions */}
        {confirmAction && (
             <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={() => setConfirmAction(null)} role="dialog" aria-modal="true" aria-label={tr("操作确认")}>
                 <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200" onClick={e => e.stopPropagation()}>
                     <h3 className="text-lg font-black text-slate-900 mb-2">
                         {tr(confirmAction === 'withdraw' ? '要提前离校吗？' : '读取手动存档？')}
                     </h3>
                     <p className="text-sm text-slate-600 mb-6">
                         {tr(confirmAction === 'withdraw'
                             ? '离校后，本局高一学年会立即结束。'
                             : '读取手动存档将覆盖你当前正在进行中的本局进度。')}
                     </p>
                     <div className="flex gap-3">
                         <button type="button" onClick={() => setConfirmAction(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">{tr("取消")}</button>
                         <button
                             type="button"
                             onClick={() => {
                                 const action = confirmAction;
                                 setConfirmAction(null);
                                 if (action === 'withdraw') {
                                     setState(p => ({ ...p, phase: Phase.WITHDRAWAL, isPlaying: false, isWeekend: false, currentEvent: null, eventQueue: [] }));
                                 } else {
                                     loadGame('manual');
                                 }
                             }}
                             className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white ${confirmAction === 'withdraw' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                         >
                             {tr("确认")}</button>
                     </div>
                 </div>
             </div>
        )}
        
        {/* Ending */}
        {(state.phase === Phase.ENDING || state.phase === Phase.WITHDRAWAL) && (
            <EndingScreen 
                state={state}
                endingData={getEndingData(state)}
                 onRestart={() => {
                     setShowHistory(false);
                     setShowSchedule(false);
                     setShowShop(false);
                     setShowAchievements(false);
                     setShowRealityGuide(false);
                     setShowContestHistory(false);
                     setShowMobileStats(false);
                     resetGame();
                     setView('HOME');
                 }}
                onViewHistory={() => openGameOverlay(setShowHistory)}
            />
        )}

      </main>
    </div>
  );
};

const App = () => <LanguageProvider><GameApp /></LanguageProvider>;
export default App;
