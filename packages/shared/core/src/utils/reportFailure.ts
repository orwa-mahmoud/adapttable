/**
 * Report a failure the table recovers from by itself — a locale's labels
 * that did not load, say — with the error that caused it, in every build.
 * The table carries on; the error is logged once, here, not rethrown.
 *
 * @param context - What failed, for whom: names and ids, never secrets.
 * @param error - The error that caused it, logged as it is.
 *
 * @public
 */
export function reportFailure(context: string, error: unknown): void {
  console.error(`[adapttable] ${context}`, error);
}
