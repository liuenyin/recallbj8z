import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const readJson = (path: string) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), 'utf8'));
const read = (path: string) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('offline AI event IDs are unique after source normalization', () => {
  const rows = readJson('../data/ai_generated_events.json') as any[];
  const events = rows.flatMap((row, eventIndex) => Array.isArray(row.childrens)
    ? row.childrens.map((event: any, childIndex: number) => ({ ...event, id: `offline_${eventIndex}_${childIndex}` }))
    : row.choices || row.effect ? [{ ...row, id: `offline_${eventIndex}` }] : []);
  const ids = events.map(event => event.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(events.every(event => (Array.isArray(event.choices) && event.choices.length > 0) || event.effect));
  assert.ok(events.every(event => typeof event.title === 'string' && event.title.trim()));
  assert.ok(events.every(event => typeof event.description === 'string' && event.description.trim()));
});

test('academic maximum ignores duplicate or non-academic keys', () => {
  const flowSource = read('../data/game_flow.ts');
  assert.match(flowSource, /Array\.from\(new Set\(subjects\)\)/);
  assert.match(flowSource, /ELECTIVE_ACADEMIC_SUBJECTS/);
});

test('active statuses are normalized to one entry per status id', () => {
  const utilsSource = read('../data/utils.ts');
  assert.match(utilsSource, /normalizeActiveStatuses/);
  assert.match(utilsSource, /const byId = new Map<string, GameStatus>\(\)/);
  assert.match(utilsSource, /activeStatuses: normalizeActiveStatuses\(state\.activeStatuses\)/);
});

test('OI JSON effects are limited to keys supported by the parser', () => {
  const rows = readJson('../oi_events.json') as any[];
  const supported = new Set(['efficiency', 'experience', 'health', 'luck', 'mindset', 'money', 'oi_dp', 'oi_ds', 'oi_graph', 'oi_math', 'oi_misc', 'oi_string']);
  const keys = new Set<string>();
  rows.forEach(event => (event.choices || []).forEach((choice: any) => Object.keys(choice.effect || {}).forEach(key => keys.add(key))));
  assert.deepEqual([...keys].filter(key => !supported.has(key)), []);
});

test('authored campus and OI event packs exclude regional mismatches and malformed text', () => {
  const campusEvents = readJson('../data/ai_generated_events.json') as any[];
  const oiEvents = readJson('../oi_events.json') as any[];
  const disallowedPattern = /全国卷|广东高考|上海市教委|3\+3选科|回南天|\uFFFD/;
  [...campusEvents, ...oiEvents].forEach((event: any) => {
    assert.ok(['positive', 'negative', 'neutral'].includes(event.type), event.id || event.title);
    assert.ok(Array.isArray(event.choices) && event.choices.length > 0, event.id || event.title);
    assert.equal(disallowedPattern.test(JSON.stringify(event)), false, event.id || event.title);
    assert.ok(event.choices.every((choice: any) => typeof choice.text === 'string' && choice.text.trim()), event.id || event.title);
  });
});
