/** One line of a unified diff hunk. */
export interface DiffLine {
  kind: 'added' | 'context' | 'removed';
  /** Line number in the new file. Undefined for removed lines. */
  newLine: number | undefined;
  text: string;
}

const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

/**
 * Parses the patch of one file (the format GitHub returns per file) into lines
 * with their line numbers in the new version of the file.
 *
 * Lines before the first hunk header and "\ No newline at end of file" markers
 * are ignored. A malformed patch gives an empty list rather than an error, so
 * one odd file never stops the whole review.
 */
export function parsePatch(patch: string): DiffLine[] {
  const lines: DiffLine[] = [];
  let nextNewLine: number | undefined;

  for (const raw of patch.split('\n')) {
    const header = HUNK_HEADER.exec(raw);
    if (header) {
      nextNewLine = Number(header[1]);
      continue;
    }
    if (nextNewLine === undefined || raw.startsWith('\\')) {
      continue;
    }

    const marker = raw.charAt(0);
    const text = raw.slice(1);
    if (marker === '+') {
      lines.push({ kind: 'added', newLine: nextNewLine, text });
      nextNewLine += 1;
    } else if (marker === '-') {
      lines.push({ kind: 'removed', newLine: undefined, text });
    } else if (marker === ' ' || raw === '') {
      // An empty string is a context line whose trailing space was trimmed.
      lines.push({ kind: 'context', newLine: nextNewLine, text });
      nextNewLine += 1;
    }
  }

  return lines;
}

/**
 * Returns the new-file line numbers that GitHub accepts inline comments on:
 * added lines and context lines inside a hunk.
 */
export function commentableLines(patch: string): Set<number> {
  const result = new Set<number>();
  for (const line of parsePatch(patch)) {
    if (line.newLine !== undefined) {
      result.add(line.newLine);
    }
  }
  return result;
}

/**
 * Renders a patch with the new-file line number in front of each line, so the
 * model can refer to exact lines. Removed lines get no number because they
 * cannot be commented on.
 */
export function numberPatch(patch: string): string {
  return parsePatch(patch)
    .map((line) => {
      const number = line.newLine === undefined ? '' : String(line.newLine);
      const marker = line.kind === 'added' ? '+' : line.kind === 'removed' ? '-' : ' ';
      return `${number.padStart(5)} ${marker} ${line.text}`;
    })
    .join('\n');
}
