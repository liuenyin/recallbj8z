import React from 'react';
import { GameState, SUBJECT_NAMES } from '../types';

interface Props {
    state: GameState;
    onShowHistory: () => void;
}

const STAT_CONFIG = [
    { key: 'mindset', label: '心态', icon: 'fa-brain', color: 'text-indigo-500', bg: 'bg-indigo-100', bar: 'bg-indigo-500' },
    { key: 'health', label: '体力', icon: 'fa-heart', color: 'text-rose-500', bg: 'bg-rose-100', bar: 'bg-rose-500' },
    { key: 'money', label: '金钱', icon: 'fa-coins', color: 'text-amber-500', bg: 'bg-amber-100', bar: 'bg-amber-500' },
    { key: 'efficiency', label: '效率', icon: 'fa-bolt', color: 'text-yellow-500', bg: 'bg-yellow-100', bar: 'bg-yellow-500' },
    { key: 'luck', label: '运气', icon: 'fa-clover', color: 'text-emerald-500', bg: 'bg-emerald-100', bar: 'bg-emerald-500' },
    { key: 'experience', label: '经验', icon: 'fa-book-open', color: 'text-blue-500', bg: 'bg-blue-100', bar: 'bg-blue-500' }
] as const;

const FloatingStats: React.FC<Props> = ({ state, onShowHistory }) => {
    const hideDetails = state.difficulty === 'REALITY' || state.difficulty === 'HELL';
    const getVagueLabel = (value: number) => {
        if (value < 0) return '负债/透支';
        if (value >= 80) return '极高';
        if (value >= 60) return '较高';
        if (value >= 40) return '一般';
        if (value >= 20) return '较低';
        return '极低';
    };

    return (
        <div className="absolute top-4 left-4 bottom-4 z-40 flex flex-col gap-4 pointer-events-none w-48 overflow-y-auto custom-scroll pr-2 pb-20">
            
            {/* Top Bar for Contest History Button (Clickable) */}
            {state.competition === 'OI' && (
                <div className="pointer-events-auto flex-shrink-0">
                    <button 
                        onClick={onShowHistory}
                        className="bg-white/95 backdrop-blur-md border border-slate-200 hover:bg-slate-50 transition-colors text-slate-700 text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-2 shadow-sm w-full"
                    >
                        <i className="fas fa-trophy text-yellow-500"></i>
                         <span>Rating: <span className="text-indigo-600">{hideDetails ? '·' : (state.oiStats?.rating ?? 1200)}</span></span>
                    </button>
                </div>
            )}
            
            {/* General Stats */}
            <div className="bg-white/95 backdrop-blur-md border border-slate-200 p-3 rounded-2xl shadow-sm flex flex-col gap-3 pointer-events-auto flex-shrink-0">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><i className="fas fa-user-circle"></i> 基础属性</div>
                {STAT_CONFIG.map(({ key, label, icon, color, bg, bar }) => {
                    const val = state.general[key as keyof typeof state.general] || 0;
                    const height = Math.min(100, Math.max(0, val));
                    return (
                        <div key={key} className="flex items-center gap-2.5 group">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${bg} ${color} flex-shrink-0 transition-transform group-hover:scale-110`}>
                                <i className={`fas ${icon} text-xs`}></i>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between text-[11px] font-bold mb-1">
                                    <span className="text-slate-500">{label}</span>
                                    <span className="text-slate-800">{hideDetails ? getVagueLabel(val) : val.toFixed(0)}</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full ${bar} transition-all duration-500`} style={{ width: `${height}%` }}></div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Subject Stats */}
            <div className="bg-white/95 backdrop-blur-md border border-slate-200 p-3 rounded-2xl shadow-sm flex flex-col gap-1 pointer-events-auto flex-shrink-0">
                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><i className="fas fa-book"></i> 学科能力</div>
                 {Object.entries(SUBJECT_NAMES).map(([key, label]) => {
                     const sub = state.subjects?.[key as keyof typeof state.subjects];
                     if (!sub) return null;
                     return (
                         <div key={key} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 px-1 rounded transition-colors">
                             <span className="text-[11px] font-bold text-slate-600">{label}</span>
                             <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{hideDetails ? getVagueLabel(sub.level) : `Lv.${sub.level.toFixed(1)}`}</span>
                                <span className="text-[11px] font-black text-indigo-600 w-6 text-right">{hideDetails ? '·' : sub.aptitude}</span>
                             </div>
                         </div>
                     );
                 })}
            </div>
            
        </div>
    );
};

export default FloatingStats;
