import { ConfigError } from '../errors.js';

export interface Config {
  anthropicApiKey: string;
  githubToken: string;
  rulesPath: string;
  model: string;
  failOnFindings: boolean;
  /** Largest diff, in characters, that is sent to the model. */
  maxDiffChars: number;
  /** Upper bound on the tokens the model may use for its answer. */
  maxOutputTokens: number;
}

/** Reads one action input. Returns an empty string when it is not set, like `core.getInput`. */
export type GetInput = (name: string) => string;

// Defaults live here and nowhere else.
export const DEFAULT_RULES_PATH = 'CLAUDE.md';
export const DEFAULT_MODEL = 'claude-sonnet-5-5';
export const DEFAULT_MAX_DIFF_CHARS = 100_000;
export const DEFAULT_MAX_OUTPUT_TOKENS = 4_096;

/**
 * Parses and validates the action inputs.
 *
 * Takes the input reader as an argument so this module does not depend on
 * @actions/core and can be tested with a plain function.
 * Error messages name the input but never include its value.
 */
export function parseConfig(getInput: GetInput): Config {
  const read = (name: string): string => getInput(name).trim();

  return {
    anthropicApiKey: required(read('anthropic-api-key'), 'anthropic-api-key'),
    githubToken: required(read('github-token'), 'github-token'),
    rulesPath: read('rules-path') || DEFAULT_RULES_PATH,
    model: read('model') || DEFAULT_MODEL,
    failOnFindings: parseBoolean(read('fail-on-findings'), 'fail-on-findings'),
    maxDiffChars: parsePositiveInteger(read('max-diff-chars'), 'max-diff-chars', DEFAULT_MAX_DIFF_CHARS),
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
  };
}

function required(value: string, name: string): string {
  if (value === '') {
    throw new ConfigError(`Input "${name}" is required.`);
  }
  return value;
}

function parseBoolean(value: string, name: string): boolean {
  switch (value.toLowerCase()) {
    case '':
    case 'false':
      return false;
    case 'true':
      return true;
    default:
      throw new ConfigError(`Input "${name}" must be "true" or "false".`);
  }
}

function parsePositiveInteger(value: string, name: string, fallback: number): number {
  if (value === '') {
    return fallback;
  }
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw new ConfigError(`Input "${name}" must be a positive whole number.`);
  }
  return number;
}
