/**
 * Responsive layout changes. A binding announces one right before it
 * publishes a media-query change that re-lays the table out; editing, once a
 * table has it, keeps the active editor's focus and caret across it. A table
 * without editing announces into nothing and never loads the focus keeper.
 */

/** What runs before each layout change, once an editing store installed it. */
let beforeLayoutChange: (() => void) | undefined;

/**
 * Announce that a responsive layout is about to replace the table's DOM.
 * Bindings call this immediately before publishing a media-query change.
 *
 * @public
 */
export function notifyLayoutChange(): void {
  beforeLayoutChange?.();
}

/**
 * Set what runs before each layout change. The editing stores install the
 * focus keeper with it when they are created.
 *
 * @internal
 */
export function runBeforeLayoutChange(run: () => void): void {
  beforeLayoutChange = run;
}
