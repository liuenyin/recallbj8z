
import React from 'react';
import { Difficulty, GeneralStats } from '../types';
import { DIFFICULTY_PRESETS, CHANGELOG_DATA } from '../data/constants';

interface HomeViewProps {
    selectedDifficulty: Difficulty;
    onDifficultyChange: (diff: Difficulty) => void;
    customStats: GeneralStats;
    onCustomStatsChange: (stats: GeneralStats) => void;
    onStart: () => void;
}

const HomeView: React.FC<HomeViewProps> = ({ selectedDifficulty, onDifficultyChange, customStats, onCustomStatsChange, onStart }) => {
    const [showChangelog, setShowChangelog] = React.useState(false);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 md:p-10 font-sans relative overflow-hidden">
             {/* Background Decoration */}
             <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none overflow-hidden">
                 <div className="absolute top-10 left-10 text-9xl font-black rotate-12">8</div>
                 <div className="absolute bottom-10 right-10 text-9xl font-black -rotate-12">OI</div>
             </div>

             {/* Header */}
             <div className="w-20 h-20 md:w-24 md:h-24 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl mb-6 md:mb-8 transform -rotate-6 z-10">
                <i className="fas fa-school text-white text-4xl md:text-5xl"></i>
             </div>
             <h1 className="text-4xl md:text-6xl font-black text-slate-800 mb-2 md:mb-4 tracking-tighter z-10 text-center">八中重开模拟器</h1>
             <p className="text-slate-400 mb-8 md:mb-10 text-lg md:text-xl font-medium z-10">Made by lg37</p>

             {/* Difficulty Selection */}
             <div className="w-full max-w-4xl z-10 mb-8">
                 <h3 className="text-center text-slate-500 font-bold mb-4 uppercase tracking-widest text-sm">选择你的开局难度</h3>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                     {(Object.entries(DIFFICULTY_PRESETS) as [Difficulty, typeof DIFFICULTY_PRESETS['NORMAL']][]).map(([key, config]) => (
                         <button key={key} onClick={() => onDifficultyChange(key)}
                             className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-2 group ${selectedDifficulty === key ? 'border-indigo-600 bg-white shadow-xl scale-105' : 'border-transparent bg-white/50 hover:bg-white hover:shadow-md'}`}
                         >
                             <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${config.color} shadow-md`}>
                                 {key === 'REALITY' ? <i className="fas fa-skull"></i> : key === 'HARD' ? <i className="fas fa-exclamation"></i> : <i className="fas fa-coffee"></i>}
                             </div>
                             <div className="font-black text-slate-800">{config.label}</div>
                             <div className="text-[10px] text-slate-500 leading-tight">{config.desc}</div>
                         </button>
                     ))}
                     <button onClick={() => onDifficultyChange('CUSTOM')}
                         className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-2 group ${selectedDifficulty === 'CUSTOM' ? 'border-indigo-600 bg-white shadow-xl scale-105' : 'border-transparent bg-white/50 hover:bg-white hover:shadow-md'}`}
                     >
                          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold shadow-md"><i className="fas fa-sliders-h"></i></div>
                          <div className="font-black text-slate-800">自定义</div>
                          <div className="text-[10px] text-slate-500 leading-tight">我是神，由于我太强了，所以我要自定义属性</div>
                     </button>
                 </div>
             </div>

             {/* Custom Stats Editor */}
             {selectedDifficulty === 'CUSTOM' && (
                 <div className="w-full max-w-2xl bg-white p-6 rounded-3xl shadow-lg border border-slate-100 z-10 mb-8 animate-fadeIn">
                     <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><i className="fas fa-pen"></i> 配置初始属性</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {(Object.keys(customStats) as (keyof GeneralStats)[]).map(key => (
                             <div key={key}>
                                 <label className="text-xs font-bold text-slate-400 uppercase flex justify-between mb-1">
                                     <span>{key}</span>
                                     <span className="text-indigo-600">{customStats[key]}</span>
                                 </label>
                                 <input type="range" min="0" max="100" value={customStats[key]} onChange={(e) => onCustomStatsChange({...customStats, [key]: parseInt(e.target.value)})} 
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                 />
                             </div>
                         ))}
                     </div>
                 </div>
             )}

             {/* Warnings & Start */}
             <div className="z-10 flex flex-col items-center gap-4">
                {selectedDifficulty !== 'REALITY' && (
                    <div className="text-amber-600 text-xs font-bold bg-amber-50 px-4 py-2 rounded-full border border-amber-200">
                        <i className="fas fa-exclamation-triangle mr-2"></i>注意：仅在【现实】难度下可解锁成就
                    </div>
                )}
                
                <div className="flex gap-4">
                    <button onClick={() => setShowChangelog(true)} className="bg-white text-slate-500 px-6 py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-slate-50 transition-all flex items-center gap-2">
                        <i className="fas fa-history"></i> <span className="hidden md:inline">更新日志</span>
                    </button>
                    <button onClick={onStart} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-black text-xl shadow-xl transition-all hover:scale-105 flex items-center gap-3">
                        <i className="fas fa-play"></i> 开启模拟
                    </button>
                </div>
             </div>

             {/* Changelog Modal */}
             {showChangelog && (
                 <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn" onClick={() => setShowChangelog(false)}>
                     <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                         <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                             <h2 className="text-2xl font-black text-slate-800">更新日志</h2>
                             <button onClick={() => setShowChangelog(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"><i className="fas fa-times"></i></button>
                         </div>
                         <div className="overflow-y-auto custom-scroll space-y-6 pr-2">
                             {CHANGELOG_DATA.map((log, i) => (
                                 <div key={i}>
                                     <div className="flex items-baseline gap-2 mb-2">
                                         <span className="text-lg font-bold text-indigo-600">{log.version}</span>
                                         <span className="text-xs text-slate-400 font-mono">{log.date}</span>
                                     </div>
                                     <ul className="list-disc list-inside space-y-1">
                                         {log.content.map((item, idx) => (
                                             <li key={idx} className="text-sm text-slate-600">{item}</li>
                                         ))}
                                     </ul>
                                 </div>
                             ))}
                         </div>
                     </div>
                 </div>
             )}
        </div>
    );
};
export default HomeView;
