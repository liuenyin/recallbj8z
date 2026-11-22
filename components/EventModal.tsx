import { useLanguage } from '../lib/i18n';
import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { GameEvent, EventChoice, GameState } from '../types';
import { formatCampusText } from '../data/campus_names';
import { isStudyBlocked, isStudyChoice } from '../data/utils';
import { playSound } from '../lib/sound';

interface EventModalProps {
    event: GameEvent;
    state: GameState;
    eventResult: GameState['eventResult'];
    onChoice: (choice: EventChoice) => void;
    onConfirm: () => void;
    paused?: boolean;
    autoContinueEnabled?: boolean;
    onToggleAutoContinue?: () => void;
}

const isNegativeDiff = (diff: string): boolean => {
    if (diff.startsWith('疲劳')) return /\+|增加/.test(diff);
    return /-|下降|降低|减少/.test(diff);
};

const getEventStrip = (event: GameEvent): string => {
    if (event.type === 'negative') return 'bg-rose-500';
    if (/^(oi_|mo_)|_oi_/.test(event.id)) return 'bg-indigo-500';
    if (/^(romance_|rival_|sum_confess)/.test(event.id)) return 'bg-pink-400';
    if (/sci_fest|campus_project|debate|sport_meet/.test(event.id)) return 'bg-amber-400';
    return 'bg-sky-400';
};

