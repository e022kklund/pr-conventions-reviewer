import { describe, expect, it } from 'vitest';
import { formatReview, formatTooLarge, MARKER } from './format.js';

const stats = { rulesPath: 'CLAUDE.md', reviewedFiles: 2, skipped: [], droppedFindings: 0 };

describe('formatReview', () => {
  it('creates one inline comment per finding', () => {
    const draft = formatReview(
      [{ path: 'src/a.ts', line: 3, rule: 'No any', message: 'Use unknown.' }],
      stats,
    );
    expect(draft.comments).toEqual([
      { path: 'src/a.ts', line: 3, body: '**Rule:** No any\n\nUse unknown.' },
    ]);
    expect(draft.body).toContain('Found 1 violation of `CLAUDE.md`');
    expect(draft.body.startsWith(MARKER)).toBe(true);
  });

  it('says so when nothing was found', () => {
    const draft = formatReview([], stats);
    expect(draft.comments).toEqual([]);
    expect(draft.body).toContain('No violations of `CLAUDE.md` found.');
    expect(draft.body).toContain('Reviewed 2 files.');
  });

  it('mentions skipped files and discarded findings', () => {
    const draft = formatReview([], {
      ...stats,
      reviewedFiles: 1,
      skipped: [{ path: 'dist/index.js', reason: 'generated' }],
      droppedFindings: 2,
    });
    expect(draft.body).toContain('Reviewed 1 file.');
    expect(draft.body).toContain('`dist/index.js` (generated)');
    expect(draft.body).toContain('2 finding(s) from the model were discarded');
  });
});

describe('formatTooLarge', () => {
  it('names the size, the limit and the input to change', () => {
    const body = formatTooLarge(150000, 100000, 'CLAUDE.md');
    expect(body).toContain('150000 characters');
    expect(body).toContain('limit of 100000');
    expect(body).toContain('max-diff-chars');
  });
});
