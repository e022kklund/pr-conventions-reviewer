import { ConfigError } from '../errors';

export interface Config {
  anthropicApiKey: string;
  githubToken: string;
  rulesPath: string;
  model: string;
  failOnFindings: boolean;
}

/** Reads one action input. Returns an empty string when it is not set, like `core.getInput`. */
export type GetInput = (name: string) => string;

// Defaults live here and nowhere else.
export const DEFAULT_RULES_PATH = 'CLAUDE.md';
export const DEFAULT_MODEL = 'claude-sonnet-5-5';

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
