import { useLanguage } from '../lib/i18n';
import React, { useEffect, useState } from 'react';
import { GameState, Phase } from '../types';
import { getAcademicMaxScore, getPhaseLabel } from '../data/game_flow';
import { ENDING_CATALOG, getEndingMemories, recordUnlockedEnding } from '../data/ending';
import { DIFFICULTY_PRESETS } from '../data/constants';
import { formatCampusText } from '../data/campus_names';
import { getMoReadiness, getMoResult } from '../data/mo_competition';

interface EndingScreenProps {
    state: GameState;
    endingData: { rank: string, title: string, comment: string, score: number };
    onRestart: () => void;
    onViewHistory: () => void;
}

const EndingScreen: React.FC<EndingScreenProps> = ({ state, endingData, onRestart, onViewHistory }) => {
    const { t: tr } = useLanguage();
    const memories = getEndingMemories(state);
    const hideDetails = state.difficulty === 'REALITY';
    const moResults = (['league', 'mock'] as const).flatMap(exam => {
        const score = state.competition === 'MO' && state.flags[`mo_${exam}_published`] && getMoResult(state, exam);
        return score ? [{ title: exam === 'league' ? '高中数学联赛' : '数竞校内模拟', ...score }] : [];
    });
    const formatStoryText = (text: string) => formatCampusText(text, state.flags.relationship_name || state.romancePartner);
    const [unlockedEndings, setUnlockedEndings] = useState<string[]>(() => recordUnlockedEnding(endingData.title));
    useEffect(() => {
        setUnlockedEndings(recordUnlockedEnding(endingData.title));
    }, [endingData.title]);

    const vagueProgress = (value: number, max: number) => {
        const ratio = Math.max(0, Math.min(1, value / max));
        return ratio < 0.2 ? 12 : ratio < 0.4 ? 30 : ratio < 0.6 ? 50 : ratio < 0.8 ? 70 : 88;
    };
    const vagueLabel = (value: number, max = 100) => {
        const ratio = value / max;
        return ratio >= 0.8 ? '高' : ratio >= 0.6 ? '较高' : ratio >= 0.4 ? '一般' : ratio >= 0.2 ? '较低' : '低';
    };
    const oiSum = state.oiStats.dp + state.oiStats.ds + state.oiStats.math + state.oiStats.string + state.oiStats.graph + state.oiStats.misc;
    
    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md text-slate-800 flex flex-col items-center p-4 md:p-6 animate-fadeIn overflow-y-auto">
                <div className="bg-white rounded-[40px] shadow-2xl my-auto w-full max-w-4xl flex flex-col md:flex-row overflow-hidden border-4 border-slate-800 relative shrink-0">

                    {/* Left Column: Stats & Profile */}
                    <div className="flex-1 p-6 md:p-8 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 relative">
                         {/* Rank Stamp placed inside Left Column header corner so it never overlaps Right Column memories */}
                         <div className="absolute top-5 right-5 z-20 pointer-events-none">
                             <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 md:border-[6px] border-red-600 flex items-center justify-center rotate-12 opacity-85 bg-white/80 backdrop-blur-sm shadow-lg">
                                 <span className="text-3xl md:text-5xl font-black text-red-600 tracking-tighter">{tr(endingData.rank)}</span>
                             </div>
                         </div>

                         <div className="flex items-center gap-4 mb-6 pr-24 md:pr-28">
                             <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl md:text-4xl shadow-lg flex-shrink-0">
                                <i className="fas fa-user-graduate"></i>
                             </div>
                             <div>
                                 <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{tr("八中生涯档案")}</div>
                                 <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">{tr(endingData.title)}</h2>
                                 <div className="text-sm font-bold text-indigo-600 mt-1">{tr(state.className || '未分班')}</div>
                             </div>
                         </div>

                         {state.difficulty && (
                             <div className="mb-6 inline-block px-3 py-1 rounded bg-slate-200 text-slate-600 text-xs font-bold">
                                 {tr("难度: ")}{tr(DIFFICULTY_PRESETS[state.difficulty]?.label || '自定义')} 
                                 {tr(state.activeChallengeId ? ' (挑战模式)' : '')}
                             </div>
                         )}
                         
                         <p className="text-slate-600 italic mb-8 border-l-4 border-indigo-200 pl-4 py-1">
                             “{tr(formatStoryText(endingData.comment))}”
                         </p>

                         <section className="mb-6 bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                             <h3 className="font-bold text-sm text-slate-800">{tr("文化课成绩单")}</h3>
                             {state.academicExamHistory.length ? (
                                 <ul className="mt-2 divide-y divide-slate-100">
                                     {state.academicExamHistory.map(exam => (
                                         <li key={exam.title} className="flex flex-wrap justify-between items-baseline gap-x-3 gap-y-1 py-2.5 text-xs">
                                             <span className="font-bold text-slate-700">{tr(getPhaseLabel(exam.title))}</span>
                                                 <span className="tabular-nums text-slate-600">
                                                     <span className="font-bold text-indigo-700">{exam.totalScore}/{getAcademicMaxScore(Object.keys(exam.scores))}</span>
                                                     {exam.rank && <span className="ml-2">{tr("年级第 ")}{exam.rank} {tr("名")}</span>}
                                                 </span>
                                         </li>
                                     ))}
                                 </ul>
                             ) : <p className="mt-2 text-xs text-slate-600">{tr("这份档案里还没有文化课成绩。")}</p>}
                             {state.examResult?.type === 'COMPETITION' && (
                                 <p className="border-t border-slate-100 pt-2.5 text-xs font-bold text-slate-700">
                                     {tr("最近竞赛 · ")}{tr(getPhaseLabel(state.examResult.title))}
                                     {tr(` · ${state.examResult.totalScore}/${Object.keys(state.examResult.scores).length * 100}`)}
                                 </p>
                             )}
                         </section>

                         {moResults.length > 0 && (
                             <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                 <h3 className="text-sm font-bold text-slate-800">{tr("数竞成绩单")}</h3>
                                 <ul className="mt-2 divide-y divide-slate-100">
                                     {moResults.map(exam => (
                                         <li key={exam.title} className="flex flex-wrap justify-between items-baseline gap-x-3 gap-y-1 py-2.5 text-xs">
                                             <span className="font-bold text-slate-700">{tr(exam.title)}</span>
                                             <span className="tabular-nums text-slate-600">{tr(`一试 ${exam.first}/120 · 二试 ${exam.second}/180`)} <strong className="ml-2 text-indigo-700">{exam.total}/300</strong></span>
                                         </li>
                                     ))}
                                 </ul>
                             </section>
                         )}

                         {/* Stats Grid */}
                         <div className="space-y-4">
                             <h3 className="font-black text-slate-400 uppercase text-xs">{tr("综合能力评估")}</h3>
                             <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                 {[
                                     { label: '心态', val: state.general.mindset, max: 100, color: 'bg-blue-500' },
                                     { label: '健康', val: state.general.health, max: 100, color: 'bg-emerald-500' },
                                     { label: '疲劳', val: state.fatigue, max: 100, color: 'bg-rose-500' },
                                     { label: '效率', val: state.general.efficiency, max: 30, color: 'bg-purple-500', decimals: 1 },
                                     { label: '魅力', val: state.general.romance, max: 100, color: 'bg-rose-500' },
                                     ...(state.competition === 'OI' ? [{ label: 'OI实力', val: oiSum, max: 300, color: 'bg-indigo-500' }] : []),
                                     ...(state.competition === 'MO' ? [{ label: '数竞实力', val: getMoReadiness(state), max: 100, color: 'bg-indigo-500', decimals: 1 }] : []),
                                     { label: '余额', val: state.general.money, max: 500, color: 'bg-yellow-500', balance: true },
                                 ].map((stat, i) => {
                                     const ratio = Math.max(0, Math.min(100, (stat.val / stat.max) * 100));
                                     const displayVal = stat.balance ? Number(stat.val.toFixed(2)) : hideDetails
                                         ? vagueLabel(stat.val, stat.max)
                                         : stat.decimals ? stat.val.toFixed(stat.decimals) : Math.floor(stat.val);
                                     return (
                                     <div key={i} className="flex flex-col gap-1">
                                         <div className="flex justify-between text-xs font-bold text-slate-600">
                                             <span>{tr(stat.label)}</span>
                                             <span>{tr(displayVal)}</span>
                                         </div>
                                         <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                             <div className={`h-full ${stat.color} transition-all duration-1000`} style={{ width: `${hideDetails && !stat.balance ? vagueProgress(stat.val, stat.max) : ratio}%` }}></div>
                                         </div>
                                     </div>
                                     );
                                 })}
                             </div>
                         </div>
                    </div>

                    {/* Right Column: Highlights & Achievements */}
                    <div className="flex-1 p-6 md:p-8 flex flex-col bg-white">
                        {memories.length > 0 && (
                            <section className="mb-5 rounded-2xl bg-indigo-50 p-4">
                                <h3 className="font-black text-indigo-700 text-sm mb-3">{tr("这一局，值得记住的事")}</h3>
                                <ul className="space-y-3 text-sm leading-relaxed text-slate-700">
                                    {memories.map(memory => <li key={memory}>{tr(formatStoryText(memory))}</li>)}
                                </ul>
                            </section>
                        )}
                        {state.talents.length > 0 && (
                            <div className="mb-5">
                                <h3 className="font-black text-slate-400 uppercase text-xs mb-3">{tr("天赋")}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {state.talents.map(t => (
                                        <div key={t.id} className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600 border border-slate-200">
                                            {tr(t.name)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex-1 mb-5">
                            <h3 className="font-black text-slate-400 uppercase text-xs mb-4">{tr("开局日记")}</h3>
                            <div className="space-y-4 relative">
                                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-slate-100"></div>
                                {state.history.slice(0, 4).map((h, i) => (
                                    <div key={i} className="flex gap-4 relative">
                                        <div className="w-4 h-4 rounded-full bg-white border-4 border-indigo-500 flex-shrink-0 z-10"></div>
                                        <div>
                                            <div className="text-[10px] font-bold text-indigo-400 uppercase">{tr(getPhaseLabel(h.phase))}</div>
                                            <div className="text-sm font-bold text-slate-800">{tr(formatStoryText(h.eventTitle))}</div>
                                            <div className="text-xs text-slate-500">{tr(formatStoryText(h.resultSummary))}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                             <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-slate-600">
                                 <span>{tr("累计成就")} <strong className="text-slate-900">{state.unlockedAchievements.length}</strong></span>
                                 <span className="text-indigo-700">{tr("图鉴 ")}{unlockedEndings.length} / {ENDING_CATALOG.length}</span>
                             </div>
                             
                             <div className="flex gap-3">
                                 <button onClick={onRestart} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-2">
                                     <i className="fas fa-redo-alt"></i> {tr("再来一年")}</button>
                                 <button onClick={onViewHistory} className="px-4 bg-white text-slate-700 border-2 border-slate-200 py-4 rounded-2xl text-sm font-bold hover:border-indigo-300 hover:text-indigo-600 transition-all">
                                     {tr("校园手记")}</button>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
    );
};
export default EndingScreen;
