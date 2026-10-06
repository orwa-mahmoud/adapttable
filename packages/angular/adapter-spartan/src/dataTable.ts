/**
 * The Spartan Angular table: semantic HTML with `data-adapttable-part`
 * hooks and an owned Helm layer over `@adapttable/angular`. Spartan Brain
 * owns controls and overlays; the binding owns the headless table model.
 */
import {
  ADAPTTABLE_FIND_STATE,
  type ContextMenuRegionHandlers,
  type FindInTableState,
} from "@adapttable/angular";
import {
  AdaptAttrs,
  AdaptDataTableShell,
  AdaptGridFocusAnnouncer,
  AdaptIcon,
  AdaptSlot,
  ADAPTTABLE_CONTEXT_MENU,
  ADAPTTABLE_PALETTE_OPEN,
  AdaptTableStatusAnnouncer,
  type PaletteOpenState,
} from "@adapttable/angular/adapter";
import { NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component, signal } from "@angular/core";

import { AdaptDesktopTable } from "./components/desktopTable";
import { AdaptErrorState } from "./components/errorState";
import { AdaptMobileCards } from "./components/mobileCards";
import { AdaptPaginationFooter } from "./components/paginationFooter";
import { AdaptTableRegion } from "./components/tableRegion";
import { AdaptTableSkeleton } from "./components/tableSkeleton";
import {
  HlmButton,
  HlmInput,
  HlmNativeOption,
  HlmNativeSelect,
} from "./helm/controls";

export type {
  BodyCellView,
  BodyRow,
  BodySlot,
  RowActionsCell,
  TableView,
} from "@adapttable/angular/adapter";

@Component({
  selector: "adapt-data-table",
  imports: [
    HlmButton,
    HlmInput,
    HlmNativeSelect,
    HlmNativeOption,
    NgTemplateOutlet,
    AdaptAttrs,
    AdaptDesktopTable,
    AdaptIcon,
    AdaptErrorState,
    AdaptGridFocusAnnouncer,
    AdaptMobileCards,
    AdaptPaginationFooter,
    AdaptSlot,
    AdaptTableRegion,
    AdaptTableSkeleton,
    AdaptTableStatusAnnouncer,
  ],
  templateUrl: "./dataTable.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
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
  ],
})
export class AdaptDataTable<TRow> extends AdaptDataTableShell<TRow> {}
