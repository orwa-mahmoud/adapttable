/**
 * Find-bar layout. Structure only — adapters pass the search field and
 * the previous / next / close buttons the end user clicks.
 */
import { findMatchCountText, handleFindBarKey } from "@adapttable/core";
import type {
  FindBarProps,
  FindBarSlots as NeutralFindBarSlots,
  FindSearchProps as NeutralFindSearchProps,
} from "@adapttable/core/binding";
import type { KeyboardEvent, ReactElement, ReactNode } from "react";

import { focusEditorOnMount } from "../editing/editableCellController";

export type { FindInTableState } from "./useFindInTable";
export type {
  FindBarProps,
  FindButtonKind,
  FindButtonProps,
} from "@adapttable/core/binding";

/**
 * Kit search field the find bar calls — `@adapttable/core`'s
 * `FindSearchProps` with React's key event.
 *
 * @public
 */
export type FindSearchProps = NeutralFindSearchProps<
  KeyboardEvent<HTMLElement>
>;

/**
 * Adapter-supplied controls for {@link FindBarChrome} — `@adapttable/core`'s
 * `FindBarSlots` drawing React nodes.
 *
 * @public
 */
export type FindBarSlots = NeutralFindBarSlots<
  ReactNode,
  KeyboardEvent<HTMLElement>
>;

/**
 * Props for {@link FindBarChrome}.
 *
 * @public
 */
export interface FindBarChromeProps extends FindBarProps {
  /** The kit's components for each part. */
  readonly slots: FindBarSlots;
}

/**
 * Renders the find bar, or nothing when it is closed — so an adapter renders
 * it unconditionally and the opt-in promise still holds.
 *
 * Enter walks forward, Shift+Enter walks back and Escape closes, which is what
 * every find bar does and therefore what nobody should have to learn.
 *
 * @public
 */
export function FindBarChrome({
  find,
  labels,
  className,
  slots,
}: Readonly<FindBarChromeProps>): ReactElement | null {
  if (!find.open) return null;
  const count = findMatchCountText(labels, find.index, find.matches.length);
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    handleFindBarKey(event, find);
  };

  const Search = slots.Search;
  const Button = slots.Button;
  return (
    <div
      data-adapttable-part="find-bar"
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5em",
        padding: "0.25em 0",
      }}
    >
      <Search
        label={labels?.findInTable ?? "Find in table"}
        placeholder={labels?.findPlaceholder ?? "Find in table"}
        value={find.query}
        focusRef={focusEditorOnMount}
        onChange={find.setQuery}
        onKeyDown={onKeyDown}
      />
      <output data-adapttable-part="find-count">{count}</output>
      <Button
        label={labels?.findPrevious ?? "Previous match"}
        part="find-previous"
        kind="previous"
        disabled={find.matches.length === 0}
        onClick={find.previous}
      />
      <Button
        label={labels?.findNext ?? "Next match"}
        part="find-next"
        kind="next"
        disabled={find.matches.length === 0}
        onClick={find.next}
      />
      <Button
        label={labels?.findClose ?? "Close find"}
        part="find-close"
        kind="close"
        onClick={() => {
          find.setOpen(false);
        }}
      />
    </div>
  );
}
