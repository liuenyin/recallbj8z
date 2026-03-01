
import React, { useEffect, useState } from 'react';
import { Difficulty, GeneralStats, Challenge } from '../types';
import { DIFFICULTY_PRESETS, CHANGELOG_DATA } from '../data/constants';
import { ACHIEVEMENTS } from '../data/mechanics';
import { WEEKLY_CHALLENGES as LOCAL_CHALLENGES } from '../data/challenges';
import { supabase, getLeaderboard, LeaderboardEntry } from '../lib/supabase';
import LeaderboardModal from './LeaderboardModal';

interface HomeViewProps {
    selectedDifficulty: Difficulty;
    onDifficultyChange: (diff: Difficulty) => void;
    customStats: GeneralStats;
    onCustomStatsChange: (stats: GeneralStats) => void;
    onStart: (challenge?: Challenge) => void; 
    hasSave: boolean;
    onLoadGame: () => void;
    unlockedAchievements: string[];
}

const SPONSORS = [
    { name: '爱发电用户_258c7', avatar: 'https://pic1.afdiancdn.com/default/avatar/avatar-purple.png', label: '发电榜一', id: 's1' },
    { name: 'Anby_', avatar: 'https://pic1.afdiancdn.com/user/dc3ad9282ab911ed94aa52540025c377/avatar/e41d1c836b39710f71c42c3d8c03985b_w3000_h3000_s863.jpeg?imageView2/1/w/240/h/240', label: '发电榜二', id: 's2' },
    { name: '爱发电用户_s45p', avatar: 'https://pic1.afdiancdn.com/default/avatar/avatar-blue.png', label: '发电榜三', id: 's3' },
];

