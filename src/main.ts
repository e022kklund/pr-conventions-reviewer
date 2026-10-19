import * as core from '@actions/core';
import { parseConfig } from './config/config.js';
import { ReviewerError } from './errors.js';

/**
 * Entry point. Wires the layers together and handles top-level errors.
 *
 * Internal errors never fail the user's CI: they are logged as a warning and
 * the action exits successfully.
 */
function run(): void {
  try {
    const config = parseConfig((name) => core.getInput(name));
    core.setSecret(config.anthropicApiKey);
    core.setSecret(config.githubToken);

    core.info(`Rules file: ${config.rulesPath}`);
    core.info(`Model: ${config.model}`);
    core.info('The review itself is not implemented yet.');
  } catch (error) {
    core.warning(describeError(error));
  }
}

// Only the message is logged. `cause` may hold request details such as auth headers.
function describeError(error: unknown): string {
  if (error instanceof ReviewerError) {
    return `${error.name}: ${error.message}`;
  }
  if (error instanceof Error) {
    return `Unexpected error: ${error.message}`;
  }
  return 'Unexpected error.';
}

run();
