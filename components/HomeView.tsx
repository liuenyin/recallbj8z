import React from 'react';
import { AiConfig, Challenge, Difficulty, GeneralStats } from '../types';
import { DIFFICULTY_PRESETS, CHANGELOG_DATA } from '../data/constants';
import { ACHIEVEMENTS } from '../data/mechanics';
import { IRREGULAR_CHALLENGES } from '../data/challenges';
import { ENDING_CATALOG, getUnlockedEndings } from '../data/ending';
import AiSettingsModal from './AiSettingsModal';
import { LocalAccount } from '../lib/accounts';
import { useLanguage } from '../lib/i18n';

interface HomeViewProps {
    selectedDifficulty: Difficulty;
    onDifficultyChange: (diff: Difficulty) => void;
    customStats: GeneralStats;
    onCustomStatsChange: (stats: GeneralStats) => void;
    onStart: (challenge?: Challenge, skipTalents?: boolean) => void;
    hasSave: boolean;
    onLoadGame: () => void;
    hasManualSave: boolean;
    onLoadManual: () => void;
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

const HomeView: React.FC<HomeViewProps> = ({ selectedDifficulty, onDifficultyChange, customStats, onCustomStatsChange, onStart, hasSave, onLoadGame, hasManualSave, onLoadManual, unlockedAchievements, aiConfig, onAiConfigChange, account, onManageAccounts }) => {
    const { language, setLanguage, t: tr } = useLanguage();
    const [showMore, setShowMore] = React.useState(false);
    const [showChangelog, setShowChangelog] = React.useState(false);
    const [showSponsor, setShowSponsor] = React.useState(false);
    const [showSettings, setShowSettings] = React.useState(false);
    const [showAiSettings, setShowAiSettings] = React.useState(false);
    const [showAchievements, setShowAchievements] = React.useState(false);
    const [collectionTab, setCollectionTab] = React.useState<'achievements' | 'endings'>('achievements');
    const [unlockedEndings, setUnlockedEndings] = React.useState<string[]>(() => getUnlockedEndings());
    const [showQQGroup, setShowQQGroup] = React.useState(false);
    const [showVideo, setShowVideo] = React.useState(false);
    const [imageFallbacks, setImageFallbacks] = React.useState<Record<string, boolean>>({});

    React.useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (showVideo) setShowVideo(false);
            else if (showAiSettings) setShowAiSettings(false);
            else if (showAchievements) setShowAchievements(false);
            else if (showSettings) setShowSettings(false);
            else if (showSponsor) setShowSponsor(false);
            else if (showChangelog) setShowChangelog(false);
            else if (showQQGroup) setShowQQGroup(false);
            else setShowMore(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [showVideo, showAiSettings, showAchievements, showSettings, showSponsor, showChangelog, showQQGroup]);
    
                
    return (
        <div className="min-h-[100dvh] bg-slate-50 px-4 py-8 md:py-16 text-slate-800 flex items-center justify-center">
            <main className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white px-6 py-8 shadow-xl shadow-slate-200/60 sm:px-10 sm:py-12">
                <div className="flex items-center gap-3">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-xl text-white sm:size-14" aria-hidden="true"><i className="fas fa-school" /></span>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-4xl">{tr("八中重开模拟器")}</h1>
                    <button type="button" onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')} className="ml-auto shrink-0 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-bold text-indigo-800 hover:bg-slate-50" lang={language === 'zh' ? 'en' : 'zh-CN'}>{language === 'zh' ? 'English' : '简体中文'}</button>
                </div>
                <p className="mt-4 text-sm text-slate-600">{tr("从入学前的暑假开始，过完在八中的高一。")}</p>

                <div className="mt-8 space-y-2.5">
                    {hasSave && (
                        <button type="button" onClick={onLoadGame} className="w-full rounded-2xl bg-indigo-700 px-6 py-3.5 font-bold text-white hover:bg-indigo-800">{tr("继续游戏")}</button>
                    )}
                    <button type="button" onClick={() => onStart()} className={`w-full rounded-2xl px-6 py-3.5 font-bold ${hasSave ? 'border border-indigo-200 text-indigo-700 hover:bg-indigo-50' : 'bg-indigo-700 text-white hover:bg-indigo-800'}`}>
                        {tr("开启新学期")}</button>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        {tr("开局难度")}<select value={selectedDifficulty} onChange={e => onDifficultyChange(e.target.value as Difficulty)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-medium text-slate-800">
                            {(Object.entries(DIFFICULTY_PRESETS) as [Difficulty, typeof DIFFICULTY_PRESETS.NORMAL][]).map(([key, preset]) => (
                                <option key={key} value={key}>{tr(preset.label)}</option>
                            ))}
                            <option value="CUSTOM">{tr("自定义")}</option>
                        </select>
                    </label>
                    <button type="button" onClick={() => setShowMore(value => !value)} aria-expanded={showMore} aria-controls="home-more" className="rounded-lg px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
                        {tr("更多 ")}<i className={`fas fa-chevron-${showMore ? 'up' : 'down'} ml-1 text-xs`} aria-hidden="true" />
                    </button>
                </div>
                {selectedDifficulty !== 'NORMAL' && (
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">{tr(selectedDifficulty === 'CUSTOM' ? '设置开局属性。' : DIFFICULTY_PRESETS[selectedDifficulty].desc)}</p>
                )}
                {selectedDifficulty === 'CUSTOM' && (
                    <div className="mt-3 grid gap-x-5 gap-y-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                        {(Object.keys(customStats) as (keyof GeneralStats)[]).map(key => (
                            <label key={key} className="flex items-center gap-2 text-xs text-slate-600">
                                <span className="w-8 shrink-0">{tr(CUSTOM_STAT_LABELS[key] || key)}</span>
                                <input type="range" min="0" max={key === 'efficiency' ? 30 : 100} value={Math.min(customStats[key], key === 'efficiency' ? 30 : 100)} onChange={e => onCustomStatsChange({ ...customStats, [key]: Number(e.target.value) })} className="w-full accent-indigo-600" />
                                <span className="w-7 shrink-0 text-right">{customStats[key]}</span>
                            </label>
                        ))}
                    </div>
                )}

