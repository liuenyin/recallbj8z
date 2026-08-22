import React, { useMemo } from 'react';
import { GameState } from '../types';

interface EndingViewProps {
  state: GameState;
}

const EndingView: React.FC<EndingViewProps> = ({ state }) => {

  const { rank, title, message, details } = useMemo(() => {
    // Calculate score from subject levels (main academic measure)
    const subjectAvg = (Object.values(state.subjects) as Array<{ level: number }>).reduce((sum, s) => sum + s.level, 0) / Object.keys(state.subjects).length;
    // Combine with general stats
    let score = subjectAvg * 1.5 + state.general.experience * 0.3 + state.general.efficiency * 0.4;
    // Exam performance bonus
    if (state.examResult?.totalScore) score += state.examResult.totalScore / 20;
    // Clamp to 0-100 range
    score = Math.min(100, Math.max(0, score));

    let noiMedal = state.flags.noi_medal;
    let provincialTeam = state.flags.provincial_team;

    let r = 'C';
    let t = '普通高中生';
    let msg = '高一学年结束了。你的成绩中规中矩，没有太多的波澜。';

    if (state.general.health <= 0) {
      r = '☠️';
      t = '英年早逝';
      msg = '因为过度的压力和劳累，你的身体彻底垮掉了。你的高中生活以一种悲剧的方式提前画上了句号...请牢记，身体才是革命的本钱。';
    } else if (noiMedal === 'GOLD') {
      r = 'SSS';
      t = '清北保送生（OI 国集）';
      msg = '你在最高荣誉殿堂 NOI 中斩获金牌！一举保送清华北大，不仅如此，你的传说将在八中流传。高中的剩下的两年对你来说只是放假！';
    } else if (noiMedal === 'SILVER') {
      r = 'SS';
      t = '强基破格入围者（OI 银牌）';
      msg = '你在 NOI 中斩获银牌。虽然未能直接保送，但清华北大的强基计划已经向你敞开大门，前途一片光明。';
    } else if (noiMedal === 'BRONZE' || provincialTeam) {
      r = 'S';
      t = '省队巨佬';
      msg = '你能冲入省队，已经在八中的历史上留下了浓墨重彩的一笔。文化课对你来说也绝不是问题。';
    } else if (score >= 90) {
      r = 'S';
      t = '年级学神';
      msg = '凭借着不可思议的学识与思维，你毫无悬念地制霸了年级榜单。高考状元，非你莫属。';
    } else if (score >= 75) {
      r = 'A';
      t = '尖子生';
      msg = '你是老师眼中的好学生，家长口中的“别人家的孩子”。985/211 对你来说如同探囊取物。';
    } else if (score >= 60) {
      r = 'B';
      t = '中上流砥柱';
      msg = '你稳扎稳打，成绩处于年级中上游，只要高二高三不松懈，一本重点大学稳操胜券。';
    } else if (score >= 40) {
      r = 'C';
      t = '芸芸众生';
      msg = '高一学年结束了。你的成绩中规中矩，不过青春不只有分数，或许你在别的地方找到了自己的价值。';
    } else if (score >= 20) {
      r = 'D';
      t = '学业危机';
      msg = '你在高一的学业似乎遇到了很大的麻烦。如果不加倍努力，未来的高考之路将布满荆棘。';
    } else {
      r = 'Z';
      t = '家里蹲预备役';
      msg = '这一年你彻底放飞了自我。成绩惨不忍睹，或许你该考虑一下重开了...';
    }

    if (state.general.romance > 80 && r !== 'Z') {
      msg += ' 此外，你这一年的桃花运非常旺盛，校园生活可谓充实且甜蜜。';
    }

    const d = [
      { label: '心态', value: Math.round(state.general.mindset) },
      { label: '经验', value: Math.round(state.general.experience) },
      { label: '效率', value: Math.round(state.general.efficiency) },
      { label: '幸运', value: Math.round(state.general.luck) },
      { label: '桃花运', value: Math.round(state.general.romance) },
    ];

    return { rank: r, title: t, message: msg, details: d };
  }, [state]);

  const handleRestart = () => {
    // 强制重置
    localStorage.removeItem('recall_save_v1');
    window.location.reload();
  };

  return (
    <div className="absolute inset-0 z-50 bg-gray-900 bg-opacity-95 flex items-center justify-center p-6 backdrop-blur-md">
      <div className="bg-white/10 p-8 rounded-3xl border border-white/20 shadow-2xl max-w-2xl w-full text-center text-white relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-500/30 rounded-full blur-[100px] pointer-events-none"></div>

        <h1 className="text-4xl font-bold mb-2 tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300">
          第一学年 总结报告
        </h1>
        <p className="text-gray-300 mb-8 italic">前面的路，以后再来探索吧...</p>

        <div className="flex flex-col md:flex-row items-center justify-center gap-10 mb-8">
          <div className="relative">
            <div className={`text-8xl font-black drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] ${
              ['SSS', 'SS', 'S'].includes(rank) ? 'text-yellow-400' :
              ['A', 'B'].includes(rank) ? 'text-blue-400' :
              ['C', 'D'].includes(rank) ? 'text-green-400' : 'text-red-500'
            }`}>
              {rank}
            </div>
            <div className="text-xl font-semibold mt-2 text-white/80">{title}</div>
          </div>

          <div className="flex-1 bg-black/40 p-5 rounded-2xl border border-white/10">
            <h3 className="text-lg font-bold mb-3 border-b border-white/10 pb-2">核心属性最终结算</h3>
            <div className="space-y-2">
              {details.map(d => (
                <div key={d.label} className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">{d.label}</span>
                  <div className="flex-1 mx-3 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-400" 
                      style={{ width: `${Math.min(100, Math.max(0, d.value))}%` }}
                    ></div>
                  </div>
                  <span className="font-mono">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-blue-900/40 border border-blue-400/30 p-5 rounded-2xl mb-8 text-left">
          <p className="text-lg leading-relaxed">{message}</p>
        </div>

        <button 
          onClick={handleRestart}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-full font-bold text-lg shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all transform hover:scale-105 active:scale-95"
        >
          重新开始，探索别的可能
        </button>
      </div>
    </div>
  );
};

export default EndingView;
