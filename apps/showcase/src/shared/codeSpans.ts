/**
 * Copy written once for every framework marks code with backticks; this
 * splits it into the runs a framework draws as text and as code.
 */

/** One run of copy: plain text, or a code span. */
export interface CopyPart {
  readonly code: boolean;
  readonly text: string;
}

/**
 * The runs of a piece of copy, `backticked` spans as code.
 *
 * @param text - The copy.
 * @returns Its runs, in order.
 */
export function codeSpans(text: string): CopyPart[] {
  return text
    .split(/(`[^`]+`)/)
    .filter(Boolean)
    .map((part) =>
      part.startsWith("`") && part.endsWith("`")
        ? { code: true, text: part.slice(1, -1) }
        : { code: false, text: part }
    );
}
