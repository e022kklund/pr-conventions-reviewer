/** One rule violation reported by the model, after validation. */
export interface Finding {
  /** File path as it appears in the diff. */
  path: string;
  /** 1-based line number in the new version of the file. */
  line: number;
  /** The rule from the rules file that is violated. */
  rule: string;
  /** Explanation shown in the review comment. */
  message: string;
}

/** One file changed by the pull request, as the github/ layer hands it over. */
export interface ChangedFile {
  path: string;
  status: 'added' | 'modified' | 'removed' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  /** Unified diff of the file. Missing for binary files and very large diffs. */
  patch?: string;
}

/** An inline comment on one line of the new version of a file. */
export interface ReviewComment {
  path: string;
  line: number;
  body: string;
}

/** Everything needed to post one review. */
export interface ReviewDraft {
  body: string;
  comments: ReviewComment[];
}

/** The two messages sent to the model. */
export interface ReviewPrompt {
  system: string;
  user: string;
}
