import { useLanguage } from '../lib/i18n';

import React from 'react';
import { GameState, SUBJECT_NAMES, SubjectKey } from '../types';
import { getEffectiveEfficiency } from '../data/utils';
import { getPhaseLabel } from '../data/game_flow';
import { getRelationshipStage } from '../data/relationships';

interface StatsPanelProps {
  state: GameState;
  onShowGuide?: () => void;
  onShowContestHistory?: () => void;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ state, onShowGuide, onShowContestHistory }) => {
    const { language, t: tr } = useLanguage();
  const effectiveEfficiency = getEffectiveEfficiency(state);
  const hideDetails = state.difficulty === 'REALITY';
  const hasMetRelationshipPeer = Boolean(state.romancePartner) || state.flags.romance_met === true
    || !!state.flags.romance_resolution || !!state.flags.ready_for_confession;

  // Restore May-era cognitive bias & experience-based self-perception with critical safety floors for survival stats
  const getFuzzyDesc = (
    val: number,
    type: 'general' | 'efficiency',
    seedKey: number,
    options?: { criticalFloor?: number }
  ) => {
    const bias = (state.general.mindset - 50) * 0.2;
    const noiseRange = Math.max(5, (35 - state.general.experience) * 0.5);
    const pseudoRandom = Math.sin((state.week + 1) * seedKey * 123.45);
    let perceivedVal = val + bias + pseudoRandom * noiseRange;
    if (options?.criticalFloor !== undefined && val <= options.criticalFloor) {
      perceivedVal = Math.min(perceivedVal, 19);
    }

    if (type === 'efficiency') {
      if (perceivedVal < 0) return { t: '极度涣散', c: 'text-rose-500' };
      if (perceivedVal < 5) return { t: '心不在焉', c: 'text-orange-500' };
      if (perceivedVal < 10) return { t: '普普通通', c: 'text-slate-500' };
      if (perceivedVal < 15) return { t: '专注', c: 'text-indigo-500' };
      if (perceivedVal < 25) return { t: '高效', c: 'text-emerald-500' };
      return { t: '心流', c: 'text-amber-500 font-black' };
    }

    if (perceivedVal < 20) return { t: '糟糕透顶', c: 'text-rose-600' };
    if (perceivedVal < 40) return { t: '不太妙', c: 'text-orange-500' };
    if (perceivedVal < 60) return { t: '平平无奇', c: 'text-slate-500' };
    if (perceivedVal < 80) return { t: '感觉良好', c: 'text-emerald-600' };
    if (perceivedVal < 100) return { t: '充满自信', c: 'text-indigo-600' };
    return { t: '超凡脱俗', c: 'text-amber-500 font-black' };
  };

  const getFatigueDesc = (fatigue: number) => {
    if (fatigue >= 85) return { t: '精疲力竭', c: 'text-rose-600 font-black' };
    const bias = (50 - state.general.mindset) * 0.18;
    const noiseRange = Math.max(4, (35 - state.general.experience) * 0.35);
    const pseudoRandom = Math.sin((state.week + 1) * 19.37);
    const perceived = Math.min(84, fatigue + bias + pseudoRandom * noiseRange);
    if (perceived < 20) return { t: '精力充沛', c: 'text-emerald-600' };
    if (perceived < 45) return { t: '尚可支撑', c: 'text-slate-500' };
    if (perceived < 70) return { t: '有些疲惫', c: 'text-amber-600' };
    return { t: '明显透支', c: 'text-orange-600' };
  };

  const getSubjectDesc = (stats: { aptitude: number; level: number }, idx: number) => {
    const aptitudeBias = (stats.aptitude - 50) * 0.2;
    const bias = (state.general.mindset - 50) * 0.3 + aptitudeBias;
    const noiseRange = Math.max(5, (80 - state.general.experience) * 0.4);
    const pseudoRandom = Math.cos((state.week + 1) * (idx + 1) * 67.89);
    const perceivedVal = stats.level + bias + pseudoRandom * noiseRange;

    if (perceivedVal < 10) return { t: '一窍不通', c: 'text-rose-500' };
    if (perceivedVal < 25) return { t: '略懂皮毛', c: 'text-orange-500' };
    if (perceivedVal < 45) return { t: '马马虎虎', c: 'text-slate-500' };
    if (perceivedVal < 65) return { t: '渐入佳境', c: 'text-indigo-500' };
    if (perceivedVal < 85) return { t: '得心应手', c: 'text-emerald-600' };
    return { t: '登峰造极', c: 'text-amber-500 font-black' };
  };

  const getOIFuzzyLabel = (val: number) => {
    if (val >= 25) return '顶尖';
    if (val >= 14) return '扎实';
    if (val >= 6) return '熟练';
    return '入门';
  };
  const oiRouteLabel = state.flags.oi_setter_followup === 'accepted'
    ? '继续参与公开赛出题'
    : state.flags.oi_problem_feedback === 'positive' || state.flags.oi_problem_feedback === 'resolved'
      ? '完成了一次公开赛出题'
      : state.flags.oi_problem_published
        ? '题目已经上线，等待反馈'
          : state.flags.oi_problem_drafted
            ? '题面已经写完，正在验题'
          : state.flags.oi_recap_reviewed === true
            ? '按游记补过错题'
            : state.flags.oi_setter === true
          ? '正在准备第一道题'
          : state.flags.oi_external_training
            ? '参加过外校集训'
            : state.flags.oi_training_group === true
              ? '加入了训练小组'
              : state.flags.oi_training_group === false
                ? '暂时独自刷题'
                : '还在找适合自己的节奏';

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-5 space-y-6 h-full border border-white/40 overflow-y-auto custom-scroll flex flex-col transition-colors duration-300">
      {/* 状态概览 */}
      {state.phase === 'SEMESTER_1' && state.flags.class_board_started && !state.flags.class_board_finished && (
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800">
          <div className="font-bold mb-1">{tr("最近的小事 · 班级板报")}</div>
          <p>{tr("第 ")}{Math.max(6, Number(state.flags.class_board_start_week ?? 5) + 1)} {tr("周交稿，记得和同学碰个面。")}</p>
        </div>
      )}
      {/* 长期课题进度 */}
      {state.activeProjects.length > 0 && (
        <div className="space-y-2">
          {state.activeProjects.map(project => (
            <div key={project.id} className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
              <div className="flex justify-between items-center font-bold mb-1">
                <span className="truncate"><i className="fas fa-tasks mr-1.5 text-amber-600" />{tr(project.title)}</span>
                <span className="shrink-0 ml-2">{project.progress} / {project.requiredProgress}</span>
              </div>
              <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden mb-1.5">
                <div className="h-full bg-amber-500 transition-all" style={{ width: `${Math.min(100, (project.progress / project.requiredProgress) * 100)}%` }} />
              </div>
              <p className="text-[10px] text-amber-700">{tr(getPhaseLabel(project.deadlinePhase))} {tr("第 ")}{project.deadlineWeek} {tr("周截止")}</p>
            </div>
          ))}
        </div>
      )}
      <div>
        <div className="flex justify-between items-center mb-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-user-circle"></i> {tr(hideDetails ? "自我认知" : "个人档案")}</h3>
              {onShowGuide && (
                <button type="button" onClick={onShowGuide} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1" title={tr("查看难度与状态说明")}>
                  <i className="fas fa-book-reader" /> {tr("说明")}</button>
              )}
            </div>
            {state.isAiGenerating && (
                 <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold border border-indigo-100 animate-pulse">
                     <i className="fas fa-robot"></i> {tr("正在生成事件...")}</div>
            )}
        </div>
      </div>

      {hasMetRelationshipPeer && (
          <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-black text-rose-800 flex items-center gap-2">
                <i className="fas fa-user-friends"></i> {tr("重要同学")}</span>
              <span className="text-[10px] font-bold text-rose-500">{tr(getRelationshipStage(state))}</span>
            </div>
            <div className="text-sm font-black text-slate-800">{language === 'zh' ? 'TA' : 'Your classmate'}</div>
          </div>
      )}

      {/* 学业背景 */}
      <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
        <div className="flex justify-between items-center gap-2 mb-2">
          <span className="text-xs font-bold text-indigo-800 min-w-0 truncate" title={`${tr("班级: ")}${tr(state.className || '待分班')}`}>{tr("班级: ")}{tr(state.className || '待分班')}</span>
          {hideDetails ? (
            <span className={`text-xs font-bold shrink-0 whitespace-nowrap ${getFuzzyDesc(effectiveEfficiency, 'efficiency', 7).c}`}>
              {tr("状态: ")}{tr(getFuzzyDesc(effectiveEfficiency, 'efficiency', 7).t)}
            </span>
          ) : (
            <span className="text-xs font-bold text-indigo-800 shrink-0 whitespace-nowrap">
                {tr("效率: ")}{effectiveEfficiency.toFixed(1)}
                {effectiveEfficiency > state.general.efficiency && <span className="text-emerald-600 text-[10px] ml-1">(+{ tr((effectiveEfficiency - state.general.efficiency).toFixed(0)) })</span>}
            </span>
          )}
        </div>
        {!hideDetails && (
          <div className="h-1.5 bg-indigo-200 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600" style={{ width: `${Math.min(100, effectiveEfficiency / 30 * 100)}%` }}></div>
          </div>
        )}
        {state.competition === 'OI' && (
          <div className="mt-2 text-[10px] font-bold text-indigo-600 truncate" title={tr(oiRouteLabel)}>
            {tr("OI 路线 · ")}{tr(oiRouteLabel)}
          </div>
        )}
      </div>

      {/* 基础属性 */}
      <div>
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <i className="fas fa-chart-bar"></i> {tr("身心状态")}</h3>
        <div className="grid grid-cols-4 gap-1.5">
            {hideDetails ? (
              <>
                <StatText icon="fa-brain" label="心态" fuzzy={getFuzzyDesc(state.general.mindset, 'general', 1, { criticalFloor: 20 })} />
                <StatText icon="fa-heartbeat" label="健康" fuzzy={getFuzzyDesc(state.general.health, 'general', 2, { criticalFloor: 18 })} />
                <StatMini icon="fa-coins" label="金钱" value={state.general.money} color={state.general.money < 0 ? 'text-rose-500' : 'text-yellow-600'} />
                <StatText icon="fa-book" label="经验" fuzzy={getFuzzyDesc(state.general.experience, 'general', 3)} />
                <StatText icon="fa-star" label="幸运" fuzzy={getFuzzyDesc(state.general.luck, 'general', 4)} />
                <StatText icon="fa-heart" label="桃花" fuzzy={getFuzzyDesc(state.general.romance, 'general', 5)} />
                <StatText icon="fa-battery-quarter" label="疲劳" fuzzy={getFatigueDesc(state.fatigue)} />
                <StatText icon="fa-fire" label="兴奋" fuzzy={getFuzzyDesc(state.general.excitement ?? 0, 'general', 6)} />
              </>
            ) : (
              <>
                <StatMini icon="fa-brain" label="心态" value={state.general.mindset} color={state.general.mindset <= 25 ? 'text-rose-500' : 'text-indigo-500'} />
                <StatMini icon="fa-heartbeat" label="健康" value={state.general.health} color={state.general.health <= 30 ? 'text-rose-500' : 'text-emerald-500'} />
                <StatMini icon="fa-coins" label="金钱" value={state.general.money} color={state.general.money < 0 ? 'text-rose-500' : 'text-yellow-600'} />
                <StatMini icon="fa-book" label="经验" value={state.general.experience} color="text-blue-500" />
                <StatMini icon="fa-star" label="幸运" value={state.general.luck} color="text-amber-500" />
                <StatMini icon="fa-heart" label="桃花" value={state.general.romance} color="text-pink-500" />
                <StatMini icon="fa-battery-quarter" label="疲劳" value={state.fatigue} color={state.fatigue >= 75 ? 'text-rose-500' : state.fatigue >= 50 ? 'text-amber-500' : 'text-emerald-500'} />
                <StatMini icon="fa-fire" label="兴奋" value={state.general.excitement ?? 0} color="text-orange-500" />
              </>
            )}
        </div>
      </div>

       {/* 天赋展示 */}
      {state.talents.length > 0 && (
           <div>
               <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                   <i className="fas fa-dna"></i> {tr("天赋")}</h3>
               <div className="flex flex-wrap gap-2">
                   {state.talents.map(t => (
                       <div key={t.id} className={`px-2 py-1 rounded text-[10px] font-bold border ${t.rarity === 'legendary' ? 'bg-amber-50 border-amber-300 text-amber-700' : t.rarity === 'rare' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : t.rarity === 'cursed' ? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-600'}`} title={tr(t.description)}>
                           {tr(t.name)}
                       </div>
                   ))}
               </div>
           </div>
      )}

      {state.competition === 'OI' && (
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <i className="fas fa-code"></i> {tr("OI 能力")}</h3>
            <button
              type="button"
              onClick={onShowContestHistory}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 disabled:text-slate-300"
              disabled={!onShowContestHistory}
            >
              {tr("竞赛履历")}</button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {([
              ['dp', 'DP'], ['ds', '数据结构'], ['math', '数学'],
              ['string', '字符串'], ['graph', '图论'], ['misc', '综合']
            ] as const).map(([key, label]) => (
              <div key={key} className="rounded-lg bg-white border border-slate-100 px-1.5 py-1.5 text-center">
                <div className="text-[9px] text-slate-500 truncate" title={tr(label)}>{tr(label)}</div>
                <div className="text-xs font-black text-indigo-600">{tr(hideDetails ? getOIFuzzyLabel(state.oiStats[key]) : Math.round(state.oiStats[key]))}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between items-center text-[10px] font-bold text-slate-500">
            <span>{tr("当前 Rating")}</span>
            <span className="text-indigo-600">{tr(hideDetails ? '不公开' : (state.oiStats.rating ?? 1200))}</span>
          </div>
        </div>
      )}

      {/* 学科属性 */}
      <div className="flex-1 pb-4">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <i className="fas fa-graduation-cap"></i> {tr(hideDetails ? "学术评估" : "学科能力")}</h3>
        <div className="grid grid-cols-1 gap-3">
          {(Object.keys(state.subjects) as SubjectKey[]).map((key, idx) => {
             const isSelected = state.selectedSubjects.includes(key);
             const fuzzy = getSubjectDesc(state.subjects[key], idx);
             return (
                <div key={key} className="group">
                  <div className="flex justify-between text-[11px] mb-1">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">{tr(SUBJECT_NAMES[key])}</span>
                        {isSelected && <span className="bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded text-[9px] font-bold">{tr("选考")}</span>}
                    </div>
                    {hideDetails ? (
                      <span className={`font-medium ${fuzzy.c}`}>{tr(fuzzy.t)}</span>
                    ) : (
                      <span className="text-slate-500">{tr(`天赋 ${state.subjects[key].aptitude} | 水平 ${state.subjects[key].level.toFixed(1)}`)}</span>
                    )}
                  </div>
                  {!hideDetails && (
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                         className="h-full bg-indigo-500 group-hover:bg-indigo-400 transition-all duration-700"
                         style={{ width: `${Math.min(100, state.subjects[key].level)}%` }}
                      />
                    </div>
                  )}
                </div>
             );
          })}
        </div>
      </div>
    </div>
  );
};

const StatMini = ({ icon, label, value, color }: { icon: string, label: string, value: number, color: string }) => {
  const { t: tr } = useLanguage();
  return (
    <div className="bg-slate-50 rounded-lg p-2 flex flex-col items-center justify-center border border-slate-100 hover:border-indigo-200 transition-colors">
      <i className={`fas ${icon} ${color} text-sm mb-1`}></i>
      <span className="text-[10px] text-slate-500">{tr(label)}</span>
      <span className={`text-xs font-bold ${color}`}>{label === '金钱' ? Number(value.toFixed(2)) : value.toFixed(0)}</span>
    </div>
  );
};

const StatText = ({ icon, label, fuzzy }: { icon: string, label: string, fuzzy: { t: string, c: string } }) => {
  const { t: tr } = useLanguage();
  return (
    <div className="bg-slate-50 rounded-lg p-2 flex flex-col items-center justify-center border border-slate-100 hover:border-indigo-200 transition-colors min-h-[60px]">
      <i className={`fas ${icon} text-slate-400 text-xs mb-1`}></i>
      <span className="text-[10px] text-slate-500">{tr(label)}</span>
      <span className={`text-[10px] font-bold text-center leading-tight ${fuzzy.c}`}>{tr(fuzzy.t)}</span>
    </div>
  );
};

export default StatsPanel;
