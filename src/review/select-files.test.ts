import { describe, expect, it } from 'vitest';
import { diffSize, selectFiles } from './select-files.js';
import type { ChangedFile } from './types.js';

const patch = '@@ -1 +1 @@\n-a\n+b';

function file(path: string, overrides: Partial<ChangedFile> = {}): ChangedFile {
  return { path, status: 'modified', patch, ...overrides };
}

describe('selectFiles', () => {
  it('keeps ordinary source files', () => {
    const result = selectFiles([file('src/main.ts')]);
    expect(result.reviewable.map((f) => f.path)).toEqual(['src/main.ts']);
    expect(result.skipped).toEqual([]);
  });

  it('skips removed, binary, lock and generated files with a reason', () => {
    const result = selectFiles([
      file('old.ts', { status: 'removed' }),
      file('logo.png', { patch: undefined }),
      file('empty.ts', { patch: '' }),
      file('web/package-lock.json'),
      file('dist/index.js'),
      file('public/app.min.js'),
      file('src/app.js.map'),
    ]);
    expect(result.reviewable).toEqual([]);
    expect(result.skipped).toEqual([
      { path: 'old.ts', reason: 'removed' },
      { path: 'logo.png', reason: 'no-patch' },
      { path: 'empty.ts', reason: 'no-patch' },
      { path: 'web/package-lock.json', reason: 'lock-file' },
      { path: 'dist/index.js', reason: 'generated' },
      { path: 'public/app.min.js', reason: 'generated' },
      { path: 'src/app.js.map', reason: 'generated' },
    ]);
  });

  it('does not treat a file that only contains "dist" in its name as generated', () => {
    expect(selectFiles([file('src/distance.ts')]).reviewable).toHaveLength(1);
  });

  it('handles an empty list', () => {
    expect(selectFiles([])).toEqual({ reviewable: [], skipped: [] });
  });
});

describe('diffSize', () => {
  it('sums the patch lengths', () => {
    expect(diffSize([{ patch: 'abc' }, { patch: 'de' }])).toBe(5);
    expect(diffSize([])).toBe(0);
  });
});
