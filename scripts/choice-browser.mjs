import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const executablePath = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/chromium', '/usr/bin/google-chrome'
].find(existsSync);
const browser = await puppeteer.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.SMOKE_URL || 'http://127.0.0.1:3000/');
  const results = await page.evaluate(async () => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js');
    const { default: { createRoot } } = await import('/node_modules/.vite/deps/react-dom_client.js');
    const { default: { flushSync } } = await import('/node_modules/.vite/deps/react-dom.js');
    const { useGameLogic } = await import('/hooks/useGameLogic.ts');
    const { PHASE_EVENTS, withChallengeSleep } = await import('/data/events.ts');
    const { getOrderedScheduleEntries } = await import('/data/timetable.ts');
    const { default: TimetableModal } = await import('/components/TimetableModal.tsx');
    const { default: EventModal } = await import('/components/EventModal.tsx');
    let game;
    const root = createRoot(document.body.appendChild(document.createElement('div')));
    function Harness({ account = 'choice-regression' }) { game = useGameLogic(undefined, account); return null; }
    flushSync(() => root.render(React.createElement(Harness)));
    const initial = game.state;
    const { SHOP_ITEMS, WEEKEND_ACTIVITIES } = await import('/data/mechanics.ts');
    const { getEndingData, getEndingMemories } = await import('/data/ending.ts');
    const book = SHOP_ITEMS.find(item=>item.id==='five_three').effect(initial);
    const club = WEEKEND_ACTIVITIES.find(activity=>activity.id==='w_club_activity');
    const generated = withChallengeSleep({id:'historical-test',title:'历史事件',description:'test',type:'neutral',choices:[{text:'继续',action:()=>({})}]});
    const sleeper = {...initial,activeChallengeId:'c_sleep_king'};
    const sleepChoice = generated.choices.find(c=>c.text==='不管了，我要睡觉');
    const memories = getEndingMemories({...initial,club:'literature',romancePartner:'林夏',flags:{oi_problem_drafted:true}});
    const routeRegressions = [
      memories.length===3 && memories.some(m=>m.includes('文学社')) && memories.some(m=>m.includes('林夏')) && memories.some(m=>m.includes('草稿')),
      !getEndingMemories(initial).some(m=>m.includes('表白')),

      ['history','geography','politics'].every(key=>book.subjects[key].level>initial.subjects[key].level),
      !club.condition({...initial,club:'none',week:4}) && club.condition({...initial,club:'literature',week:4}),
      sleepChoice.condition(sleeper) && !sleepChoice.condition(initial) && sleepChoice.action(sleeper).hasSleptThisWeek,
      withChallengeSleep(generated).choices.length===generated.choices.length,
      getEndingData({...sleeper,phase:'ENDING',flags:{sleep_challenge_failed:true}}).title==='睡神挑战失败',
      getEndingData({...initial,phase:'ENDING',competition:'OI',flags:{oi_setter:true,oi_problem_drafted:true}}).comment.includes('草稿'),
      getEndingData({...initial,phase:'ENDING',competition:'MO',flags:{mo_setter:true,mo_review:'rough'}}).comment.includes('空缺')
    ];

    const legacyPlan = getOrderedScheduleEntries({Sat_Aft:'act_library'})[0][1] === 'w_library';
    const delayedChoices = [];
    for (const [id, followupId, index] of [['campus_borrow_pen','campus_pen_return',0],['campus_lost_card','campus_card_return',1]]) {
      const event = PHASE_EVENTS.SEMESTER_1.find(e=>e.id===id);
      const followup = PHASE_EVENTS.SEMESTER_1.find(e=>e.id===followupId);
      const before = {...initial,phase:'SEMESTER_1',week:4};
      const help = {...before,...event.choices[index].action(before)};
      const other = {...before,...event.choices[1-index].action(before),week:5};
      delayedChoices.push(!followup.condition(help),followup.condition({...help,week:5}),!followup.condition(other));
      delayedChoices.push(!followup.condition({...help,phase:'SEMESTER_2',week:5}));
    }
    const feedbackRoot = createRoot(document.body.appendChild(document.createElement('div')));
    const nativeSetTimeout = window.setTimeout;
    const nativeClearTimeout = window.clearTimeout;
    const timers = new Map();
    let createdTimers = 0;
    const confirmations = [];
    let stableTimer, pausedTimer, resumedTimer, importantManual;
    const daily = PHASE_EVENTS.SEMESTER_1.find(event => event.id === 'campus_borrow_pen');
    const feedback = { choice:daily.choices[0],diff:[] };
    try {
      window.setTimeout = (callback, delay, ...args) => {
        if (delay !== 3000) return nativeSetTimeout(callback,delay,...args);
        const id = -(++createdTimers);
        timers.set(id, callback);
        return id;
      };
      window.clearTimeout = id => { if (id < 0) timers.delete(id); else nativeClearTimeout(id); };
      const renderFeedback = (marker, paused = false, autoContinue = true) => flushSync(() => feedbackRoot.render(
        React.createElement(EventModal,{event:{...daily,autoContinue},state:initial,eventResult:feedback,
          paused,onChoice:()=>{},onConfirm:()=>confirmations.push(marker)})));
      for (let i=0;i<5;i++) renderFeedback(i);
      stableTimer = createdTimers === 1 && timers.size === 1;
      renderFeedback(5,true);
      pausedTimer = timers.size === 0;
      renderFeedback(6);
      resumedTimer = timers.size === 1;
      for (const callback of timers.values()) callback();
      renderFeedback(7,false,false);
      importantManual = timers.size === 0 && confirmations.length === 1 && confirmations[0] === 6;
    } finally {
      feedbackRoot.unmount();
      window.setTimeout = nativeSetTimeout;
      window.clearTimeout = nativeClearTimeout;
    }
    const board = PHASE_EVENTS.SEMESTER_1.find(event => event.id === 's1_class_board');
    const finish = PHASE_EVENTS.SEMESTER_1.find(event => event.id === 's1_class_board_finish');
    const boardChecks = [];
    for (const week of [3, 6, 8]) {
      for (const choice of board.choices.slice(0, 2)) {
        const start = { ...initial, phase: 'SEMESTER_1', week };
        const accepted = { ...start, ...choice.action(start) };
        boardChecks.push(!finish.condition(accepted));
        const later = { ...accepted, week: Math.max(6, week + 1) };
        boardChecks.push(finish.condition(later));
        flushSync(() => game.setState({ ...later, currentEvent: finish, isPlaying: false }));
        flushSync(() => game.handleChoice(finish.choices[0]));
        boardChecks.push(game.state.fatigue === later.fatigue + 5);
        boardChecks.push(!finish.condition(game.state));
        boardChecks.push(game.state.history.at(-1).resultSummary.includes('板报赶在早读前完成'));
      }
    }
    boardChecks.push(finish.condition({ ...initial, phase:'SEMESTER_1', week:6, flags:{class_board_started:true} }));
    const reunion = PHASE_EVENTS.SEMESTER_1.find(event => event.id === 's1_class_board_reunion');
    const reunionState = { ...initial, phase:'SEMESTER_1', week:7, flags:{class_board_finished:true,class_board_finish_week:6} };
    boardChecks.push(!reunion.condition(reunionState));
    boardChecks.push(reunion.condition({...reunionState,week:8}));
    boardChecks.push(!reunion.condition({...reunionState,week:8,flags:{}}));
    boardChecks.push(!reunion.condition({...reunionState,week:8,flags:reunion.choices[0].action(reunionState).flags}));
    const auditFailures = [];
    let auditedChoices = 0;
    for (const [phase, events] of Object.entries(PHASE_EVENTS)) {
      for (const competition of ['None', 'OI', 'MO']) {
        const sample = { ...initial, phase, competition, week: 6, isPlaying: false };
        for (const event of events) {
          if (event.condition && !event.condition(sample)) continue;
          for (const choice of event.choices || []) {
            if (choice.condition && !choice.condition(sample)) continue;
            try {
              const updates = choice.action(structuredClone(sample));
              if (updates.general && 'fatigue' in updates.general) throw new Error('fatigue is nested in general');
              for (const group of ['general', 'oiStats']) {
                for (const [key, value] of Object.entries(updates[group] || {})) {
                  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`${group}.${key} is not finite`);
                }
              }
              auditedChoices++;
            } catch (error) { auditFailures.push(`${event.id}: ${choice.text}: ${error.message}`); }
          }
        }
      }
    }
    const checks = [];
    const library = PHASE_EVENTS.SEMESTER_1.find(event => event.id === 's1_library');
    const notebook = Object.values(PHASE_EVENTS).flat().flatMap(event => event.choices || [])
      .find(choice => choice.text === '整理学习笔记');
    const choices = [library.choices[0],
      notebook,
      { text: '学习', action: s => ({ subjects: s.subjects }) },
      { text: '学习', action: s => ({ general: s.general }) },
      { text: '休息', action: () => ({ fatigue: 10 }) }
    ];
    for (const choice of choices) {
      flushSync(() => game.setState({ ...initial, isPlaying: false, currentEvent: library }));
      try {
        flushSync(() => game.handleChoice(choice, (before, after) => {
          // The actual screen reads every subject to display choice rewards.
          Object.keys(before.subjects).forEach(key => after.subjects[key].level);
          return [];
        }));
        checks.push({ choice: choice.text, result: !!game.state.eventResult,
          subjects: Object.keys(game.state.subjects).length === Object.keys(initial.subjects).length,
          oi: game.state.oiStats.rating === initial.oiStats.rating });
      } catch (error) { checks.push({ choice: choice.text, error: error.message }); }
    }
    flushSync(() => game.setState({ ...initial, phase: 'SEMESTER_1', week: 3, isPlaying: false, isWeekend: true }));
    flushSync(() => game.executeTimetable({ Sat_Aft: 'w_library', Sun_Aft: 'w_library' }));
    const plannedLibrary = game.state.subjects.math.level > initial.subjects.math.level
      && game.state.log.some(entry => entry.details?.some(line => line.includes('图书馆')));
    flushSync(() => game.setState({...initial,phase:'SEMESTER_1',week:4,difficulty:'HELL',
      isPlaying:false,isWeekend:true,general:{...initial.general,health:100,mindset:80},
      flags:{joined_evening_study:true}}));
    flushSync(() => game.executeTimetable({Mon_Eve:'w_read',Sat_Aft:'w_library',Sun_Aft:'w_library'}));
    const planLog = game.state.log.find(entry=>entry.message.startsWith('【本周计划】'));
    const completeSummary = planLog.message.includes('完成 1 项，跳过 2 项') && planLog.details.length === 3
      && planLog.details.some(line=>line.includes('晚自习')) && planLog.details.some(line=>line.includes('本周最多'));
    const plannerRoot = createRoot(document.body.appendChild(document.createElement('div')));
    const plannerState = { ...initial, difficulty:'HELL', fatigue:95, isWeekend:true,
      general:{...initial.general, mindset:80}, availableWeekendActivityIds:['w_sleep','w_library'],
      lastWeekSchedule:{Sat_Morn:'w_sleep'} };
    flushSync(() => plannerRoot.render(React.createElement(TimetableModal, {state:plannerState,onConfirm:()=>{}})));
    // Locate the Saturday afternoon slot through its day section.
    const saturday = [...document.querySelectorAll('h3')].find(el => el.textContent === '周六').parentElement;
    const afternoon = [...saturday.querySelectorAll('[class]')].find(el => el.textContent === '周六下午');
    const clickable = afternoon?.closest('[class*="cursor-pointer"]');
    if (!clickable) throw new Error('Saturday afternoon slot not found');
    flushSync(() => clickable.click());
    const libraryOption = [...document.querySelectorAll('span')].find(el => el.textContent === '上图书馆');
    flushSync(() => libraryOption.parentElement.parentElement.click());
    const restThenStudy = document.body.innerText.includes('2 项可执行');
    flushSync(() => plannerRoot.render(React.createElement(TimetableModal, {key:'limit',
      state:{...plannerState,difficulty:'NORMAL',fatigue:20,availableWeekendActivityIds:['w_game'],
        lastWeekSchedule:{Sat_Aft:'w_game',Sun_Aft:'w_game'}},onConfirm:()=>{}})));
    const saturdayAgain = [...document.querySelectorAll('h3')].find(el => el.textContent === '周六').parentElement;
    const afternoonAgain = [...saturdayAgain.querySelectorAll('[class]')].find(el => el.textContent === '周六下午');
    flushSync(() => afternoonAgain.closest('[class*="cursor-pointer"]').click());
    const gameOption = [...document.querySelectorAll('span')].find(el => el.textContent === '打游戏' && el.parentElement.parentElement.textContent.includes('适度游戏益脑'));
    flushSync(() => gameOption.parentElement.parentElement.click());
    const keepExistingAtLimit = !document.body.innerText.includes('选择活动');
    flushSync(() => plannerRoot.render(React.createElement(TimetableModal,{key:'skip-reasons',
      state:{...plannerState,week:3,difficulty:'NORMAL',fatigue:20,club:'literature',
        lastWeekSchedule:{Sat_Morn:'w_club_activity',Sat_Aft:'w_sleep'}},onConfirm:()=>{}})));
    const skipReasonVisible = document.body.innerText.includes('本周不满足活动条件');
    const clearSkipped = [...document.querySelectorAll('button')].find(b=>b.textContent==='清除这些安排');
    flushSync(()=>clearSkipped.click());
    const skipCleanup = skipReasonVisible && !document.body.innerText.includes('本周不满足活动条件') && document.body.innerText.includes('1 项可执行');
    plannerRoot.unmount();
    const saveKey = 'recall_save_v1_choice-regression';
    flushSync(() => game.setState({...initial,phase:'SEMESTER_1',week:7,isPlaying:false,isWeekend:true}));
    const autoSaved = JSON.parse(localStorage.getItem(saveKey)).state.week === 7 && game.saveNotice.includes('自动');
    flushSync(() => game.setState(prev => ({...prev,week:8,currentEvent:library,isWeekend:false})));
    const pendingNotSaved = JSON.parse(localStorage.getItem(saveKey)).state.week === 7;
    flushSync(() => game.handleChoice(library.choices[0]));
    flushSync(() => game.handleEventConfirm());
    const afterChoice = JSON.parse(localStorage.getItem(saveKey)).state;
    flushSync(() => game.loadGame());
    const restored = game.state.week === 8 && game.state.subjects.chinese.level === afterChoice.subjects.chinese.level;
    flushSync(() => game.saveGame());
    const manualBytes = localStorage.getItem(saveKey + '_manual');
    flushSync(() => game.setState(prev => ({...prev,week:9})));
    const manualIndependent = localStorage.getItem(saveKey + '_manual') === manualBytes
      && JSON.parse(localStorage.getItem(saveKey)).state.week === 9;
    flushSync(() => game.loadGame('manual'));
    const manualRestored = game.state.week === 8;
    const originalSetItem = Storage.prototype.setItem;
    let failedWrites = 0;
    Storage.prototype.setItem = function(key, value) {
      if (key === saveKey) { failedWrites++; throw new Error('simulated full storage'); }
      return originalSetItem.call(this,key,value);
    };
    flushSync(() => game.setState(prev => ({...prev,week:9})));
    await new Promise(resolve => setTimeout(resolve, 0));
    const failureReported = game.saveNotice.includes('失败') && failedWrites === 1;
    Storage.prototype.setItem = originalSetItem;
    const beforeSwitch = localStorage.getItem(saveKey);
    localStorage.setItem('recall_save_v1_other-regression','untouched');
    flushSync(() => root.render(React.createElement(Harness,{account:'other-regression'})));
    await new Promise(resolve => setTimeout(resolve, 0));
    const isolated = game.state.phase === 'INIT'
      && localStorage.getItem('recall_save_v1_other-regression') === 'untouched'
      && localStorage.getItem(saveKey) === beforeSwitch;
    root.unmount();
    return { skipCleanup, routeRegressions, checks, plannedLibrary, boardChecks, restThenStudy, auditedChoices, auditFailures,
      autoSaved,pendingNotSaved,restored,failureReported,isolated,keepExistingAtLimit,manualIndependent,manualRestored,
      stableTimer,pausedTimer,resumedTimer,importantManual,legacyPlan,delayedChoices,completeSummary };
  });
  console.log(JSON.stringify(results));
  for (const check of results.checks) {
    assert.equal(check.error, undefined, JSON.stringify(check));
    assert.ok(check.result && check.subjects && check.oi, JSON.stringify(check));
  }
  assert.ok(results.routeRegressions.every(Boolean), 'route failures, sleep availability, humanities book and empty club');
  assert.ok(results.skipCleanup, 'clear only skipped slots, retaining valid rest');
  assert.ok(results.plannedLibrary);
  assert.ok(results.boardChecks.every(Boolean), 'board timing, fatigue, diary and old saves');
  assert.ok(results.restThenStudy, 'resting first must unlock learning in a later slot');
  assert.ok(results.keepExistingAtLimit, 'keeping an existing activity does not consume another slot');
  assert.ok(results.legacyPlan && results.completeSummary && results.delayedChoices.every(Boolean), 'legacy plans, complete summaries and delayed choice outcomes');
  for (const key of ['stableTimer','pausedTimer','resumedTimer','importantManual']) assert.ok(results[key],key);
  for (const key of ['autoSaved','pendingNotSaved','restored','failureReported','isolated','manualIndependent','manualRestored']) assert.ok(results[key],key);
  assert.deepEqual(results.auditFailures, []);
  assert.deepEqual(errors, []);
  console.log('PASS: event choices preserve untouched stats and repeated library plans execute');
} finally { await browser.close(); }
