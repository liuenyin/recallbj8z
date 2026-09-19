import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const executablePath = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/chromium', '/usr/bin/google-chrome'
].find(existsSync);
const browser = await puppeteer.launch({executablePath,headless:true});
const scenarios = [
  {name:'academic-science',route:'None',difficulty:'NORMAL',seed:11},
  {name:'academic-humanities',route:'None',difficulty:'NORMAL',seed:22,humanities:true,alternate:true},
  {name:'academic-hard',route:'None',difficulty:'HARD',seed:33},
  {name:'academic-reality',route:'None',difficulty:'REALITY',seed:44},
  {name:'academic-hell',route:'None',difficulty:'HELL',seed:55},
  {name:'oi-cooperate',route:'OI',difficulty:'NORMAL',seed:66},
  {name:'oi-independent',route:'OI',difficulty:'NORMAL',seed:77,alternate:true},
  {name:'mo-cooperate',route:'MO',difficulty:'NORMAL',seed:88},
  {name:'mo-risky',route:'MO',difficulty:'NORMAL',seed:99,alternate:true},
  {name:'romance',route:'None',difficulty:'NORMAL',seed:111,romance:true},
  {name:'sleep-challenge',route:'None',difficulty:'REALITY',seed:122,challenge:'c_sleep_king'},
  {name:'sleep-challenge-fail',route:'None',difficulty:'REALITY',seed:133,challenge:'c_sleep_king',fail:true},
  {name:'debt-challenge',route:'None',difficulty:'REALITY',seed:144,challenge:'c_debt_king'}
  ,...['rap','dance','volleyball','vocaloid','poetry','social_science','mun','touhou','astronomy','math_research','ttrpg','literature','otaku','anime','human_behavior'].map((club,i)=>({name:'club-'+club,club,route:'None',difficulty:'NORMAL',seed:200+i})),
  {name:'oi-rough-repair',route:'OI',difficulty:'NORMAL',seed:301,choices:{oi_problem_draft:1,oi_problem_testing:1}},
  {name:'oi-rough-defend',route:'OI',difficulty:'NORMAL',seed:302,choices:{oi_problem_draft:1,oi_problem_testing:1,oi_problem_feedback:1}},
  {name:'mo-rough',route:'MO',difficulty:'NORMAL',seed:303,choices:{mo_setter_review:1}},
  {name:'mo-medal',route:'MO',difficulty:'NORMAL',seed:304,club:'math_research',talents:['lucky_dog','healthy','optimist']}
].filter(s => !process.env.ROUTE || s.name === process.env.ROUTE);
const reports = [];
mkdirSync('artifacts',{recursive:true});
try {
  for (const scenario of scenarios) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(process.env.SMOKE_URL || 'http://127.0.0.1:3000/',{waitUntil:'networkidle0'});
    const report = await page.evaluate(async config => {
      const {default:React} = await import('/node_modules/.vite/deps/react.js');
      const {default:{createRoot}} = await import('/node_modules/.vite/deps/react-dom_client.js');
      const {default:{flushSync}} = await import('/node_modules/.vite/deps/react-dom.js');
      const {useGameLogic} = await import('/hooks/useGameLogic.ts');
      const {default:ExamView} = await import('/components/ExamView.tsx');
      const {default:EndingScreen} = await import('/components/EndingScreen.tsx');
      const {default:EventModal} = await import('/components/EventModal.tsx');
      const {isExamPhase,getSubjectReselectionReturnPhase} = await import('/data/game_flow.ts');
      const {isStudyChoice,isStudyBlocked,getWeekendActivityUpdates,clampGameStateMetrics,getActivityBlockReason,isLearningActivity} = await import('/data/utils.ts');
      const {SCHEDULE_SLOTS,ALLOWED_SLOTS_MAP,BLOCKED_SLOTS_MAP} = await import('/data/timetable.ts');
      const {IRREGULAR_CHALLENGES} = await import('/data/challenges.ts');
      const {getEndingData} = await import('/data/ending.ts');
      const {TALENTS} = await import('/data/mechanics.ts');
      const nativeTimeout = window.setTimeout;
      const wait = () => new Promise(resolve=>nativeTimeout(resolve,5));
      window.setTimeout = (fn,delay,...args)=>nativeTimeout(fn,delay === 1000 || delay === 800 ? 5 : delay,...args);
      let seed = config.seed;
      Math.random = () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
      let game;
      const host = document.body.appendChild(document.createElement('div'));
      const root = createRoot(host);
      function Harness() {
        game = useGameLogic(undefined,config.name);
        const s=game.state;
        if (s.currentEvent) return React.createElement(EventModal,{event:s.currentEvent,state:s,eventResult:s.eventResult,
          autoContinueEnabled:false,onChoice:choice=>game.handleChoice(choice),onConfirm:game.handleEventConfirm});
        if (isExamPhase(s.phase) && !s.popupExamResult) return React.createElement(ExamView,{key:s.phase+':'+s.week,
          title:s.phase,state:s,onFinish:game.handleExamFinish});
        return null;
      }
      flushSync(()=>root.render(React.createElement(Harness)));
      await wait();
      const talents = config.difficulty === 'HELL' ? TALENTS.filter(t=>t.id==='loner') : TALENTS.filter(t=>(config.talents||['genius']).includes(t.id));
      flushSync(()=>game.startGameState(config.difficulty,{},talents,IRREGULAR_CHALLENGES.find(c=>c.id===config.challenge)));
      const timeline=[], exams=[], failures=[], seen=new Set();
      const visitedChoices=[], activityCounts={};
      let idle=0, lastSignature='', steps=0, fullYear=false;
      function score(before,update) {
        const after={...before,...update};
        let value=0;
        for (const [key,weight] of Object.entries({health:before.general.health<65?9:0.3,mindset:before.general.mindset<35?3:0.12,
          efficiency:0.7,money:before.general.money<0?0.8:0.1,experience:0.1,romance:config.romance?2:0.05})) {
          value += ((after.general?.[key]??before.general[key])-before.general[key])*weight;
        }
        value -= ((after.fatigue??before.fatigue)-before.fatigue)*(before.fatigue>55?1.5:0.15);
        for (const key of Object.keys(before.subjects)) value += ((after.subjects?.[key]?.level??before.subjects[key].level)-before.subjects[key].level)*(config.route==='MO'&&key==='math'?6:0.2);
        for (const key of ['dp','ds','math','string','graph','misc']) value += ((after.oiStats?.[key]??before.oiStats[key])-before.oiStats[key])*(config.route==='OI'?4:0);
        if (update.phase==='WITHDRAWAL') value-=10000;
        return value;
      }
      function probe(fn,s) {
        const random=Math.random;
        try { Math.random=()=>0.5; return fn({...s,general:{...s.general},subjects:Object.fromEntries(Object.entries(s.subjects).map(([k,v])=>[k,{...v}])),flags:{...s.flags},oiStats:{...s.oiStats},log:[...s.log]}); }
        finally { Math.random=random; }
      }
      try {
        for (;steps<8000;steps++) {
          const s=game.state;
          const key=s.phase+':'+s.week;
          if (!seen.has(key)) {seen.add(key);timeline.push({phase:s.phase,week:s.week,health:s.general.health,mindset:s.general.mindset,fatigue:s.fatigue});}
          if (s.phase==='SUMMER_BREAK' && s.week>=8) fullYear=true;
          for (const [key,value] of Object.entries(s.general)) if (!Number.isFinite(value)) throw new Error(`Nonfinite general.${key}`);
          if (s.phase==='ENDING'||s.phase==='WITHDRAWAL') break;
          const signature=key+':'+(s.currentEvent?.id||'')+':'+Boolean(s.eventResult)+':'+s.isWeekend+':'+Boolean(s.popupExamResult);
          idle=signature===lastSignature?idle+1:0;lastSignature=signature;
          if (idle>300) throw new Error('Stuck: '+signature);
          if (s.popupExamResult) {exams.push({phase:s.phase,week:s.week,total:s.popupExamResult.totalScore});flushSync(()=>game.closeExamResult());}
          else if (s.phase==='SELECTION'||s.phase==='SUBJECT_RESELECTION') {
            flushSync(()=>game.setState(prev=>({...prev,selectedSubjects:config.humanities?['history','geography','politics']:['physics','chemistry','biology'],
              phase:prev.phase==='SELECTION'?'PLACEMENT_EXAM':getSubjectReselectionReturnPhase(prev),
              week:prev.phase==='SUBJECT_RESELECTION'?Math.max(12,prev.week+1):prev.week,
              isPlaying:prev.phase==='SUBJECT_RESELECTION',totalWeeksInPhase:prev.phase==='SELECTION'?0:21,subjectReselectionReturnPhase:null})));
          } else if (s.currentEvent) {
            if (s.eventResult) flushSync(()=>game.handleEventConfirm());
            else {
              let choices=(s.currentEvent.choices||[]).filter(c=>(!c.condition||c.condition(s))&&!(isStudyChoice(c)&&isStudyBlocked(s)));
              if (config.fail) choices=choices.filter(c=>! /睡|梦/.test(c.text));
              let choice = config.choices?.[s.currentEvent.id] === undefined ? undefined : choices[config.choices[s.currentEvent.id]];
              if (s.currentEvent.id==='sum_goal_selection') choice=choices.find(c=>config.route==='None'?c.text==='专注课内综合':c.text.includes('('+config.route+')'));
              if (config.challenge==='c_sleep_king'&&!config.fail&&!s.hasSleptThisWeek) choice=choices.find(c=>/睡|梦/.test(c.text))||choice;
              if (!choice && /^(oi_|mo_|rival_|romance_|s1_class_board|campus_.*return)/.test(s.currentEvent.id)) choice=choices[config.alternate?choices.length-1:0];
              if (!choice) choice=choices.map(c=>({c,value:score(s,probe(c.action,s))+(config.romance&&/表白|约|搭话/.test(c.text)?20:0)})).sort((a,b)=>b.value-a.value)[0]?.c;
              if (choice) {
                visitedChoices.push({phase:s.phase,week:s.week,id:s.currentEvent.id,title:s.currentEvent.title,choice:choice.text});
                flushSync(()=>game.handleChoice(choice));
              } else flushSync(()=>game.handleEventConfirm());
            }
          } else if (isExamPhase(s.phase)) {
            const button=[...host.querySelectorAll('button')].find(b=>b.textContent.includes('查看排名'));
            if (button) flushSync(()=>button.click());
          } else if (s.phase==='SEMESTER_1'&&s.week===2&&!s.hasSelectedClub) flushSync(()=>game.handleClubSelect(config.club||'none'));
          else if (s.isWeekend) {
            const schedule={},counts={},blocked=new Set();let simulated=s,studies=0;
            for (const slot of SCHEDULE_SLOTS) {
              if (blocked.has(slot.id)||s.flags.joined_evening_study&&['Mon','Tue','Wed','Thu','Fri'].includes(slot.day)) continue;
              const candidates=game.weekendOptions.filter(a=> (!a.condition||a.condition(simulated))&&!getActivityBlockReason(simulated,a)
                && (!ALLOWED_SLOTS_MAP[a.id]||ALLOWED_SLOTS_MAP[a.id].includes(slot.id))
                && (counts[a.id]||0)<({act_cf:1,w_cf:1,w_atc:1,w_game_late:1,w_game:2}[a.id]||3)
                && !(isLearningActivity(a)&&(isStudyBlocked(simulated)||config.difficulty==='HELL'&&studies>=1)));
              const rated=candidates.map(a=>({a,updates:probe(st=>getWeekendActivityUpdates(st,a,(counts[a.id]||0)+1,true),simulated)}))
                .map(r=>({...r,value:score(simulated,r.updates)+(aProject(r.a)?12:0)+(config.club&&r.a.id==='w_club_activity'?12:0)+(config.route==='OI'&&r.a.id==='act_cf'?8:0)}))
                .sort((a,b)=>b.value-a.value);
              const picked=config.challenge==='c_sleep_king'&&!config.fail&&!Object.values(schedule).includes('w_sleep')?rated.find(r=>r.a.id==='w_sleep')||rated[0]:rated[0];
              if (!picked) continue;
              if (config.fail&&picked.a.id==='w_sleep') continue;
              schedule[slot.id]=picked.a.id;activityCounts[picked.a.id]=(activityCounts[picked.a.id]||0)+1;counts[picked.a.id]=(counts[picked.a.id]||0)+1;
              if(isLearningActivity(picked.a))studies++;
              (BLOCKED_SLOTS_MAP[picked.a.id]||[]).forEach(id=>blocked.add(id));
              simulated=clampGameStateMetrics({...simulated,...picked.updates});
            }
            flushSync(()=>game.executeTimetable(schedule));
          } else if (!s.isPlaying) flushSync(()=>game.setState(prev=>({...prev,isPlaying:true})));
          await wait();
        }
      } catch(error) {failures.push(error.message);}
      function aProject(a){return a.id==='w_project_work';}
      const final=game.state;
      if (!config.fail&&!fullYear) failures.push('Expected a full year');
      if (config.club && (!activityCounts.w_club_activity || final.club!==config.club)) failures.push('Club route was not exercised');
      if (config.fail && !final.flags.sleep_challenge_failed) failures.push('Expected sleep challenge failure');
      const report={...config,steps,fullYear,phase:final.phase,week:final.week,failures,timeline,exams,visitedChoices,
        ending:getEndingData(final),activityCounts,worldContext:final.worldContext,flags:final.flags,activeProjects:final.activeProjects,completedProjects:final.completedProjects,club:final.club,romancePartner:final.romancePartner,health:final.general.health,endingLogs:final.log.slice(-8),history:final.history};
      flushSync(()=>root.render(React.createElement(EndingScreen,{state:final,endingData:getEndingData(final),onRestart:()=>{},onViewHistory:()=>{}})));
      return report;
    },scenario);
    if (['sleep-challenge-fail','mo-rough','oi-cooperate','romance'].includes(scenario.name)) {
      await page.setViewport({width:390,height:844});
      await page.screenshot({path:`artifacts/ending-${scenario.name}.png`,fullPage:true});
    }
    report.errors=errors;reports.push(report);
    writeFileSync(process.env.ROUTE ? `artifacts/playthrough-${process.env.ROUTE}.json` : 'artifacts/full-playthrough.json',JSON.stringify(reports,null,2));
    console.log(JSON.stringify({name:report.name,fullYear:report.fullYear,phase:report.phase,week:report.week,steps:report.steps,events:report.visitedChoices.length,exams:report.exams,failures:report.failures,errors}));
    await page.close();
  }
} finally {await browser.close();}
if(reports.some(r=>r.failures.length||r.errors.length||r.phase!=='ENDING'&&r.phase!=='WITHDRAWAL'))process.exitCode=1;
