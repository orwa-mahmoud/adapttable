/**
 * The NG-ZORRO Angular table, over the headless `@adapttable/angular` binding.
 * State and callbacks stay in the binding; NG-ZORRO owns the visible controls.
 */
import {
  AdaptAttrs,
  AdaptDataTableShell,
  AdaptGridFocusAnnouncer,
  AdaptIcon,
  AdaptSlot,
  ADAPTTABLE_CONTEXT_MENU,
  ADAPTTABLE_FIND_STATE,
  ADAPTTABLE_PALETTE_OPEN,
  AdaptTableStatusAnnouncer,
  type ContextMenuRegionHandlers,
  type FindInTableState,
  type PaletteOpenState,
} from "@adapttable/angular";
import { BidiModule } from "@angular/cdk/bidi";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  signal,
  viewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NzBadgeModule } from "ng-zorro-antd/badge";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzEmptyModule } from "ng-zorro-antd/empty";
import { NzFlexModule } from "ng-zorro-antd/flex";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzSelectModule } from "ng-zorro-antd/select";
import { NzSpinModule } from "ng-zorro-antd/spin";

import { AdaptDesktopTable } from "./components/desktopTable";
import { AdaptErrorState } from "./components/errorState";
import { AdaptMobileCards } from "./components/mobileCards";
import { AdaptOverlayOrigin } from "./components/overlayPlacement";
import { AdaptPaginationFooter } from "./components/paginationFooter";
import { AdaptTableRegion } from "./components/tableRegion";
import { AdaptTableSkeleton } from "./components/tableSkeleton";

export type {
  BodyCellView,
  BodyRow,
  BodySlot,
  RowActionsCell,
  TableView,
} from "@adapttable/angular";

@Component({
  selector: "adapt-data-table",
  imports: [
    AdaptOverlayOrigin,
    FormsModule,
    NzBadgeModule,
    NzButtonModule,
    BidiModule,
    NzEmptyModule,
    NzFlexModule,
    NzInputModule,
    NzSelectModule,
    NzSpinModule,
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
  private readonly sortSelect = viewChild<
    ElementRef<HTMLElement>,
    ElementRef<HTMLElement>
  >("sortSelect", { read: ElementRef });

  /** Label the kit's real combobox, rather than only its host. */
  protected readonly sortInput = (): HTMLElement | null =>
    this.sortSelect()?.nativeElement.querySelector("input") ?? null;
}
