import type { ChangedFile } from './types.js';

export type SkipReason = 'removed' | 'no-patch' | 'lock-file' | 'generated';

export interface FileSelection {
  /** Files that are sent to the model. Every one has a patch. */
  reviewable: (ChangedFile & { patch: string })[];
  skipped: { path: string; reason: SkipReason }[];
}

const LOCK_FILES = new Set([
  'package-lock.json',
  'npm-shrinkwrap.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  'Cargo.lock',
  'Gemfile.lock',
  'poetry.lock',
  'composer.lock',
  'go.sum',
  'packages.lock.json',
]);

// Paths that are almost always build output or generated code.
const GENERATED_PATTERNS: RegExp[] = [
  /(^|\/)dist\//,
  /(^|\/)build\//,
  /(^|\/)vendor\//,
  /(^|\/)node_modules\//,
  /\.min\.(js|css)$/,
  /\.map$/,
  /\.snap$/,
  /\.(pb|generated)\.\w+$/,
];

/**
 * Splits the changed files into the ones worth reviewing and the ones to skip,
 * with the reason for each skipped file.
 */
export function selectFiles(files: ChangedFile[]): FileSelection {
  const selection: FileSelection = { reviewable: [], skipped: [] };

  for (const file of files) {
    const reason = skipReason(file);
    if (reason) {
      selection.skipped.push({ path: file.path, reason });
    } else if (file.patch !== undefined) {
      selection.reviewable.push({ ...file, patch: file.patch });
    }
  }

  return selection;
}

function skipReason(file: ChangedFile): SkipReason | undefined {
  if (file.status === 'removed') {
    return 'removed';
  }
  if (file.patch === undefined || file.patch === '') {
    return 'no-patch';
  }
  const fileName = file.path.split('/').pop() ?? file.path;
  if (LOCK_FILES.has(fileName)) {
    return 'lock-file';
  }
  if (GENERATED_PATTERNS.some((pattern) => pattern.test(file.path))) {
    return 'generated';
  }
  return undefined;
}

/** Total size of the patches in characters, which is what the size limit is measured in. */
export function diffSize(files: { patch: string }[]): number {
  return files.reduce((sum, file) => sum + file.patch.length, 0);
}
