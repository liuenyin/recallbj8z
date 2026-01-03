
import React from 'react';
import { GameEvent, EventChoice, GameState } from '../types';

interface EventModalProps {
    event: GameEvent;
    state: GameState;
    eventResult: { choice: EventChoice, diff: string[] } | null;
    onChoice: (choice: EventChoice, e: React.MouseEvent) => void;
    onConfirm: () => void;
}

const EventModal: React.FC<EventModalProps> = ({ event, state, eventResult, onChoice, onConfirm }) => {
    return (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 z-20 animate-fadeIn">
               <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-w-xl w-full border border-slate-200 max-h-[85vh] overflow-y-auto custom-scroll">
                  {!eventResult ? (
                    <>
                      <div className="flex justify-between items-start mb-4">
                          <h2 className="text-xl md:text-2xl font-black text-slate-800">{event.title}</h2>
                          {state.eventQueue.length > 0 && <span className="bg-rose-100 text-rose-600 text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap">+{state.eventQueue.length} 更多</span>}
                      </div>
                      <p className="text-slate-600 mb-8 text-base md:text-lg leading-relaxed">
                          {typeof event.description === 'function' 
                            ? event.description(state) 
                            : event.description}
                      </p>
                      <div className="space-y-3">
                         {event.choices?.map((c, i) => (
                           <button key={i} onClick={(e) => onChoice(c, e)} className="w-full text-left p-4 rounded-2xl bg-slate-50 hover:bg-indigo-600 hover:text-white border border-slate-200 transition-all font-bold group flex justify-between items-center active:scale-95">
                              {c.text}
                              <i className="fas fa-chevron-right opacity-0 group-hover:opacity-100 transition-all"></i>
                           </button>
                         ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl"><i className="fas fa-check"></i></div>
                      <h2 className="text-xl font-black text-slate-800 mb-2 italic">"{eventResult.choice.text}"</h2>
                      {eventResult.diff.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2 mb-8 mt-4">
                           {eventResult.diff.map((d, i) => (
                             <span key={i} className={`px-3 py-1 rounded-full text-xs font-bold ${d.includes('+') ? 'bg-emerald-50 text-emerald-700' : d.includes('-') ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'}`}>{d}</span>
                           ))}
                        </div>
                      )}
                      <button onClick={onConfirm} className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-lg hover:bg-indigo-700 shadow-xl active:scale-95 transition-transform">
                           {(state.chainedEvent || eventResult.choice.nextEventId) ? '继续...' : '确认结果'}
                      </button>
                    </div>
                  )}
               </div>
            </div>
    );
};
export default EventModal;
