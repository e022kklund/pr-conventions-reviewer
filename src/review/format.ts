import type { SkipReason } from './select-files.js';
import type { Finding, ReviewDraft } from './types.js';

/** Hidden marker so reviews and comments from this action can be recognised. */
export const MARKER = '<!-- pr-conventions-reviewer -->';

export interface ReviewStats {
  rulesPath: string;
  reviewedFiles: number;
  skipped: { path: string; reason: SkipReason }[];
  /** Findings removed because they were malformed or pointed outside the diff. */
  droppedFindings: number;
}

/** Turns the findings into one review: a summary plus one inline comment per finding. */
export function formatReview(findings: Finding[], stats: ReviewStats): ReviewDraft {
  return {
    body: formatSummary(findings.length, stats),
    comments: findings.map((finding) => ({
      path: finding.path,
      line: finding.line,
      body: `**Rule:** ${finding.rule}\n\n${finding.message}`,
    })),
  };
}

function formatSummary(count: number, stats: ReviewStats): string {
  const headline =
    count === 0
      ? `No violations of \`${stats.rulesPath}\` found.`
      : `Found ${String(count)} ${count === 1 ? 'violation' : 'violations'} of \`${stats.rulesPath}\`. See the inline comments.`;

  const details = [
    `Reviewed ${String(stats.reviewedFiles)} ${stats.reviewedFiles === 1 ? 'file' : 'files'}.`,
  ];
  if (stats.skipped.length > 0) {
    const names = stats.skipped.map((file) => `\`${file.path}\` (${file.reason})`).join(', ');
    details.push(`Skipped: ${names}.`);
  }
  if (stats.droppedFindings > 0) {
    details.push(
      `${String(stats.droppedFindings)} finding(s) from the model were discarded because they did not point at a line in the diff.`,
    );
  }

  return `${MARKER}\n### PR Conventions Reviewer\n\n${headline}\n\n${details.join(' ')}`;
}

/** Comment posted instead of a review when the diff is above the size limit. */
export function formatTooLarge(size: number, limit: number, rulesPath: string): string {
  return `${MARKER}\n### PR Conventions Reviewer\n\nThis pull request was not reviewed against \`${rulesPath}\`: the diff is ${String(size)} characters, above the limit of ${String(limit)}. Split it into smaller pull requests, or raise the \`max-diff-chars\` input.`;
}
