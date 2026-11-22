import { useLanguage } from '../lib/i18n';

import React, { useState } from 'react';

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
                    <button onClick={() => setTab('STATS')} className={`flex-1 py-3 text-sm font-bold transition-colors ${tab === 'STATS' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-slate-500 hover:bg-slate-50'}`}>
                        {tr("模糊显示对照")}</button>
                    <button onClick={() => setTab('MECHANICS')} className={`flex-1 py-3 text-sm font-bold transition-colors ${tab === 'MECHANICS' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-slate-500 hover:bg-slate-50'}`}>
                        {tr("效率与难度规则")}</button>
                    <button onClick={() => setTab('EXAMS')} className={`flex-1 py-3 text-sm font-bold transition-colors ${tab === 'EXAMS' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-slate-500 hover:bg-slate-50'}`}>
                        {tr("考试与排名")}</button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scroll text-sm text-slate-700 leading-relaxed">
                    
                    {tab === 'STATS' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold text-slate-900 mb-2 border-l-4 border-indigo-500 pl-2">{tr("现实 / 地狱模式状态档位")}</h3>
                                <p className="text-xs text-slate-500 mb-2">{tr("【现实】与【地狱】模式下数值会隐去具体数字，改按实际区间显示文字档位（无随机认知偏差）：")}</p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-2 bg-rose-50 text-rose-700 rounded border border-rose-100 flex justify-between"><span>{tr("极低（金钱<0 显示负债）")}</span> <span>&lt; 20</span></div>
                                    <div className="p-2 bg-orange-50 text-orange-600 rounded border border-orange-100 flex justify-between"><span>{tr("较低")}</span> <span>20 - 39</span></div>
                                    <div className="p-2 bg-slate-50 text-slate-600 rounded border border-slate-200 flex justify-between"><span>{tr("一般")}</span> <span>40 - 59</span></div>
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded border border-emerald-100 flex justify-between"><span>{tr("较高")}</span> <span>60 - 79</span></div>
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded border border-indigo-100 flex justify-between col-span-2"><span>{tr("极高")}</span> <span>&ge; 80</span></div>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-slate-900 mb-2 border-l-4 border-indigo-500 pl-2">{tr("有效效率 (0 ~ 30)")}</h3>
                                <p className="text-xs text-slate-500 mb-2">{tr("基础效率上限为 30，再结合状态 Buff/Debuff 与疲劳惩罚折算为有效效率：")}</p>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className="p-2 bg-rose-50 text-rose-700 rounded border border-rose-100 flex justify-between"><span>{tr("低")}</span> <span>&lt; 8</span></div>
                                    <div className="p-2 bg-slate-50 text-slate-600 rounded border border-slate-200 flex justify-between"><span>{tr("中")}</span> <span>8 - 14.9</span></div>
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded border border-emerald-100 flex justify-between font-bold"><span>{tr("高")}</span> <span>&ge; 15</span></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'MECHANICS' && (
                        <div className="space-y-5">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                                <h4 className="font-bold text-indigo-700 text-sm">{tr("疲劳、兴奋与收益规律")}</h4>
                                <p>{tr("• 疲劳 &ge; 50/75/90 时，有效效率依次扣除 1 / 3 / 6 点；疲劳 &ge; 75 还会持续扣减健康与心态。")}</p>
                                <p>{tr("• 兴奋值越高，学习与运动正向收益越高，但休息恢复效率会相应下降。")}</p>
                                <p>{tr("• 周末同一项活动重复安排会触发收益递减（第 1~4 次：100% / 68% / 45% / 30%）。")}</p>
                            </div>

                            <div className="space-y-2 text-xs">
                                <h4 className="font-bold text-slate-900 text-sm">{tr("高难度专属限制")}</h4>
                                <ul className="list-disc list-inside space-y-1.5 pl-1">
                                    <li><span className="font-bold text-rose-600">{tr("现实难度")}</span>{tr("：每周周末仅随机提供 6 项可选活动，且隐藏具体数值。")}</li>
                                    <li><span className="font-bold text-slate-900">{tr("地狱难度")}</span>{tr("：健康低于 10 立即结束；心态 < 20 或疲劳 > 90 无法学习；每周最多安排 1 次学习；商店价格翻倍；同样可解锁成就。")}</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {tab === 'EXAMS' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold text-slate-900 mb-2">{tr("排名计算机制")}</h3>
                                <p className="mb-4">{tr("文化课大考按全年级 633 人正态分布模拟排名（标准差约 13%），不同难度的同学平均水平如下：")}</p>
                                
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">{tr("普")}</div>
                                        <div className="flex-1 text-xs">{tr("普通难度：年级平均分约占总分 ")}<strong>58%</strong></div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-rose-100 text-rose-700 flex items-center justify-center font-bold">{tr("现")}</div>
                                        <div className="flex-1 text-xs">{tr("困难 / 现实难度：年级平均分约占总分 ")}<strong>68%</strong></div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-slate-200 text-slate-800 flex items-center justify-center font-bold">{tr("狱")}</div>
                                        <div className="flex-1 text-xs">{tr("地狱难度：年级平均分约占总分 ")}<strong>74%</strong></div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-amber-800 text-xs">
                                <span className="font-bold block mb-1"><i className="fas fa-lightbulb"></i> {tr("提示：")}</span>
                                {tr("总分达到满分的 ")}<strong>&ge; 98%</strong> {tr("即可锁定年级第一；OI 竞赛成绩会同时结合各算法维度的训练积累而非单靠数学基础。")}</div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default RealityGuideModal;
