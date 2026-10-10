/**
 * A search box that types fast and commits slowly: the text follows every
 * keystroke, and the trimmed term reaches the view state once typing pauses
 * or the box loses focus.
 */
import { commitSearchOnBlur } from "@adapttable/core/binding";
import {
  DestroyRef,
  effect,
  type Injector,
  type Signal,
  signal,
  untracked,
} from "@angular/core";

/** The live text of a debounced search box, and its setter. */
export interface SearchInput {
  /** What the box shows, committed or not. */
  readonly value: Signal<string>;
  /** Type into the box; the trimmed term commits after the delay or on blur. */
  readonly setValue: (next: string) => void;
  /** Commit a term now, skipping the delay. */
  readonly commit: (term: string) => void;
}

/**
 * Bridge the box to the committed search. An outside change to the committed
 * term — the back button, a deep link, clear-all — replaces the text, but
 * the table's own commit coming back does not, so a keystroke typed while it
 * travels is kept.
 */
export function createSearchInput(
  committed: Signal<string>,
  setSearch: (term: string) => void,
  delayMs: number,
  injector: Injector
): SearchInput {
  const value = signal(untracked(committed));
  let last = untracked(committed);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disarm: (() => void) | undefined;

  const cancel = (): void => {
    clearTimeout(timer);
    timer = undefined;
    disarm?.();
    disarm = undefined;
  };
  const flush = (next: string): void => {
    cancel();
    const trimmed = next.trim();
    if (trimmed === last) return;
    last = trimmed;
    setSearch(trimmed);
  };
  const commit = (term: string): void => {
    value.set(term.trim());
    flush(term);
  };

  effect(
    () => {
      const next = committed();
      if (next === last) return;
      cancel();
      last = next;
      value.set(next);
    },
    { injector }
  );
  injector.get(DestroyRef).onDestroy(cancel);

  return {
    value: value.asReadonly(),
    setValue: (next) => {
      value.set(next);
      cancel();
      timer = setTimeout(() => {
        flush(next);
      }, delayMs);
      // Leaving the box commits now, so the next control the user reaches
      // acts on the term they typed rather than racing the delay.
      disarm = commitSearchOnBlur(() => {
        flush(next);
      });
    },
    commit,
  };
}
