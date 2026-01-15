
import React from 'react';
import { GameState, Phase } from '../types';
import { DIFFICULTY_PRESETS } from '../data/constants';

interface EndingScreenProps {
    state: GameState;
    endingData: { rank: string, title: string, comment: string, score: number };
    onRestart: () => void;
    onViewHistory: () => void;
}

const EndingScreen: React.FC<EndingScreenProps> = ({ state, endingData, onRestart, onViewHistory }) => {
    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md text-slate-800 flex flex-col items-center justify-center p-4 md:p-6 animate-fadeIn overflow-y-auto">
                <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden border-4 border-slate-800 relative shrink-0">
                    
                    {/* Rank Stamp */}
                    <div className="absolute top-0 right-0 z-20 pointer-events-none transform translate-x-1/4 -translate-y-1/4 md:translate-x-0 md:-translate-y-0 md:top-6 md:right-6">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-8 border-red-600 flex items-center justify-center rotate-12 opacity-80 animate-pulse bg-white/10 backdrop-blur-sm shadow-xl">
                            <span className="text-6xl md:text-8xl font-black text-red-600 tracking-tighter">{endingData.rank}</span>
                        </div>
                    </div>

                    {/* Left Column: Stats & Profile */}
                    <div className="flex-1 p-8 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200">
                         <div className="flex items-center gap-4 mb-8">
                             <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-4xl shadow-lg flex-shrink-0">
                                <i className="fas fa-user-graduate"></i>
                             </div>
                             <div>
                                 <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">八中生涯档案</div>
                                 <h2 className="text-3xl font-black text-slate-900 leading-tight">{endingData.title}</h2>
                                 <div className="text-sm font-bold text-indigo-600 mt-1">{state.className}</div>
                             </div>
                         </div>

                         {state.difficulty && (
                             <div className="mb-6 inline-block px-3 py-1 rounded bg-slate-200 text-slate-600 text-xs font-bold">
                                 难度: {DIFFICULTY_PRESETS[state.difficulty]?.label || '自定义'}
                             </div>
                         )}
                         
                         <p className="text-slate-600 italic mb-8 border-l-4 border-indigo-200 pl-4 py-1">
                             "{endingData.comment}"
                         </p>

                         {/* Academic Records */}
                         <div className="mb-6 bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                             <h3 className="font-black text-slate-400 uppercase text-xs mb-3">考试排名</h3>
                             <div className="flex justify-between gap-4 text-center">
                                 <div className="flex-1">
                                     <div className="text-xs text-slate-500 mb-1">期中考试</div>
                                     <div className="text-xl font-black text-slate-800">{state.midtermRank ? `Top ${state.midtermRank}` : 'N/A'}</div>
                                 </div>
                                 <div className="w-px bg-slate-200"></div>
                                 <div className="flex-1">
                                     <div className="text-xs text-slate-500 mb-1">期末考试</div>
                                     <div className="text-xl font-black text-indigo-600">
                                         {(state.examResult?.title === Phase.FINAL_EXAM || state.examResult?.title === '期末考试') && state.examResult.rank ? `Top ${state.examResult.rank}` : 'N/A'}
                                     </div>
                                 </div>
                             </div>
                         </div>

                         {/* Stats Grid */}
                         <div className="space-y-4">
                             <h3 className="font-black text-slate-400 uppercase text-xs">综合能力评估</h3>
                             <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                 {/* Simple Stat Bars */}
                                 {[
                                     { label: '心态', val: state.general.mindset, max: 100, color: 'bg-blue-500' },
                                     { label: '健康', val: state.general.health, max: 100, color: 'bg-emerald-500' },
                                     { label: '效率', val: state.general.efficiency * 5, max: 100, color: 'bg-purple-500' },
                                     { label: '魅力', val: state.general.romance, max: 100, color: 'bg-rose-500' },
                                     { label: 'OI实力', val: (state.oiStats.dp + state.oiStats.ds + state.oiStats.math + state.oiStats.string + state.oiStats.graph + state.oiStats.misc) * 5, max: 100, color: 'bg-indigo-500' },
                                     { label: '财富', val: Math.max(0, Math.min(100, state.general.money / 5)), max: 100, color: 'bg-yellow-500' },
                                 ].map((stat, i) => (
                                     <div key={i} className="flex flex-col gap-1">
                                         <div className="flex justify-between text-xs font-bold text-slate-600">
                                             <span>{stat.label}</span>
                                             <span>{stat.val > 100 ? 'MAX' : Math.floor(stat.val)}</span>
                                         </div>
                                         <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                             <div className={`h-full ${stat.color} transition-all duration-1000`} style={{ width: `${Math.max(0, Math.min(100, stat.val))}%` }}></div>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         </div>
                    </div>

                    {/* Right Column: Highlights & Achievements */}
                    <div className="flex-1 p-8 flex flex-col bg-white">
                        {state.talents.length > 0 && (
                            <div className="mb-6">
                                <h3 className="font-black text-slate-400 uppercase text-xs mb-3">天赋</h3>
                                <div className="flex flex-wrap gap-2">
                                    {state.talents.map(t => (
                                        <div key={t.id} className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600 border border-slate-200">
                                            {t.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex-1">
                            <h3 className="font-black text-slate-400 uppercase text-xs mb-4">学期高光时刻</h3>
                            <div className="space-y-4 relative">
                                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-slate-100"></div>
                                {state.history.slice(0, 4).map((h, i) => (
                                    <div key={i} className="flex gap-4 relative">
                                        <div className="w-4 h-4 rounded-full bg-white border-4 border-indigo-500 flex-shrink-0 z-10"></div>
                                        <div>
                                            <div className="text-[10px] font-bold text-indigo-400 uppercase">{h.phase}</div>
                                            <div className="text-sm font-bold text-slate-800">{h.eventTitle}</div>
                                            <div className="text-xs text-slate-500">{h.resultSummary}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100">
                             <div className="flex justify-between items-end mb-4">
                                 <div>
                                     <div className="text-xs font-bold text-slate-400 uppercase">本局成就</div>
                                     <div className="text-2xl font-black text-slate-800">{state.unlockedAchievements.length} 个</div>
                                 </div>
                                 <div className="text-right">
                                     <div className="text-xs font-bold text-slate-400 uppercase">最终得分</div>
                                     <div className="text-4xl font-black text-indigo-600">{Math.floor(endingData.score)}</div>
                                 </div>
                             </div>
                             
                             <div className="flex gap-3">
                                 <button onClick={onRestart} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-2">
                                     <i className="fas fa-redo-alt"></i> 再来一年
                                 </button>
                                 <button onClick={onViewHistory} className="px-6 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors">
                                     <i className="fas fa-history"></i>
                                 </button>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
    );
};
export default EndingScreen;
