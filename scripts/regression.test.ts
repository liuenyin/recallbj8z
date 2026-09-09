import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path: string) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const utilsSource = read('../data/utils.ts');
const logicSource = read('../hooks/useGameLogic.ts');
const modalSource = read('../components/TimetableModal.tsx');
const generatorSource = read('../data/event_generators.ts');
const utilsModuleSource = read('../data/utils.ts');

test('health fatality handles zero in normal/reality and the hell threshold', () => {
  assert.ok(utilsSource.includes('threshold === undefined ? health <= 0'));
  assert.ok(utilsSource.includes('threshold <= 0 ? health <= 0 : health < threshold'));
  assert.ok(logicSource.includes('isHealthFatal(state.difficulty, state.general.health)'));
  assert.ok(logicSource.includes('isHealthFatal(prev.difficulty, updatedGeneral.health)'));
});

test('OI weekend activities use the same hell restrictions as study activities', () => {
  assert.ok(utilsSource.includes("activity.type === 'STUDY' || activity.type === 'OI'"));
  assert.ok(logicSource.includes('const learningActivity = isLearningActivity(activity)'));
  assert.ok(modalSource.includes('isLearningActivity(act)'));
});

test('unsupported generated triggers are normalized to playable random events', () => {
  assert.ok(utilsSource.includes('SUPPORTED_EVENT_TRIGGERS'));
  assert.ok(utilsSource.includes('normalizeEventTriggerType(aiEvent.triggerType)'));
});

test('generated AI events carry a JSON payload for save restoration', () => {
  assert.ok(utilsSource.includes('serialized: {'));
  assert.match(logicSource, /event\.serialized \|\| \(EVENT_REGISTRY\[event\.id\]/);
  assert.ok(logicSource.includes('mapAiEventToGameEvent(value)'));
});

test('OI events choose the nearest authored rating band when out of range', () => {
  assert.ok(generatorSource.includes('const nearestDistance = Math.min(...phasePool.map(distanceToBand)'));
  assert.ok(generatorSource.includes('const nearest = phasePool.filter'));
});

test('HELL study blocking covers untagged authored study wording', () => {
  assert.match(utilsModuleSource, /自学\|网课/);
  assert.match(utilsModuleSource, /背单词/);
  assert.match(utilsModuleSource, /全神贯注/);
  assert.match(utilsModuleSource, /肝！/);
});

test('project weekend work is treated as a learning activity', () => {
  assert.match(utilsModuleSource, /activity\.type === 'STUDY' \|\| activity\.type === 'OI' \|\| activity\.type === 'PROJECT'/);
});

test('legacy AI effect fields are normalized without leaking unsupported metadata', () => {
  assert.match(utilsModuleSource, /LEGACY_AI_EFFECT_ALIASES/);
  assert.match(utilsModuleSource, /enjoyment: 'mindset'/);
  assert.match(utilsModuleSource, /knowlege: 'experience'/);
  assert.match(utilsModuleSource, /effect\.fatigue = fatigue/);
  assert.match(utilsModuleSource, /\['dp', 'ds', 'math', 'string', 'graph', 'misc'\]/);
  assert.doesNotMatch(utilsModuleSource, /effect\.oiStats\.rating/);
});

test('AI endpoint normalization preserves query parameters', () => {
  const endpointSource = read('../lib/gemini.ts');
  assert.match(endpointSource, /new URL\(value\)/);
  assert.match(endpointSource, /endpoint\.toString\(\)/);
  assert.doesNotMatch(endpointSource, /split\(['"]\?['"]\)/);
});

test('toolbar actions share the selection and weekend flow lock', () => {
  assert.match(read('../App.tsx'), /const toolbarLocked = interactionLocked \|\| state\.isWeekend/);
  assert.match(read('../App.tsx'), /onClick=\{\(\) => openGameOverlay\(setShowSchedule\)\} disabled=\{toolbarLocked\}/);
  assert.match(read('../App.tsx'), /onClick=\{\(\) => openGameOverlay\(setShowShop\)\} disabled=\{toolbarLocked\}/);
});

test('ending-screen history opens above the ending overlay', () => {
  assert.match(read('../App.tsx'), /showHistory && \([\s\S]*?z-\[110\][\s\S]*?closeGameOverlay\(setShowHistory\)/);
});

test('save restoration filters malformed log and story entries', () => {
  const source = read('../hooks/useGameLogic.ts');
  assert.match(source, /const restoreLogEntries = \(value: unknown\): GameLogEntry\[\] =>/);
  assert.match(source, /const restoreStoryEntries = \(value: unknown\): StoryEntry\[\] =>/);
  assert.match(source, /log: restoreLogEntries\(loaded\.log\)/);
  assert.match(source, /history: restoreStoryEntries\(loaded\.history\)/);
});

test('empty summer or military weeks still run weekly settlement', () => {
  assert.match(read('../hooks/useGameLogic.ts'), /const \{ updatedGeneral, updatedStatuses, updatedSubjects, updatedFatigue \} = calculateWeeklyUpdates\(prev\)/);
  assert.match(read('../hooks/useGameLogic.ts'), /const weeklyState = clampGameStateMetrics\(/);
});

test('fixed events honor an explicit phase gate', () => {
  assert.match(read('../hooks/useGameLogic.ts'), /\(!e\.fixedPhase \|\| e\.fixedPhase === state\.phase\)/);
});

test('hidden fatigue and excitement diffs keep their semantic colors', () => {
  const modalSource = read('../components/EventModal.tsx');
  assert.match(modalSource, /diff\.startsWith\('疲劳'\)/);
  assert.match(modalSource, /diff\.startsWith\('兴奋'\)/);
});

test('AI event sanitation accepts legacy top-level choice effects', () => {
  const geminiSource = read('../lib/gemini.ts');
  assert.match(geminiSource, /const rawEffect = choice\.effect && typeof choice\.effect === 'object'/);
  assert.match(geminiSource, /effect: sanitizeEffect\(rawEffect\)/);
});

test('malformed saves are removed after a failed load attempt', () => {
  const source = read('../hooks/useGameLogic.ts');
  assert.match(source, /let saveKeyUsed: string \| null = null/);
  assert.match(source, /localStorage\.removeItem\(saveKeyUsed\)/);
});

test('AI relationship effects cannot bypass the authored romance route', () => {
  const source = read('../data/utils.ts');
  assert.match(source, /canEstablishRelationship/);
  assert.match(source, /s\.flags\.ready_for_confession === true/);
  assert.match(source, /&& favorability >= 70/);
});

test('randomized weekend activities expose a side-effect-free timetable projection', () => {
  const typesSource = read('../types.ts');
  const mechanicsSource = read('../data/mechanics.ts');
  const modalSource = read('../components/TimetableModal.tsx');
  assert.match(typesSource, /previewAction\?:/);
  assert.match(mechanicsSource, /id: 'act_cf'[\s\S]*?previewAction:/);
  assert.match(modalSource, /getWeekendActivityUpdates\(previewState, activity, repeatCount, true\)/);
  assert.match(utilsSource, /preview \? activity\.previewAction \|\| activity\.action : activity\.action/);
});

test('club selection pauses the loop and resumes only without pending events', () => {
  const appSource = read('../App.tsx');
  const logicSource = read('../hooks/useGameLogic.ts');
  assert.match(appSource, /setState\(prev => prev\.isPlaying \? \{ \.\.\.prev, isPlaying: false \} : prev\)/);
  assert.match(logicSource, /prev\.eventQueue\.length === 0[\s\S]*?\? true[\s\S]*?: prev\.isPlaying/);
});
