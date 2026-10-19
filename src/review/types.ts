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
