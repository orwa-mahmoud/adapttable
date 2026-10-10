/**
 * The toolbar's optional controls, drawn with NG-ZORRO. Each renders through the
 * toolbar-extras slot, so a table that never composes a feature carries
 * neither its handler nor its button.
 */
import {
  AdaptExportAnnouncer,
  AdaptExportProgressChrome,
  type ExportProgressSlots,
  type ExportProgressSurfaceSlotProps,
  type ToolbarExtrasSlotProps,
} from "@adapttable/angular/adapter";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzFlexModule } from "ng-zorro-antd/flex";
import { NzProgressModule } from "ng-zorro-antd/progress";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzTypographyModule } from "ng-zorro-antd/typography";

/** Switches between comfortable and compact rows. @internal */
@Component({
  selector: "adapt-density-button",
  imports: [NzButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      nz-button
      nzSize="small"
      type="button"
      data-adapttable-part="density-toggle"
      [attr.aria-label]="p.labels.density"
      (click)="
        p.onDensityChange(p.density === 'compact' ? 'comfortable' : 'compact')
      "
    >
      <span
        >{{
          p.density === "compact"
            ? p.labels.densityCompact
            : p.labels.densityComfortable
        }}
      </span>
    </button>
  `,
})
export class AdaptDensityButton {
  /** The slot's props. */
  readonly props = input.required<ToolbarExtrasSlotProps>();
}

/** Takes the table fullscreen, and back. @internal */
@Component({
  selector: "adapt-fullscreen-button",
  imports: [NzButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    @if (p.onToggleFullscreen; as toggle) {
      <button
        nz-button
        nzSize="small"
        type="button"
        data-adapttable-part="fullscreen-toggle"
        [attr.aria-label]="
          p.isFullscreen ? p.labels.exitFullscreen : p.labels.enterFullscreen
        "
        (click)="toggle()"
      >
        <span>{{ p.isFullscreen ? "✕" : "⛶" }} </span>
      </button>
    }
  `,
})
export class AdaptFullscreenButton {
  /** The slot's props. */
  readonly props = input.required<ToolbarExtrasSlotProps>();
}

/** The server-export progress surface. @internal */
@Component({
  selector: "adapt-export-progress-surface",
  imports: [
    NzButtonModule,
    NzCardModule,
    NzFlexModule,
    NzProgressModule,
    NzSpinModule,
    NzTypographyModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./toolbarExtras.html",
})
export class AdaptExportProgressSurface {
  /** The view from the progress chrome. */
  readonly props = input.required<ExportProgressSurfaceSlotProps>();
}

const EXPORT_SLOTS: ExportProgressSlots = {
  Surface: AdaptExportProgressSurface,
};

/** Exports the current view, and says how it went. @internal */
@Component({
  selector: "adapt-export-button",
  imports: [
    AdaptExportAnnouncer,
    AdaptExportProgressChrome,
    NzButtonModule,
    NzSpinModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    @if (p.onExportCsv; as start) {
      <button
        nz-button
        nzSize="small"
        type="button"
        data-adapttable-part="export-csv-button"
        style="flex-shrink: 0; white-space: nowrap"
        [disabled]="p.exportBusy === true || p.exportDisabled === true"
        [attr.aria-busy]="p.exportBusy ?? null"
        [attr.title]="p.exportDisabled ? p.exportDisabledReason : null"
        (click)="start()"
      >
        @if (p.exportBusy) {
          <nz-spin aria-hidden="true" nzSize="small" />
        }
        <span>{{ p.exportLabel }} </span>
      </button>
      <adapt-export-progress-chrome
        [progress]="p.exportProgressState ?? null"
        [labels]="p.labels"
        [slots]="slots"
      />
      <adapt-export-announcer [announcement]="p.exportAnnouncement ?? ''" />
    }
  `,
})
export class AdaptExportButton {
  /** The slot's props. */
  readonly props = input.required<ToolbarExtrasSlotProps>();

  /** The progress surface. */
  protected readonly slots = EXPORT_SLOTS;
}

/** Prints the table. @internal */
@Component({
  selector: "adapt-print-button",
  imports: [NzButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    @if (p.onPrint; as print) {
      <button
        nz-button
        nzSize="small"
        type="button"
        data-adapttable-part="print-button"
        (click)="print()"
      >
        <span>{{ p.printLabel }} </span>
      </button>
    }
  `,
})
export class AdaptPrintButton {
  /** The slot's props. */
  readonly props = input.required<ToolbarExtrasSlotProps>();
}

/** NG-ZORRO controls for the table's edit history. @internal */
@Component({
  selector: "adapt-undo-redo-buttons",
  imports: [NzButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    @if (p.onUndo && p.onRedo) {
      <button
        nz-button
        nzSize="small"
        type="button"
        data-adapttable-part="undo-button"
        [class]="p.classNames?.['undoButton']"
        [disabled]="p.canUndo !== true"
        (click)="p.onUndo()"
      >
        <span>{{ p.undoLabel }} </span>
      </button>
      <button
        nz-button
        nzSize="small"
        type="button"
        data-adapttable-part="redo-button"
        [class]="p.classNames?.['redoButton']"
        [disabled]="p.canRedo !== true"
        (click)="p.onRedo()"
      >
        <span>{{ p.redoLabel }} </span>
      </button>
    }
  `,
})
export class AdaptUndoRedoButtons {
  /** The current history controls and labels. */
  readonly props = input.required<ToolbarExtrasSlotProps>();
}