                {showMore && (
                    <div id="home-more" className="mt-5 space-y-4 border-t border-slate-200 pt-4">
                        <div className="grid grid-cols-2 gap-1.5 text-left text-sm">
                            <button type="button" onClick={() => onStart(undefined, true)} disabled={selectedDifficulty === 'HELL'} className="rounded-lg px-3 py-2 text-left hover:bg-slate-100 disabled:opacity-40">{tr("跳过天赋速开")}</button>
                            <button type="button" onClick={() => { setShowMore(false); onManageAccounts(); }} className="rounded-lg px-3 py-2 text-left hover:bg-slate-100">{tr("账号与存档 ")}<span className="block truncate text-xs text-slate-500">{tr(account.name)}</span></button>
                            {hasManualSave && <button type="button" onClick={onLoadManual} className="rounded-lg px-3 py-2 text-left hover:bg-slate-100">{tr("读取手动存档")}</button>}
                            <button type="button" onClick={() => { setUnlockedEndings(getUnlockedEndings()); setShowAchievements(true); }} className="rounded-lg px-3 py-2 text-left hover:bg-slate-100">{tr("成就与图鉴")}</button>
                            <button type="button" onClick={() => setShowAiSettings(true)} className="rounded-lg px-3 py-2 text-left hover:bg-slate-100">{tr("AI 模式")}{tr(aiConfig.enabled ? '（已开启）' : '')}</button>
                        </div>

                        <details className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
                            <summary className="cursor-pointer font-medium">{tr("特殊挑战")}</summary>
                            <div className="mt-2 space-y-1">
                                {IRREGULAR_CHALLENGES.map(challenge => (
                                    <button key={challenge.id} type="button" onClick={() => onStart(challenge)} className="block w-full rounded-lg px-2 py-2 text-left hover:bg-white">
                                        <strong>{tr(challenge.title)}</strong>
                                        <span className="mt-0.5 block text-xs text-slate-600">{tr(challenge.description)}</span>
                                    </button>
                                ))}
                            </div>
                        </details>

                        <div className="flex flex-wrap gap-x-4 gap-y-2 px-1 text-xs text-slate-600">
                            <button type="button" onClick={() => setShowSettings(true)} className="hover:text-indigo-700">{tr("帮助")}</button>
                            <button type="button" onClick={() => setShowChangelog(true)} className="hover:text-indigo-700">{tr("更新日志")}</button>
                            <button type="button" onClick={() => setShowQQGroup(true)} className="hover:text-indigo-700">{tr("QQ群")}</button>
                            <button type="button" onClick={() => setShowVideo(true)} className="hover:text-indigo-700">{tr("介绍视频")}</button>
                            <button type="button" onClick={() => setShowSponsor(true)} className="hover:text-indigo-700">{tr("支持作者")}</button>
                        </div>
                    </div>
                )}
            </main>

