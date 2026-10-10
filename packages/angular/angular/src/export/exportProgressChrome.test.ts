/**
 * Export progress, the announcement, and the XLSX and PDF writers.
 */
import type { ExportProgressState } from "@adapttable/core";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import { featureOptionsOf } from "../featureHost";
import { exportPdf, exportXlsx } from "../features/export";
import { AdaptExportAnnouncer } from "./exportAnnouncer";
import {
  AdaptExportProgressChrome,
  type ExportProgressSlots,
} from "./exportProgressChrome";

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

@Component({
  template: `<div data-adapttable-part="export-progress-stub">
    {{ props().heading }}
  </div>`,
})
class SurfaceStub {
  readonly props = input.required<{ heading: string }>();
}

const SLOTS: ExportProgressSlots = { Surface: SurfaceStub };

const BUSY: ExportProgressState = {
  status: "busy",
  value: 40,
  message: "Working",
  error: "",
  downloadUrl: undefined,
  onCancel: () => undefined,
  onRetry: undefined,
  onDismiss: undefined,
};

@Component({
  imports: [AdaptExportProgressChrome],
  template: `
    <adapt-export-progress-chrome
      [progress]="progress()"
      [labels]="labels"
      [slots]="slots"
    />
  `,
})
class ChromeHost {
  readonly progress = input<ExportProgressState | null>(null);
  readonly labels = {};
  readonly slots = SLOTS;
}

@Component({
  imports: [AdaptExportAnnouncer],
  template: `<adapt-export-announcer [announcement]="announcement()" />`,
})
class AnnouncerHost {
  readonly announcement = input("");
}

describe("AdaptExportProgressChrome", () => {
  it("renders nothing until an export is reporting progress", () => {
    const fixture = TestBed.createComponent(ChromeHost);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    expect(part("export-progress-stub")).toBeNull();

    fixture.componentRef.setInput("progress", BUSY);
    fixture.detectChanges();
    expect(part("export-progress-stub")?.textContent?.trim()).not.toBe("");
  });
});

describe("AdaptExportAnnouncer", () => {
  it("is mounted empty, then says how the export ended", () => {
    const fixture = TestBed.createComponent(AnnouncerHost);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    expect(part("export-announcer")?.textContent).toBe("");

    fixture.componentRef.setInput("announcement", "Export ready");
    fixture.detectChanges();
    expect(part("export-announcer")?.textContent).toBe("Export ready");
  });
});

describe("export writers", () => {
  it("arms an xlsx writer, a pdf writer, or neither", () => {
    const xlsx = featureOptionsOf([exportXlsx()]);
    expect(xlsx.exportCsv).toMatchObject({
      writer: { extension: "xlsx" },
    });
    const named = featureOptionsOf([exportXlsx({ filename: "people.xlsx" })]);
    expect(named.exportCsv).toMatchObject({ filename: "people.xlsx" });
    expect(featureOptionsOf([exportXlsx(false)])).toEqual({ exportCsv: false });
    const pdf = featureOptionsOf([exportPdf()]);
    expect(pdf.exportCsv).toMatchObject({ writer: { extension: "pdf" } });
  });
});
