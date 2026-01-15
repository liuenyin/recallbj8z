
import React from 'react';
import { Difficulty, GeneralStats } from '../types';
import { DIFFICULTY_PRESETS, CHANGELOG_DATA } from '../data/constants';

interface HomeViewProps {
    selectedDifficulty: Difficulty;
    onDifficultyChange: (diff: Difficulty) => void;
    customStats: GeneralStats;
    onCustomStatsChange: (stats: GeneralStats) => void;
    onStart: () => void;
    
    // New Props for Saves
    hasSave: boolean;
    onLoadGame: () => void;
}

const HomeView: React.FC<HomeViewProps> = ({ selectedDifficulty, onDifficultyChange, customStats, onCustomStatsChange, onStart, hasSave, onLoadGame }) => {
    const [showChangelog, setShowChangelog] = React.useState(false);
    const [showSponsor, setShowSponsor] = React.useState(false);
    const [showSettings, setShowSettings] = React.useState(false);

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 p-4 md:p-8 flex items-center justify-center transition-colors duration-300">
            {/* Background Decoration */}
             <div className="fixed top-0 left-0 w-full h-full opacity-5 pointer-events-none overflow-hidden z-0">
                 <div className="absolute top-10 left-10 text-[12rem] font-black rotate-12 text-slate-900">8</div>
                 <div className="absolute bottom-10 right-10 text-[12rem] font-black -rotate-12 text-slate-900">OI</div>
             </div>

             <div className="w-full max-w-6xl z-10 grid grid-cols-1 lg:grid-cols-12 gap-4 auto-rows-min">
                 
                 {/* 1. Hero Card (Top Left - Main Game Control) */}
                 <div className="lg:col-span-8 bg-white rounded-3xl p-6 md:p-10 shadow-xl border border-slate-100 flex flex-col justify-between min-h-[400px] relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
                     <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>

                     <div className="relative z-10">
                         <div className="flex items-center gap-4 mb-2">
                             <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl shadow-lg transform -rotate-3">
                                <i className="fas fa-school"></i>
                             </div>
                             <div>
                                 <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900">八中重开模拟器</h1>
                                 <p className="text-slate-400 font-bold text-sm">Made by liuenyin</p>
                             </div>
                         </div>
                         
                         <p className="mt-6 text-slate-600 leading-relaxed max-w-lg">
                             喵喵喵，重开一次？
                         </p>
                     </div>

                     <div className="relative z-10 mt-8">
                         {/* Difficulty Select */}
                         <div className="mb-6">
                             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">选择开局难度</h3>
                             <div className="flex flex-wrap gap-2">
                                 {(Object.entries(DIFFICULTY_PRESETS) as [Difficulty, typeof DIFFICULTY_PRESETS['NORMAL']][]).map(([key, config]) => (
                                     <button key={key} onClick={() => onDifficultyChange(key)}
                                         className={`px-4 py-2 rounded-xl border-2 transition-all flex items-center gap-2 font-bold text-sm ${selectedDifficulty === key ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}
                                     >
                                         <div className={`w-2 h-2 rounded-full ${config.color}`}></div>
                                         {config.label}
                                     </button>
                                 ))}
                                 <button onClick={() => onDifficultyChange('CUSTOM')}
                                     className={`px-4 py-2 rounded-xl border-2 transition-all flex items-center gap-2 font-bold text-sm ${selectedDifficulty === 'CUSTOM' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}
                                 >
                                      <i className="fas fa-sliders-h text-xs"></i> 自定义
                                 </button>
                             </div>
                         </div>

                         {/* Custom Stats Slider */}
                         {selectedDifficulty === 'CUSTOM' && (
                             <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-x-8 gap-y-2">
                                 {(Object.keys(customStats) as (keyof GeneralStats)[]).map(key => (
                                     <div key={key} className="flex items-center gap-2">
                                         <span className="text-[10px] font-bold text-slate-400 w-12 uppercase">{key}</span>
                                         <input type="range" min="0" max="100" value={customStats[key]} onChange={(e) => onCustomStatsChange({...customStats, [key]: parseInt(e.target.value)})} 
                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                         />
                                         <span className="text-xs font-bold text-indigo-600 w-6 text-right">{customStats[key]}</span>
                                     </div>
                                 ))}
                             </div>
                         )}

                         <div className="flex gap-3">
                             <button onClick={onStart} className="flex-1 md:w-auto bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3">
                                 <i className="fas fa-play"></i> 开启新学期
                             </button>
                             
                             {hasSave && (
                                <button onClick={onLoadGame} className="px-6 py-4 bg-emerald-500 text-white rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2" title="继续上次的进度">
                                     <i className="fas fa-save"></i>
                                 </button>
                             )}
                         </div>

                         {selectedDifficulty !== 'REALITY' && (
                             <div className="mt-3 text-xs text-amber-500 font-bold flex items-center gap-1.5">
                                 <i className="fas fa-exclamation-triangle"></i> 仅在【现实】难度下可解锁成就
                             </div>
                         )}
                     </div>
                 </div>

                 {/* 2. Weekly Challenge (Top Right - Meta Game) */}
                 <div className="lg:col-span-4 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 md:p-8 shadow-xl text-white flex flex-col justify-between relative overflow-hidden group">
                     {/* Decorative background */}
                     <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
                     
                     <div>
                         <div className="flex items-center justify-between mb-4">
                             <h3 className="font-black text-indigo-200 uppercase tracking-widest text-xs">Weekly Challenge</h3>
                             <span className="bg-white/20 px-2 py-1 rounded text-[10px] font-bold backdrop-blur-sm">S0 赛季</span>
                         </div>
                         <h2 className="text-3xl font-black mb-1">敬请期待</h2>
                         <p className="text-indigo-200 text-sm mb-6">每周不同规则，冲击最高分！</p>
                         
                         {/* Mock Leaderboard Preview */}
                         <div className="space-y-2 bg-black/10 rounded-xl p-3 backdrop-blur-sm border border-white/5">
                             <div className="flex justify-between text-xs font-bold items-center">
                                 <div className="flex items-center gap-2"><span className="text-yellow-300">#1</span> <span>请输入文本</span></div>
                                 <span className="font-mono opacity-80">0 pts</span>
                             </div>
                             <div className="flex justify-between text-xs font-medium items-center opacity-80">
                                 <div className="flex items-center gap-2"><span className="text-slate-300">#2</span> <span>双击输入文字</span></div>
                                 <span className="font-mono">0 pts</span>
                             </div>
                             <div className="flex justify-between text-xs font-medium items-center opacity-60">
                                 <div className="flex items-center gap-2"><span className="text-amber-700">#3</span> <span>Warning: 不可留空</span></div>
                                 <span className="font-mono">0 pts</span>
                             </div>
                         </div>
                     </div>

                     <button className="mt-6 w-full py-3 bg-white text-indigo-700 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg opacity-50 cursor-not-allowed">
                        <i className="fas fa-lock mr-2"></i> 暂未开放
                     </button>
                 </div>

                 {/* 3. Hall of Fame (Bottom Left - Permanent) */}
                 <div className="lg:col-span-4 bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex flex-col justify-between h-full relative overflow-hidden">
                     <div className="relative z-10">
                         <h3 className="font-black text-slate-300 uppercase tracking-widest text-xs mb-2">Hall of Fame</h3>
                         <h2 className="text-2xl font-black text-slate-800 mb-4">名人堂</h2>
                         <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-white text-xl shadow-md border-2 border-white">
                                 <i className="fas fa-crown"></i>
                             </div>
                             <div>
                                 <div className="text-xs text-slate-400 font-bold uppercase">All Time Best</div>
                                 <div className="font-black text-slate-800">虚位以待</div>
                             </div>
                             <div className="ml-auto text-xl font-black text-yellow-500 font-mono">---</div>
                         </div>
                     </div>
                     <div className="absolute -bottom-6 -right-6 text-9xl text-slate-50 opacity-50 transform rotate-12 z-0"><i className="fas fa-trophy"></i></div>
                 </div>

                 {/* 4. Utils Grid (Bottom Right - Meta Links) */}
                 <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-5 gap-4">
                     <button onClick={() => setShowChangelog(true)} className="bg-white p-4 rounded-3xl shadow-md border border-slate-100 hover:shadow-lg hover:border-indigo-100 transition-all flex flex-col items-center justify-center gap-2 group h-full">
                         <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors"><i className="fas fa-history"></i></div>
                         <span className="font-bold text-slate-600 text-sm">更新日志</span>
                     </button>
                     <button onClick={() => setShowSponsor(true)} className="bg-white p-4 rounded-3xl shadow-md border border-slate-100 hover:shadow-lg hover:border-amber-100 transition-all flex flex-col items-center justify-center gap-2 group h-full">
                         <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors"><i className="fas fa-heart"></i></div>
                         <span className="font-bold text-slate-600 text-sm">赞助</span>
                     </button>
                     <button onClick={() => setShowSettings(true)} className="bg-white p-4 rounded-3xl shadow-md border border-slate-100 hover:shadow-lg hover:border-blue-100 transition-all flex flex-col items-center justify-center gap-2 group h-full">
                         <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors"><i className="fas fa-cog"></i></div>
                         <span className="font-bold text-slate-600 text-sm">关于本项目</span>
                     </button>
                     <a href="https://v.wjx.cn/vm/exSyEK0.aspx" target="_blank" rel="noopener noreferrer" className="bg-white p-4 rounded-3xl shadow-md border border-slate-100 hover:shadow-lg hover:border-emerald-100 transition-all flex flex-col items-center justify-center gap-2 group h-full">
                         <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors"><i className="fas fa-poll-h"></i></div>
                         <span className="font-bold text-slate-600 text-sm">反馈</span>
                     </a>
                     <a href="https://github.com/liuenyin/recallbj8z" target="_blank" rel="noopener noreferrer" className="bg-slate-900 p-4 rounded-3xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-2 group h-full text-white">
                         <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"><i className="fab fa-github"></i></div>
                         <span className="font-bold text-sm">GitHub</span>
                     </a>
                 </div>

             </div>

             {/* Changelog Modal */}
             {showChangelog && (
                 <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn" onClick={() => setShowChangelog(false)}>
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

             {/* Sponsor Modal */}
             {showSponsor && (
                 <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn" onClick={() => setShowSponsor(false)}>
                     <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                         <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                             <h2 className="text-2xl font-black text-slate-800">赞助商展示</h2>
                             <button onClick={() => setShowSponsor(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"><i className="fas fa-times"></i></button>
                         </div>
                         <div className="overflow-y-auto custom-scroll space-y-4 pr-2 text-center">
                             
                             <div className="p-4 bg-white rounded-2xl border border-indigo-100 shadow-sm mb-2 flex items-center gap-4">
                                <img src="https://pic1.afdiancdn.com/user/dc3ad9282ab911ed94aa52540025c377/avatar/e41d1c836b39710f71c42c3d8c03985b_w3000_h3000_s863.jpeg?imageView2/1/w/240/h/240" 
                                     alt="Anby_" 
                                     className="w-12 h-12 rounded-full border-2 border-indigo-200 shadow-sm"
                                />
                                <div className="text-left">
                                    <div className="font-bold text-slate-800">Anby_</div>
                                    <div className="text-xs text-indigo-500 font-bold bg-indigo-50 px-2 py-0.5 rounded-full w-fit">发电榜一</div>
                                </div>
                             </div>

                             <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-4 opacity-70">
                                <div className="w-12 h-12 bg-slate-200 rounded-full mx-auto mb-2 flex items-center justify-center text-xl text-slate-400"><i className="fas fa-plus"></i></div>
                                <div className="font-bold text-slate-400 text-sm">虚位以待</div>
                             </div>
                             
                             <p className="text-xs text-slate-400 mb-6">金主列表每周更新一次，可能有时间延迟</p>
                             <a href="https://afdian.com/a/liuenyin?tab=home" target="_blank" rel="noopener noreferrer" className="block w-full bg-amber-500 text-white py-3 rounded-xl font-bold hover:bg-amber-600 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0">
                                 <i className="fas fa-bolt mr-2"></i> 前往爱发电支持作者
                             </a>
                         </div>
                     </div>
                 </div>
             )}
             
             {/* Settings Modal */}
             {showSettings && (
                 <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn" onClick={() => setShowSettings(false)}>
                     <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                         <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                             <h2 className="text-2xl font-black text-slate-800">关于本project&FAQ</h2>
                             <button onClick={() => setShowSettings(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"><i className="fas fa-times"></i></button>
                         </div>
                         
                         <div className="overflow-y-auto custom-scroll space-y-6 pr-2">

                             {/* About Section */}
                             <div className="space-y-4">
                                 <h3 className="font-black text-slate-400 uppercase tracking-widest text-xs border-b border-slate-100 pb-2">关于本项目</h3>
                                 <p className="text-sm text-slate-600 leading-relaxed">
                                     本项目纯属虚构，如有雷同，纯属巧合。“八中”只是一个泛名，并不指代任何现实中的学校，只是为了让这个项目看起来更具体，更贴近现实一些。
                                 </p>
                                 <div className="text-xs text-slate-400">
                                     <p>Developer: liuenyin</p>
                                     <p>Tech Stack: React, Tailwind, TypeScript</p>
                                 </div>
                             </div>
                             
                             <div className="space-y-4">
                                 <h3 className="font-black text-slate-400 uppercase tracking-widest text-xs border-b border-slate-100 pb-2">FAQ</h3>
                                 <div className="text-sm text-slate-600 space-y-2">
                                     <p><span className="font-bold text-slate-800">Q: 我有建议/Bug反馈怎么办？</span><br/>A: 欢迎填写 <a href="https://v.wjx.cn/vm/exSyEK0.aspx" target="_blank" className="text-indigo-600 hover:underline">反馈问卷</a>，我会认真阅读每一条反馈。</p>
                                     <p><span className="font-bold text-slate-800">Q: 你真的会看我们的反馈吗？</span><br/>A: 真的真的！没法逐一回复是因为1）有点忙2）迫于问卷星的特性。我真的会看你们的反馈的！</p>
                                     <p><span className="font-bold text-slate-800">Q: 怎么存档？</span><br/>A: 目前支持本地单档存储。点击主页或游戏侧边栏的保存按钮即可。游戏在关键节点不会自动保存，请手动保存。</p>
                                     <p><span className="font-bold text-slate-800">Q: 为什么有些成就无法解锁？</span><br/>A: 所有成就仅在【现实】难度下开放解锁。经过实验，实际上所有成就都可以达成</p>
                                 </div>
                             </div>

                         </div>
                     </div>
                 </div>
             )}

             {/* Footer with Links */}
            <div className="fixed bottom-4 left-0 w-full flex justify-center items-center gap-6 text-slate-400 z-0 pointer-events-none md:pointer-events-auto">
                <div className="flex items-center gap-2 text-xs bg-white/50 backdrop-blur-md px-3 py-1 rounded-full shadow-sm">
                    <i className="fas fa-eye"></i>
                    <span>访问量:</span>
                    <img src="https://api.visitorbadge.io/api/visitors?path=https%3A%2F%2Fgithub.com%2Fliuenyin%2Frecallbj8z&label=VIEWS&countColor=%236366f1" alt="views" className="h-3" />
                </div>
            </div>
        </div>
    );
};
export default HomeView;
