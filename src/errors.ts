/**
 * Error types used at the layer boundaries.
 *
 * config/, github/ and llm/ translate library errors into these types, and
 * main.ts decides how to report them.
 *
 * `message` is the only part that gets logged, so it must never contain
 * secrets. The original library error goes in `cause`, which may hold request
 * details such as auth headers, and must not be logged as-is.
 */
export class ReviewerError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Action inputs are missing or invalid. */
export class ConfigError extends ReviewerError {}

/** A GitHub API call failed. */
export class GitHubError extends ReviewerError {}

/** A Claude API call failed or returned something unusable. */
export class LlmError extends ReviewerError {}
