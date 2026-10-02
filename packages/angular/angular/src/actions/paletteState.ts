/**
 * The palette's open state, shared by the dialog and its toolbar button.
 *
 * React keeps this in context. Angular keeps it on an injection token the
 * data table provides, the same way the find button reads find state.
 */
import { InjectionToken, type WritableSignal } from "@angular/core";

/**
 * Whether the palette is showing, and the action that opens or closes it.
 *
 * @public
 */
export interface PaletteOpenState {
  /** Whether the palette is showing. */
  readonly open: boolean;
  /** Ask it to open or close. */
  readonly setOpen: (open: boolean) => void;
}

/**
 * The table's palette, or `null` while none is armed.
 *
 * @public
 */
export const ADAPTTABLE_PALETTE_OPEN = new InjectionToken<
  WritableSignal<PaletteOpenState | null>
>("ADAPTTABLE_PALETTE_OPEN");
