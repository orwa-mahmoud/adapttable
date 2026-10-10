import {
  AdaptExportAnnouncer,
  AdaptExportProgressChrome,
  type ExportProgressSlots,
  type ExportProgressSurfaceSlotProps,
  type ToolbarExtrasSlotProps,
} from "@adapttable/angular/adapter";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { TAIGA_CONTROLS } from "../taigaControls";

/**
 * The toolbar's optional controls, drawn natively. Each renders through the
 * toolbar-extras slot, so a table that never composes a feature carries
 * neither its handler nor its button.
 */

/** Switches between comfortable and compact rows. @internal */
@Component({
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-density-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      tuiButton
      size="s"
      appearance="secondary"
      type="button"
      data-adapttable-part="density-toggle"
      [attr.aria-label]="p.labels.density"
      (click)="
        p.onDensityChange(p.density === 'compact' ? 'comfortable' : 'compact')
      "
    >
      {{
        p.density === "compact"
          ? p.labels.densityCompact
          : p.labels.densityComfortable
      }}
    </button>
  `,
})
export class AdaptDensityButton {
  /** The slot's props. */
  readonly props = input.required<ToolbarExtrasSlotProps>();
}

/** Takes the table fullscreen, and back. @internal */
@Component({
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-fullscreen-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    @if (p.onToggleFullscreen; as toggle) {
      <button
        tuiButton
        size="s"
        appearance="secondary"
        type="button"
        data-adapttable-part="fullscreen-toggle"
        [attr.aria-label]="
          p.isFullscreen ? p.labels.exitFullscreen : p.labels.enterFullscreen
        "
        (click)="toggle()"
      >
        {{ p.isFullscreen ? "✕" : "⛶" }}
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
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-export-progress-surface",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    <section
      [attr.aria-label]="p.heading"
      data-adapttable-part="export-progress-surface"
      style="position: fixed; z-index: 20; inset-inline-end: 16px; bottom: 16px; width: 320px; max-width: calc(100vw - 32px); padding: 16px; border: 1px solid currentColor; border-radius: 8px; background: Canvas; color: CanvasText"
    >
      <div style="display: flex; align-items: center; gap: 8px">
        <strong style="flex: 1">{{ p.heading }}</strong>
        @if (p.dismiss; as dismiss) {
          <button
            tuiButton
            size="s"
            appearance="secondary"
            type="button"
            data-adapttable-part="export-progress-dismiss"
            (click)="dismiss.onAction()"
          >
            {{ dismiss.label }}
          </button>
        }
      </div>
      @if (p.status === "busy") {
        <progress
          data-adapttable-part="export-progress-bar"
          max="100"
          [attr.value]="p.progress ?? null"
          [attr.aria-label]="p.progressLabel"
          style="display: block; width: 100%; margin-block: 12px"
        ></progress>
      }
      @if (p.message) {
        <p data-adapttable-part="export-progress-message">{{ p.message }}</p>
      }
      @if (p.error) {
        <p data-adapttable-part="export-progress-message">{{ p.error }}</p>
      }
      <div
        data-adapttable-part="export-progress-actions"
        style="display: flex; justify-content: flex-end; gap: 8px"
      >
        @if (p.cancel; as cancel) {
          <button
            tuiButton
            size="s"
            appearance="secondary"
            type="button"
            data-adapttable-part="export-progress-cancel"
            (click)="cancel.onAction()"
          >
            {{ cancel.label }}
          </button>
        }
        @if (p.retry; as retry) {
          <button
            tuiButton
            size="s"
            appearance="secondary"
            type="button"
            data-adapttable-part="export-progress-retry"
            (click)="retry.onAction()"
          >
            {{ retry.label }}
          </button>
        }
        @if (p.download; as download) {
          <a
            [href]="download.url"
            download
            data-adapttable-part="export-progress-download"
          >
            {{ download.label }}
          </a>
        }
      </div>
    </section>
  `,
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
  imports: [...TAIGA_CONTROLS, AdaptExportAnnouncer, AdaptExportProgressChrome],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    @if (p.onExportCsv; as start) {
      <button
        tuiButton
        size="s"
        appearance="secondary"
        type="button"
        data-adapttable-part="export-csv-button"
        style="flex-shrink: 0; white-space: nowrap"
        [disabled]="p.exportBusy === true || p.exportDisabled === true"
        [attr.aria-busy]="p.exportBusy ?? null"
        [attr.title]="p.exportDisabled ? p.exportDisabledReason : null"
        (click)="start()"
      >
        @if (p.exportBusy) {
          <span aria-hidden="true" data-taiga-part="export-spinner"></span>
        }
        {{ p.exportLabel }}
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
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-print-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    @if (p.onPrint; as print) {
      <button
        tuiButton
        size="s"
        appearance="secondary"
        type="button"
        data-adapttable-part="print-button"
        (click)="print()"
      >
        {{ p.printLabel }}
      </button>
    }
  `,
})
export class AdaptPrintButton {
  /** The slot's props. */
  readonly props = input.required<ToolbarExtrasSlotProps>();
}

/** Native controls for the table's edit history. @internal */
@Component({
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-undo-redo-buttons",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    @if (p.onUndo && p.onRedo) {
      <button
        tuiButton
        size="s"
        appearance="secondary"
        type="button"
        data-adapttable-part="undo-button"
        [class]="p.classNames?.['undoButton']"
        [disabled]="p.canUndo !== true"
        (click)="p.onUndo()"
      >
        {{ p.undoLabel }}
      </button>
      <button
        tuiButton
        size="s"
        appearance="secondary"
        type="button"
        data-adapttable-part="redo-button"
        [class]="p.classNames?.['redoButton']"
        [disabled]="p.canRedo !== true"
        (click)="p.onRedo()"
      >
        {{ p.redoLabel }}
      </button>
    }
  `,
})
export class AdaptUndoRedoButtons {
  /** The current history controls and labels. */
  readonly props = input.required<ToolbarExtrasSlotProps>();
}
