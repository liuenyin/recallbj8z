
import React, { useState, useEffect } from 'react';
import { GameState, ExamResult, SubjectKey, SUBJECT_NAMES, Phase, OIProblem, OIStats } from '../types';
import { OI_PROBLEMS } from '../data/oi_data';

interface ExamViewProps {
  title: string;
  state: GameState;
  onFinish: (result: ExamResult) => void;
}

const ExamView: React.FC<ExamViewProps> = ({ title, state, onFinish }) => {
  const [examStep, setExamStep] = useState(0);
  const [examLogs, setExamLogs] = useState<string[]>([]);
  const [currentScores, setCurrentScores] = useState<Record<string, number>>({});
  const [isFinished, setIsFinished] = useState(false);

  // Determine which subjects to test based on phase
  const getSubjectsToTest = (): string[] => {
    if (state.phase === Phase.CSP_EXAM || state.phase === Phase.NOIP_EXAM) {
      // Pick 4 random OI problems
      return ['oi_prob_1', 'oi_prob_2', 'oi_prob_3', 'oi_prob_4'];
    }
    if (state.phase === Phase.PLACEMENT_EXAM || state.phase === Phase.MIDTERM_EXAM || state.phase === Phase.FINAL_EXAM) {
      if (state.selectedSubjects.length === 3) {
          return ['chinese', 'math', 'english', ...state.selectedSubjects];
      }
      return ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology'];
    }
    return Object.keys(state.subjects) as SubjectKey[];
  };

  const [subjectsToTest] = useState(getSubjectsToTest());
  const [oiProblems] = useState<OIProblem[]>(() => {
       if (state.phase === Phase.CSP_EXAM || state.phase === Phase.NOIP_EXAM) {
           // Randomly select 4 distinct problems
           const shuffled = [...OI_PROBLEMS].sort(() => 0.5 - Math.random());
           return shuffled.slice(0, 4);
       }
       return [];
  });

  useEffect(() => {
    if (examStep < subjectsToTest.length) {
      const subjectKey = subjectsToTest[examStep];
      const isOI = state.phase === Phase.CSP_EXAM || state.phase === Phase.NOIP_EXAM;
      
      const timer = setTimeout(() => {
        let score = 0;
        let maxScore = 100;
        let logMsg = '';

        if (isOI) {
             const prob = oiProblems[examStep];
             maxScore = 100;
             const stats = state.oiStats;
             
             // Base performance on relevant stat
             let ability = 0;
             let required = 0;
             
             // Weighted ability based on problem profile
             if (prob.difficulty.dp > 0) { ability += stats.dp; required += prob.difficulty.dp; }
             if (prob.difficulty.ds > 0) { ability += stats.ds; required += prob.difficulty.ds; }
             if (prob.difficulty.math > 0) { ability += stats.math; required += prob.difficulty.math; }
             if (prob.difficulty.string > 0) { ability += stats.string; required += prob.difficulty.string; }
             if (prob.difficulty.graph > 0) { ability += stats.graph; required += prob.difficulty.graph; }
             if (prob.difficulty.misc > 0) { ability += stats.misc; required += prob.difficulty.misc; }
             
             // Misc base capability from general intelligence/math
             ability += state.subjects.math.aptitude * 0.1; 
             
             // Difficulty scaling - INCREASED DIFFICULTY MULTIPLIER to nerf easy wins
             const difficultyFactor = (required * 7.5); 
             
             // Score Calc
             let ratio = ability / Math.max(1, difficultyFactor);
             
             // RNG Factors
             const luckFactor = (state.general.luck - 50) / 400; // +/- 0.125
             const mindsetFactor = (state.general.mindset - 50) / 400;

             // Difficulty Mode Modifier
             let modeMod = 0.7;
             if (state.difficulty === 'NORMAL') modeMod = 1.0; 
             if (state.difficulty === 'REALITY') modeMod = 0.5; // Slightly harder nerf for reality

             const finalRatio = (ratio + luckFactor + mindsetFactor) * modeMod;
             
             // Clamping for partial points logic
             if (finalRatio >= 0.98) score = 100; // Harder to get AK
             else if (finalRatio <= 0.15) score = 0;
             else score = Math.floor(Math.pow(finalRatio, 0.8) * 100);
             
             logMsg = `题目 "${prob.name}" (难度:${prob.level}) 测试结束，获得 ${score} 分。`;

        } else {
            // Standard Exam Logic
            const subject = subjectKey as SubjectKey;
            const isMainSubject = ['chinese', 'math', 'english'].includes(subject);
            maxScore = isMainSubject ? 150 : 100;
            
            const stats = state.subjects[subject];
            // Nerfed formula: Harder to get full marks
            // New Formula: (Aptitude * 0.2 + Level * 1.0) / 80  -- Reduced multipliers heavily
            let basePercentage = (stats.aptitude * 0.2 + stats.level * 1.0) / 80;
            basePercentage = Math.max(0.3, basePercentage); 

            const luckFactor = (state.general.luck - 50) / 500; 
            const mindsetFactor = (state.general.mindset - 50) / 500;
            const efficiencyFactor = (state.general.efficiency - 10) / 200;
            
            // Random variance 0.85 - 1.15 (Wider range)
            const randomVar = 0.85 + Math.random() * 0.3; 

            let finalPercentage = (basePercentage + luckFactor + mindsetFactor + efficiencyFactor) * randomVar;
            finalPercentage = Math.min(1.0, Math.max(0, finalPercentage));
            
            // Curve the score slightly towards the middle-high range for realism, but harder to get perfect
            finalPercentage = Math.pow(finalPercentage, 0.9);

            score = Math.floor(finalPercentage * maxScore);
            // Cap at max score
            if (score > maxScore) score = maxScore;

            logMsg = `${SUBJECT_NAMES[subject]} 考试结束，得分 ${score}/${maxScore}。`;
        }

        setCurrentScores(prev => ({ ...prev, [subjectKey]: score }));
        setExamLogs(prev => [...prev, logMsg]);
        setExamStep(prev => prev + 1);
      }, 800);
      return () => clearTimeout(timer);
    } else if (!isFinished) {
      setIsFinished(true);
    }
  }, [examStep, state, currentScores, isFinished, subjectsToTest, oiProblems]);

  const handleFinishConfirm = () => {
      const total = (Object.values(currentScores) as number[]).reduce((a, b) => a + b, 0);
      
      let comment = "继续努力。";
      if (state.phase === Phase.CSP_EXAM || state.phase === Phase.NOIP_EXAM) {
          if (total >= 300) comment = "神乎其技，你就是机房的传说！";
          else if (total >= 200) comment = "发挥稳定，应该能拿奖。";
          else if (total >= 100) comment = "有些遗憾，明年再战。";
          else comment = "技不如人，甘拜下风。";
      } else {
          // 普通考试评价
          const maxTotal = subjectsToTest.reduce((acc, s) => acc + (['chinese', 'math', 'english'].includes(s) ? 150 : 100), 0);
          const ratio = total / maxTotal;
          if (ratio > 0.95) comment = "傲视群雄，你是八中当之无愧的传说，老师口中的“那个学生”！"; 
          else if (ratio > 0.85) comment = "表现优异，保持在这个梯队。";
          else if (ratio > 0.70) comment = "中规中矩，还有提升空间。";
          else comment = "基础不牢，地动山摇。";
      }

      onFinish({
        title,
        scores: currentScores,
        totalScore: total,
        comment
      });
  };

  return (
    <div className="bg-white rounded-3xl p-8 h-full flex flex-col shadow-2xl overflow-hidden relative border border-slate-200">
      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 animate-pulse"></div>
      
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3 text-slate-800">
          <i className="fas fa-file-signature text-indigo-500"></i>
          {title}
        </h2>
        <div className="px-4 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-mono">
          STATUS: {isFinished ? 'COMPLETED' : 'IN_PROGRESS'}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 font-mono text-sm custom-scroll pr-4 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
        {examLogs.map((log, i) => (
          <div key={i} className="flex gap-4 items-start animate-fadeIn">
            <span className="text-slate-400">[{new Date().toLocaleTimeString()}]</span>
            <span className="text-slate-700">{log}</span>
          </div>
        ))}
        {examStep < subjectsToTest.length && (
          <div className="flex gap-4 items-center">
            <span className="text-slate-400">[{new Date().toLocaleTimeString()}]</span>
            <span className="text-slate-500 font-bold">
               {state.phase === Phase.CSP_EXAM || state.phase === Phase.NOIP_EXAM 
                  ? `正在攻克 ${oiProblems[examStep]?.name || 'Unknown Problem'}...` 
                  : `正在进行 ${SUBJECT_NAMES[subjectsToTest[examStep] as SubjectKey]} 考试...`}
            </span>
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-8">
        {subjectsToTest.map((sub, idx) => (
          <div key={sub} className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm text-center">
            <div className="text-[10px] text-slate-500 uppercase truncate mb-1">
                {state.phase === Phase.CSP_EXAM || state.phase === Phase.NOIP_EXAM ? oiProblems[idx]?.name : SUBJECT_NAMES[sub as SubjectKey]}
            </div>
            <div className="text-xl font-black text-indigo-600">{currentScores[sub] ?? '--'}</div>
          </div>
        ))}
      </div>
      
      {isFinished && (
          <button onClick={handleFinishConfirm} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-lg shadow-xl transition-all animate-fadeIn flex items-center justify-center gap-2 active:scale-95">
              查看排名 / 继续 <i className="fas fa-arrow-right"></i>
          </button>
      )}
    </div>
  );
};

export default ExamView;
