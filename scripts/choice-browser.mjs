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
    let game;
    const root = createRoot(document.body.appendChild(document.createElement('div')));
    function Harness() { game = useGameLogic(undefined, 'choice-regression'); return null; }
    flushSync(() => root.render(React.createElement(Harness)));
    const initial = game.state;
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
    root.unmount();
    return { checks, plannedLibrary };
  });
  console.log(JSON.stringify(results));
  for (const check of results.checks) {
    assert.equal(check.error, undefined, JSON.stringify(check));
    assert.ok(check.result && check.subjects && check.oi, JSON.stringify(check));
  }
  assert.ok(results.plannedLibrary);
  assert.deepEqual(errors, []);
  console.log('PASS: event choices preserve untouched stats and repeated library plans execute');
} finally { await browser.close(); }
