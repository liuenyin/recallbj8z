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
    const { PHASE_EVENTS } = await import('/data/events.ts');
    const { default: TimetableModal } = await import('/components/TimetableModal.tsx');
    let game;
    const root = createRoot(document.body.appendChild(document.createElement('div')));
    function Harness({ account = 'choice-regression' }) { game = useGameLogic(undefined, account); return null; }
    flushSync(() => root.render(React.createElement(Harness)));
    const initial = game.state;
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
      && game.state.log.some(entry => entry.message.includes('图书馆'));
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
    return { checks, plannedLibrary, boardChecks, restThenStudy, auditedChoices, auditFailures,
      autoSaved,pendingNotSaved,restored,failureReported,isolated };
  });
  console.log(JSON.stringify(results));
  for (const check of results.checks) {
    assert.equal(check.error, undefined, JSON.stringify(check));
    assert.ok(check.result && check.subjects && check.oi, JSON.stringify(check));
  }
  assert.ok(results.plannedLibrary);
  assert.ok(results.boardChecks.every(Boolean), 'board timing, fatigue, diary and old saves');
  assert.ok(results.restThenStudy, 'resting first must unlock learning in a later slot');
  for (const key of ['autoSaved','pendingNotSaved','restored','failureReported','isolated']) assert.ok(results[key],key);
  assert.deepEqual(results.auditFailures, []);
  assert.deepEqual(errors, []);
  console.log('PASS: event choices preserve untouched stats and repeated library plans execute');
} finally { await browser.close(); }
