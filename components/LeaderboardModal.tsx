
import React, { useEffect, useState } from 'react';
import { getLeaderboard, LeaderboardEntry } from '../lib/supabase';
import { WEEKLY_CHALLENGES } from '../data/challenges';

interface LeaderboardModalProps {
    onClose: () => void;
    initialChallengeId?: string | null;
}

const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ onClose, initialChallengeId }) => {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<string | null>(initialChallengeId || null);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            setError(null);
            setEntries([]);
            try {
                const { data, error: fetchError } = await getLeaderboard(filter);
                if (fetchError) {
                    throw fetchError;
                }
                if (data) {
                    // @ts-ignore
                    setEntries(data);
                }
            } catch (e: any) {
                console.error("Leaderboard fetch error:", e);
                setError(e.message || "Failed to load");
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [filter]);

    return (
        <div className="fixed inset-0 z-[80] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-white rounded-[2rem] p-8 max-w-4xl w-full h-[80vh] shadow-2xl flex flex-col relative overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <i className="fas fa-trophy text-yellow-500"></i> 八中名人堂
                    </h2>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
                    <button 
                        onClick={() => setFilter(null)}
                        className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-colors ${filter === null ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                        综合榜单
                    </button>
                    {WEEKLY_CHALLENGES.map(c => (
                         <button 
                            key={c.id}
                            onClick={() => setFilter(c.id)}
                            className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-colors ${filter === c.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                            {c.title}
                        </button>
                    ))}
                </div>

                <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
                    <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-200 bg-slate-100/50 text-xs font-bold text-slate-500 uppercase">
                        <div className="col-span-1 text-center" style={{ marginLeft: '6px' }}>#</div>
                        <div className="col-span-2 text-center" style={{ marginLeft: '68px' }}>玩家</div>
                        <div className="col-span-3 text-center" style={{ marginLeft: '64px' }}>分数</div>
                        <div className="col-span-1 text-center" style={{ marginRight: '5px' }}>评级</div>
                        <div className="col-span-3 text-center" style={{ marginRight: '10px' }}>评价</div>
                        <div className="col-span-1 text-center" style={{ marginRight: '15px' }}>时间</div>
                    </div>
                    <div className="overflow-y-auto custom-scroll flex-1 p-2">
                        {loading ? (
                            <div className="flex items-center justify-center h-40 text-slate-400">
                                <i className="fas fa-spinner fa-spin text-2xl mr-2"></i> 加载中...
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center h-40 text-rose-500">
                                <i className="fas fa-exclamation-triangle text-3xl mb-2"></i>
                                <span>加载失败 ({error})</span>
                                <div className="text-xs text-slate-400 mt-2">请检查 Supabase 表配置</div>
                            </div>
                        ) : entries.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                                <i className="fas fa-ghost text-3xl mb-2 opacity-50"></i>
                                <span>虚位以待</span>
                            </div>
                        ) : (
                            entries.map((entry, idx) => (
                                <div key={entry.id} className="grid grid-cols-12 gap-4 p-3 hover:bg-white rounded-xl transition-colors text-sm border-b border-slate-100 last:border-0 group">
                                    <div className="col-span-1 text-center font-black text-slate-300 group-hover:text-indigo-500">
                                        {idx + 1}
                                    </div>
                                    <div className="col-span-3 text-center font-bold text-slate-700 truncate">
                                        {entry.player_name}
                                    </div>
                                    <div className="col-span-2 text-center font-mono font-bold text-indigo-600">
                                        {Math.floor(entry.score)}
                                    </div>
                                    <div className="col-span-1 text-center text-xs text-slate-500 truncate">
                                        <span className="px-2 py-0.5 bg-slate-200 rounded text-[10px]">{entry.details?.rank || 'B'}</span>
                                    </div>
                                    <div className="col-span-3 text-center">
                                        {entry.details?.title}
                                    </div>
                                    <div className="col-start-11 col-span-1 text-center text-xs text-slate-400 font-mono">
                                        {new Date(entry.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeaderboardModal;
