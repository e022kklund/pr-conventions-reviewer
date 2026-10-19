import type { Finding } from './types';

export type ParseFindingsResult =
  | { ok: true; findings: Finding[]; dropped: number }
  | { ok: false; reason: string };

/**
 * Validates raw model output against the Finding schema.
 *
 * The model output is never trusted: entries with a wrong shape are dropped
 * one by one, and only known fields are copied. If the input is not an array
 * at all, the whole response is rejected and the caller decides what to do.
 */
export function parseFindings(raw: unknown): ParseFindingsResult {
  if (!Array.isArray(raw)) {
    return { ok: false, reason: 'Expected an array of findings.' };
  }

  const findings: Finding[] = [];
  for (const entry of raw) {
    const finding = toFinding(entry);
    if (finding) {
      findings.push(finding);
    }
  }

  return { ok: true, findings, dropped: raw.length - findings.length };
}

function toFinding(entry: unknown): Finding | undefined {
  if (!isRecord(entry)) {
    return undefined;
  }

  const { path, line, rule, message } = entry;
  if (
    !isNonEmptyString(path) ||
    !isPositiveInteger(line) ||
    !isNonEmptyString(rule) ||
    !isNonEmptyString(message)
  ) {
    return undefined;
  }

  return { path, line, rule, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}
