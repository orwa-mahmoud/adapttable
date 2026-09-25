import { useEffect, useRef, useState } from "react";

import { useDebounce } from "../hooks/useDebounce";

/**
 * A controlled, debounced search input bound to a committed value.
 *
 * @public
 */
export interface SearchInputState {
  /** The live (uncommitted) input value. */
  value: string;
  /** Update the live input value. */
  setValue: (next: string) => void;
}

/**
 * Bridge a fast-typing search box to a slower committed search value.
 * Local input updates immediately; the trimmed value is flushed to
 * `setSearch` after the debounce, and external `search` changes (back
 * button, deep link, clear-all) mirror back into the input.
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
  const [value, setValue] = useState(search);
  const debounced = useDebounce(value, debounceMs);
  // The last value we committed, so we can tell our own echo (the committed
  // value coming back as `search`) from a genuine external change.
  const committedRef = useRef(search);

  // Mirror only *external* changes (back button, deep link, clear-all) into
  // the input. Skipping our own echo avoids clobbering in-flight typing:
  // a keystroke landing between commit and the committed-value re-render
  // must not be reset to the just-committed string.
  useEffect(() => {
    if (search !== committedRef.current) {
      committedRef.current = search;
      setValue(search);
    }
  }, [search]);

  // Debounced input → commit, skipping when already in sync. Compare against
  // the last value WE committed (not the live `search`): when an external
  // change (clear-all, back button) lands while a debounce is still pending,
  // `search` flips but `debounced` is briefly stale — keying off `search` here
  // would re-commit that stale value and resurrect the cleared/old search.
  useEffect(() => {
    const trimmed = debounced.trim();
    if (trimmed !== committedRef.current) {
      committedRef.current = trimmed;
      setSearch(trimmed);
    }
  }, [debounced, setSearch]);

  return { value, setValue };
}
