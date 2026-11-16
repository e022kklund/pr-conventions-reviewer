import { context, getOctokit } from '@actions/github';
import { GitHubError } from '../errors.js';
import type { ChangedFile, ReviewDraft } from '../review/types.js';

export type Octokit = ReturnType<typeof getOctokit>;

/** The pull request the action runs for. */
export interface PullRequestRef {
  owner: string;
  repo: string;
  number: number;
  baseSha: string;
  headSha: string;
  /** True when the head branch lives in a fork. Secrets are not available then. */
  isFromFork: boolean;
}

export function createGitHubClient(token: string): Octokit {
  return getOctokit(token);
}

/**
 * Reads the pull request from the workflow event.
 * Returns undefined when the action was not triggered by a pull request event.
 */
export function readPullRequest(): PullRequestRef | undefined {
  const pr: unknown = context.payload.pull_request;
  if (!isRecord(pr)) {
    return undefined;
  }

  const base = pr.base;
  const head = pr.head;
  if (!isRecord(base) || !isRecord(head) || typeof pr.number !== 'number') {
    return undefined;
  }
  if (typeof base.sha !== 'string' || typeof head.sha !== 'string') {
    return undefined;
  }

  const headRepo = isRecord(head.repo) ? head.repo.full_name : undefined;
  const baseRepo = `${context.repo.owner}/${context.repo.repo}`;

  return {
    owner: context.repo.owner,
    repo: context.repo.repo,
    number: pr.number,
    baseSha: base.sha,
    headSha: head.sha,
    isFromFork: typeof headRepo === 'string' && headRepo !== baseRepo,
  };
}

/** Lists every file changed by the pull request, with its patch when GitHub provides one. */
export async function fetchChangedFiles(
  octokit: Octokit,
  pr: PullRequestRef,
): Promise<ChangedFile[]> {
  try {
    const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
      owner: pr.owner,
      repo: pr.repo,
      pull_number: pr.number,
      per_page: 100,
    });
    return files.map((file) => ({
      path: file.filename,
      status: file.status,
      ...(file.patch === undefined ? {} : { patch: file.patch }),
    }));
  } catch (error) {
    throw new GitHubError(
      `Could not list the files of pull request #${String(pr.number)}. Check that the token has "pull-requests: read" permission.`,
      { cause: error },
    );
  }
}

/**
 * Reads the rules file from the base commit, not from the pull request.
 * That way a pull request cannot change the rules it is reviewed against.
 * Returns undefined when the file does not exist on the base branch.
 */
export async function fetchRulesFile(
  octokit: Octokit,
  pr: PullRequestRef,
  path: string,
): Promise<string | undefined> {
  try {
    const response = await octokit.rest.repos.getContent({
      owner: pr.owner,
      repo: pr.repo,
      path,
      ref: pr.baseSha,
    });
    const data: unknown = response.data;
    if (!isRecord(data) || data.type !== 'file' || typeof data.content !== 'string') {
      throw new GitHubError(`"${path}" on the base branch is not a file.`);
    }
    return Buffer.from(data.content, 'base64').toString('utf8');
  } catch (error) {
    if (error instanceof GitHubError) {
      throw error;
    }
    if (statusOf(error) === 404) {
      return undefined;
    }
    throw new GitHubError(`Could not read the rules file "${path}" from the base branch.`, {
      cause: error,
    });
  }
}

/** Posts the review as one COMMENT review with inline comments on the head commit. */
export async function postReview(
  octokit: Octokit,
  pr: PullRequestRef,
  draft: ReviewDraft,
): Promise<void> {
  try {
    await octokit.rest.pulls.createReview({
      owner: pr.owner,
      repo: pr.repo,
      pull_number: pr.number,
      commit_id: pr.headSha,
      event: 'COMMENT',
      body: draft.body,
      comments: draft.comments.map((comment) => ({
        path: comment.path,
        line: comment.line,
        side: 'RIGHT',
        body: comment.body,
      })),
    });
  } catch (error) {
    throw new GitHubError(
      `Could not post the review on pull request #${String(pr.number)}. Check that the workflow has "pull-requests: write" permission.`,
      { cause: error },
    );
  }
}

/** Posts a plain comment on the pull request conversation. */
export async function postComment(
  octokit: Octokit,
  pr: PullRequestRef,
  body: string,
): Promise<void> {
  try {
    await octokit.rest.issues.createComment({
      owner: pr.owner,
      repo: pr.repo,
      issue_number: pr.number,
      body,
    });
  } catch (error) {
    throw new GitHubError(
      `Could not comment on pull request #${String(pr.number)}. Check that the workflow has "pull-requests: write" permission.`,
      { cause: error },
    );
  }
}

function statusOf(error: unknown): number | undefined {
  return isRecord(error) && typeof error.status === 'number' ? error.status : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
