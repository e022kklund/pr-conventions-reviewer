import { commentableLines } from './diff.js';
import type { Finding } from './types.js';

export interface FilteredFindings {
  kept: Finding[];
  /** Findings that pointed at a file or line outside the diff. */
  dropped: number;
}

/**
 * Keeps only findings that point at a line GitHub can comment on.
 *
 * The model can invent paths or line numbers, and GitHub rejects the whole
 * review if one comment points outside the diff, so this check is required.
 * Duplicate findings on the same line and rule are collapsed into one.
 */
export function keepFindingsInDiff(
  findings: Finding[],
  files: { path: string; patch: string }[],
): FilteredFindings {
  const linesByPath = new Map(files.map((file) => [file.path, commentableLines(file.patch)]));
  const seen = new Set<string>();
  const kept: Finding[] = [];

  for (const finding of findings) {
    const lines = linesByPath.get(finding.path);
    if (!lines?.has(finding.line)) {
      continue;
    }
    const key = `${finding.path}:${String(finding.line)}:${finding.rule}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    kept.push(finding);
  }

  return { kept, dropped: findings.length - kept.length };
}
