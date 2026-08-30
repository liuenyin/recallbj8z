
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameEvent, EventChoice, GameState } from '../types';
import { isStudyBlocked } from '../data/utils';

interface EventModalProps {
    event: GameEvent;
    state: GameState;
    eventResult: { choice: EventChoice, diff: string[] } | null;
    onChoice: (choice: EventChoice, e: React.MouseEvent) => void;
    onConfirm: () => void;
}

const EventModal: React.FC<EventModalProps> = ({ event, state, eventResult, onChoice, onConfirm }) => {
    const formatStoryText = (text: string) => text.replace(/\bTA\b/g, state.flags.relationship_name || 'TA');
    const getDiffClass = (diff: string) => {
        if (diff.startsWith('疲劳 ')) {
            return diff.includes('+')
                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                : 'bg-emerald-50 text-emerald-600 border border-emerald-100';
        }
        if (diff.startsWith('兴奋 ')) {
            return diff.includes('+')
                ? 'bg-orange-50 text-orange-600 border border-orange-100'
                : 'bg-amber-50 text-amber-600 border border-amber-100';
        }
        return diff.includes('+')
            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
            : diff.includes('-')
                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                : 'bg-blue-50 text-blue-600 border border-blue-100';
    };
    // Filter choices: Show if no condition OR condition is met
    const visibleChoices = event.choices?.filter(c => !c.condition || c.condition(state)) || [];
    const studyBlocked = isStudyBlocked(state);

    return (
        <AnimatePresence mode="wait">
        <motion.div 
            key={event.id + (eventResult ? '-result' : '')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 md:p-8 z-20"
        >
               <motion.div 
                  initial={{ scale: 0.9, y: 20, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl p-6 md:p-10 max-w-xl w-full border border-white/50 max-h-[85vh] overflow-y-auto custom-scroll"
               >
                  {!eventResult ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                      <div className="flex justify-between items-start mb-6">
                          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">{event.title}</h2>
                          {state.eventQueue.length > 0 && <span className="bg-rose-100/80 backdrop-blur text-rose-600 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap shadow-sm">+{state.eventQueue.length} 更多</span>}
                      </div>
                      <p className="text-slate-700 mb-8 text-base md:text-lg leading-relaxed font-medium">
                          {formatStoryText(typeof event.description === 'function'
                            ? event.description(state) 
                            : event.description)}
                      </p>
                      <div className="space-y-3">
                         {visibleChoices.map((c, i) => {
                           const isStudyChoice = (c.tags || []).includes('study') || /学习|刷题|复习|通宵|熬夜|集训|肝|认真听/.test(c.text);
                           const disabled = studyBlocked && isStudyChoice;
                           return (
                           <motion.button 
                             whileHover={{ scale: 1.02 }}
                             whileTap={{ scale: 0.98 }}
                             key={i} disabled={disabled} onClick={(e: any) => onChoice(c, e)}
                             title={disabled ? '极限难度：当前心态或疲劳状态不允许学习' : undefined}
                             className={`w-full text-left p-4 rounded-2xl border transition-all font-bold group flex justify-between items-center shadow-sm ${disabled ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : c.text.includes('【睡神】') ? 'bg-indigo-50/80 border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white hover:shadow-indigo-200/50 hover:shadow-lg' : 'bg-white/60 border-white/50 text-slate-800 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 hover:shadow-indigo-200/50 hover:shadow-lg'}`}
                           >
                              {formatStoryText(c.text)}
                              {disabled ? <span className="text-[10px] font-bold">暂不可用</span> : <i className="fas fa-chevron-right opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0"></i>}
                           </motion.button>
                           );
                         })}
                         {studyBlocked && <div className="text-xs font-bold text-rose-500 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">极限难度：心态低于 20 或疲劳超过 90，学习选项暂时不可用。</div>}
                         {visibleChoices.length === 0 && (
                           <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-sm font-bold text-amber-700">
                             当前没有可用选项，已跳过此事件。
                             <button type="button" onClick={onConfirm} className="ml-3 underline">继续</button>
                           </div>
                         )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
                      <motion.div 
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner border-4 border-white"
                      >
                        <i className="fas fa-check"></i>
                      </motion.div>
                      <h2 className="text-2xl font-black text-slate-800 mb-3 italic">"{formatStoryText(eventResult.choice.text)}"</h2>
                      {eventResult.choice.resultDescription && (
                        <p className="text-slate-600 leading-relaxed text-sm md:text-base max-w-lg mx-auto mb-5">
                          {formatStoryText(eventResult.choice.resultDescription)}
                        </p>
                      )}
                      {eventResult.diff.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2 mb-10 mt-6">
                           {eventResult.diff.map((d, i) => (
                             <motion.span 
                               initial={{ opacity: 0, y: 10 }}
                               animate={{ opacity: 1, y: 0 }}
                               transition={{ delay: i * 0.1 }}
                               key={i} className={`px-4 py-2 rounded-full text-xs font-black shadow-sm ${getDiffClass(d)}`}
                             >
                               {d}
                             </motion.span>
                           ))}
                        </div>
                      )}
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onConfirm} className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-lg hover:bg-black shadow-xl transition-all flex items-center justify-center gap-2"
                      >
                           {(state.chainedEvent || eventResult.choice.nextEventId) ? '继续...' : '确认结果'} <i className="fas fa-arrow-right text-slate-400"></i>
                      </motion.button>
                    </motion.div>
                  )}
               </motion.div>
            </motion.div>
            </AnimatePresence>
    );
};
export default EventModal;
