import {
  AdaptAttrs,
  AdaptDataTableShell,
  AdaptGridFocusAnnouncer,
  AdaptIcon,
  AdaptSlot,
  ADAPTTABLE_KIT_MOTION_OFF,
  AdaptTableStatusAnnouncer,
  type KitEnvironment,
  provideAdaptTableState,
} from "@adapttable/angular/adapter";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  ViewEncapsulation,
} from "@angular/core";
import { TUI_ANIMATIONS_SPEED, TUI_REDUCED_MOTION } from "@taiga-ui/core";
import { TUI_LANGUAGE } from "@taiga-ui/i18n";

import { AdaptDesktopTable } from "./components/desktopTable";
import { AdaptErrorState } from "./components/errorState";
import { AdaptMobileCards } from "./components/mobileCards";
import { AdaptPaginationFooter } from "./components/paginationFooter";
import { AdaptTableRegion } from "./components/tableRegion";
import { AdaptTableSkeleton } from "./components/tableSkeleton";
import { taigaLibrary, taigaMotionOff } from "./libraryEnvironment";
import { TAIGA_CONTROLS } from "./taigaControls";
import { AdaptTaigaRoot } from "./taigaRoot";

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
    AdaptTaigaRoot,
    ...TAIGA_CONTROLS,
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
  styleUrl: "./dataTable.css",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: ADAPTTABLE_KIT_MOTION_OFF,
      useFactory: () =>
        signal(
          taigaMotionOff(
            inject(TUI_REDUCED_MOTION),
            inject(TUI_ANIMATIONS_SPEED)
          )
        ),
    },
    provideAdaptTableState(),
  ],
})
export class AdaptDataTable<TRow> extends AdaptDataTableShell<TRow> {
  private readonly language = inject(TUI_LANGUAGE);

  /**
   * Taiga's `TUI_LANGUAGE`. The default English pack stays unset. Arabic
   * and Hebrew do not imply a direction: Taiga follows the page `dir`.
   * `TUI_ANIMATIONS_SPEED` of `0`, or `TUI_REDUCED_MOTION`, turns motion off.
   * Taiga has no app-wide size setting.
   */
  protected override kitEnvironment(): KitEnvironment {
    return taigaLibrary(this.language().name);
  }
}
