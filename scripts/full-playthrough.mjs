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
  {name:'academic-reality-balanced',route:'None',difficulty:'REALITY',seed:55,focusAcademics:true},
  {name:'oi-cooperate',route:'OI',difficulty:'NORMAL',seed:66},
  {name:'oi-independent',route:'OI',difficulty:'NORMAL',seed:77,alternate:true},
  {name:'mo-league',route:'MO',difficulty:'NORMAL',seed:88,expectedLeague:true},
  {name:'mo-mock-only',route:'MO',difficulty:'REALITY',seed:99,choices:{mo_september_entry:1}},
  {name:'romance',expectedRomance:'dating',route:'None',difficulty:'NORMAL',seed:111,romance:true}
  ,{name:'romance-friends',expectedRomance:'friends',route:'None',difficulty:'NORMAL',seed:111,romance:true,choices:{romance_confession_prep:1}}
  ,{name:'romance-separate',expectedRomance:'separated',route:'None',difficulty:'NORMAL',seed:111,romance:true,choices:{romance_missed_message:1,romance_repair:1}},
  {name:'romance-repair',expectedRomance:'dating',route:'None',difficulty:'NORMAL',seed:111,romance:true,choices:{romance_missed_message:1,romance_repair:0}},
  {name:'romance-rejected',expectedRomance:'friends',route:'None',difficulty:'NORMAL',seed:111,romance:true,choices:{romance_personal_moment:1,romance_confession_prep:0,romance_confession:0}},
  {name:'romance-space',expectedRomance:'distance',route:'None',difficulty:'NORMAL',seed:111,romance:true,choices:{romance_personal_moment:1,romance_confession_prep:0,romance_confession:0,romance_after_rejection:1}},
  {name:'sleep-challenge',route:'None',difficulty:'REALITY',seed:122,challenge:'c_sleep_king'},
  {name:'sleep-challenge-fail',route:'None',difficulty:'REALITY',seed:133,challenge:'c_sleep_king',fail:true},
  {name:'debt-challenge',route:'None',difficulty:'REALITY',seed:144,challenge:'c_debt_king'}
  ,...['rap','dance','volleyball','vocaloid','poetry','social_science','mun','touhou','astronomy','math_research','ttrpg','literature','otaku','anime','human_behavior'].map((club,i)=>({name:'club-'+club,club,route:'None',difficulty:'NORMAL',seed:200+i})),
  {name:'oi-rough-repair',route:'OI',difficulty:'NORMAL',seed:301,choices:{oi_problem_draft:1,oi_problem_testing:1}},
  {name:'oi-rough-defend',route:'OI',difficulty:'NORMAL',seed:302,choices:{oi_problem_draft:1,oi_problem_testing:1,oi_problem_feedback:1}},
  {name:'mo-light',route:'MO',difficulty:'REALITY',seed:303,expectedLeague:true,skipMock:true,lightMo:true,
    choices:{mo_summer_diagnostic:2,mo_summer_topics:2,mo_summer_mock:2,mo_mock_paper_one:2}},
  {name:'mo-reality',route:'MO',difficulty:'REALITY',seed:304,expectedLeague:true},
  {name:'festival-build',route:'None',difficulty:'NORMAL',seed:401,club:'astronomy',expectedFestival:'built',
    choices:{sci_fest_first_day:0,sci_fest_signup:0,sci_fest_rehearsal:0,evt_sci_fest:0}},
  {name:'festival-guide',route:'None',difficulty:'NORMAL',seed:402,club:'math_research',expectedFestival:'guided',
    choices:{sci_fest_first_day:0,sci_fest_signup:1,sci_fest_rehearsal:0,evt_sci_fest:0}},
  {name:'festival-improvise',route:'None',difficulty:'NORMAL',seed:403,expectedFestival:'improvised',
    choices:{sci_fest_first_day:1,sci_fest_signup:0,sci_fest_rehearsal:1,evt_sci_fest:0}},
  {name:'festival-visit',route:'None',difficulty:'NORMAL',seed:404,expectedFestival:'visited',
    choices:{sci_fest_first_day:1,sci_fest_signup:2,evt_sci_fest:0}},
  {name:'festival-astronomy-notes',route:'None',difficulty:'NORMAL',seed:405,club:'astronomy',expectedFestival:'astronomy_notes',
    choices:{sci_fest_astronomy_notes:0,sci_fest_signup:0,sci_fest_rehearsal:1,evt_sci_fest:0}},
  {name:'project-complete',route:'None',difficulty:'REALITY',seed:501,expectedProject:'compare',
    choices:{campus_project_signup:0,campus_project_sample:0}},
  {name:'project-overdue',route:'None',difficulty:'NORMAL',seed:502,expectedProject:'draft',
    choices:{campus_project_signup:1,campus_project_sample:1}}
].filter(s => !process.env.ROUTE || s.name === process.env.ROUTE);
const english = process.env.GAME_LANGUAGE === 'en';
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
      const {isExamPhase,getSubjectReselectionReturnPhase,isWintryWeek} = await import('/data/game_flow.ts');
      const {isStudyChoice,isStudyBlocked,getWeekendActivityUpdates,clampGameStateMetrics,getActivityBlockReason,isLearningActivity} = await import('/data/utils.ts');
      const {SCHEDULE_SLOTS,ALLOWED_SLOTS_MAP,BLOCKED_SLOTS_MAP,getActivityMaxSlots,getEveningStudySlots,getMoExamSlots,HOMEWORK_ACTIVITY_ID} = await import('/data/timetable.ts');
      const {getSaturdayCourses} = await import('/data/saturday_courses.ts');
      const {SUBJECT_NAMES} = await import('/types.ts');
      const {IRREGULAR_CHALLENGES} = await import('/data/challenges.ts');
      const {getEndingData,getEndingMemories} = await import('/data/ending.ts');
      const {getMoReadiness,getMoResult} = await import('/data/mo_competition.ts');
      const {TALENTS} = await import('/data/mechanics.ts');
      // Use the component's module instance after a Vite hot update.
      const eventModule = config.english ? await (await fetch('/components/EventModal.tsx')).text() : '';
      const i18nPath = eventModule.match(/from ["'](\/lib\/i18n\.tsx[^"']*)["']/)?.[1] ?? '/lib/i18n.tsx';
      const {LanguageProvider,useLanguage} = await import(i18nPath);
      if (config.english) window.history.replaceState(null,'','?lang=en');
      const localized = element => config.english ? React.createElement(LanguageProvider,null,element) : element;
      const nativeTimeout = window.setTimeout;
      const wait = () => new Promise(resolve=>nativeTimeout(resolve,5));
      window.setTimeout = (fn,delay,...args)=>nativeTimeout(fn,delay === 1000 || delay === 800 ? 5 : delay,...args);
      let seed = config.seed;
      Math.random = () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
      let game,language;
      const host = document.body.appendChild(document.createElement('div'));
      const root = createRoot(host);
      function Harness() {
        language = useLanguage().language;
        game = useGameLogic(undefined,config.name,language);
        const s=game.state;
        if (s.currentEvent) return React.createElement(EventModal,{event:s.currentEvent,state:s,eventResult:s.eventResult,
          autoContinueEnabled:false,onChoice:choice=>game.handleChoice(choice),onConfirm:game.handleEventConfirm});
        if (isExamPhase(s.phase) && !s.popupExamResult) return React.createElement(ExamView,{key:s.phase+':'+s.week,
          title:s.phase,state:s,onFinish:game.handleExamFinish});
        return null;
      }
      flushSync(()=>root.render(localized(React.createElement(Harness))));
      await wait();
      for (let attempt=0;config.english && language!=='en' && attempt<100;attempt++) await wait();
      if (config.english && language!=='en') throw new Error('English catalog did not load');
      const talentIds = config.talents || (config.focusAcademics ? ['lucky_dog','healthy','loner','frail'] : config.difficulty === 'REALITY' ? [] : ['genius']);
      const talents = TALENTS.filter(t=>talentIds.includes(t.id));
      flushSync(()=>game.startGameState(config.difficulty,{},talents,IRREGULAR_CHALLENGES.find(c=>c.id===config.challenge)));
      const timeline=[], exams=[], failures=[], seen=new Set();
      const visitedChoices=[], activityCounts={};
      const untranslated = new Map();
      const checkEnglish = scene => {
        if (!config.english) return;
        for (const node of host.querySelectorAll('h1,h2,h3,p,button,span,li')) {
          if (node.children.length || !node.getClientRects().length) continue;
          const copy = node.textContent.trim();
          if (/\p{Script=Han}/u.test(copy)) untranslated.set(copy,scene);
        }
      };
      let idle=0, lastSignature='', steps=0, fullYear=false;
      function score(before,update) {
        const after={...before,...update};
        let value=0;
        for (const [key,weight] of Object.entries({health:before.general.health<65?9:0.3,mindset:before.general.mindset<35?3:0.12,
          efficiency:0.7,money:before.general.money<0?0.8:0.1,experience:0.1,romance:config.romance?2:0.05})) {
          value += ((after.general?.[key]??before.general[key])-before.general[key])*weight;
        }
        value -= ((after.fatigue??before.fatigue)-before.fatigue)*(before.fatigue>55?1.5:0.15);
        const testedSubjects = ['chinese','math','english',...before.selectedSubjects];
        for (const key of Object.keys(before.subjects)) value += ((after.subjects?.[key]?.level??before.subjects[key].level)-before.subjects[key].level)*(config.focusAcademics&&testedSubjects.includes(key)?6:0.2);
        for (const key of ['dp','ds','math','string','graph','misc']) value += ((after.oiStats?.[key]??before.oiStats[key])-before.oiStats[key])*(config.route==='OI'?4:0);
        if (config.route==='MO' && update.flags) value += (getMoReadiness({...before,flags:update.flags})-getMoReadiness(before))*24;
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
          if (signature !== lastSignature) checkEnglish(s.currentEvent?.id || key);
          idle=signature===lastSignature?idle+1:0;lastSignature=signature;
          if (idle>300) throw new Error('Stuck: '+signature);
          if (s.popupExamResult) {exams.push({phase:s.phase,week:s.week,total:s.popupExamResult.totalScore});flushSync(()=>game.closeExamResult());}
          else if (s.phase==='SELECTION'||s.phase==='SUBJECT_RESELECTION') {
            const retPhase = prevPhase => prevPhase==='SELECTION'?'PLACEMENT_EXAM':getSubjectReselectionReturnPhase(s);
            const targetPhase = retPhase(s.phase);
            const electives = config.focusAcademics ? ['physics','chemistry','biology','history','geography','politics'].sort((a,b) => s.subjects[b].level + s.subjects[b].aptitude/7.5 - s.subjects[a].level - s.subjects[a].aptitude/7.5).slice(0,3)
              : config.humanities ? ['history','geography','politics'] : ['physics','chemistry','biology'];
            flushSync(()=>game.setState(prev=>({...prev,selectedSubjects:electives,
              phase:targetPhase,
              week:prev.phase==='SUBJECT_RESELECTION'?(targetPhase==='SEMESTER_1'?Math.max(12,prev.week+1):Math.min(21,prev.week+1)):prev.week,
              isPlaying:prev.phase==='SUBJECT_RESELECTION',totalWeeksInPhase:prev.phase==='SELECTION'?0:21,subjectReselectionReturnPhase:null})));
          } else if (s.currentEvent) {
            if (s.eventResult) flushSync(()=>game.handleEventConfirm());
            else {
              let choices=(s.currentEvent.choices||[]).filter(c=>(!c.condition||c.condition(s))&&!(isStudyChoice(c)&&isStudyBlocked(s)));
              if (config.fail) choices=choices.filter(c=>! /睡|梦/.test(c.text));
              let choice = config.choices?.[s.currentEvent.id] === undefined ? undefined : choices[config.choices[s.currentEvent.id]];
              if (s.currentEvent.id.startsWith('saturday_course_')) {
                const testedSubjects = ['chinese','math','english',...s.selectedSubjects].filter(key => key !== s.flags.saturday_course_first);
                testedSubjects.sort((a,b)=>s.subjects[a].level + s.subjects[a].aptitude/7.5 - s.subjects[b].level - s.subjects[b].aptitude/7.5);
                const wanted = config.focusAcademics ? SUBJECT_NAMES[testedSubjects[0]] : '这学年先不报三修课';
                choice = choices.find(c=>c.text===wanted) || choices[0];
              }
              if (!config.expectedProject && s.currentEvent.id === 'campus_project_signup') choice = choices.find(c=>c.text==='这次先不报名');
              if (s.currentEvent.id==='sum_goal_selection') choice=choices.find(c=>config.route==='None'?c.text==='专注课内综合':c.text.includes('('+config.route+')'));
              if (config.challenge==='c_sleep_king'&&!config.fail&&!s.hasSleptThisWeek) choice=choices.find(c=>/睡|梦/.test(c.text))||choice;
              if (!choice && s.currentEvent.id==='romance_first_encounter' && !config.romance) choice=choices[1];
              if (!choice && /^(oi_|mo_|rival_|romance_|s1_class_board|campus_project_report|campus_.*return)/.test(s.currentEvent.id)) choice=choices[config.alternate?choices.length-1:0];
              if (!choice) choice=choices.map(c=>({c,value:score(s,probe(c.action,s))+(config.romance&&/表白|约|搭话/.test(c.text)?20:0)})).sort((a,b)=>b.value-a.value)[0]?.c;
              if (choice) {
                visitedChoices.push({phase:s.phase,week:s.week,id:s.currentEvent.id,title:s.currentEvent.title,choice:choice.text});
                flushSync(()=>game.handleChoice(choice));
              } else flushSync(()=>game.handleEventConfirm());
            }
          } else if (isExamPhase(s.phase)) {
            const button=[...host.querySelectorAll('button')].find(b=>b.textContent.includes(config.english ? 'View results' : '查看排名'));
            if (button) flushSync(()=>button.click());
          } else if (s.phase==='SEMESTER_1'&&s.week===2&&!s.hasSelectedClub) flushSync(()=>game.handleClubSelect(config.club||'none'));
          else if (s.isWeekend) {
            const schedule={},counts={},blocked=new Set([...getEveningStudySlots(s),...getMoExamSlots(s)]);let simulated=s;
            const fixedCourses = getSaturdayCourses(s);
            for (const slot of SCHEDULE_SLOTS) {
              if (blocked.has(slot.id)) continue;
              const course = fixedCourses[slot.id];
              if (course) {
                if (!isStudyBlocked(simulated)) simulated=clampGameStateMetrics({...simulated,...getWeekendActivityUpdates(simulated,course,1,true)});
                continue;
              }
              const candidates=game.weekendOptions.filter(a=> (!a.condition||a.condition(simulated))&&!getActivityBlockReason(simulated,a)
                && (a.id !== 'w_project_work' || !config.expectedProject || config.expectedProject === 'compare' && s.week === 12)
                && (!config.lightMo || !a.id.startsWith('w_mo_'))
                && (!ALLOWED_SLOTS_MAP[a.id]||ALLOWED_SLOTS_MAP[a.id].includes(slot.id))
                && (counts[a.id]||0)<getActivityMaxSlots(a.id,s)
                && !(isLearningActivity(a)&&isStudyBlocked(simulated)));
              const rated=candidates.map(a=>({a,updates:probe(st=>getWeekendActivityUpdates(st,a,(counts[a.id]||0)+1,true),simulated)}))
                .map(r=>({...r,value:score(simulated,r.updates)+(r.a.id===HOMEWORK_ACTIVITY_ID?26:0)+(aProject(r.a)?12:0)+(config.club&&r.a.id==='w_club_activity'?12:0)+(config.route==='OI'&&r.a.id==='act_cf'?8:0)}))
                .sort((a,b)=>b.value-a.value);
              const picked=config.challenge==='c_sleep_king'&&!config.fail&&!Object.values(schedule).includes('w_sleep')?rated.find(r=>r.a.id==='w_sleep')||rated[0]:rated[0];
              if (!picked) continue;
              if (config.fail&&picked.a.id==='w_sleep') continue;
              schedule[slot.id]=picked.a.id;activityCounts[picked.a.id]=(activityCounts[picked.a.id]||0)+1;counts[picked.a.id]=(counts[picked.a.id]||0)+1;
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
      const moResults = config.route==='MO' ? {league:getMoResult(final,'league'),mock:getMoResult(final,'mock')} : undefined;
      if (moResults && (Boolean(moResults.league) !== Boolean(config.expectedLeague)
          || Boolean(moResults.mock) === Boolean(config.skipMock)
          || (config.lightMo && (final.flags.mo_league_awarded || moResults.league?.total >= 80))
          || (moResults.league && (!final.flags.mo_league_published || !visitedChoices.some(e=>e.id==='mo_league_paper_two'&&e.phase==='SEMESTER_1'&&e.week===2)))
          || (moResults.mock && (!final.flags.mo_mock_published || !visitedChoices.some(e=>e.id==='mo_mock_paper_two'&&e.phase==='SEMESTER_2'&&e.week===14)))
          || visitedChoices.some(e=>/mo_(setter|problem_circle)/.test(e.id)) || activityCounts.w_invite_contest)) {
        failures.push('MO competition dates, marks or route were incorrect');
      }
      if (config.romance) {
        const helpAt = visitedChoices.findIndex(event => event.id === 'romance_peer_help');
        const interestAt = visitedChoices.findIndex(event => event.id === 'romance_interest_choice');
        const confessionAt = visitedChoices.findIndex(event => event.id === 'romance_confession_prep');
        if (helpAt < 0 || interestAt <= helpAt || confessionAt <= interestAt) failures.push('Romance scenes were out of order');
      }
      if (config.expectedRomance && final.flags.romance_resolution!==config.expectedRomance) failures.push('Romance outcome: '+final.flags.romance_resolution);
      if (!config.fail&&!fullYear) failures.push('Expected a full year');
      if (config.club && (!activityCounts.w_club_activity || final.club!==config.club)) failures.push('Club route was not exercised');
      if (config.fail && !final.flags.sleep_challenge_failed) failures.push('Expected sleep challenge failure');
      const militaryChoices = visitedChoices.filter(entry => entry.phase === 'MILITARY');
      if (fullYear && (militaryChoices.some(entry => entry.week !== 1)
          || !militaryChoices.some(entry => entry.id === 'mil_closing'))) {
        failures.push('Military training should open and close within one week');
      }
      if (visitedChoices.some(entry => entry.id === 'flavor_2' && !isWintryWeek(entry))) {
        failures.push('Snow appeared outside the wintry part of the year');
      }
      if (fullYear && (final.academicExamHistory.length !== 5 || final.academicExamHistory.at(-1).title !== 'FINAL_EXAM_2')) {
        failures.push('Academic exam history is incomplete');
      }
      if (config.expectedFestival && (final.flags.science_festival_outcome !== config.expectedFestival
          || !getEndingMemories(final).some(memory => memory.includes('科技节'))
          || Boolean(final.flags.science_festival_club_organizer) !== (config.expectedFestival === 'guided'))) {
        failures.push('Unexpected festival outcome or memory');
      }
      if (config.expectedProject) {
        const completed = final.completedProjects.includes('proj_campus_observation');
        if (final.flags.campus_project_report !== config.expectedProject
          || completed !== (config.expectedProject === 'compare')
          || final.activeProjects.some(project=>project.id==='proj_campus_observation')
          || !visitedChoices.some(entry=>entry.id==='campus_project_return'&&entry.phase==='SEMESTER_2')
          || (completed && (!getEndingMemories(final).some(memory=>memory.includes('食堂等餐记录')) || activityCounts.w_project_work !== 3))) {
          failures.push('Unexpected project progress, report or spring follow-up');
        }
      }
      const report={...config,steps,fullYear,phase:final.phase,week:final.week,failures,timeline,exams,moResults,visitedChoices,
        ending:getEndingData(final),academicExams:final.academicExamHistory,activityCounts,flags:final.flags,activeProjects:final.activeProjects,completedProjects:final.completedProjects,club:final.club,romancePartner:final.romancePartner,health:final.general.health,endingLogs:final.log.slice(-8),history:final.history};
      flushSync(()=>root.render(localized(React.createElement(EndingScreen,{state:final,endingData:getEndingData(final),onRestart:()=>{},onViewHistory:()=>{}}))));
      checkEnglish('ending');
      report.untranslated = [...untranslated].map(([copy,scene])=>({scene,copy}));
      if (report.untranslated.length) failures.push(`${report.untranslated.length} untranslated pieces of visible copy`);
      return report;
    },{...scenario,english});
    if (['sleep-challenge-fail','mo-league','oi-cooperate','romance','festival-guide'].includes(scenario.name)) {
      await page.setViewport({width:390,height:844});
      await page.screenshot({path:`artifacts/ending-${scenario.name}.png`,fullPage:true});
    }
    report.errors=errors;reports.push(report);
    const suffix = english ? '-en' : '';
    writeFileSync(process.env.ROUTE ? `artifacts/playthrough-${process.env.ROUTE}${suffix}.json` : `artifacts/full-playthrough${suffix}.json`,JSON.stringify(reports,null,2));
    console.log(JSON.stringify({name:report.name,fullYear:report.fullYear,phase:report.phase,week:report.week,steps:report.steps,events:report.visitedChoices.length,exams:report.exams,moResults:report.moResults,finalRank:report.academicExams.at(-1)?.rank,failures:report.failures,errors}));
    await page.close();
  }
} finally {await browser.close();}
if(reports.some(r=>r.failures.length||r.errors.length||r.phase!=='ENDING'&&r.phase!=='WITHDRAWAL'))process.exitCode=1;