const HomeView: React.FC<HomeViewProps> = ({ selectedDifficulty, onDifficultyChange, customStats, onCustomStatsChange, onStart, hasSave, onLoadGame, unlockedAchievements }) => {
    const [showChangelog, setShowChangelog] = React.useState(false);
    const [showSponsor, setShowSponsor] = React.useState(false);
    const [showSettings, setShowSettings] = React.useState(false);
    const [showAchievements, setShowAchievements] = React.useState(false);
    const [showQQGroup, setShowQQGroup] = React.useState(false);
    const [showVideo, setShowVideo] = React.useState(false);
    
    // Leaderboard State
    const [showLeaderboard, setShowLeaderboard] = React.useState(false);
    const [leaderboardInitId, setLeaderboardInitId] = useState<string | null>(null);
    const [topScores, setTopScores] = useState<LeaderboardEntry[]>([]);

    // Challenges State
    const [challenges, setChallenges] = useState<Challenge[]>(LOCAL_CHALLENGES);
    const [loadingChallenges, setLoadingChallenges] = useState(true);

    useEffect(() => {
        const fetchChallengesAndScores = async () => {
            setLoadingChallenges(true);
            try {
                // 1. Fetch Challenges
                // In a real app we might fetch from DB, here we stick to local or simple DB check
                // For now, we use the local list which contains the Sleep Challenge
                setChallenges(LOCAL_CHALLENGES);

                // 2. Fetch Top Scores for the first challenge (Sleep King)
                if (LOCAL_CHALLENGES.length > 0) {
                    const { data } = await getLeaderboard(LOCAL_CHALLENGES[0].id, 5);
                    if (data) {
                        // @ts-ignore
                        setTopScores(data);
                    }
                }
            } catch (e) {
                console.error('Error fetching data', e);
            } finally {
                setLoadingChallenges(false);
            }
        };
        fetchChallengesAndScores();
    }, []);

    const openLeaderboard = (id: string | null) => {
        setLeaderboardInitId(id);
        setShowLeaderboard(true);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 p-4 md:p-8 flex items-center justify-center">
             <div className="fixed top-0 left-0 w-full h-full opacity-5 pointer-events-none overflow-hidden z-0">
                 <div className="absolute top-10 left-10 text-[12rem] font-black rotate-12 text-slate-900">8</div>
                 <div className="absolute bottom-10 right-10 text-[12rem] font-black -rotate-12 text-slate-900">OI</div>
             </div>

             <div className="w-full max-w-6xl z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 auto-rows-min">
                 
                 {/* 1. Hero Card */}
                 <div className="lg:col-span-8 bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-indigo-100/50 border border-slate-100 flex flex-col justify-between min-h-[420px] relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
                     <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>

                     <div className="relative z-10">
                         <div className="flex justify-between items-start">
                             <div className="flex items-center gap-5 mb-2">
                                 <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-4xl shadow-lg shadow-indigo-200 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                                    <i className="fas fa-school"></i>
                                 </div>
                                 <div>
                                     <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900">八中重开模拟器</h1>
                                     <p className="text-slate-400 font-bold text-sm mt-1">Made by liuenyin</p>
                                 </div>
                             </div>
                             
                             {/* Visitor Badge */}
                             <div className="hidden md:flex flex-col items-end">
                                 <div className="bg-white/80 backdrop-blur-sm border border-slate-100 px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2">
                                     <span className="relative flex h-2 w-2">
                                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                       <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                     </span>
                                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visitors</span>
                                     <img src="https://api.visitorbadge.io/api/visitors?path=https%3A%2F%2Fgithub.com%2Fliuenyin%2Frecallbj8z&label=&countColor=%234f46e5&style=flat&labelStyle=none" alt="views" className="h-4" />
                                 </div>
                             </div>
                         </div>
                         
                         <p className="mt-8 text-lg text-slate-600 leading-relaxed max-w-lg font-medium">
                             如果是你，能在这所学校里活得更精彩吗？<br/>
                             <span className="text-sm text-slate-400 font-normal">体验真实的高中生活，做出你的选择。</span>
                         </p>
                     </div>

                     <div className="relative z-10 mt-10">
                         {/* Difficulty Select */}
                         <div className="mb-8">
                             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">选择开局难度</h3>
                             <div className="flex flex-wrap gap-3">
                                 {(Object.entries(DIFFICULTY_PRESETS) as [Difficulty, typeof DIFFICULTY_PRESETS['NORMAL']][]).map(([key, config]) => (
                                     <button key={key} onClick={() => onDifficultyChange(key)}
                                         className={`px-5 py-2.5 rounded-2xl border-2 transition-all flex items-center gap-2 font-bold text-sm ${selectedDifficulty === key ? `border-indigo-600 ${key === 'AI_STORY' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700'} shadow-sm ring-2 ring-indigo-100 ring-offset-1` : 'border-slate-100 bg-slate-50/50 text-slate-500 hover:border-slate-300 hover:bg-white'}`}
                                     >
                                         <div className={`w-2.5 h-2.5 rounded-full ${key === 'AI_STORY' && selectedDifficulty === key ? 'bg-white' : config.color}`}></div>
                                         {config.label}
                                         {key === 'AI_STORY' && <i className="fas fa-sparkles text-xs animate-pulse"></i>}
                                     </button>
                                 ))}
                                 <button onClick={() => onDifficultyChange('CUSTOM')}
                                     className={`px-5 py-2.5 rounded-2xl border-2 transition-all flex items-center gap-2 font-bold text-sm ${selectedDifficulty === 'CUSTOM' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm ring-2 ring-indigo-100 ring-offset-1' : 'border-slate-100 bg-slate-50/50 text-slate-500 hover:border-slate-300 hover:bg-white'}`}
                                 >
                                      <i className="fas fa-sliders-h text-xs"></i> 自定义
                                 </button>
                             </div>
                         </div>

                         {selectedDifficulty === 'CUSTOM' && (
                             <div className="mb-6 bg-slate-50 p-5 rounded-2xl border border-slate-200 grid grid-cols-2 gap-x-8 gap-y-3 shadow-inner">
                                 {(Object.keys(customStats) as (keyof GeneralStats)[]).map(key => (
                                     <div key={key} className="flex items-center gap-3">
                                         <span className="text-[10px] font-bold text-slate-500 w-12 uppercase">{key}</span>
                                         <input type="range" min="0" max="100" value={customStats[key]} onChange={(e) => onCustomStatsChange({...customStats, [key]: parseInt(e.target.value)})} 
                                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                         />
                                         <span className="text-xs font-bold text-indigo-600 w-8 text-right">{customStats[key]}</span>
                                     </div>
                                 ))}
                             </div>
                         )}

                         <div className="flex gap-4">
                             <button onClick={() => onStart()} className="flex-1 md:w-auto bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3 active:scale-95">
                                 <i className="fas fa-play text-indigo-400"></i> 开启新学期
                             </button>
                             
                             {hasSave && (
                                <button onClick={onLoadGame} className="px-8 py-4 bg-white text-emerald-600 border-2 border-emerald-100 hover:border-emerald-300 rounded-2xl font-black text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2 active:scale-95 group" title="继续上次的进度">
                                     <i className="fas fa-save group-hover:animate-bounce"></i> 继续游戏
                                 </button>
                             )}
                         </div>

                         {selectedDifficulty !== 'REALITY' && selectedDifficulty !== 'AI_STORY' && (
                             <div className="mt-4 text-xs text-amber-500 font-bold flex items-center gap-1.5 bg-amber-50 w-fit px-3 py-1 rounded-full">
                                 <i className="fas fa-exclamation-triangle"></i> 仅在【现实】难度下可解锁成就
                             </div>
                         )}
                         {selectedDifficulty === 'AI_STORY' && (
                             <div className="mt-4 text-xs text-indigo-600 font-bold flex items-center gap-1.5 bg-indigo-50 w-fit px-3 py-1 rounded-full border border-indigo-100">
                                 <i className="fas fa-robot"></i> 实验性功能：事件将由 DeepSeek API 实时生成，请确保网络通畅。
                             </div>
                         )}
                     </div>
                 </div>

                 {/* 2. Weekly Challenge (DYNAMIC) */}
                 <div className="lg:col-span-4 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-8 shadow-xl shadow-indigo-200 text-white flex flex-col justify-between relative overflow-hidden group min-h-[300px]">
                     <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
                     
                     <div className="flex-1 flex flex-col z-10 relative">
                         <div className="flex items-center justify-between mb-6">
                             <h3 className="font-black text-indigo-200 uppercase tracking-widest text-xs">Weekly Challenge</h3>
                             <div className="flex gap-2 items-center">
                                 <button 
                                    onClick={() => openLeaderboard(challenges[0]?.id || null)}
                                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-3 py-1 rounded-lg text-[10px] font-bold border border-white/10 transition-colors flex items-center gap-1 active:scale-95"
                                    title="查看本期榜单"
                                 >
                                     <i className="fas fa-list-ol"></i> 完整榜单
                                 </button>
                                 <span className="bg-white/20 px-2 py-1 rounded-lg text-[10px] font-bold backdrop-blur-sm border border-white/10">S1 赛季</span>
                             </div>
                         </div>
                         
                         {loadingChallenges ? (
                             <div className="flex-1 flex items-center justify-center">
                                 <i className="fas fa-spinner fa-spin text-2xl opacity-50"></i>
                             </div>
                         ) : challenges.length > 0 ? (
                             <>
                                 <div className="mb-6">
                                     <h2 className="text-2xl font-black mb-1 truncate">{challenges[0].title}</h2>
                                     <p className="text-indigo-200 text-xs opacity-80 line-clamp-2">{challenges[0].description}</p>
                                 </div>
                                 
                                 <div className="flex-1 bg-black/20 rounded-2xl p-4 backdrop-blur-md border border-white/10 overflow-hidden flex flex-col">
                                     <div className="flex justify-between items-center mb-3 border-b border-white/10 pb-2">
                                         <span className="text-xs font-bold text-indigo-200 uppercase">Top 5 Players</span>
                                         <i className="fas fa-crown text-yellow-400 text-xs"></i>
                                     </div>
                                     <div className="space-y-3 overflow-y-auto custom-scroll-light pr-1">
                                         {topScores.length > 0 ? topScores.map((entry, idx) => (
                                             <div key={idx} className="flex items-center justify-between text-xs">
                                                 <div className="flex items-center gap-3">
                                                     <span className={`font-black w-4 text-center ${idx === 0 ? 'text-yellow-300' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-indigo-300'}`}>{idx + 1}</span>
                                                     <div className="flex flex-col">
                                                         <span className="font-bold text-white truncate max-w-[80px]">{entry.player_name}</span>
                                                         <span className="text-[10px] text-white/50">{entry.details.rank}</span>
                                                     </div>
                                                 </div>
                                                 <span className="font-mono font-bold text-indigo-100">{Math.floor(entry.score)}</span>
                                             </div>
                                         )) : (
                                             <div className="text-center py-4 text-indigo-300/50 text-xs">
                                                 暂无记录，等你来挑战！
                                             </div>
                                         )}
                                     </div>
                                 </div>
                             </>
                         ) : (
                             <div className="text-center py-10 opacity-60">
                                 <i className="fas fa-box-open text-3xl mb-2"></i>
                                 <p className="text-sm">暂无挑战</p>
                             </div>
                         )}
                     </div>

                     {challenges.length > 0 && (
                        //            修改这里可以修改挑战按钮的链接，目前是默认第一个挑战（欠债挑战）
                        //            你可以根据需要调整为特定挑战的 ID，欠债挑战可以使用challenges[0]来挑战，睡王是challenges[1]，如果你添加了新的挑战，可以在WEEKLY_CHALLENGES里找到对应的ID来设置
                        <button onClick={() => onStart(challenges[0])} className="mt-4 w-full py-4 bg-white text-indigo-700 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg flex items-center justify-center gap-2 active:scale-95 relative z-20">
                            <i className="fas fa-bolt"></i> 立即挑战
                        </button>
                     )}
                 </div>

                 {/* 3. Utils Dock */}
                 <div className="lg:col-span-12">
                    <div className="bg-white rounded-3xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100 flex flex-wrap md:flex-nowrap justify-between items-center gap-4">
                         
                        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto no-scrollbar">
                             <UtilityButton icon="fa-trophy" label="成就墙" onClick={() => setShowAchievements(true)} color="text-yellow-600 bg-yellow-50 hover:bg-yellow-100" />
                             <UtilityButton icon="fa-list-ol" label="排行榜" onClick={() => openLeaderboard(null)} color="text-purple-600 bg-purple-50 hover:bg-purple-100" />
                             <UtilityButton icon="fa-video" label="宣传片" onClick={() => setShowVideo(true)} color="text-pink-600 bg-pink-50 hover:bg-pink-100" />
                             <UtilityButton icon="fa-history" label="日志" onClick={() => setShowChangelog(true)} color="text-indigo-600 bg-indigo-50 hover:bg-indigo-100" />
                             <UtilityButton icon="fa-heart" label="赞助" onClick={() => setShowSponsor(true)} color="text-rose-600 bg-rose-50 hover:bg-rose-100" />
                             <UtilityButton icon="fa-cog" label="关于" onClick={() => setShowSettings(true)} color="text-slate-600 bg-slate-50 hover:bg-slate-100" />
                        </div>

                        <div className="grid grid-cols-2 md:flex gap-3 w-full md:w-auto">
                            <button onClick={() => setShowQQGroup(true)} className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-50 text-blue-600 font-bold hover:bg-blue-100 transition-colors text-sm" title="群号: 1080382240">
                                <i className="fab fa-qq"></i> 玩家群
                            </button>
                             <a href="https://www.zhihu.com/question/1995560005978563512" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-sky-50 text-sky-600 font-bold hover:bg-sky-100 transition-colors text-sm">
                                <i className="fab fa-zhihu"></i> 知乎评价
                            </a>
                            <a href="https://v.wjx.cn/vm/exSyEK0.aspx" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 transition-colors text-sm">
                                <i className="fas fa-poll-h"></i> 反馈
                            </a>
                        </div>
                     </div>
                 </div>

             </div>

             {/* Modals */}
             
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
             
             {/* Bilibili Video Modal */}
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
             
             {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} initialChallengeId={leaderboardInitId} />}
             
             {/* ... Other modals ... */}
             
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
                                     <p><span className="font-bold text-slate-800">最终得分计算公式：</span><br/>
                                     得分 = 心态 + 健康 + (效率 × 5) + (成就数 × 50)</p>
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

const UtilityButton = ({ icon, label, onClick, color }: { icon: string, label: string, onClick: () => void, color: string }) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap ${color}`}>
        <i className={`fas ${icon}`}></i> {label}
    </button>
);

export default HomeView;
