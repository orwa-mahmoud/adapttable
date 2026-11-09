import {
  ADAPTTABLE_FIND_STATE,
  type FindInTableState,
} from "@adapttable/angular";
import type { ContextMenuRegionHandlers } from "@adapttable/core";
import {
  Directive,
  inject,
  type Provider,
  signal,
  viewChild,
} from "@angular/core";

import {
  ADAPTTABLE_PALETTE_OPEN,
  type PaletteOpenState,
} from "../actions/paletteState";
import { ADAPTTABLE_CONTEXT_MENU } from "../actions/tableContextMenu";
import { AdaptDesktopStructure } from "./desktopStructure";
import { AdaptHeaderTemplateSlot } from "./headerTemplate";
import { AdaptMobileStructure } from "./mobileStructure";
import { AdaptTableSurface } from "./tableSurface";

/**
 * The table-wide state a kit's data table provides: the live find state, the
 * open palette and the armed context menu, each `null` until composed.
 *
 * @public
 */
export function provideAdaptTableState(): Provider[] {
  return [
    {
      provide: ADAPTTABLE_FIND_STATE,
      useFactory: () => signal<FindInTableState | null>(null),
    },
    {
      provide: ADAPTTABLE_PALETTE_OPEN,
      useFactory: () => signal<PaletteOpenState | null>(null),
    },
    {
      provide: ADAPTTABLE_CONTEXT_MENU,
      useFactory: () => signal<ContextMenuRegionHandlers | null>(null),
    },
  ];
}

/**
 * A kit's desktop table drawn through {@link AdaptDesktopStructure}. The kit
 * provides {@link AdaptHeaderTemplateSlot} and declares its header-cell
 * template; the structure's scroll box is the one the shell virtualizes.
 *
 * @public
 */
@Directive({})
export abstract class AdaptDesktopTableHost<
  TRow,
> extends AdaptTableSurface<TRow> {
  private readonly structure = viewChild(AdaptDesktopStructure);
  /** The header-cell template the table view registers. */
  protected readonly header = inject(AdaptHeaderTemplateSlot);

  override scrollElement(): HTMLElement | null {
    return this.structure()?.scrollElement() ?? null;
  }
}

/**
 * A kit's card list drawn through {@link AdaptMobileStructure}; the
 * structure's scroll box is the one the shell virtualizes.
 *
 * @public
 */
@Directive({})
export abstract class AdaptMobileCardsHost<
  TRow,
> extends AdaptTableSurface<TRow> {
  private readonly structure = viewChild(AdaptMobileStructure);

  override scrollElement(): HTMLElement | null {
    return this.structure()?.scrollElement() ?? null;
  }
}
