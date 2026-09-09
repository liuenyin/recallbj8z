import React from 'react';
import { AiConfig, Difficulty, GeneralStats } from '../types';
import { DIFFICULTY_PRESETS, CHANGELOG_DATA } from '../data/constants';
import { ACHIEVEMENTS } from '../data/mechanics';
import { motion } from 'framer-motion';
import AiSettingsModal from './AiSettingsModal';
import { LocalAccount } from '../lib/accounts';

interface HomeViewProps {
    selectedDifficulty: Difficulty;
    onDifficultyChange: (diff: Difficulty) => void;
    customStats: GeneralStats;
    onCustomStatsChange: (stats: GeneralStats) => void;
    onStart: () => void;
    hasSave: boolean;
    onLoadGame: () => void;
    unlockedAchievements: string[];
    aiConfig: AiConfig;
    onAiConfigChange: (config: AiConfig) => void;
    account: LocalAccount;
    onManageAccounts: () => void;
}

const SPONSORS = [
    { name: '爱发电用户_258c7', avatar: 'https://pic1.afdiancdn.com/default/avatar/avatar-purple.png', label: '发电榜一', id: 's1' },
    { name: 'Anby_', avatar: 'https://pic1.afdiancdn.com/user/dc3ad9282ab911ed94aa52540025c377/avatar/e41d1c836b39710f71c42c3d8c03985b_w3000_h3000_s863.jpeg?imageView2/1/w/240/h/240', label: '发电榜二', id: 's2' },
    { name: '爱发电用户_s45p', avatar: 'https://pic1.afdiancdn.com/default/avatar/avatar-blue.png', label: '发电榜三', id: 's3' },
];

const CUSTOM_STAT_LABELS: Partial<Record<keyof GeneralStats, string>> = {
    mindset: '心态', experience: '经验', luck: '幸运', romance: '桃花',
    health: '健康', money: '金钱', efficiency: '效率', excitement: '兴奋'
};

