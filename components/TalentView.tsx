
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

const TalentView: React.FC<TalentViewProps> = ({ availableTalents, selectedTalents, talentPoints, onToggleTalent, onConfirm, onBack }) => {
    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 md:p-10 font-sans relative">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-2 tracking-tight">天赋抉择</h2>
              <div className="flex items-center gap-4 mb-8 bg-slate-800 px-6 py-3 rounded-full border border-slate-700">
                  <span className="text-slate-400 font-bold">剩余点数</span>
                  <span className={`text-2xl font-black ${talentPoints >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>{talentPoints}</span>
                  <span className="text-xs text-slate-500 border-l border-slate-600 pl-4 ml-2">选择负面天赋以获取更多点数</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 max-w-6xl w-full mb-8 overflow-y-auto max-h-[60vh] p-2 custom-scroll">
                  {availableTalents.map(talent => {
                      const isSelected = selectedTalents.some(t => t.id === talent.id);
                      return (
                        <button 
                            key={talent.id} 
                            onClick={() => onToggleTalent(talent)}
                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-start gap-2 h-44 relative overflow-hidden group text-left ${isSelected ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg transform scale-105 z-10' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                        >
                            <div className="flex justify-between w-full items-start">
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${talent.rarity === 'cursed' ? 'bg-rose-900 text-rose-300' : 'bg-slate-700 text-slate-400'}`}>
                                    {talent.rarity}
                                </span>
                                <span className={`text-xs font-black px-2 py-1 rounded-full ${talent.cost > 0 ? 'bg-slate-900 text-red-400' : 'bg-emerald-900 text-emerald-400'}`}>
                                    {talent.cost > 0 ? `-${talent.cost}` : `+${Math.abs(talent.cost)}`}
                                </span>
                            </div>
                            
                            <h3 className="text-base md:text-lg font-bold mt-1 leading-tight">{talent.name}</h3>
                            <p className={`text-xs leading-relaxed ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>{talent.description}</p>
                            
                            {isSelected && (
                                <div className="absolute bottom-2 right-2 w-5 h-5 bg-white text-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                                    <i className="fas fa-check text-[10px]"></i>
                                </div>
                            )}
                        </button>
                      );
                  })}
              </div>

              <div className="flex gap-4 z-20 bg-slate-900/90 backdrop-blur p-4 rounded-2xl border border-slate-800">
                  <button onClick={onBack} className="text-slate-500 font-bold hover:text-white transition-colors px-4">返回</button>
                  <button 
                    onClick={onConfirm} 
                    disabled={talentPoints < 0}
                    className="bg-white text-slate-900 px-8 py-3 rounded-xl font-black text-lg hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                      {talentPoints < 0 ? '点数不足' : '入学吧。'} 
                      {talentPoints >= 0 && <i className="fas fa-arrow-right"></i>}
                  </button>
              </div>
          </div>
    );
};
export default TalentView;
