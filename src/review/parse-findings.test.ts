import { describe, expect, it } from 'vitest';
import { parseFindings } from './parse-findings.js';

const valid = {
  path: 'src/main.ts',
  line: 12,
  rule: 'No I/O in review/',
  message: 'This reads a file inside review/.',
};

describe('parseFindings', () => {
  it('accepts valid findings', () => {
    expect(parseFindings([valid])).toEqual({ ok: true, findings: [valid], dropped: 0 });
  });

  it('accepts an empty array', () => {
    expect(parseFindings([])).toEqual({ ok: true, findings: [], dropped: 0 });
  });

  it.each([
    ['an object', { findings: [valid] }],
    ['a string', '[]'],
    ['null', null],
    ['undefined', undefined],
  ])('rejects %s instead of an array', (_label, raw) => {
    const result = parseFindings(raw);

    expect(result.ok).toBe(false);
    expect(result).toHaveProperty('reason');
  });

  it.each([
    ['missing path', { ...valid, path: undefined }],
    ['empty path', { ...valid, path: '  ' }],
    ['line as a string', { ...valid, line: '12' }],
    ['line zero', { ...valid, line: 0 }],
    ['negative line', { ...valid, line: -3 }],
    ['decimal line', { ...valid, line: 1.5 }],
    ['NaN line', { ...valid, line: Number.NaN }],
    ['missing rule', { ...valid, rule: undefined }],
    ['message as a number', { ...valid, message: 42 }],
    ['null entry', null],
    ['array entry', [valid]],
  ])('drops an entry with %s and keeps the valid ones', (_label, invalid) => {
    expect(parseFindings([valid, invalid])).toEqual({ ok: true, findings: [valid], dropped: 1 });
  });

  it('copies only known fields', () => {
    const result = parseFindings([{ ...valid, suggestion: 'rm -rf /' }]);

    expect(result).toEqual({ ok: true, findings: [valid], dropped: 0 });
  });
});
