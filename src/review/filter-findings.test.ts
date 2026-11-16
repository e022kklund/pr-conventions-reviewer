import { describe, expect, it } from 'vitest';
import { keepFindingsInDiff } from './filter-findings.js';
import type { Finding } from './types.js';

const files = [{ path: 'src/a.ts', patch: '@@ -1,2 +1,3 @@\n keep\n-gone\n+new\n+newer' }];

function finding(path: string, line: number, rule = 'Rule'): Finding {
  return { path, line, rule, message: 'msg' };
}

describe('keepFindingsInDiff', () => {
  it('keeps findings on commentable lines', () => {
    const result = keepFindingsInDiff([finding('src/a.ts', 2), finding('src/a.ts', 1)], files);
    expect(result).toEqual({ kept: [finding('src/a.ts', 2), finding('src/a.ts', 1)], dropped: 0 });
  });

  it('drops findings on unknown files or lines outside the diff', () => {
    const result = keepFindingsInDiff([finding('src/other.ts', 1), finding('src/a.ts', 99)], files);
    expect(result).toEqual({ kept: [], dropped: 2 });
  });

  it('collapses duplicates on the same line and rule', () => {
    const result = keepFindingsInDiff(
      [finding('src/a.ts', 2), finding('src/a.ts', 2), finding('src/a.ts', 2, 'Other rule')],
      files,
    );
    expect(result.kept).toHaveLength(2);
    expect(result.dropped).toBe(1);
  });

  it('handles no findings', () => {
    expect(keepFindingsInDiff([], files)).toEqual({ kept: [], dropped: 0 });
  });
});
