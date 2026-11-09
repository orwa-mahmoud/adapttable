/**
 * The ng-bootstrap Angular table: Bootstrap controls with `data-adapttable-part`
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
import { ADAPTTABLE_KIT_MOTION_OFF } from "@adapttable/angular";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from "@angular/core";
import { NgbConfig } from "@ng-bootstrap/ng-bootstrap";

import { AdaptDesktopTable } from "./components/desktopTable";
import { AdaptErrorState } from "./components/errorState";
import { AdaptMobileCards } from "./components/mobileCards";
import { AdaptPaginationFooter } from "./components/paginationFooter";
import { AdaptTableRegion } from "./components/tableRegion";
import { AdaptTableSkeleton } from "./components/tableSkeleton";
import { ngBootstrapMotionOff } from "./libraryEnvironment";

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
      provide: ADAPTTABLE_KIT_MOTION_OFF,
      useFactory: () => ngBootstrapMotionOff(inject(NgbConfig)),
    },
    provideAdaptTableState(),
  ],
})
export class AdaptDataTable<TRow> extends AdaptDataTableShell<TRow> {
  /** Bootstrap color mode, scoped to this table and its overlays. */
  readonly theme = input<"light" | "dark">("light");
}
