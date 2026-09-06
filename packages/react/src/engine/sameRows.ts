/**
 * Whether two row arrays are the same rows.
 *
 * A host that builds `data` inline hands the table a new array on every
 * render. Treating that as new data would rebuild the derived view each time
 * and — once the engine publishes at commit rather than during render — would
 * notify, re-render, and be handed another new array: a loop the host cannot
 * see and did not ask for.
 *
 * Element identity is the test, so this stays O(n) pointer comparisons and
 * never looks inside a row. A patched array carries its own log and is
 * compared by identity alone, because the log is what continues the
 * incremental view.
 */
export function sameRows<TRow>(
  a: readonly TRow[],
  b: readonly TRow[]
): boolean {
  if (Object.is(a, b)) return true;
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index++) {
    if (!Object.is(a[index], b[index])) return false;
  }
  return true;
}