             {showQQGroup && (
                 <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn" onClick={() => setShowQQGroup(false)}>
                     <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center" onClick={e => e.stopPropagation()}>
                         <div className="flex justify-between items-center w-full mb-6 border-b border-slate-100 pb-4">
                             <h2 className="text-2xl font-black text-slate-800">{tr("加入组织")}</h2>
                             <button onClick={() => setShowQQGroup(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"><i className="fas fa-times"></i></button>
                         </div>
                         <div className="bg-slate-100 p-4 rounded-2xl mb-4">
                            {imageFallbacks.qr ? (
                                <div className="w-64 h-48 rounded-xl bg-white flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                                    <i className="fas fa-qrcode text-3xl" />
                                    <span>{tr("二维码加载失败，请直接搜群号")}</span>
                                </div>
                            ) : (
                                <img src="https://cdn.luogu.com.cn/upload/image_hosting/rhymaxyw.png" alt="QQ Group QR" onError={() => setImageFallbacks(prev => ({ ...prev, qr: true }))} className="w-64 h-auto rounded-xl mix-blend-multiply" />
                            )}
                         </div>
                         <p className="text-center text-slate-600 font-bold mb-2">{tr("群号: 1080382240")}</p>
                         <p className="text-center text-xs text-slate-400">{tr("点击图片或长按保存扫描")}</p>
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
                            src="https://player.bilibili.com/player.html?isOutside=true&aid=115953580973453&bvid=BV1TEzDBDEPg&cid=35597586008&p=1&autoplay=0" 
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
                    <div className="bg-white rounded-[2rem] p-6 md:p-8 max-w-4xl w-full h-[80vh] shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
                             <div>
                                <h2 className="text-2xl md:text-3xl font-black text-slate-800">{tr(collectionTab === 'achievements' ? '成就墙' : '生涯结局图鉴')}</h2>
                                <p className="text-sm text-slate-500 font-medium mt-1">
                                    {collectionTab === 'achievements'
                                        ? <>{tr("已解锁 ")}<span className="text-indigo-600 font-bold">{unlockedAchievements.length}</span> / {Object.keys(ACHIEVEMENTS).length}</>
                                        : <>{tr("已点亮 ")}<span className="text-indigo-600 font-bold">{unlockedEndings.length}</span> / {ENDING_CATALOG.length}</>}
                                </p>
                             </div>
                             <div className="flex items-center gap-2">
                                 <div className="bg-slate-100 p-1 rounded-xl flex text-xs font-bold">
                                     <button type="button" onClick={() => setCollectionTab('achievements')} className={`px-3 py-1.5 rounded-lg transition-all ${collectionTab === 'achievements' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>{tr("成就徽章")}</button>
                                     <button type="button" onClick={() => setCollectionTab('endings')} className={`px-3 py-1.5 rounded-lg transition-all ${collectionTab === 'endings' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>{tr("结局图鉴")}</button>
                                 </div>
                                 <button onClick={() => setShowAchievements(false)} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"><i className="fas fa-times"></i></button>
                             </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scroll grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-2">
                            {collectionTab === 'achievements' ? Object.values(ACHIEVEMENTS).map(ach => {
                                const isUnlocked = unlockedAchievements.includes(ach.id);
                                return (
                                    <div key={ach.id} className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${isUnlocked ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-50 border-slate-100 opacity-60 grayscale'}`}>
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${isUnlocked ? 'bg-white text-indigo-500' : 'bg-slate-200 text-slate-400'}`}>
                                            <i className={`fas ${ach.icon}`}></i>
                                        </div>
                                        <div>
                                            <h4 className={`font-bold text-sm ${isUnlocked ? 'text-slate-800' : 'text-slate-500'}`}>{tr(ach.title)}</h4>
                                            <p className="text-xs text-slate-400 mt-0.5 leading-tight">{tr(ach.description)}</p>
                                        </div>
                                    </div>
                                );
                            }) : ENDING_CATALOG.map(entry => {
                                const isUnlocked = unlockedEndings.includes(entry.title);
                                return (
                                    <div key={entry.title} className={`p-4 rounded-2xl border-2 flex flex-col justify-between gap-2 transition-all ${isUnlocked ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-50 border-slate-100 opacity-75'}`}>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isUnlocked ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{tr(entry.rank)} · {tr(entry.category)}</span>
                                            <i className={`fas ${isUnlocked ? 'fa-check-circle text-emerald-500' : 'fa-lock text-slate-300'}`} />
                                        </div>
                                        <h4 className={`font-black text-sm ${isUnlocked ? 'text-slate-900' : 'text-slate-500'}`}>{tr(isUnlocked ? entry.title : '未点亮结局')}</h4>
                                        <p className="text-xs text-slate-500 leading-relaxed">{tr(entry.hint)}</p>
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
                             <h2 className="text-2xl font-black text-slate-800">{tr("更新日志")}</h2>
                             <button onClick={() => setShowChangelog(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"><i className="fas fa-times"></i></button>
                         </div>
                         <div className="overflow-y-auto custom-scroll space-y-6 pr-2">
                             {CHANGELOG_DATA.map((log, i) => (
                                 <div key={i}>
                                     <div className="flex items-baseline gap-2 mb-2">
                                         <span className="text-lg font-bold text-indigo-600">{tr(log.version)}</span>
                                         <span className="text-xs text-slate-400 font-mono">{tr(log.date)}</span>
                                     </div>
                                     <ul className="list-disc list-inside space-y-1">
                                         {log.content.map((item, idx) => (
                                             <li key={idx} className="text-sm text-slate-600">{tr(item)}</li>
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
                             <h2 className="text-2xl font-black text-slate-800">{tr("赞助商展示")}</h2>
                             <button onClick={() => setShowSponsor(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"><i className="fas fa-times"></i></button>
                         </div>
                         <div className="overflow-y-auto custom-scroll space-y-3 pr-2 text-center">
                             {SPONSORS.map((sponsor, idx) => (
                                 <div key={sponsor.id} className={`p-4 rounded-2xl border shadow-sm flex items-center gap-4 ${idx === 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-indigo-100'}`}>
                                    {imageFallbacks[sponsor.id] ? (
                                        <div className="w-12 h-12 rounded-full border-2 border-white shadow-md flex-shrink-0 bg-indigo-100 text-indigo-600 flex items-center justify-center font-black">{tr(sponsor.name.slice(0, 1))}</div>
                                    ) : (
                                        <img src={sponsor.avatar} alt={tr(sponsor.name)} onError={() => setImageFallbacks(prev => ({ ...prev, [sponsor.id]: true }))} className="w-12 h-12 rounded-full border-2 border-white shadow-md flex-shrink-0 bg-slate-200"/>
                                    )}
                                    <div className="text-left flex-1 min-w-0">
                                        <div className="font-bold text-slate-800 truncate">{tr(sponsor.name)}</div>
                                        <div className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit mt-1 ${idx === 0 ? 'bg-amber-200 text-amber-800' : 'bg-indigo-50 text-indigo-500'}`}>{tr(sponsor.label)}</div>
                                    </div>
                                 </div>
                             ))}
                             
                             <p className="text-xs text-slate-400 mt-4 mb-6">{tr("金主列表每周更新一次，可能有时间延迟")}</p>
                             <a href="https://afdian.com/a/liuenyin?tab=home" target="_blank" rel="noopener noreferrer" className="block w-full bg-amber-500 text-white py-3 rounded-xl font-bold hover:bg-amber-600 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0">
                                 <i className="fas fa-bolt mr-2"></i> {tr("前往爱发电支持作者")}</a>
                         </div>
                     </div>
                 </div>
             )}
             
             {showSettings && (
                 <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn" onClick={() => setShowSettings(false)}>
                     <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                         <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                             <h2 className="text-2xl font-black text-slate-800">{tr("游戏帮助")}</h2>
                             <button onClick={() => setShowSettings(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"><i className="fas fa-times"></i></button>
                         </div>
                         <div className="overflow-y-auto custom-scroll space-y-6 pr-2">
                             {/* ... Content ... */}
                             <div className="space-y-4">
                                 <h3 className="font-black text-slate-400 uppercase tracking-widest text-xs border-b border-slate-100 pb-2">{tr("关于本项目")}</h3>
                                 <p className="text-sm text-slate-600 leading-relaxed">
                                     {tr("本项目纯属虚构，如有雷同，纯属巧合。")}</p>
                                 <div className="text-xs text-slate-400">
                                     <p>Developer: liuenyin</p>
                                     <p>Tech Stack: React, Tailwind, TypeScript</p>
                                 </div>
                             </div>
                             
                             <div className="space-y-4">
                                 <h3 className="font-black text-slate-400 uppercase tracking-widest text-xs border-b border-slate-100 pb-2">{tr("游戏机制")}</h3>
                                 <div className="text-sm text-slate-600 space-y-2">
                                     <p><span className="font-bold text-slate-800">{tr("最终评价：")}</span><br/>
                                     {tr("以各科水平为主，结合经验、效率、长期项目、社团和关键路线成果；不同路线会影响结局。")}</p>
                                 </div>
                             </div>

                             <div className="space-y-4">
                                 <h3 className="font-black text-slate-400 uppercase tracking-widest text-xs border-b border-slate-100 pb-2">FAQ</h3>
                                 <div className="text-sm text-slate-600 space-y-2">
                                     <p><span className="font-bold text-slate-800">{tr("Q: 怎么存档？")}</span><br/>{tr("A: 游戏中用「更多」里的「保存」建立手动存档。到达存档点时，游戏也会自动保存。")}</p>
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
