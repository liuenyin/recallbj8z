
import React from 'react';
import { GameState, SUBJECT_NAMES, SubjectKey } from '../types';
import { getEffectiveEfficiency } from '../data/utils';
import { getRelationshipStage, RELATIONSHIP_PROFILES } from '../data/relationships';

interface StatsPanelProps {
  state: GameState;
  onShowGuide?: () => void;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ state, onShowGuide }) => {
  const effectiveEfficiency = getEffectiveEfficiency(state);

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-5 space-y-6 h-full border border-white/40 overflow-y-auto custom-scroll flex flex-col transition-colors duration-300">
      {/* 状态概览 */}
      <div>
        {state.worldContext && (
            <div className="mb-4 p-3 bg-gradient-to-r from-slate-800 to-indigo-900 rounded-xl text-white shadow-inner flex flex-col gap-1 relative overflow-hidden">
                <i className="fas fa-globe-asia absolute -right-2 -bottom-4 text-6xl text-white/10"></i>
                <div className="text-[10px] text-indigo-200 font-bold tracking-widest uppercase mb-1">背景城市 / 时代</div>
                <div className="flex items-center justify-between z-10">
                    <span className="font-black text-sm">来自{state.worldContext.region} · 就读八中</span>
                    <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">{state.worldContext.yearStart} - {state.worldContext.yearEnd}</span>
                </div>
            </div>
        )}
        <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <i className="fas fa-user-circle"></i> 个人档案
            </h3>
            {state.isAiGenerating && (
                 <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold border border-indigo-100 animate-pulse">
                     <i className="fas fa-robot"></i> 正在生成事件...
                 </div>
            )}
        </div>
      </div>

      {state.relationshipProfileId && (() => {
        const profile = RELATIONSHIP_PROFILES.find(item => item.id === state.relationshipProfileId);
        if (!profile) return null;
        return (
          <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-black text-rose-800 flex items-center gap-2">
                <i className="fas fa-user-friends"></i> 重要同学
              </span>
              <span className="text-[10px] font-bold text-rose-500">{getRelationshipStage(state)}</span>
            </div>
            <div className="text-sm font-black text-slate-800">{profile.name} · {profile.role}</div>
            <div className="text-[11px] leading-relaxed text-slate-600 mt-1">{profile.personality}</div>
            <div className="text-[10px] leading-relaxed text-rose-600 mt-1">路线提示：{profile.routeHint}</div>
          </div>
        );
      })()}

      {/* 学业背景 */}
      <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-indigo-800">班级: {state.className || '待分班'}</span>
          <span className="text-xs font-bold text-indigo-800">
              效率: {state.difficulty === 'REALITY' ? (effectiveEfficiency >= 15 ? '高' : effectiveEfficiency >= 8 ? '中' : '低') : effectiveEfficiency.toFixed(1)} 
              {effectiveEfficiency > state.general.efficiency && <span className="text-emerald-500 text-[10px] ml-1">(+{ (effectiveEfficiency - state.general.efficiency).toFixed(0) })</span>}
          </span>
        </div>
        <div className="h-1.5 bg-indigo-200 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600" style={{ width: `${Math.min(100, effectiveEfficiency * 5)}%` }}></div>
        </div>
      </div>

      {/* 6大基础属性 */}
      <div>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <i className="fas fa-chart-bar"></i> 身心状态
        </h3>
        <div className="grid grid-cols-2 gap-2">
            <StatMini icon="fa-brain" label="心态" value={state.general.mindset} color="text-indigo-500" hideValue={state.difficulty === 'REALITY'} />
            <StatMini icon="fa-heartbeat" label="健康" value={state.general.health} color="text-emerald-500" hideValue={state.difficulty === 'REALITY'} />
            <StatMini icon="fa-coins" label="金钱" value={state.general.money} color="text-yellow-600" hideValue={state.difficulty === 'REALITY'} />
            <StatMini icon="fa-book" label="经验" value={state.general.experience} color="text-blue-500" hideValue={state.difficulty === 'REALITY'} />
            <StatMini icon="fa-star" label="幸运" value={state.general.luck} color="text-amber-500" hideValue={state.difficulty === 'REALITY'} />
            <StatMini icon="fa-heart" label="桃花" value={state.general.romance} color="text-pink-500" hideValue={state.difficulty === 'REALITY'} />
            <StatMini icon="fa-battery-quarter" label="疲劳" value={state.fatigue} color="text-rose-500" hideValue={state.difficulty === 'REALITY'} />
        </div>
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
      <div className="flex-1 pb-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <i className="fas fa-graduation-cap"></i> 学科能力
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {(Object.keys(state.subjects) as SubjectKey[]).map(key => {
             const isSelected = state.selectedSubjects.includes(key);
             return (
                <div key={key} className="group">
                  <div className="flex justify-between text-[11px] mb-1">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">{SUBJECT_NAMES[key]}</span>
                        {isSelected && <span className="bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded text-[9px] font-bold">选考</span>}
                    </div>
                    <span className="text-slate-400">{state.difficulty === 'REALITY' ? '' : `天赋 ${state.subjects[key].aptitude} | 水平 ${state.subjects[key].level.toFixed(1)}`}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div 
                       className="h-full bg-indigo-500 group-hover:bg-indigo-400 transition-all duration-700" 
                       style={{ width: `${Math.min(100, state.subjects[key].level)}%` }}
                    />
                  </div>
                </div>
             );
          })}
        </div>
      </div>
    </div>
  );
};

const StatMini = ({ icon, label, value, color, hideValue }: { icon: string, label: string, value: number, color: string, hideValue?: boolean }) => {
  const getVagueLabel = (v: number) => {
    if (v >= 80) return '极高';
    if (v >= 60) return '较高';
    if (v >= 40) return '一般';
    if (v >= 20) return '较低';
    return '极低';
  };
  return (
    <div className="bg-slate-50 rounded-lg p-2 flex flex-col items-center justify-center border border-slate-100 hover:border-indigo-200 transition-colors">
      <i className={`fas ${icon} ${color} text-sm mb-1`}></i>
      <span className="text-[10px] text-slate-500">{label}</span>
      <span className={`text-xs font-bold ${color}`}>{hideValue ? getVagueLabel(value) : value.toFixed(0)}</span>
    </div>
  );
};

export default StatsPanel;
