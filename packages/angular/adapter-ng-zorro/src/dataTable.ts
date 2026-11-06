/**
 * The NG-ZORRO Angular table, over the headless `@adapttable/angular` binding.
 * State and callbacks stay in the binding; NG-ZORRO owns the visible controls.
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
  type KitEnvironment,
  type PaletteOpenState,
} from "@adapttable/angular/adapter";
import { BidiModule, Directionality } from "@angular/cdk/bidi";
import {
  FullscreenOverlayContainer,
  OverlayContainer,
} from "@angular/cdk/overlay";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NzBadgeModule } from "ng-zorro-antd/badge";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NZ_CONFIG } from "ng-zorro-antd/core/config";
import { NzEmptyModule } from "ng-zorro-antd/empty";
import { NzFlexModule } from "ng-zorro-antd/flex";
import { NZ_I18N } from "ng-zorro-antd/i18n";
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
import { ngZorroLibrary } from "./libraryEnvironment";

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
    // The Fullscreen API hides everything outside the promoted element, so
    // the table's selects, menus and popovers render into a CDK overlay
    // container that follows the page into fullscreen.
    { provide: OverlayContainer, useClass: FullscreenOverlayContainer },
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
  private readonly inheritedDirection = inject(Directionality, {
    optional: true,
  });
  private readonly i18n = inject(NZ_I18N, { optional: true });
  private readonly config = inject(NZ_CONFIG, { optional: true });
  private readonly sortSelect = viewChild<
    ElementRef<HTMLElement>,
    ElementRef<HTMLElement>
  >("sortSelect", { read: ElementRef });

  /** Label the kit's real combobox, rather than only its host. */
  protected readonly sortInput = (): HTMLElement | null =>
    this.sortSelect()?.nativeElement.querySelector("input") ?? null;

  protected override kitEnvironment(): KitEnvironment {
    return ngZorroLibrary({
      dir: this.inheritedDirection?.valueSignal(),
      locale: this.i18n?.locale,
      size: this.config?.table?.nzSize,
    });
  }
}
