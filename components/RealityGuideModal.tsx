import { useLanguage } from '../lib/i18n';

import React, { useState } from 'react';
import { DIFFICULTY_PRESETS } from '../data/constants';

interface RealityGuideModalProps {
    onClose: () => void;
}

const RealityGuideModal: React.FC<RealityGuideModalProps> = ({ onClose }) => {
    const { t: tr } = useLanguage();
    const [tab, setTab] = useState<'STATS' | 'MECHANICS' | 'EXAMS'>('STATS');

    return (
        <div className="fixed inset-0 z-[90] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={onClose} role="dialog" aria-modal="true" aria-label={tr("游戏机制说明")}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-300" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <i className="fas fa-book-reader text-indigo-600"></i> {tr("难度与机制说明")}</h2>
                    <button type="button" onClick={onClose} aria-label={tr("关闭")} className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                    <button type="button" onClick={() => setTab('STATS')} className={`flex-1 min-w-0 px-2 py-3 text-xs sm:text-sm font-bold transition-colors ${tab === 'STATS' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-slate-600 hover:bg-slate-50'}`}>
                        {tr("模糊显示对照")}</button>
                    <button type="button" onClick={() => setTab('MECHANICS')} className={`flex-1 min-w-0 px-2 py-3 text-xs sm:text-sm font-bold transition-colors ${tab === 'MECHANICS' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-slate-600 hover:bg-slate-50'}`}>
                        {tr("效率与难度规则")}</button>
                    <button type="button" onClick={() => setTab('EXAMS')} className={`flex-1 min-w-0 px-2 py-3 text-xs sm:text-sm font-bold transition-colors ${tab === 'EXAMS' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-slate-600 hover:bg-slate-50'}`}>
                        {tr("考试与排名")}</button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scroll text-sm text-slate-700 leading-relaxed">
                    
                    {tab === 'STATS' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold text-slate-900 mb-2 border-l-4 border-indigo-500 pl-2">{tr("现实难度 · 自我认知")}</h3>
                                <p className="text-xs text-slate-500 mb-2">{tr("现实难度显示精确余额，其余属性以体感档位呈现。")}</p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-2 bg-rose-50 text-rose-700 rounded border border-rose-100 flex justify-between"><span>{tr("糟糕透顶")}</span> <span>&lt; 20</span></div>
                                    <div className="p-2 bg-orange-50 text-orange-600 rounded border border-orange-100 flex justify-between"><span>{tr("不太妙")}</span> <span>20 - 39</span></div>
                                    <div className="p-2 bg-slate-50 text-slate-600 rounded border border-slate-200 flex justify-between"><span>{tr("平平无奇")}</span> <span>40 - 59</span></div>
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded border border-emerald-100 flex justify-between"><span>{tr("感觉良好")}</span> <span>60 - 79</span></div>
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded border border-indigo-100 flex justify-between"><span>{tr("充满自信")}</span> <span>80 - 99</span></div>
                                    <div className="p-2 bg-amber-50 text-amber-700 rounded border border-amber-200 flex justify-between font-bold"><span>{tr("超凡脱俗")}</span> <span>&ge; 100</span></div>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-slate-900 mb-2 border-l-4 border-indigo-500 pl-2">{tr("学习状态与学科体感")}</h3>
                                <p className="text-xs text-slate-500 mb-2">{tr("效率体感由「极度涣散 / 心不在焉 / 普普通通 / 专注 / 高效 / 心流」表示；学科能力由「一窍不通 / 略懂皮毛 / 马马虎虎 / 渐入佳境 / 得心应手 / 登峰造极」表示；疲劳以「精力充沛 / 尚可支撑 / 有些疲惫 / 明显透支 / 精疲力竭」提示。")}</p>
                            </div>
                        </div>
                    )}

                    {tab === 'MECHANICS' && (
                        <div className="space-y-5">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                                <h4 className="font-bold text-indigo-700 text-sm">{tr("疲劳、兴奋与收益规律")}</h4>
                                <p>{tr("• 疲劳 ≥ 50/75/90 时，有效效率依次扣除 1 / 3 / 6 点；疲劳 ≥ 75 还会持续扣减健康与心态。")}</p>
                                <p>{tr("• 兴奋值越高，学习与运动正向收益越高，但休息恢复效率会相应下降。")}</p>
                                <p>{tr("• 周末同一项活动重复安排会触发收益递减（第 1~4 次：100% / 68% / 45% / 30%）。")}</p>
                                <p>{tr("• 现实难度下，心态低时容易低估自己，心态高时容易高估。经验越多，自我判断越稳定。")}</p>
                            </div>

                            <div className="space-y-2 text-xs">
                                <h4 className="font-bold text-slate-900 text-sm">{tr("难度规则差异")}</h4>
                                <ul className="list-disc list-inside space-y-1.5 pl-1">
                                    <li><span className="font-bold text-orange-600">{tr("困难难度")}</span>{tr("：开局属性与零花钱更少，同学平均水平更高。")}</li>
                                    <li><span className="font-bold text-rose-600">{tr("现实难度")}</span>{tr("：除余额外以体感档位呈现，事件隐藏高风险提示；周末活动每周变化；心态低于 20 或疲劳超过 90 时无法学习。")}</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {tab === 'EXAMS' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold text-slate-900 mb-2">{tr("排名计算机制")}</h3>
                                <p className="mb-4">{tr("文化课考试按 633 人估算年级排名，以下均分以满分 750 为例。")}</p>
                                
                                <dl className="grid gap-2">
                                    {Object.values(DIFFICULTY_PRESETS).map(preset => (
                                        <div key={preset.label} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                                            <dt className="font-bold">{tr(preset.label)}</dt>
                                            <dd>{Math.round(preset.peerAverage * 750)} / 750</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>

                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-amber-800 text-xs">
                                <span className="font-bold block mb-1"><i className="fas fa-lightbulb"></i> {tr("提示：")}</span>
                                {tr("现实难度的 750 分制参照：约 710 分为年级第 1，677 分为第 10，655 分为第 50，640 分为第 100。")}</div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default RealityGuideModal;
