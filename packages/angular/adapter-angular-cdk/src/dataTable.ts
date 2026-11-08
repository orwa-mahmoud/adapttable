/**
 * The CDK Angular table: semantic HTML with `data-adapttable-part`
 * hooks and adapter-owned neutral styles, over `@adapttable/angular`. Native HTML is
 * this kit's kit, so every control a reader uses is the browser's own.
 */
import {
  AdaptAttrs,
  AdaptDataTableShell,
  AdaptGridFocusAnnouncer,
  AdaptIcon,
  AdaptSlot,
  AdaptTableStatusAnnouncer,
  type KitEnvironment,
  provideAdaptTableState,
} from "@adapttable/angular/adapter";
import { A11yModule } from "@angular/cdk/a11y";
import { Dir, Directionality } from "@angular/cdk/bidi";
import { NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject } from "@angular/core";

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
  selector: "adapt-data-table",
  imports: [
    A11yModule,
    Dir,
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
  private readonly inheritedDirection = inject(Directionality, {
    optional: true,
  });

  /** CDK's `Directionality`: the closest `dir`, or the document. */
  protected override kitEnvironment(): KitEnvironment {
    const dir = this.inheritedDirection?.valueSignal();
    return dir === undefined ? {} : { dir };
  }
}
