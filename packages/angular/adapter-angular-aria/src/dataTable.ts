/**
 * The Angular Aria Angular table: semantic HTML with `data-adapttable-part`
 * hooks and no styles of its own, over `@adapttable/angular`. Native HTML is
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
import { Directionality } from "@angular/cdk/bidi";
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
  host: { class: "adapt-aria" },
  selector: "adapt-data-table",
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
  private readonly inheritedDirection = inject(Directionality, {
    optional: true,
  });

  /**
   * Angular Aria takes direction from CDK `Directionality`. It has no
   * runtime locale, density, or motion setting for the table's chrome.
   */
  protected override kitEnvironment(): KitEnvironment {
    const dir = this.inheritedDirection?.valueSignal();
    return dir === undefined ? {} : { dir };
  }
}