const EventModal: React.FC<EventModalProps> = ({ event, state, eventResult, onChoice, onConfirm, paused = false, autoContinueEnabled = true, onToggleAutoContinue }) => {
    const { t: tr } = useLanguage();
    const reduceMotion = useReducedMotion();
    const dialogRef = useRef<HTMLDivElement>(null);
    const confirmRef = useRef(onConfirm);
    const onChoiceRef = useRef(onChoice);
    confirmRef.current = onConfirm;
    onChoiceRef.current = onChoice;

    const canAutoContinue = !!(event.autoContinue && eventResult && !state.chainedEvent && !eventResult.choice.nextEventId);
    useEffect(() => {
        if (paused || !autoContinueEnabled || !canAutoContinue) return;
        const timer = setTimeout(() => confirmRef.current(), 2000);
        return () => clearTimeout(timer);
    }, [event.id, eventResult, canAutoContinue, paused, autoContinueEnabled]);

    useEffect(() => {
        if (!paused && dialogRef.current) {
            dialogRef.current.scrollTop = 0;
            dialogRef.current.focus({ preventScroll: true });
        }
    }, [event.id, eventResult, paused]);

    const formatStoryText = (text: string) => formatCampusText(text, state.flags.relationship_name || state.romancePartner);

    const getDiffClass = (diff: string) => {
        const isPositive = /\+|上升|提升|增加/.test(diff);
        const isNegative = /-|下降|降低|减少/.test(diff);
        if (diff.startsWith('疲劳')) {
            return isPositive
                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                : 'bg-emerald-50 text-emerald-600 border border-emerald-100';
        }
        if (diff.startsWith('兴奋')) {
            return isPositive
                ? 'bg-orange-50 text-orange-600 border border-orange-100'
                : 'bg-amber-50 text-amber-600 border border-amber-100';
        }
        return isPositive
            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
            : isNegative
                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                : 'bg-blue-50 text-blue-600 border border-blue-100';
    };

    const visibleChoices = event.choices?.filter(c => !c.condition || c.condition(state)) || [];
    const studyBlocked = isStudyBlocked(state);

    useEffect(() => {
        if (paused) return;
        const onKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

            if (!eventResult) {
                const digitMatch = e.key.match(/^[1-4]$/);
                if (!digitMatch) return;
                const choice = visibleChoices[Number(digitMatch[0]) - 1];
                if (!choice || (studyBlocked && isStudyChoice(choice))) return;
                e.preventDefault();
                playSound('choice');
                onChoiceRef.current(choice);
            } else if ((e.key === 'Enter' || e.key === ' ') && !target?.closest('button, a')) {
                e.preventDefault();
                playSound('confirm');
                confirmRef.current();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [paused, eventResult, visibleChoices, studyBlocked]);

    const descriptionText = formatStoryText(typeof event.description === 'function' ? event.description(state) : event.description);
    const resultDescText = formatStoryText(eventResult?.narrative || eventResult?.choice.resultDescription || '');

    return (
        <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 z-20">
               <motion.div 
                  key={event.id}
                  ref={dialogRef}
                  tabIndex={-1}
                  role="dialog"
                  aria-modal="true"
                  aria-label={tr(eventResult ? `${event.title}的结果` : event.title)}
                  initial={reduceMotion ? false : { y: 6, opacity: 0.7 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.14 }}
                  className="relative rounded-[2rem] shadow-2xl max-w-xl w-full border border-slate-200 bg-white max-h-full overflow-y-auto custom-scroll outline-none"
               >
                  <div className={`h-1 w-full ${getEventStrip(event)}`} aria-hidden="true" />
                  <div className="p-5 md:p-9">
                  {!eventResult ? (
                    <div>
                      <div className="flex justify-between items-start gap-3 mb-4">
                          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">{tr(formatStoryText(event.title))}</h2>
                          {state.eventQueue.length > 0 && <span className="mt-1 text-xs text-slate-500 whitespace-nowrap">{tr("还有 ")}{state.eventQueue.length} {tr("件事")}</span>}
                      </div>

                      <p className="text-slate-700 mb-5 text-base md:text-lg leading-relaxed font-medium">
                          {tr(descriptionText)}
                      </p>

                      <div className="space-y-3">
                         {visibleChoices.map((c, i) => {
                           const disabled = studyBlocked && isStudyChoice(c);
                           const isRisky = c.tags?.includes('risky');
                           return (
                           <button
                             type="button"
                             key={i} disabled={disabled} onClick={() => {
                                 playSound('choice');
                                 onChoice(c);
                             }}
                             title={tr(disabled ? '极限难度：当前心态或疲劳状态不允许学习' : undefined)}
                             className={`w-full text-left p-4 rounded-2xl border transition-all font-bold group flex justify-between items-center gap-3 shadow-sm ${disabled ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : c.text.includes('【睡神】') ? 'bg-indigo-50/80 border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white hover:shadow-indigo-200/50 hover:shadow-lg' : isRisky ? 'bg-rose-50/40 border-rose-200/70 text-slate-800 hover:bg-rose-600 hover:text-white hover:border-rose-500 hover:shadow-rose-200/50 hover:shadow-lg' : 'bg-white border-slate-200/70 text-slate-800 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 hover:shadow-indigo-200/50 hover:shadow-lg'}`}
                           >
                              <span className="flex-1 min-w-0">
                                  <span className="block">{tr(formatStoryText(c.text))}</span>
                                  {c.hint && <span className={`block mt-1 text-xs font-medium leading-relaxed ${disabled ? 'text-slate-500' : 'text-slate-600 group-hover:text-white'}`}>{tr(formatStoryText(c.hint))}</span>}
                              </span>
                              <span className="flex items-center gap-2 shrink-0">
                                  {isRisky && !disabled && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 group-hover:bg-white/20 group-hover:text-white">{tr("有风险")}</span>}
                                  {i < 4 && !disabled && <kbd className="hidden md:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 group-hover:bg-white/20 group-hover:text-white">{i + 1}</kbd>}
                                  {disabled ? <span className="text-[10px] font-bold">{tr("暂不可用")}</span> : <i className="fas fa-chevron-right opacity-0 group-hover:opacity-100 transition-all translate-x-[-8px] group-hover:translate-x-0"></i>}
                              </span>
                           </button>
                           );
                         })}
                         {studyBlocked && <div className="text-xs font-bold text-rose-500 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{tr("极限难度：心态低于 20 或疲劳超过 90，学习选项暂时不可用。")}</div>}
                         {studyBlocked && visibleChoices.length > 0 && visibleChoices.every(isStudyChoice) && (
                           <button type="button" onClick={onConfirm} className="w-full p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 font-bold hover:bg-amber-100">
                             {tr("跳过本次学习机会")}</button>
                         )}
                         {visibleChoices.length === 0 && (
                           <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-sm font-bold text-amber-700">
                             {tr("当前没有可用选项。")}<button type="button" onClick={onConfirm} className="ml-3 underline">{tr("继续")}</button>
                           </div>
                         )}
                      </div>
                    </div>
                  ) : (
                    <motion.div initial={reduceMotion ? false : { y: 4 }} animate={{ y: 0 }} transition={{ duration: 0.12 }}>
                      <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-3">{tr(formatStoryText(eventResult.choice.text))}</h2>
                      {resultDescText && (
                        <p className="text-slate-700 leading-relaxed text-base mb-4">
                          {tr(resultDescText)}
                        </p>
                      )}
                      {eventResult.diff.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-5" aria-label={tr("属性变化")}>
                           {eventResult.diff.map((d, i) => (
                             <span
                               key={i} className={`px-3.5 py-1.5 rounded-full text-xs font-black shadow-sm ${getDiffClass(d)}`}
                             >
                               {tr(d)}
                             </span>
                           ))}
                        </div>
                      )}
                      {canAutoContinue && autoContinueEnabled && <p className="text-xs text-slate-500 mb-2">{tr("片刻后自动继续。结果已记入手记。")}</p>}
                      {canAutoContinue && onToggleAutoContinue && <button type="button" onClick={onToggleAutoContinue} className="mb-4 text-xs text-indigo-600 underline">{tr(autoContinueEnabled ? '改为手动继续' : '恢复自动继续')}</button>}
                      <button
                        type="button"
                        onClick={() => {
                            playSound(eventResult.diff.length && eventResult.diff.every(isNegativeDiff) ? 'negative' : 'confirm');
                            onConfirm();
                        }} className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-lg hover:bg-black shadow-xl transition-all flex items-center justify-center gap-2"
                      >
                           {tr((state.chainedEvent || eventResult.choice.nextEventId) ? '继续' : '确认结果')} <i className="fas fa-arrow-right text-slate-400"></i>
                           <kbd className="hidden md:inline-block ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/15 text-slate-300">Enter</kbd>
                      </button>
                    </motion.div>
                  )}
                  </div>
               </motion.div>
        </div>
    );
};
export default EventModal;
