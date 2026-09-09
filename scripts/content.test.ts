import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (path: string) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
test('class board side story is authored and gated across weeks', () => {
  const source = read('../data/events.ts');
  assert.match(source, /id: 's1_class_board'/);
  assert.match(source, /id: 's1_class_board_finish'/);
  assert.match(source, /class_board_started/);
  assert.match(source, /class_board_finished/);
});
test('phase labels and diary stay readable', () => {
  const source = read('../data/game_flow.ts');
  assert.match(source, /SEMESTER_1: '高一上学期'/);
  assert.match(source, /我的选择：/);
});