const UtilityButton: React.FC<{ icon: string, label: string, onClick: () => void, color: string }> = ({ icon, label, onClick, color }) => (
    <button onClick={onClick} className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl transition-all active:scale-95 shadow-sm ${color}`}>
        <i className={`fas ${icon} text-lg md:text-xl mb-1`}></i>
        <span className="text-[10px] md:text-xs font-bold">{label}</span>
    </button>
);

const HomeView: React.FC<HomeViewProps> = ({ selectedDifficulty, onDifficultyChange, customStats, onCustomStatsChange, onStart, hasSave, onLoadGame, unlockedAchievements, aiConfig, onAiConfigChange, account, onManageAccounts }) => {
    const [showChangelog, setShowChangelog] = React.useState(false);
    const [showSponsor, setShowSponsor] = React.useState(false);
    const [showSettings, setShowSettings] = React.useState(false);
    const [showAiSettings, setShowAiSettings] = React.useState(false);
    const [showAchievements, setShowAchievements] = React.useState(false);
    const [showQQGroup, setShowQQGroup] = React.useState(false);
    const [showVideo, setShowVideo] = React.useState(false);
    
                
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 p-4 md:p-8 flex items-center justify-center">
             <div className="fixed top-0 left-0 w-full h-full opacity-5 pointer-events-none overflow-hidden z-0">
                 <div className="absolute top-10 left-10 text-[12rem] font-black rotate-12 text-slate-900">8</div>
                 <div className="absolute bottom-10 right-10 text-[12rem] font-black -rotate-12 text-slate-900">OI</div>
             </div>

             <div className="w-full max-w-4xl z-10 mx-auto">
                 
                 {/* 1. Hero Card */}
                 <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-indigo-100/50 border border-slate-100 flex flex-col justify-between min-h-[420px] relative overflow-hidden group">
                     {/* ... Hero Content ... */}
                      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
                     <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>

                     <div className="relative z-10">
                         <div className="flex justify-between items-start">
                             <div className="flex items-center gap-3 md:gap-5 mb-2">
                                 <div className="w-14 h-14 md:w-20 md:h-20 shrink-0 bg-indigo-600 rounded-2xl md:rounded-3xl flex items-center justify-center text-white text-4xl shadow-lg shadow-indigo-200 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                                    <i className="fas fa-school"></i>
                                 </div>
                                 <div>
                                     <h1 className="text-2xl md:text-5xl font-black tracking-tighter text-slate-900">八中重开模拟器</h1>
                                     <p className="text-slate-400 font-bold text-sm mt-1">Made by liuenyin</p>
                                 </div>
                             </div>
                             
                             <div className="hidden md:flex flex-col items-end gap-2">
                                 <button type="button" onClick={onManageAccounts} className="bg-white/80 backdrop-blur-sm border border-slate-100 px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2 text-xs font-bold text-slate-600 hover:border-indigo-200">
                                     <i className="fas fa-user-circle text-indigo-500" /> {account.name}
                                 </button>
                             </div>
                         </div>
                         
                         <p className="mt-8 text-lg text-slate-600 leading-relaxed max-w-lg font-medium">
                             如果是你，能在这所学校里活得更精彩吗？<br/>
                             <span className="text-sm text-slate-400 font-normal">体验真实的高中生活，做出你的选择。</span>
                         </p>
                     </div>

                     <div className="relative z-10 mt-10">
                         <div className="mb-8">
                             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">选择开局难度</h3>
                             <div className="flex flex-wrap gap-3">
                                 {(Object.entries(DIFFICULTY_PRESETS) as [Difficulty, typeof DIFFICULTY_PRESETS['NORMAL']][]).map(([key, config]) => (
                                     <button key={key} onClick={() => onDifficultyChange(key)}
                                         title={config.desc}
                                         className={`px-5 py-2.5 rounded-2xl border-2 transition-all flex items-center gap-2 font-bold text-sm ${selectedDifficulty === key ? `border-indigo-600 ${'bg-indigo-50 text-indigo-700'} shadow-sm ring-2 ring-indigo-100 ring-offset-1` : 'border-slate-100 bg-slate-50/50 text-slate-500 hover:border-slate-300 hover:bg-white'}`}
                                     >
                                         <div className={`w-2.5 h-2.5 rounded-full ${config.color}`}></div>
                                         {config.label}
                                         
                                     </button>
                                 ))}
                                 <button onClick={() => onDifficultyChange('CUSTOM')}
                                     className={`px-5 py-2.5 rounded-2xl border-2 transition-all flex items-center gap-2 font-bold text-sm ${selectedDifficulty === 'CUSTOM' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm ring-2 ring-indigo-100 ring-offset-1' : 'border-slate-100 bg-slate-50/50 text-slate-500 hover:border-slate-300 hover:bg-white'}`}
                                 >
                                      <i className="fas fa-sliders-h text-xs"></i> 自定义
                                 </button>
                             </div>
                             <p className="mt-3 text-xs text-slate-500 font-medium">{selectedDifficulty === 'CUSTOM' ? '自行分配开局属性。' : DIFFICULTY_PRESETS[selectedDifficulty].desc}</p>
                         </div>

                         {selectedDifficulty === 'CUSTOM' && (
                             <div className="mb-6 bg-slate-50 p-5 rounded-2xl border border-slate-200 grid grid-cols-2 gap-x-8 gap-y-3 shadow-inner">
                                 {(Object.keys(customStats) as (keyof GeneralStats)[]).map(key => (
                                     <div key={key} className="flex items-center gap-3">
                                         <span className="text-[10px] font-bold text-slate-500 w-12">{CUSTOM_STAT_LABELS[key] || key}</span>
                                         <input type="range" min="0" max={key === 'efficiency' ? 30 : 100} value={Math.min(customStats[key], key === 'efficiency' ? 30 : 100)} onChange={(e) => onCustomStatsChange({...customStats, [key]: parseInt(e.target.value)})}
                                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                         />
                                         <span className="text-xs font-bold text-indigo-600 w-8 text-right">{customStats[key]}</span>
                                     </div>
                                 ))}
                             </div>
                         )}
                         
                         {/* Achievement Meta Progression */}
                         <div className="mt-8">
                             <div className="flex flex-wrap gap-3">
                                 <button onClick={() => setShowAchievements(true)} className="px-6 py-3 bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 rounded-xl font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                                     <i className="fas fa-trophy text-yellow-500"></i> 查看成就墙 ({unlockedAchievements.length} / {Object.keys(ACHIEVEMENTS).length})
                                 </button>
                                 <button onClick={() => setShowAiSettings(true)} className={`px-6 py-3 border rounded-xl font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2 ${aiConfig.enabled ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'}`}>
                                     <i className="fas fa-robot"></i> {aiConfig.enabled ? 'AI 模式已启用' : 'AI 模式设置'}
                                 </button>
                             </div>
                         </div>

                         <div className="flex gap-4 mt-8">
                             <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => onStart()} 
                                className="flex-1 md:w-auto bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3"
                             >
                                 <i className="fas fa-play text-indigo-400"></i> 开启新学期
                             </motion.button>
                             
                             {hasSave && (
                                <button onClick={onLoadGame} className="px-8 py-4 bg-white text-emerald-600 border-2 border-emerald-100 hover:border-emerald-300 rounded-2xl font-black text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2 active:scale-95 group" title="继续上次的进度">
                                     <i className="fas fa-save group-hover:animate-bounce"></i> 继续游戏
                                 </button>
                             )}
                         </div>
                         <button type="button" onClick={onManageAccounts} className="mt-4 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1">
                             <i className="fas fa-users-cog" /> 管理本地账号与存档
                         </button>

                         <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
                             <UtilityButton icon="fa-history" label="更新日志" onClick={() => setShowChangelog(true)} color="bg-slate-100 text-slate-600 hover:bg-slate-200" />
                             <UtilityButton icon="fa-info-circle" label="关于 / FAQ" onClick={() => setShowSettings(true)} color="bg-slate-100 text-slate-600 hover:bg-slate-200" />
                             <UtilityButton icon="fa-users" label="加入组织" onClick={() => setShowQQGroup(true)} color="bg-indigo-50 text-indigo-600 hover:bg-indigo-100" />
                             <UtilityButton icon="fa-play-circle" label="视频介绍" onClick={() => setShowVideo(true)} color="bg-rose-50 text-rose-600 hover:bg-rose-100" />
                             <UtilityButton icon="fa-bolt" label="支持作者" onClick={() => setShowSponsor(true)} color="bg-amber-50 text-amber-700 hover:bg-amber-100" />
                         </div>
                         
                         {/* Hints */}
                         {selectedDifficulty !== 'REALITY'  && (
                             <div className="mt-4 text-xs text-amber-500 font-bold flex items-center gap-1.5 bg-amber-50 w-fit px-3 py-1 rounded-full">
                                 <i className="fas fa-exclamation-triangle"></i> 仅在【现实】难度下可解锁成就
                             </div>
                         )}
                         {selectedDifficulty === 'HELL' && (
                             <div className="mt-3 text-xs text-rose-600 font-bold flex items-start gap-1.5 bg-rose-50 w-fit max-w-xl px-3 py-2 rounded-xl border border-rose-100">
                                 <i className="fas fa-skull-crossbones mt-0.5" />
                                 <span>极限规则：健康低于 10 立即结束；心态低于 20 或疲劳超过 90 时不能学习。开局天赋点为 -1，需选择负面天赋补足；商店价格翻倍。</span>
                             </div>
                         )}
                     </div>
                 </div>
             </div>


             {/* Modals ... (Rest is largely same but omitting for brevity, assuming standard imports work) */}
             
             {showQQGroup && (
                 <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn" onClick={() => setShowQQGroup(false)}>
                     <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center" onClick={e => e.stopPropagation()}>
                         <div className="flex justify-between items-center w-full mb-6 border-b border-slate-100 pb-4">
                             <h2 className="text-2xl font-black text-slate-800">加入组织</h2>
                             <button onClick={() => setShowQQGroup(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"><i className="fas fa-times"></i></button>
                         </div>
                         <div className="bg-slate-100 p-4 rounded-2xl mb-4">
                            <img src="https://cdn.luogu.com.cn/upload/image_hosting/rhymaxyw.png" alt="QQ Group QR" className="w-64 h-auto rounded-xl mix-blend-multiply" />
                         </div>
                         <p className="text-center text-slate-600 font-bold mb-2">群号: 1080382240</p>
                         <p className="text-center text-xs text-slate-400">点击图片或长按保存扫描</p>
                     </div>
                 </div>
             )}

             {showAiSettings && (
                 <AiSettingsModal config={aiConfig} onSave={onAiConfigChange} onClose={() => setShowAiSettings(false)} />
             )}
             
             {showVideo && (
                 <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn" onClick={() => setShowVideo(false)}>
                     <div className="w-full max-w-5xl aspect-video bg-black rounded-3xl shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
                         <button onClick={() => setShowVideo(false)} className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white flex items-center justify-center transition-colors">
                             <i className="fas fa-times"></i>
                         </button>
                         <iframe 
                            src="//player.bilibili.com/player.html?isOutside=true&aid=115953580973453&bvid=BV1TEzDBDEPg&cid=35597586008&p=1&autoplay=0" 
                            scrolling="no" 
                            style={{ border: 0 }}
                            frameBorder="0" 
                            allowFullScreen={true} 
                            className="w-full h-full"
                         ></iframe>
                     </div>
                 </div>
             )}

             {showAchievements && (
                 <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn" onClick={() => setShowAchievements(false)}>
                    <div className="bg-white rounded-[2rem] p-8 max-w-4xl w-full h-[80vh] shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                             <div>
                                <h2 className="text-3xl font-black text-slate-800">成就墙</h2>
                                <p className="text-sm text-slate-500 font-medium mt-1">已解锁 <span className="text-indigo-600 font-bold">{unlockedAchievements.length}</span> / {Object.keys(ACHIEVEMENTS).length}</p>
                             </div>
                             <button onClick={() => setShowAchievements(false)} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"><i className="fas fa-times"></i></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scroll grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-2">
                            {Object.values(ACHIEVEMENTS).map(ach => {
                                const isUnlocked = unlockedAchievements.includes(ach.id);
                                return (
                                    <div key={ach.id} className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${isUnlocked ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-50 border-slate-100 opacity-60 grayscale'}`}>
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${isUnlocked ? 'bg-white text-indigo-500' : 'bg-slate-200 text-slate-400'}`}>
                                            <i className={`fas ${ach.icon}`}></i>
                                        </div>
                                        <div>
                                            <h4 className={`font-bold text-sm ${isUnlocked ? 'text-slate-800' : 'text-slate-500'}`}>{ach.title}</h4>
                                            <p className="text-xs text-slate-400 mt-0.5 leading-tight">{ach.description}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                 </div>
             )}
             
             
             
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
             
             {showSponsor && (
                 <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn" onClick={() => setShowSponsor(false)}>
                     <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                         <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                             <h2 className="text-2xl font-black text-slate-800">赞助商展示</h2>
                             <button onClick={() => setShowSponsor(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"><i className="fas fa-times"></i></button>
                         </div>
                         <div className="overflow-y-auto custom-scroll space-y-3 pr-2 text-center">
                             {SPONSORS.map((sponsor, idx) => (
                                 <div key={sponsor.id} className={`p-4 rounded-2xl border shadow-sm flex items-center gap-4 ${idx === 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-indigo-100'}`}>
                                    <img src={sponsor.avatar} alt={sponsor.name} className="w-12 h-12 rounded-full border-2 border-white shadow-md flex-shrink-0 bg-slate-200"/>
                                    <div className="text-left flex-1 min-w-0">
                                        <div className="font-bold text-slate-800 truncate">{sponsor.name}</div>
                                        <div className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit mt-1 ${idx === 0 ? 'bg-amber-200 text-amber-800' : 'bg-indigo-50 text-indigo-500'}`}>{sponsor.label}</div>
                                    </div>
                                 </div>
                             ))}
                             
                             <p className="text-xs text-slate-400 mt-4 mb-6">金主列表每周更新一次，可能有时间延迟</p>
                             <a href="https://afdian.com/a/liuenyin?tab=home" target="_blank" rel="noopener noreferrer" className="block w-full bg-amber-500 text-white py-3 rounded-xl font-bold hover:bg-amber-600 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0">
                                 <i className="fas fa-bolt mr-2"></i> 前往爱发电支持作者
                             </a>
                         </div>
                     </div>
                 </div>
             )}
             
             {showSettings && (
                 <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn" onClick={() => setShowSettings(false)}>
                     <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                         <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                             <h2 className="text-2xl font-black text-slate-800">关于与FAQ</h2>
                             <button onClick={() => setShowSettings(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"><i className="fas fa-times"></i></button>
                         </div>
                         <div className="overflow-y-auto custom-scroll space-y-6 pr-2">
                             {/* ... Content ... */}
                             <div className="space-y-4">
                                 <h3 className="font-black text-slate-400 uppercase tracking-widest text-xs border-b border-slate-100 pb-2">关于本项目</h3>
                                 <p className="text-sm text-slate-600 leading-relaxed">
                                     本项目纯属虚构，如有雷同，纯属巧合。
                                 </p>
                                 <div className="text-xs text-slate-400">
                                     <p>Developer: liuenyin</p>
                                     <p>Tech Stack: React, Tailwind, TypeScript</p>
                                 </div>
                             </div>
                             
                             <div className="space-y-4">
                                 <h3 className="font-black text-slate-400 uppercase tracking-widest text-xs border-b border-slate-100 pb-2">游戏机制</h3>
                                 <div className="text-sm text-slate-600 space-y-2">
                                     <p><span className="font-bold text-slate-800">最终评价：</span><br/>
                                     以各科水平为主，结合经验、效率、长期项目、社团和关键路线成果；不同路线会影响结局。</p>
                                 </div>
                             </div>

                             <div className="space-y-4">
                                 <h3 className="font-black text-slate-400 uppercase tracking-widest text-xs border-b border-slate-100 pb-2">FAQ</h3>
                                 <div className="text-sm text-slate-600 space-y-2">
                                     <p><span className="font-bold text-slate-800">Q: 怎么存档？</span><br/>A: 点击主页或游戏侧边栏的保存按钮即可。</p>
                                 </div>
                             </div>
                         </div>
                     </div>
                 </div>
             )}
        </div>
    );
};

export default HomeView;
