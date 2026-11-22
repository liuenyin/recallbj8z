import { useLanguage } from '../lib/i18n';
import { getAcademicExamSubjectScore } from '../data/balance';

import React, { useState, useEffect, useRef } from 'react';
import { GameState, ExamResult, SubjectKey, SUBJECT_NAMES, Phase, OIProblem, OIStats } from '../types';
import { OI_PROBLEMS } from '../data/oi_data';
import { getEffectiveEfficiency } from '../data/utils';
import { getAcademicMaxScore } from '../data/game_flow';

interface ExamViewProps {
  title: string;
  state: GameState;
  onFinish: (result: ExamResult) => void;
}

interface ExamLogEntry {
  message: string;
  timestamp: number;
}

const ExamView: React.FC<ExamViewProps> = ({ title, state, onFinish }) => {
    const { t: tr } = useLanguage();
  const [examStep, setExamStep] = useState(0);
  const [examLogs, setExamLogs] = useState<ExamLogEntry[]>([]);
  const [currentScores, setCurrentScores] = useState<Record<string, number>>({});
  const [isFinished, setIsFinished] = useState(false);
  const finishSubmittedRef = useRef(false);
  const logBoxRef = useRef<HTMLDivElement>(null);
  const hideDetails = state.difficulty === 'REALITY';

  // Determine which subjects to test based on phase
  const getSubjectsToTest = (): string[] => {
    if ([Phase.CSP_EXAM, Phase.NOIP_EXAM, Phase.WC_EXAM, Phase.PROVINCIAL_EXAM, Phase.APIO_EXAM, Phase.NOI_EXAM].includes(state.phase)) {
      const problemCount = [Phase.NOI_EXAM].includes(state.phase) ? 8 : [Phase.WC_EXAM, Phase.PROVINCIAL_EXAM, Phase.APIO_EXAM].includes(state.phase) ? 6 : 4;
      return Array.from({length: problemCount}, (_, i) => `oi_prob_${i+1}`);
    }
    if (state.phase === Phase.PLACEMENT_EXAM) {
        if (state.selectedSubjects && state.selectedSubjects.length === 3) {
            return ['chinese', 'math', 'english', ...state.selectedSubjects];
        }
        // Fallback
        return ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology'];
    }
    if (state.phase === Phase.MIDTERM_EXAM || state.phase === Phase.FINAL_EXAM || state.phase === Phase.MIDTERM_EXAM_2 || state.phase === Phase.FINAL_EXAM_2) {
      if (state.selectedSubjects.length === 3) {
          return ['chinese', 'math', 'english', ...state.selectedSubjects];
      }
      return ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology'];
    }
    return Object.keys(state.subjects) as SubjectKey[];
  };

  const [subjectsToTest] = useState(getSubjectsToTest());
  const [oiProblems] = useState<OIProblem[]>(() => {
       if ([Phase.CSP_EXAM, Phase.NOIP_EXAM, Phase.WC_EXAM, Phase.PROVINCIAL_EXAM, Phase.APIO_EXAM, Phase.NOI_EXAM].includes(state.phase)) {
           const problemCount = [Phase.NOI_EXAM].includes(state.phase) ? 8 : [Phase.WC_EXAM, Phase.PROVINCIAL_EXAM, Phase.APIO_EXAM].includes(state.phase) ? 6 : 4;
           const maxLevel = state.phase === Phase.CSP_EXAM ? 3
             : state.phase === Phase.NOIP_EXAM ? 5
             : state.phase === Phase.PROVINCIAL_EXAM ? 8
             : state.phase === Phase.APIO_EXAM ? 9
             : 10;
           // Advanced contests should not roll the same introductory questions as CSP.
           const minLevel = Math.max(1, maxLevel - problemCount + 1);
           const authored = OI_PROBLEMS.filter(problem => problem.level >= minLevel && problem.level <= maxLevel);
           const pool = authored.length >= problemCount ? authored : OI_PROBLEMS;
           const shuffled = [...pool].sort(() => 0.5 - Math.random());
           return shuffled.slice(0, problemCount);
       }
       return [];
  });

  const getOIPaperDifficulty = (phase: Phase): number => {
      switch (phase) {
          case Phase.CSP_EXAM: return 1.0;
          case Phase.NOIP_EXAM: return 1.3;
          case Phase.WC_EXAM: return 1.5;
          case Phase.PROVINCIAL_EXAM: return 1.8;
          case Phase.APIO_EXAM: return 1.6;
          case Phase.NOI_EXAM: return 2.0;
          default: return 1.0;
      }
  };

  const evaluateExamStep = (stepIndex: number) => {
    const subjectKey = subjectsToTest[stepIndex];
    const isOI = [Phase.CSP_EXAM, Phase.NOIP_EXAM, Phase.WC_EXAM, Phase.PROVINCIAL_EXAM, Phase.APIO_EXAM, Phase.NOI_EXAM].includes(state.phase);
    let score = 0;
    let maxScore = 100;
    let logMsg = '';
    let extraLog = '';

    const isRealisticAcademic = !isOI && state.difficulty === 'REALITY';
    const fluctuation = isOI ? 0.1 : isRealisticAcademic ? 0.055 : 0.07;
    let luckMultiplier = 1 + (Math.random() * 2 - 1) * fluctuation;
    luckMultiplier += (state.general.luck - 50) / (isOI ? 500 : isRealisticAcademic ? 900 : 800);
    const critChance = Math.max(0, state.general.luck - 20) / 500;
    if (Math.random() < critChance) {
      luckMultiplier += isOI ? 0.25 : 0.08;
      extraLog = ' (超常发挥！)';
    }
    const fumbleChance = Math.max(0, (50 - state.general.luck) / 500);
    if (Math.random() < fumbleChance) {
      luckMultiplier -= isOI ? 0.2 : 0.08;
      extraLog = ' (失误了...)';
    }
    if (state.general.mindset < 30) {
      luckMultiplier -= Math.random() * (isOI ? 0.1 : isRealisticAcademic ? 0.06 : 0.075);
    }

    if (isOI) {
      const difficultyMod = getOIPaperDifficulty(state.phase);
      const prob = oiProblems[stepIndex];
      const stats = state.oiStats;
      let weightedRatio = 0;
      let totalWeight = 0;
      (['dp', 'ds', 'math', 'string', 'graph', 'misc'] as const).forEach(k => {
        const d = prob.difficulty[k];
        if (d > 0) {
          const need = (d * 2.2 + 2) * difficultyMod;
          const dimRatio = Math.min(1.1, (stats[k] || 0) / need);
          weightedRatio += dimRatio * d;
          totalWeight += d;
        }
      });
      const baseMastery = totalWeight > 0 ? weightedRatio / totalWeight : 0;
      const mathBonus = Math.min(0.10, (state.subjects.math.aptitude * 0.03 + state.subjects.math.level * 0.1) / (30 * difficultyMod));
      const finalRatio = (baseMastery + mathBonus) * luckMultiplier;
      if (finalRatio >= 0.97) score = 100;
      else score = Math.max(0, Math.floor(Math.min(100, finalRatio * 100)));
      logMsg = `题目 "${prob.name}" 测试结束，${hideDetails ? '表现已记录' : `获得 ${score} 分`}${extraLog}。`;
    } else {
      const subject = subjectKey as SubjectKey;
      const isMainSubject = ['chinese', 'math', 'english'].includes(subject);
      maxScore = isMainSubject ? 150 : 100;
      score = getAcademicExamSubjectScore(state, subject, maxScore, getEffectiveEfficiency(state), luckMultiplier);
      logMsg = `${SUBJECT_NAMES[subject]} 考试结束，${hideDetails ? '表现已记录' : `得分 ${score}/${maxScore}`}${extraLog}。`;
    }
    return { subjectKey, score, logMsg };
  };

  useEffect(() => {
    logBoxRef.current?.scrollTo({ top: logBoxRef.current.scrollHeight, behavior: 'smooth' });
  }, [examLogs]);

  useEffect(() => {
    if (examStep < subjectsToTest.length) {
      const timer = setTimeout(() => {
        const { subjectKey, score, logMsg } = evaluateExamStep(examStep);
        setCurrentScores(prev => ({ ...prev, [subjectKey]: score }));
        setExamLogs(prev => [...prev, { message: logMsg, timestamp: Date.now() }]);
        setExamStep(prev => prev + 1);
      }, 800);
      return () => clearTimeout(timer);
    } else if (!isFinished) {
      setIsFinished(true);
    }
  }, [examStep, isFinished, subjectsToTest.length]);

  const handleSkipAnimation = () => {
    if (examStep >= subjectsToTest.length) return;
    const nextScores = { ...currentScores };
    const nextLogs = [...examLogs];
    for (let i = examStep; i < subjectsToTest.length; i += 1) {
      const { subjectKey, score, logMsg } = evaluateExamStep(i);
      nextScores[subjectKey] = score;
      nextLogs.push({ message: logMsg, timestamp: Date.now() });
    }
    setCurrentScores(nextScores);
    setExamLogs(nextLogs);
    setExamStep(subjectsToTest.length);
    setIsFinished(true);
  };

  const handleFinishConfirm = () => {
      if (finishSubmittedRef.current) return;
      finishSubmittedRef.current = true;
      const total = (Object.values(currentScores) as number[]).reduce((a, b) => a + b, 0);
      
      let comment = "试卷已批阅。";
      // Comments based on relative performance (Phase sensitive)
      const isOIExam = [Phase.CSP_EXAM, Phase.NOIP_EXAM, Phase.WC_EXAM, Phase.PROVINCIAL_EXAM, Phase.APIO_EXAM, Phase.NOI_EXAM].includes(state.phase);
      const maxTotal = isOIExam ? subjectsToTest.length * 100 : getAcademicMaxScore(subjectsToTest);
      const ratio = total / maxTotal;

      if (isOIExam) {
          if (ratio >= 0.85) comment = "发挥很强，已经进入奖项或选拔机会的竞争区间，等待正式结果。";
          else if (ratio >= 0.65) comment = "发挥稳定，成绩有竞争力，但奖项仍取决于当年分数线和名额。";
          else if (ratio >= 0.4) comment = "拿到了一部分分数，赛后补题和复盘比猜奖项更重要。";
          else comment = "这场发挥不理想，先把失分点记下来，之后再决定是否继续参赛。";
      }

      onFinish({
        title,
        scores: currentScores,
        totalScore: total,
        totalStudents: isOIExam ? undefined : 633,
        comment
      });
  };

  return (
    <div className="bg-white rounded-3xl p-8 h-full flex flex-col shadow-2xl overflow-hidden relative border border-slate-200">
      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 animate-pulse"></div>
      
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3 text-slate-800">
          <i className="fas fa-file-signature text-indigo-500"></i>
          {tr(title)}
        </h2>
        <div className="flex items-center gap-2">
          {!isFinished && (
            <button type="button" onClick={handleSkipAnimation} className="px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors">
              {tr("跳过动画")}</button>
          )}
          <div className="px-4 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-mono">
            STATUS: {tr(isFinished ? 'COMPLETED' : 'IN_PROGRESS')}
          </div>
        </div>
      </div>

      <div ref={logBoxRef} className="flex-1 overflow-y-auto space-y-4 font-mono text-sm custom-scroll pr-4 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
        {examLogs.map((log, i) => (
          <div key={i} className="flex gap-4 items-start animate-fadeIn">
            <span className="text-slate-400">[{tr(new Date(log.timestamp).toLocaleTimeString())}]</span>
            <span className={`text-slate-700 ${log.message.includes('超常发挥') ? 'text-amber-600 font-bold' : log.message.includes('失误') ? 'text-rose-600' : ''}`}>{tr(log.message)}</span>
          </div>
        ))}
        {examStep < subjectsToTest.length && (
          <div className="flex gap-4 items-center">
            <span className="text-slate-400">[{tr(new Date().toLocaleTimeString())}]</span>
            <span className="text-slate-500 font-bold">
               {tr([Phase.CSP_EXAM, Phase.NOIP_EXAM, Phase.WC_EXAM, Phase.PROVINCIAL_EXAM, Phase.APIO_EXAM, Phase.NOI_EXAM].includes(state.phase)
                   ? `正在攻克 ${oiProblems[examStep]?.name || 'Unknown Problem'}...` 
                   : `正在进行 ${SUBJECT_NAMES[subjectsToTest[examStep] as SubjectKey]} 考试...`)}
            </span>
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-8">
        {subjectsToTest.map((sub, idx) => (
          <div key={sub} className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm text-center">
            <div className="text-[10px] text-slate-500 uppercase truncate mb-1">
                {tr([Phase.CSP_EXAM, Phase.NOIP_EXAM, Phase.WC_EXAM, Phase.PROVINCIAL_EXAM, Phase.APIO_EXAM, Phase.NOI_EXAM].includes(state.phase) ? oiProblems[idx]?.name : SUBJECT_NAMES[sub as SubjectKey])}
            </div>
            <div className="text-xl font-black text-indigo-600">{tr(currentScores[sub] === undefined ? '--' : hideDetails ? '·' : currentScores[sub])}</div>
          </div>
        ))}
      </div>
      
      {isFinished && (
           <button onClick={handleFinishConfirm} disabled={finishSubmittedRef.current} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-lg shadow-xl transition-all animate-fadeIn flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
              {tr("查看排名 / 继续 ")}<i className="fas fa-arrow-right"></i>
          </button>
      )}
    </div>
  );
};

export default ExamView;
