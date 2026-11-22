import React from 'react';
import { AiConfig, Challenge, Difficulty, GeneralStats } from '../types';
import { DIFFICULTY_PRESETS } from '../data/constants';
import { ACHIEVEMENTS } from '../data/mechanics';
import { IRREGULAR_CHALLENGES } from '../data/challenges';
import { ENDING_CATALOG, getUnlockedEndings } from '../data/ending';
import AiSettingsModal from './AiSettingsModal';
import { useLanguage } from '../lib/i18n';

interface HomeViewProps {
    selectedDifficulty: Difficulty;
    onDifficultyChange: (diff: Difficulty) => void;
    customStats: GeneralStats;
    onCustomStatsChange: (stats: GeneralStats) => void;
    onStart: (challenge?: Challenge) => void;
    hasSave: boolean;
    onLoadGame: () => void;
    hasManualSave: boolean;
    onLoadManual: () => void;
    unlockedAchievements: string[];
    aiConfig: AiConfig;
    onAiConfigChange: (config: AiConfig) => void;
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

const DIFFICULTY_CARDS = [
    { difficulty: 'NORMAL', icon: 'fa-mug-hot' },
    { difficulty: 'HARD', icon: 'fa-exclamation' },
    { difficulty: 'REALITY', icon: 'fa-skull' },
    { difficulty: 'CUSTOM', icon: 'fa-sliders' },
] as const;

const CUSTOM_DIFFICULTY_CARD = { label: '自定义', color: 'bg-slate-800' };
const HOME_SHORTCUT_STYLE = 'flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-center text-sm font-bold transition sm:px-4';

const HomeView: React.FC<HomeViewProps> = ({ selectedDifficulty, onDifficultyChange, customStats, onCustomStatsChange, onStart, hasSave, onLoadGame, hasManualSave, onLoadManual, unlockedAchievements, aiConfig, onAiConfigChange, onManageAccounts }) => {
    const { language, setLanguage, t: tr } = useLanguage();
    const [showChallenges, setShowChallenges] = React.useState(false);
    const [showSponsor, setShowSponsor] = React.useState(false);
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
            else if (showSponsor) setShowSponsor(false);
            else if (showQQGroup) setShowQQGroup(false);
            else if (showChallenges) setShowChallenges(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [showVideo, showAiSettings, showAchievements, showSponsor, showQQGroup, showChallenges]);

    return (
        <div className="relative isolate flex min-h-[100dvh] items-center justify-center bg-slate-50 p-4 text-slate-800 md:p-8">
            <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden text-[12rem] font-black opacity-5">
                <span className="absolute left-10 top-10 rotate-12">8</span>
                <span className="absolute bottom-10 right-10 -rotate-12">OI</span>
            </div>
            <main className="grid w-full max-w-6xl gap-5 lg:gap-6">
                <section className="relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-xl shadow-indigo-100/50 md:p-10 lg:min-h-[380px]">
                    <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 size-64 rounded-full bg-indigo-100/70 blur-3xl" />
                    <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 size-64 rounded-full bg-emerald-50 blur-3xl" />
                    <div className="relative">
                        <header className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3 md:gap-5">
                                <span aria-hidden="true" className="grid size-14 shrink-0 -rotate-3 place-items-center rounded-2xl bg-indigo-600 text-2xl text-white shadow-lg shadow-indigo-200 md:size-20 md:rounded-3xl md:text-4xl">
                                    <i className="fas fa-school" />
                                </span>
                                <div className="min-w-0">
                                    <h1 className="text-2xl font-black leading-tight tracking-tighter text-slate-900 sm:text-4xl md:text-5xl">{tr("八中重开模拟器")}</h1>
                                    <p className="mt-1 text-xs font-bold text-slate-500 md:text-sm">Made by liuenyin</p>
                                </div>
                            </div>
                            <button type="button" onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-indigo-800 hover:bg-indigo-50" lang={language === 'zh' ? 'en' : 'zh-CN'}>{language === 'zh' ? 'English' : '简体中文'}</button>
                        </header>
                        <p className="mt-5 max-w-lg text-sm font-medium leading-relaxed text-slate-600 md:mt-8 md:text-lg">{tr("从入学前的暑假开始，过完在八中的高一。")}</p>
                    </div>
                    <div className="relative mt-7 md:mt-10">
                        <h2 id="home-difficulty" className="mb-3 text-xs font-black tracking-wider text-slate-600">{tr("选择你的开局难度")}</h2>
                        <div role="group" aria-labelledby="home-difficulty" className="flex flex-wrap gap-2 sm:gap-3">
                            {DIFFICULTY_CARDS.map(({ difficulty, icon }) => {
                                const preset = difficulty === 'CUSTOM' ? CUSTOM_DIFFICULTY_CARD : DIFFICULTY_PRESETS[difficulty];
                                return (
                                    <button key={difficulty} type="button" onClick={() => onDifficultyChange(difficulty)} aria-pressed={selectedDifficulty === difficulty} className={`flex items-center gap-2 rounded-2xl border-2 px-3 py-2 text-sm font-bold transition sm:px-5 sm:py-2.5 ${selectedDifficulty === difficulty ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm ring-2 ring-indigo-100' : 'border-slate-100 bg-white/70 text-slate-600 hover:border-slate-300'}`}>
                                        {difficulty === 'CUSTOM' ? <i className={`fas ${icon} text-xs`} aria-hidden="true" /> : <span aria-hidden="true" className={`size-2.5 rounded-full ${preset.color}`} />}
                                        {tr(preset.label)}
                                    </button>
                                );
                            })}
                        </div>
                        {selectedDifficulty === 'CUSTOM' && (
                            <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <h2 className="mb-3 text-sm font-bold text-slate-700">{tr("配置初始属性")}</h2>
                                <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                                    {(Object.keys(customStats) as (keyof GeneralStats)[]).map(key => {
                                        const max = key === 'efficiency' ? 30 : 100;
                                        return (
                                            <label key={key} className="flex items-center gap-2 text-xs text-slate-600">
                                                <span className="w-16 shrink-0">{tr(CUSTOM_STAT_LABELS[key] || key)}</span>
                                                <input type="range" min="0" max={max} value={Math.min(customStats[key], max)} onChange={e => onCustomStatsChange({ ...customStats, [key]: Number(e.target.value) })} className="min-w-0 flex-1 accent-indigo-600" />
                                                <span className="w-7 shrink-0 text-right font-bold text-indigo-700">{Math.min(customStats[key], max)}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </section>
                        )}
                        <div className="mt-6 flex flex-wrap gap-3">
                            <button type="button" onClick={() => onStart()} className="flex min-h-12 min-w-fit flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 font-black text-white shadow-xl transition hover:bg-slate-800 active:scale-95 md:px-8 md:py-4 md:text-xl">
                                <i className="fas fa-play text-indigo-300" aria-hidden="true" />{tr("开启模拟")}
                            </button>
                            {hasSave && (
                                <button type="button" onClick={onLoadGame} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-emerald-100 bg-white px-4 py-3 font-bold text-emerald-700 shadow-md hover:bg-emerald-50 md:px-6">
                                    <i className="fas fa-floppy-disk" aria-hidden="true" />{tr("继续游戏")}
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-lg shadow-slate-200/50">
                    <nav className="flex flex-wrap gap-2" aria-label={tr("游戏工具")}>
                        {[
                            { label: '成就与图鉴', icon: 'fa-trophy', color: 'bg-amber-50 text-amber-800 hover:bg-amber-100', action: () => { setUnlockedEndings(getUnlockedEndings()); setShowAchievements(true); } },
                            { label: '特殊挑战', icon: 'fa-bolt', color: 'bg-violet-50 text-violet-800 hover:bg-violet-100', action: () => setShowChallenges(true) },
                            { label: '账号与存档', icon: 'fa-folder-open', color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100', action: onManageAccounts },
                            ...(hasManualSave ? [{ label: '读取手动存档', icon: 'fa-floppy-disk', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100', action: onLoadManual }] : []),
                            { label: '介绍视频', icon: 'fa-video', color: 'bg-pink-50 text-pink-700 hover:bg-pink-100', action: () => setShowVideo(true) },
                            { label: '赞助', icon: 'fa-heart', color: 'bg-rose-50 text-rose-700 hover:bg-rose-100', action: () => setShowSponsor(true) },
                            { label: 'AI 模式', icon: 'fa-robot', color: 'bg-slate-100 text-slate-700 hover:bg-slate-200', action: () => setShowAiSettings(true) },
                            { label: 'QQ群', icon: 'fa-brands fa-qq', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100', action: () => setShowQQGroup(true) },
                        ].map(tool => (
                            <button key={tool.label} type="button" onClick={tool.action} className={`${HOME_SHORTCUT_STYLE} ${tool.color}`}>
                                <i className={`${tool.icon.startsWith('fa-brands') ? '' : 'fas '}${tool.icon}`} aria-hidden="true" />{tr(tool.label)}{tool.label === 'AI 模式' && aiConfig.enabled && tr('（已开启）')}
                            </button>
                        ))}
                        <a href="https://v.wjx.cn/vm/exSyEK0.aspx" target="_blank" rel="noopener noreferrer" className={`${HOME_SHORTCUT_STYLE} bg-emerald-50 text-emerald-800 hover:bg-emerald-100`}><i className="fas fa-comment-dots" aria-hidden="true" />{tr("反馈建议")}</a>
                    </nav>
                </div>
                <footer className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-bold text-slate-500">
                    <a href="https://github.com/liuenyin/recallbj8z" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-indigo-700">
                        <i className="fab fa-github" aria-hidden="true" />{tr("GitHub 仓库")}
                    </a>
                    <a href="https://lg37.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-indigo-700 hover:underline">
                        {tr("想看更多作品？访问 lg37.com")}<i className="fas fa-arrow-up-right-from-square" aria-hidden="true" />
                    </a>
                </footer>
            </main>

            {showChallenges && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn" onClick={() => setShowChallenges(false)}>
                    <section role="dialog" aria-modal="true" aria-labelledby="challenge-heading" className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7" onClick={event => event.stopPropagation()}>
                        <div className="mb-4 flex items-center justify-between">
                            <h2 id="challenge-heading" className="flex items-center gap-2 text-xl font-black"><i className="fas fa-bolt text-violet-600" aria-hidden="true" />{tr("特殊挑战")}</h2>
                            <button type="button" autoFocus onClick={() => setShowChallenges(false)} aria-label={tr("关闭")} className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"><i className="fas fa-times" aria-hidden="true" /></button>
                        </div>
                        <div className="grid gap-2">
                            {IRREGULAR_CHALLENGES.map(challenge => (
                                <button key={challenge.id} type="button" onClick={() => onStart(challenge)} className="group rounded-2xl border border-violet-100 bg-violet-50 p-4 text-left hover:border-violet-300 hover:bg-violet-100">
                                    <span className="flex items-center justify-between gap-2 font-bold text-violet-900">{tr(challenge.title)}<i className="fas fa-chevron-right text-xs" aria-hidden="true" /></span>
                                    <span className="mt-1.5 block text-sm leading-relaxed text-slate-700">{tr(challenge.description)}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                </div>
            )}

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
             
        </div>
    );
};

export default HomeView;
