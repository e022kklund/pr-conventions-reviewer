import { describe, expect, it } from 'vitest';
import { ConfigError, GitHubError, LlmError, ReviewerError } from './errors.js';

describe('error types', () => {
  it.each([
    ['ConfigError', ConfigError],
    ['GitHubError', GitHubError],
    ['LlmError', LlmError],
  ])('%s is a ReviewerError with its own name', (name, ErrorType) => {
    const error = new ErrorType('something failed');

    expect(error).toBeInstanceOf(ReviewerError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe(name);
    expect(error.message).toBe('something failed');
  });

  it('keeps the cause without copying it into the message', () => {
    const cause = new Error('Authorization: Bearer secret-token');
    const error = new GitHubError('Failed to fetch the diff', { cause });

    expect(error.cause).toBe(cause);
    expect(error.message).toBe('Failed to fetch the diff');
    expect(error.message).not.toContain('secret-token');
    expect(String(error)).not.toContain('secret-token');
  });
});
