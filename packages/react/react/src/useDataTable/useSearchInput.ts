import {
  commitSearchOnBlur,
  type SearchInputState,
} from "@adapttable/core/binding";
import { useCallback, useEffect, useRef, useState } from "react";

import { useDebounce } from "../hooks/useDebounce";
export type { SearchInputState } from "@adapttable/core/binding";

/**
 * Bridge a fast-typing search box to a slower committed search value.
 * Local input updates immediately; the trimmed value is flushed to
 * `setSearch` after the debounce, or as soon as the box loses focus, and
 * external `search` changes (back button, deep link, clear-all, a saved view)
 * mirror back into the input.
 *
 * @param search - The committed search value (from a source).
 * @param setSearch - Commit a new search value.
 * @param debounceMs - Debounce delay; defaults to 300.
 * @returns The controlled input state.
 *
 * @public
 */
export function useSearchInput(
  search: string,
  setSearch: (next: string) => void,
  debounceMs = 300
): SearchInputState {
  const [value, setTyped] = useState(search);
  const debounced = useDebounce(value, debounceMs);
  // The last value we committed, so we can tell our own echo (the committed
  // value coming back as `search`) from a genuine external change.
  const committedRef = useRef(search);
  const typedRef = useRef(search);
  const setSearchRef = useRef(setSearch);
  const disarmRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    setSearchRef.current = setSearch;
  }, [setSearch]);

  const disarm = useCallback(() => {
    disarmRef.current?.();
    disarmRef.current = undefined;
  }, []);

  const commit = useCallback(
    (next: string) => {
      disarm();
      const trimmed = next.trim();
      if (trimmed === committedRef.current) return;
      committedRef.current = trimmed;
      setSearchRef.current(trimmed);
    },
    [disarm]
  );

  // Mirror only *external* changes (back button, deep link, clear-all) into
  // the input. Skipping our own echo avoids clobbering in-flight typing:
  // a keystroke landing between commit and the committed-value re-render
  // must not be reset to the just-committed string.
  useEffect(() => {
    if (search !== committedRef.current) {
      disarm();
      committedRef.current = search;
      typedRef.current = search;
      setTyped(search);
    }
  }, [search, disarm]);

  // Debounced input → commit, skipping when already in sync. Compare against
  // the last value WE committed (not the live `search`): when an external
  // change (clear-all, back button) lands while a debounce is still pending,
  // `search` flips but `debounced` is briefly stale — keying off `search` here
  // would re-commit that stale value and resurrect the cleared/old search.
  useEffect(() => {
    const trimmed = debounced.trim();
    if (trimmed !== committedRef.current) {
      committedRef.current = trimmed;
      setSearchRef.current(trimmed);
    }
    // Typing has paused on this term, so leaving the box has nothing to add.
    if (debounced === typedRef.current) disarm();
  }, [debounced, disarm]);

  useEffect(() => disarm, [disarm]);

  // Typing arms a commit for when focus leaves the box, so the next control
  // the user reaches acts on the term they typed, not on the debounce.
  const setValue = useCallback(
    (next: string) => {
      typedRef.current = next;
      setTyped(next);
      disarm();
      disarmRef.current = commitSearchOnBlur(() => {
        disarmRef.current = undefined;
        commit(typedRef.current);
      });
    },
    [commit, disarm]
  );

  return { value, setValue };
}
