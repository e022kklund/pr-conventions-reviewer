import { describe, expect, it } from 'vitest';
import { commentableLines, numberPatch, parsePatch } from './diff.js';

const patch = [
  '@@ -1,3 +1,4 @@',
  ' import a from "a";',
  '-import b from "b";',
  '+import c from "c";',
  '+import d from "d";',
  ' ',
  '@@ -20,2 +21,2 @@ function run() {',
  '-  old();',
  '+  next();',
  ' }',
  '\\ No newline at end of file',
].join('\n');

describe('parsePatch', () => {
  it('numbers added and context lines in the new file', () => {
    const lines = parsePatch(patch);
    expect(lines.map((line) => [line.kind, line.newLine])).toEqual([
      ['context', 1],
      ['removed', undefined],
      ['added', 2],
      ['added', 3],
      ['context', 4],
      ['removed', undefined],
      ['added', 21],
      ['context', 22],
    ]);
  });

  it('ignores text before the first hunk and returns nothing for a malformed patch', () => {
    expect(parsePatch('not a diff\n+looks added')).toEqual([]);
  });

  it('treats an empty line inside a hunk as context', () => {
    expect(parsePatch('@@ -1 +5,2 @@\n\n+x')).toEqual([
      { kind: 'context', newLine: 5, text: '' },
      { kind: 'added', newLine: 6, text: 'x' },
    ]);
  });
});

describe('commentableLines', () => {
  it('contains added and context lines but not removed ones', () => {
    expect([...commentableLines(patch)].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 21, 22]);
  });
});

describe('numberPatch', () => {
  it('prefixes each line with its new line number and marker', () => {
    const rendered = numberPatch('@@ -1,2 +1,2 @@\n-a\n+b\n c');
    expect(rendered.split('\n')).toEqual(['      - a', '    1 + b', '    2   c']);
  });
});
