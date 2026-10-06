/**
 * The ng-bootstrap Angular table: Bootstrap controls with `data-adapttable-part`
 * hooks and isolated Bootstrap styling, over `@adapttable/angular`. Native HTML is
 * this kit's kit, so every control a reader uses is the browser's own.
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
import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
} from "@angular/core";

import { AdaptDesktopTable } from "./components/desktopTable";
import { AdaptErrorState } from "./components/errorState";
import { AdaptMobileCards } from "./components/mobileCards";
import { AdaptPaginationFooter } from "./components/paginationFooter";
import { AdaptTableRegion } from "./components/tableRegion";
import { AdaptTableSkeleton } from "./components/tableSkeleton";

export type {
  BodyCellView,
  BodyRow,
  BodySlot,
  RowActionsCell,
  TableView,
} from "@adapttable/angular/adapter";

@Component({
  selector: "adapt-data-table, adapt-ng-bootstrap-table",
  host: { class: "adapttable-ng-bootstrap", "[attr.data-bs-theme]": "theme()" },
  imports: [
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
export class AdaptDataTable<TRow> extends AdaptDataTableShell<TRow> {
  /** Bootstrap color mode, scoped to this table and its overlays. */
  readonly theme = input<"light" | "dark">("light");
}
