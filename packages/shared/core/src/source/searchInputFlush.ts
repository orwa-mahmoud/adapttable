/**
 * A debounced search box commits its pending term when it loses focus, so
 * the next control the user reaches — a saved view, a filter, a sort — acts
 * on the term they typed rather than racing the debounce.
 */

const nothingToDisarm = (): void => undefined;

/**
 * Run `commit` once when the focused element loses focus. A binding arms it
 * while a search debounce is pending and disarms it when the term commits.
 * Without a focused element (server rendering, a programmatic change) it
 * arms nothing.
 *
 * @param commit - Commit the pending search term now.
 * @returns Disarm the pending commit.
 * @public
 */
export function commitSearchOnBlur(commit: () => void): () => void {
  if (typeof document === "undefined") return nothingToDisarm;
  const target = document.activeElement;
  if (!(target instanceof HTMLElement) || target === document.body)
    return nothingToDisarm;
  const onBlur = (): void => {
    commit();
  };
  target.addEventListener("blur", onBlur, { once: true });
  return () => {
    target.removeEventListener("blur", onBlur);
  };
}
