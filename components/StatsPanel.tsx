
import React from 'react';
import { GameState, SUBJECT_NAMES, SubjectKey } from '../types';

interface StatsPanelProps {
  state: GameState;
  onShowGuide?: () => void;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ state, onShowGuide }) => {
  const isReality = state.difficulty === 'REALITY';

  // Helper to generate fuzzy description based on stats
  const getFuzzyDesc = (val: number, type: 'general' | 'subject' | 'efficiency') => {
      // 1. Calculate Perceived Value
      // Bias: Mindset < 50 causes underestimation, > 50 causes overestimation
      const bias = (state.general.mindset - 50) * 0.2; 
      // Noise: Low experience causes high variance (uncertainty)
      const noiseRange = Math.max(5, (35 - state.general.experience) * 0.5);
      // Deterministic randomness based on value and week to prevent flickering within same week
      const pseudoRandom = Math.sin(state.week * val * 123.45); 
      
      const perceivedVal = val + bias + (pseudoRandom * noiseRange);

      // 2. Map to Text
      if (type === 'efficiency') {
          // Efficiency scale roughly -5 to 25
          if (perceivedVal < 0) return { t: "极度涣散", c: "text-rose-500" };
          if (perceivedVal < 5) return { t: "心不在焉", c: "text-orange-500" };
          if (perceivedVal < 10) return { t: "普普通通", c: "text-slate-500" };
          if (perceivedVal < 15) return { t: "专注", c: "text-indigo-500" };
          if (perceivedVal < 20) return { t: "高效", c: "text-emerald-500" };
          return { t: "心流", c: "text-amber-500 font-black" };
      }
      
      // General scale 0 to 100+
      if (perceivedVal < 20) return { t: "糟糕透顶", c: "text-rose-600" };
      if (perceivedVal < 40) return { t: "不太妙", c: "text-orange-500" };
      if (perceivedVal < 60) return { t: "平平无奇", c: "text-slate-500" };
      if (perceivedVal < 80) return { t: "感觉良好", c: "text-emerald-600" };
      if (perceivedVal < 100) return { t: "充满自信", c: "text-indigo-600" };
      return { t: "超凡脱俗", c: "text-amber-500 font-black" };
  };

  const getSubjectDesc = (stats: { aptitude: number, level: number }) => {
      // Subject mastery depends on Level primarily, Aptitude affects 'feeling' of potential
      const val = stats.level;
      // High aptitude makes you feel better even if level is low (Dunning-Kruger-ish)
      const aptitudeBias = (stats.aptitude - 50) * 0.2;
      
      const bias = (state.general.mindset - 50) * 0.3 + aptitudeBias;
      const noiseRange = Math.max(5, (80 - state.general.experience) * 0.4);
      const pseudoRandom = Math.cos(state.week * val * 67.89);
      
      const perceivedVal = val + bias + (pseudoRandom * noiseRange);

      if (perceivedVal < 10) return { t: "一窍不通", c: "text-rose-500" };
      if (perceivedVal < 25) return { t: "略懂皮毛", c: "text-orange-500" };
      if (perceivedVal < 45) return { t: "马马虎虎", c: "text-slate-500" };
      if (perceivedVal < 65) return { t: "渐入佳境", c: "text-indigo-500" };
      if (perceivedVal < 85) return { t: "得心应手", c: "text-emerald-600" };
      return { t: "登峰造极", c: "text-amber-500 font-black" };
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-5 space-y-6 h-full border border-slate-200 overflow-y-auto custom-scroll flex flex-col transition-colors duration-300">
      {/* 状态概览 */}
      <div>
        <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <i className="fas fa-user-circle"></i> {isReality ? "自我认知" : "个人档案"}
            </h3>
            {isReality && onShowGuide && (
                <button onClick={onShowGuide} className="text-slate-400 hover:text-indigo-600 transition-colors" title="查看状态说明">
                    <i className="fas fa-question-circle"></i>
                </button>
            )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {isReality ? (
              <>
                <StatText icon="fa-brain" label="心态" fuzzy={getFuzzyDesc(state.general.mindset, 'general')} />
                <StatText icon="fa-book-open" label="经验" fuzzy={getFuzzyDesc(state.general.experience, 'general')} />
                <StatText icon="fa-heart" label="魅力" fuzzy={getFuzzyDesc(state.general.romance, 'general')} />
                <StatText icon="fa-medkit" label="健康" fuzzy={getFuzzyDesc(state.general.health, 'general')} />
                {/* Money is always visible */}
                <StatMini icon="fa-coins" label="金钱" value={state.general.money} color="text-yellow-600" />
                <StatText icon="fa-clover" label="运气" fuzzy={getFuzzyDesc(state.general.luck, 'general')} />
              </>
          ) : (
              <>
                <StatMini icon="fa-brain" label="心态" value={state.general.mindset} color="text-blue-500" />
                <StatMini icon="fa-book-open" label="经验" value={state.general.experience} color="text-amber-500" />
                <StatMini icon="fa-heart" label="魅力" value={state.general.romance} color="text-rose-500" />
                <StatMini icon="fa-medkit" label="健康" value={state.general.health} color="text-emerald-500" />
                <StatMini icon="fa-coins" label="金钱" value={state.general.money} color="text-yellow-600" />
                <StatMini icon="fa-clover" label="运气" value={state.general.luck} color="text-purple-500" />
              </>
          )}
        </div>
      </div>

      {/* 学业背景 */}
      <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-indigo-800">班级: {state.className || '待分班'}</span>
          {isReality ? (
              <span className={`text-xs font-bold ${getFuzzyDesc(state.general.efficiency, 'efficiency').c}`}>
                  状态: {getFuzzyDesc(state.general.efficiency, 'efficiency').t}
              </span>
          ) : (
              <span className="text-xs font-bold text-indigo-800">效率: {state.general.efficiency.toFixed(1)}</span>
          )}
        </div>
        {!isReality && (
            <div className="h-1.5 bg-indigo-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600" style={{ width: `${Math.min(100, state.general.efficiency * 5)}%` }}></div>
            </div>
        )}
      </div>

       {/* 天赋展示 */}
       {state.talents.length > 0 && (
           <div>
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                   <i className="fas fa-dna"></i> 天赋
               </h3>
               <div className="flex flex-wrap gap-2">
                   {state.talents.map(t => (
                       <div key={t.id} className={`px-2 py-1 rounded text-[10px] font-bold border ${t.rarity === 'legendary' ? 'bg-amber-50 border-amber-300 text-amber-700' : t.rarity === 'rare' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : t.rarity === 'cursed' ? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-600'}`} title={t.description}>
                           {t.name}
                       </div>
                   ))}
               </div>
           </div>
       )}

      {/* 学科属性 */}
      <div className="flex-1">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <i className="fas fa-graduation-cap"></i> 学术评估
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {(Object.keys(state.subjects) as SubjectKey[]).map(key => {
             const fuzzy = getSubjectDesc(state.subjects[key]);
             const isSelected = state.selectedSubjects.includes(key);
             return (
                <div key={key} className="group">
                  <div className="flex justify-between text-[11px] mb-1">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">{SUBJECT_NAMES[key]}</span>
                        {isSelected && <span className="bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded text-[9px] font-bold">选考</span>}
                    </div>
                    {isReality ? (
                        <span className={`font-medium ${fuzzy.c}`}>{fuzzy.t}</span>
                    ) : (
                        <span className="text-slate-400">天赋 {state.subjects[key].aptitude} | 水平 {state.subjects[key].level.toFixed(1)}</span>
                    )}
                  </div>
                  {!isReality && (
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div 
                          className="h-full bg-indigo-500 group-hover:bg-indigo-400 transition-all duration-700" 
                          style={{ width: `${Math.min(100, state.subjects[key].level)}%` }}
                        />
                      </div>
                  )}
                </div>
             );
          })}
        </div>
      </div>
    </div>
  );
};

const StatMini = ({ icon, label, value, color }: { icon: string, label: string, value: number, color: string }) => (
  <div className="bg-slate-50 rounded-lg p-2 flex flex-col items-center justify-center border border-slate-100 hover:border-indigo-200 transition-colors">
    <i className={`fas ${icon} ${color} text-sm mb-1`}></i>
    <span className="text-[10px] text-slate-500">{label}</span>
    <span className="text-xs font-bold text-slate-800">{value.toFixed(0)}</span>
  </div>
);

const StatText = ({ icon, label, fuzzy }: { icon: string, label: string, fuzzy: { t: string, c: string } }) => (
  <div className="bg-slate-50 rounded-lg p-2 flex flex-col items-center justify-center border border-slate-100 hover:border-indigo-200 transition-colors min-h-[60px]">
    <i className={`fas ${icon} text-slate-400 text-xs mb-1`}></i>
    <span className="text-[10px] text-slate-500">{label}</span>
    <span className={`text-[10px] font-bold text-center leading-tight ${fuzzy.c}`}>{fuzzy.t}</span>
  </div>
);

export default StatsPanel;
