import { useLanguage } from '../lib/i18n';

import React from 'react';
import { Talent } from '../types';

interface TalentViewProps {
    availableTalents: Talent[];
    selectedTalents: Talent[];
    talentPoints: number;
    onToggleTalent: (talent: Talent) => void;
    onConfirm: () => void;
    onBack: () => void;
}

const RARITY_STYLES: Record<Talent['rarity'], { label: string; badge: string }> = {
    common: { label: '普通', badge: 'bg-slate-100 text-slate-600' },
    rare: { label: '稀有', badge: 'bg-indigo-100 text-indigo-700' },
    legendary: { label: '传说', badge: 'bg-amber-100 text-amber-700' },
    mythical: { label: '神话', badge: 'bg-fuchsia-100 text-fuchsia-700' },
    cursed: { label: '负面', badge: 'bg-rose-100 text-rose-600' }
};

const TalentView: React.FC<TalentViewProps> = ({ availableTalents, selectedTalents, talentPoints, onToggleTalent, onConfirm, onBack }) => {
    const { t: tr } = useLanguage();
    const isAtCap = selectedTalents.length >= 5;
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-10 font-sans relative">
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-3 tracking-tight">{tr("天赋抉择")}</h2>
              <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 mb-6 bg-white px-5 py-2.5 rounded-2xl md:rounded-full border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-bold text-sm">{tr("剩余点数")}</span>
                      <span className={`text-2xl font-black ${talentPoints >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{talentPoints}</span>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isAtCap ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-600'}`}>
                      {tr("已选 ")}{selectedTalents.length} / 5 {tr(isAtCap ? '（已满）' : '')}
                  </span>
                  <span className="text-xs text-slate-400 hidden sm:inline border-l border-slate-200 pl-3">{tr("选择负面天赋以获取更多点数")}</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 max-w-6xl w-full mb-8 overflow-y-auto max-h-[60vh] p-2 custom-scroll">
                  {availableTalents.map(talent => {
                      const isSelected = selectedTalents.some(t => t.id === talent.id);
                      const disabledByCap = !isSelected && isAtCap;
                      const rarityMeta = RARITY_STYLES[talent.rarity] || RARITY_STYLES.common;
                      return (
                        <button 
                            key={talent.id} 
                            onClick={() => onToggleTalent(talent)}
                            disabled={disabledByCap}
                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-start gap-2 min-h-[10.5rem] h-auto relative group text-left ${isSelected ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg scale-[1.02] z-10' : disabledByCap ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-slate-50'}`}
                        >
                            <div className="flex justify-between w-full items-start">
                                <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded ${isSelected ? 'bg-white/20 text-white' : rarityMeta.badge}`}>
                                    {tr(rarityMeta.label)}
                                </span>
                                <span className={`text-xs font-black px-2 py-1 rounded-full ${talent.cost > 0 ? 'bg-slate-100 text-red-500' : 'bg-emerald-100 text-emerald-600'}`}>
                                    {tr(talent.cost > 0 ? `-${talent.cost}` : `+${Math.abs(talent.cost)}`)}
                                </span>
                            </div>
                            
                            <h3 className="text-base md:text-lg font-bold mt-1 leading-tight">{tr(talent.name)}</h3>
                            <p className={`text-xs leading-relaxed ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>{tr(talent.description)}</p>
                            
                            {isSelected && (
                                <div className="absolute bottom-2 right-2 w-5 h-5 bg-white text-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                                    <i className="fas fa-check text-[10px]"></i>
                                </div>
                            )}
                        </button>
                      );
                  })}
              </div>

              <div className="flex gap-4 z-20 bg-white/90 backdrop-blur p-4 rounded-2xl border border-slate-200 shadow-xl">
                  <button onClick={onBack} className="text-slate-500 font-bold hover:text-slate-800 transition-colors px-4">{tr("返回")}</button>
                  <button 
                    onClick={onConfirm} 
                    disabled={talentPoints < 0}
                    className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black text-lg hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                  >
                      {tr(talentPoints < 0 ? '点数不足' : '入学吧。')} 
                      {talentPoints >= 0 && <i className="fas fa-arrow-right"></i>}
                  </button>
              </div>
          </div>
    );
};
export default TalentView;
