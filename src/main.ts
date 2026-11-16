import * as core from '@actions/core';
import { parseConfig, type Config } from './config/config.js';
import { LlmError, ReviewerError } from './errors.js';
import {
  createGitHubClient,
  fetchChangedFiles,
  fetchRulesFile,
  postComment,
  postReview,
  readPullRequest,
  type PullRequestRef,
} from './github/github.js';
import { createLlmClient, requestFindings } from './llm/llm.js';
import { keepFindingsInDiff } from './review/filter-findings.js';
import { formatReview, formatTooLarge } from './review/format.js';
import { parseFindings } from './review/parse-findings.js';
import { buildPrompt } from './review/prompt.js';
import { diffSize, selectFiles } from './review/select-files.js';

/**
 * Entry point. Wires the layers together and handles top-level errors.
 *
 * Internal errors never fail the user's CI: they are logged as a warning and
 * the action exits successfully. Only findings can fail the check, and only
 * when fail-on-findings is "true".
 */
async function run(): Promise<void> {
  try {
    const pr = readPullRequest();
    if (!pr) {
      core.warning('PR Conventions Reviewer only runs on pull_request events. Nothing to do.');
      return;
    }
    if (pr.isFromFork && core.getInput('anthropic-api-key').trim() === '') {
      core.warning(
        'Skipped: this pull request comes from a fork, and GitHub does not pass secrets such as ANTHROPIC_API_KEY to workflows for forks.',
      );
      return;
    }

    const config = parseConfig((name) => core.getInput(name));
    core.setSecret(config.anthropicApiKey);
    core.setSecret(config.githubToken);

    const findingsCount = await review(pr, config);
    core.setOutput('findings-count', findingsCount);

    if (config.failOnFindings && findingsCount > 0) {
      core.setFailed(`Found ${String(findingsCount)} violation(s) of ${config.rulesPath}.`);
    }
  } catch (error) {
    core.warning(describeError(error));
  }
}

/** Runs one review and returns the number of findings posted. */
async function review(pr: PullRequestRef, config: Config): Promise<number> {
  const octokit = createGitHubClient(config.githubToken);

  const rules = await fetchRulesFile(octokit, pr, config.rulesPath);
  if (rules === undefined || rules.trim() === '') {
    core.warning(
      `No rules found: "${config.rulesPath}" is missing or empty on the base branch. Add it there, or point the "rules-path" input at your rules file.`,
    );
    return 0;
  }

  const selection = selectFiles(await fetchChangedFiles(octokit, pr));
  core.info(
    `Reviewing ${String(selection.reviewable.length)} file(s), skipping ${String(selection.skipped.length)}.`,
  );
  if (selection.reviewable.length === 0) {
    core.info('No reviewable files in this pull request.');
    return 0;
  }

  const size = diffSize(selection.reviewable);
  if (size > config.maxDiffChars) {
    core.warning(`Diff is ${String(size)} characters, above the limit of ${String(config.maxDiffChars)}.`);
    await postComment(octokit, pr, formatTooLarge(size, config.maxDiffChars, config.rulesPath));
    return 0;
  }

  const prompt = buildPrompt(rules, config.rulesPath, selection.reviewable);
  const raw = await requestFindings(createLlmClient(config.anthropicApiKey), prompt, {
    model: config.model,
    maxOutputTokens: config.maxOutputTokens,
  });

  const parsed = parseFindings(raw);
  if (!parsed.ok) {
    throw new LlmError(`The model's answer could not be used: ${parsed.reason}`);
  }
  const filtered = keepFindingsInDiff(parsed.findings, selection.reviewable);

  await postReview(
    octokit,
    pr,
    formatReview(filtered.kept, {
      rulesPath: config.rulesPath,
      reviewedFiles: selection.reviewable.length,
      skipped: selection.skipped,
      droppedFindings: parsed.dropped + filtered.dropped,
    }),
  );
  core.info(`Posted a review with ${String(filtered.kept.length)} finding(s).`);
  return filtered.kept.length;
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

await run();
