/** The outlined button a kit panel opens from. */
import type { ReactElement, ReactNode, RefObject } from "react";

import type { KitPrimitivesOf, KitTriggerProps } from "./primitives";
import { mergeRefs } from "./refs";

/** What the trigger draws and where it keeps its button. */
export interface AnchoredTriggerOptions {
  /** The kit's button. */
  readonly Button: KitPrimitivesOf<"Button">["Button"];
  /** Holds the button, so the panel can hand focus back to it. */
  readonly anchorRef: RefObject<HTMLButtonElement | null>;
  /** The button's part name. */
  readonly part: string;
  /** Whether the panel is open. */
  readonly open: boolean;
  /** The button's caption. */
  readonly children: ReactNode;
}

/**
 * The trigger a kit popover draws: the kit's outlined button, anchored to the
 * popover and kept in `anchorRef`.
 *
 * @param options - The button, its ref, part, open state and caption.
 * @returns The popover's `trigger` renderer.
 */
export function anchoredTrigger({
  Button,
  anchorRef,
  part,
  open,
  children,
}: AnchoredTriggerOptions): (trigger: KitTriggerProps) => ReactElement {
  return function AnchoredTrigger({ elementRef, ...trigger }) {
    return (
      <Button
        {...trigger}
        elementRef={mergeRefs(anchorRef, elementRef)}
        variant="outlined"
        aria-haspopup="true"
        data-adapttable-part={part}
        data-active={open ? "" : undefined}
      >
        {children}
      </Button>
    );
  };
}
