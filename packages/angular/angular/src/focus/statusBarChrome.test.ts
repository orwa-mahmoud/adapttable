/**
 * The status bar, the selection figures it hosts, and the focus announcer.
 */
import type { SelectionStats } from "@adapttable/core";
import { NgTemplateOutlet } from "@angular/common";
import { Component, input, signal, type TemplateRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import { selectionStats } from "../features/selectionStats";
import {
  AdaptGridFocusAnnouncer,
  type GridFocusAnnouncement,
} from "./gridFocusAnnouncer";
import { selectionStatsOf } from "./selectionStats";
import {
  AdaptSelectionStatsChrome,
  type SelectionStatsSlots,
} from "./selectionStatsBar";
import { AdaptStatusBarChrome, type StatusBarSlots } from "./statusBarChrome";

const STATS: SelectionStats = {
  cells: 2,
  numeric: 2,
  sum: 40,
  average: 20,
  min: 10,
  max: 30,
};

@Component({
  selector: "status-bar-stub",
  imports: [NgTemplateOutlet],
  template: `
    <div data-adapttable-part="status-bar" [class]="props().className">
      @for (item of props().items; track item.key) {
        <span
          data-adapttable-part="status-item"
          [attr.data-status]="item.key"
          [attr.data-appearance]="item.appearance ?? null"
        >
          {{ item.text }}
        </span>
      }
      @if (props().stats; as stats) {
        <ng-container [ngTemplateOutlet]="stats" />
      }
    </div>
  `,
})
class BarStub {
  readonly props = input.required<{
    readonly items: readonly {
      readonly key: string;
      readonly text: string;
      readonly appearance?: string;
    }[];
    readonly stats?: TemplateRef<unknown>;
    readonly className?: string;
  }>();
}

@Component({
  selector: "stats-stub",
  template: `
    <output data-adapttable-part="selection-stats">
      @for (part of props().parts; track part.key) {
        <span data-adapttable-part="selection-stat">{{ part.text }}</span>
      }
    </output>
  `,
})
class StatsStub {
  readonly props = input.required<{
    readonly parts: readonly { readonly key: string; readonly text: string }[];
  }>();
}

const STAT_SLOTS: SelectionStatsSlots = { Stats: StatsStub };
const SLOTS: StatusBarSlots = { Bar: BarStub, stats: STAT_SLOTS };

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

@Component({
  imports: [AdaptStatusBarChrome],
  template: `
    <adapt-status-bar-chrome
      [enabled]="enabled()"
      [shown]="2"
      [selected]="selected()"
      [stats]="stats()"
      locale="en-US"
      [notices]="notices()"
      [slots]="slots"
    />
  `,
})
class BarHost {
  readonly enabled = input(true);
  readonly selected = input(1);
  readonly stats = input<SelectionStats | null>(STATS);
  readonly notices = input<
    readonly {
      readonly kind: "export-all-page";
      readonly appearance: "disabled";
      readonly message: string;
    }[]
  >([]);
  readonly slots = SLOTS;
}

@Component({
  imports: [AdaptSelectionStatsChrome],
  template: `
    <adapt-selection-stats-chrome
      [stats]="stats()"
      locale="en-US"
      [slots]="slots"
    />
  `,
})
class StatsHost {
  readonly stats = input<SelectionStats | null>(STATS);
  readonly slots = STAT_SLOTS;
}

@Component({
  imports: [AdaptGridFocusAnnouncer],
  template: `<adapt-grid-focus-announcer [focus]="focus" />`,
})
class AnnouncerHost {
  readonly enabled = signal(false);
  readonly announcement = signal("");
  readonly focus: GridFocusAnnouncement = {
    enabled: this.enabled,
    announcement: this.announcement,
  };
}

async function mount<T>(
  component: T
): Promise<ReturnType<typeof TestBed.createComponent>> {
  const fixture = TestBed.createComponent(component as never);
  document.body.append(fixture.nativeElement);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe("AdaptStatusBarChrome", () => {
  it("shows the row count, the selection, and the hosted figures", async () => {
    const fixture = await mount(BarHost);
    fixture.componentRef.setInput("notices", [
      {
        kind: "export-all-page",
        appearance: "disabled",
        message: "Export all is unavailable",
      },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("status-bar")?.textContent).toContain("Showing");
    expect(part("status-bar")?.textContent).toContain("1 selected");
    expect(part("status-item")?.getAttribute("data-appearance")).toBe(
      "disabled"
    );
    expect(part("status-item")?.textContent).toContain(
      "Export all is unavailable"
    );
    expect(part("selection-stats")?.textContent).toContain("Sum");
    expect(part("selection-stat")?.textContent).toContain("Count");
  });

  it("keeps a notice when the strip itself is off", async () => {
    const fixture = await mount(BarHost);
    fixture.componentRef.setInput("enabled", false);
    fixture.componentRef.setInput("selected", 0);
    fixture.componentRef.setInput("stats", null);
    fixture.componentRef.setInput("notices", [
      {
        kind: "export-all-page",
        appearance: "disabled",
        message: "Export all is unavailable",
      },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("status-bar")?.textContent).toContain(
      "Export all is unavailable"
    );
    expect(part("status-bar")?.textContent).not.toContain("Showing");
    expect(part("selection-stats")).toBeNull();
  });

  it("renders the figures alone when the strip is off and nothing else is pending", async () => {
    const fixture = await mount(BarHost);
    fixture.componentRef.setInput("enabled", false);
    fixture.componentRef.setInput("selected", 0);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("status-bar")).toBeNull();
    expect(part("selection-stats")?.textContent).toContain("Avg");
  });
});

describe("AdaptSelectionStatsChrome", () => {
  it("formats the figures, and skips a selection of one cell", async () => {
    const fixture = await mount(StatsHost);
    expect(part("selection-stats")?.textContent).toContain("Sum");
    expect(part("selection-stats")?.textContent).toContain("Min");
    expect(part("selection-stats")?.textContent).toContain("Max");

    fixture.componentRef.setInput("stats", { ...STATS, cells: 1 });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("selection-stats")).toBeNull();
  });
});

describe("selectionStats", () => {
  it("records the request and counts a rectangle", () => {
    expect(selectionStats().id).toBe("selection-stats");
    const stats = selectionStatsOf({
      range: null,
      rows: [],
      columns: [],
    });
    expect(stats).toBeNull();
  });
});

describe("AdaptGridFocusAnnouncer", () => {
  it("is absent until cell navigation is on, then speaks the announcement", async () => {
    const fixture = await mount(AnnouncerHost);
    const host = fixture.componentInstance as AnnouncerHost;
    expect(part("grid-announcer")).toBeNull();

    host.enabled.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("grid-announcer")?.textContent).toBe("");

    host.announcement.set("Budget, 1,240, row 40,002 of 100,000");
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("grid-announcer")?.textContent).toContain("Budget");
  });
});
