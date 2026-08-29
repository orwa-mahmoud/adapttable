/**
 * The formula columns in the URL, so a typed column survives a reload and can
 * be sent to someone.
 *
 * Everything else a table holds is a choice among things the table offered. A
 * formula is text somebody wrote, which makes it both the most expensive state
 * to rebuild by hand and the most worth putting in a link — and, once it is in
 * a link, the state that must never be executed on the way back in. The
 * encoding is in {@link ./formulaUrlCodec}, which reads specs and nothing else;
 * evaluation happens later, in the engine, on purpose.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { type UrlStateAdapter, useResolvedAdapter } from "../url/adapter";

export type { UrlStateAdapter };
import { PARAM_FORMULA } from "../url/serialize";
import type { FormulaColumnSpec } from "./formulaColumn";
import {
  deserializeFormulaColumns,
  serializeFormulaColumns,
} from "./formulaUrlCodec";

/**
 * Trailing debounce for URL persistence. A formula bar that writes as it is
 * typed commits one list per keystroke, and `history.replaceState` at that rate
 * trips Safari's limit (~100 calls per 30s, then it throws). Reads stay instant
 * through the optimistic overlay below; only the URL write waits.
 *
 * @public
 */
export const FORMULA_URL_WRITE_DEBOUNCE_MS = 150;

/** Stable identity for "no formula columns", so a read cannot churn a memo. */
const NO_FORMULAS: readonly FormulaColumnSpec[] = [];

/**
 * What {@link useFormulaUrlState} needs.
 *
 * @public
 */
export interface UseFormulaUrlStateOptions {
  /** URL-state backend. Defaults to the browser History API. */
  urlAdapter?: UrlStateAdapter;
  /** When `false`, keep the columns in a local memory store. Defaults `true`. */
  urlSync?: boolean;
  /** Namespace, when several tables share one URL (`left.formula`). */
  urlKey?: string;
  /** The columns applied while the URL carries none. Defaults to none. */
  defaultFormulas?: readonly FormulaColumnSpec[];
}

/**
 * The controlled pair to hand a formula bar and {@link buildFormulaColumns}.
 *
 * @public
 */
export interface UseFormulaUrlStateResult {
  /** The columns — from the URL, or the default while the URL is silent. */
  formulas: readonly FormulaColumnSpec[];
  /** Persist a new list. Wire to whatever adds and removes a column. */
  onFormulasChange: (next: readonly FormulaColumnSpec[]) => void;
}

/**
 * Keep the formula columns in the URL.
 *
 * @param options - See {@link UseFormulaUrlStateOptions}.
 * @returns The current columns and a change handler that persists them.
 *
 * @public
 */
export function useFormulaUrlState(
  options: UseFormulaUrlStateOptions = {}
): UseFormulaUrlStateResult {
  const { urlAdapter, urlSync, urlKey, defaultFormulas } = options;
  const ns = urlKey ? `${urlKey}.` : "";
  const param = `${ns}${PARAM_FORMULA}`;
  const resolved = useResolvedAdapter(urlAdapter, urlSync ?? true);
  // Same SSR rule as the other URL hooks: only an explicit adapter is trusted
  // to be hydration-consistent; the default history adapter hydrates from "".
  const search = useSyncExternalStore(
    (onChange) => resolved.subscribe(onChange),
    () => resolved.getSearch(),
    () => (urlAdapter ? urlAdapter.getSearch() : "")
  );
  // Optimistic overlay: the list that has not reached the URL yet.
  const [pending, setPending] = useState<readonly FormulaColumnSpec[] | null>(
    null
  );
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formulas = useMemo<readonly FormulaColumnSpec[]>(() => {
    if (pending) return pending;
    const raw = new URLSearchParams(search).get(param);
    // Absent means nothing has been said, so the default applies. Present and
    // empty means someone removed the last column, which is not the same thing.
    if (raw === null) return defaultFormulas ?? NO_FORMULAS;
    return deserializeFormulaColumns(raw);
  }, [pending, search, param, defaultFormulas]);

  const persist = useCallback(
    (next: readonly FormulaColumnSpec[]) => {
      const params = new URLSearchParams(resolved.getSearch());
      const value = serializeFormulaColumns(next);
      if (value !== "") params.set(param, value);
      else if (defaultFormulas && defaultFormulas.length > 0) {
        // An emptied list writes the empty marker when there is a default to
        // displace: deleting the parameter reads back as "nothing has been
        // said", and the removed columns would return on the next read.
        params.set(param, "");
      } else params.delete(param);
      resolved.setSearch(params.toString());
    },
    [resolved, param, defaultFormulas]
  );

  const onFormulasChange = useCallback(
    (next: readonly FormulaColumnSpec[]) => {
      setPending(next);
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(() => {
        flushTimer.current = null;
        persist(next);
        setPending(null);
      }, FORMULA_URL_WRITE_DEBOUNCE_MS);
    },
    [persist]
  );

  // Flush a pending list on unmount so a formula typed and navigated away from
  // is not lost.
  const latestRef = useRef<{
    pending: readonly FormulaColumnSpec[] | null;
    persist: typeof persist;
  }>({ pending, persist });
  latestRef.current = { pending, persist };
  useEffect(
    () => () => {
      if (flushTimer.current) {
        clearTimeout(flushTimer.current);
        // Invariant: a live timer implies a pending list — the timeout clears
        // the timer BEFORE it clears `pending`.
        const { pending: last, persist: write } = latestRef.current;
        write(last!);
      }
    },
    []
  );

  return { formulas, onFormulasChange };
}
