/**
 * Find-bar layout. Structure only — adapters pass the search field and
 * the previous / next / close buttons the end user clicks.
 */
import type { KeyboardEvent, ReactElement, ReactNode } from "react";

import { focusEditorOnMount } from "../editing/editableCellController";
import type { TableLabels } from "../types";
import type { FindInTableState } from "./useFindInTable";

/**
 * Props for an adapter `FindBar` — no slots on the public API.
 *
 * @public
 */
export interface FindBarProps {
  /** The find state, straight from `shell.find`. */
  find: FindInTableState;
  /** Labels; falls back to the built-in English. */
  labels?: TableLabels;
  /** A kit's own class for the bar. */
  className?: string;
}

/**
 * Kit search field the find bar calls.
 *
 * @public
 */
export interface FindSearchProps {
  /** Accessible name for the control. */
  readonly label: string;
  /** Placeholder text. */
  readonly placeholder: string;
  /** Current value. */
  readonly value: string;
  readonly focusRef: (node: { focus: () => void } | null) => void;
  /** Called with the new value. */
  readonly onChange: (value: string) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

/**
 * One find-bar glyph.
 *
 * @public
 */
export type FindButtonKind = "previous" | "next" | "close";

/**
 * Kit button the find bar calls.
 *
 * @public
 */
export interface FindButtonProps {
  /** Accessible name for the control. */
  readonly label: string;
  /** Part name, so styling can target this element. */
  readonly part: string;
  readonly kind: FindButtonKind;
  /** Whether the control is offered but not available. */
  readonly disabled?: boolean;
  /** Called when pressed. */
  readonly onClick: () => void;
}

/**
 * Adapter-supplied controls for {@link FindBarChrome}.
 *
 * @public
 */
export interface FindBarSlots {
  readonly Search: (props: FindSearchProps) => ReactNode;
  readonly Button: (props: FindButtonProps) => ReactNode;
}

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
  const count = (labels?.findMatchCount ?? defaultCount)(
    find.index + 1,
    find.matches.length
  );
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      find.setOpen(false);
      return;
    }
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (event.shiftKey) find.previous();
    else find.next();
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

/** "3 of 17", or "No matches" — replaceable through `labels.findMatchCount`. */
function defaultCount(current: number, total: number): string {
  return total === 0 ? "No matches" : `${current} of ${total}`;
}
