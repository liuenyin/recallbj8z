import { useLanguage } from '../lib/i18n';
import { getAcademicExamSubjectScore } from '../data/balance';

import React, { useState, useEffect, useRef } from 'react';
import { GameState, ExamResult, SubjectKey, SUBJECT_NAMES, Phase } from '../types';
import { isOIExamPhase, selectOIExamProblems, evaluateOIProblemScore, type OIExamItem } from '../data/oi_data';
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
  const isOI = isOIExamPhase(state.phase);

  const [oiProblems] = useState<OIExamItem[]>(() =>
    isOI ? selectOIExamProblems(state.phase) : []
  );

  // Determine which subjects to test based on phase
  const getSubjectsToTest = (): string[] => {
    if (isOI) {
      return Array.from({ length: oiProblems.length }, (_, i) => `oi_prob_${i + 1}`);
    }
    if (state.phase === Phase.PLACEMENT_EXAM || state.phase === Phase.MIDTERM_EXAM || state.phase === Phase.FINAL_EXAM || state.phase === Phase.MIDTERM_EXAM_2 || state.phase === Phase.FINAL_EXAM_2) {
      if (state.selectedSubjects && state.selectedSubjects.length === 3) {
        return ['chinese', 'math', 'english', ...state.selectedSubjects];
      }
      return ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology'];
    }
    return Object.keys(state.subjects) as SubjectKey[];
  };

  const [subjectsToTest] = useState(getSubjectsToTest);

  const evaluateExamStep = (stepIndex: number) => {
    const subjectKey = subjectsToTest[stepIndex];
    let score = 0;
    let maxScore = 100;
    let logMsg = '';
    let extraLog = '';

    const isRealisticAcademic = !isOI && state.difficulty === 'REALITY';
    const fluctuation = isOI ? 0.08 : isRealisticAcademic ? 0.055 : 0.07;
    let luckMultiplier = 1 + (Math.random() * 2 - 1) * fluctuation;
    luckMultiplier += (state.general.luck - 50) / (isOI ? 600 : isRealisticAcademic ? 900 : 800);
    const critChance = Math.max(0, state.general.luck - 20) / (isOI ? 550 : 500);
    if (Math.random() < critChance) {
      luckMultiplier += isOI ? 0.16 : 0.08;
      extraLog = ' (超常发挥！)';
    }
    const fumbleChance = Math.max(0, (50 - state.general.luck) / (isOI ? 550 : 500));
    if (Math.random() < fumbleChance) {
      luckMultiplier -= isOI ? 0.15 : 0.08;
      extraLog = ' (失误了...)';
    }
    if (state.general.mindset < 30) {
      luckMultiplier -= Math.random() * (isOI ? 0.09 : isRealisticAcademic ? 0.06 : 0.075);
    }

    if (isOI) {
      const prob = oiProblems[stepIndex];
      score = evaluateOIProblemScore(state.phase, prob, state.oiStats, state.subjects.math, state.general.experience, luckMultiplier);
      const outcomeText = hideDetails ? '表现已记录' : `获得 ${score} 分`;
      logMsg = prob.isWritten
        ? `${prob.name} 结束，${outcomeText}${extraLog}。`
        : `题目 "${prob.name}" 测试结束，${outcomeText}${extraLog}。`;
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
      const maxTotal = isOI ? subjectsToTest.length * 100 : getAcademicMaxScore(subjectsToTest);
      const ratio = total / maxTotal;

      if (isOI) {
          if (ratio >= 0.70) comment = "发挥很强，已经进入奖项或选拔机会的竞争区间，等待正式结果。";
          else if (ratio >= 0.50) comment = "发挥稳定，成绩有竞争力，但奖项仍取决于当年分数线和名额。";
          else if (ratio >= 0.30) comment = "拿到了一部分分数，赛后补题和复盘比猜奖项更重要。";
          else comment = "这场发挥不理想，先把失分点记下来，之后再决定是否继续参赛。";
      }

      onFinish({
        title,
        scores: currentScores,
        totalScore: total,
        totalStudents: isOI ? undefined : 633,
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
               {tr(isOI
                   ? `正在攻克 ${oiProblems[examStep]?.name || 'Unknown Problem'}...` 
                   : `正在进行 ${SUBJECT_NAMES[subjectsToTest[examStep] as SubjectKey]} 考试...`)}
            </span>
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></span>
          </div>
        )}
      </div>

      <div className={`grid gap-4 mb-8 ${subjectsToTest.length === 3 ? 'grid-cols-3' : subjectsToTest.length === 4 ? 'grid-cols-2 md:grid-cols-4' : subjectsToTest.length === 7 ? 'grid-cols-3 md:grid-cols-7' : 'grid-cols-3 md:grid-cols-6'}`}>
        {subjectsToTest.map((sub, idx) => (
          <div key={sub} className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm text-center">
            <div className="text-[10px] text-slate-500 uppercase truncate mb-1">
                {tr(isOI ? oiProblems[idx]?.name : SUBJECT_NAMES[sub as SubjectKey])}
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
