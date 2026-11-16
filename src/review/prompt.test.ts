import { describe, expect, it } from 'vitest';
import { buildPrompt } from './prompt.js';

describe('buildPrompt', () => {
  const prompt = buildPrompt('  No global variables.\n', 'CLAUDE.md', [
    { path: 'src/a.ts', patch: '@@ -1 +1 @@\n-let x = 1;\n+export let x = 2;' },
  ]);

  it('includes the trimmed rules with their source', () => {
    expect(prompt.user).toContain('<rules source="CLAUDE.md">\nNo global variables.\n</rules>');
  });

  it('includes each file with numbered diff lines', () => {
    expect(prompt.user).toContain('<file path="src/a.ts">');
    expect(prompt.user).toContain('    1 + export let x = 2;');
  });

  it('tells the model to treat the diff as untrusted data', () => {
    expect(prompt.system).toContain('untrusted input');
    expect(prompt.system).toContain('"findings"');
  });
});
