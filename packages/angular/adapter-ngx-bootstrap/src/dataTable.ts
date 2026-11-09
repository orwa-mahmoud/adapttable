/**
 * The ngx-bootstrap Angular table: Bootstrap controls with `data-adapttable-part`
 * hooks and isolated Bootstrap styling, over `@adapttable/angular`. Native HTML is
 * this kit's kit, so every control a reader uses is the browser's own.
 */
import {
  AdaptAttrs,
  AdaptDataTableShell,
  AdaptGridFocusAnnouncer,
  AdaptIcon,
  AdaptSlot,
  AdaptTableStatusAnnouncer,
  provideAdaptTableState,
} from "@adapttable/angular/adapter";
import { NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

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
  selector: "adapt-data-table, adapt-ngx-bootstrap-table",
  host: {
    class: "adapttable-ngx-bootstrap",
    "[attr.data-bs-theme]": "theme()",
    "[attr.dir]": "dir()",
  },
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
  providers: [provideAdaptTableState()],
})
export class AdaptDataTable<TRow> extends AdaptDataTableShell<TRow> {
  /** Bootstrap color mode, scoped to this table and its overlays. */
  readonly theme = input<"light" | "dark">("light");
}
