import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (path: string) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('curated daily scenes have distinct stable IDs and complete choice feedback', () => {
  const events = JSON.parse(read('../data/ai_generated_events.json'));
  assert.ok(events.length >= 12 && events.length <= 40);
  assert.equal(new Set(events.map(event => event.id)).size, events.length);
  assert.equal(new Set(events.map(event => event.title)).size, events.length);
  for (const event of events) {
    assert.ok(event.id.startsWith('campus_'));
    assert.ok(event.description && !JSON.stringify(event).includes('\uFFFD'));
    assert.ok(event.choices.length >= 2);
    for (const choice of event.choices) assert.ok(choice.text && choice.resultDescription && choice.effect);
  }
});
test('phase labels and diary stay readable', () => {
  const source = read('../data/game_flow.ts');
  assert.match(source, /SEMESTER_1: '高一上学期'/);
  assert.match(source, /我的选择：/);
});
