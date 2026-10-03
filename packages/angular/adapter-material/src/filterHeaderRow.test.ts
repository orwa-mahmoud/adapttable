/**
 * Native header-filter controls: the same writes the React kit's header
 * harness covers, drawn through the compact row.
 */
import {
  AdaptFilterHeaderControl,
  AdaptFilterHeaderRow,
} from "@adapttable/angular-material/header-filters";
import {
  defaultLabels,
  type ExtraFilters,
  type FilterDef,
} from "@adapttable/core";
import { Component, computed, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { MatInput } from "@angular/material/input";
import { MatSelect } from "@angular/material/select";
import { By } from "@angular/platform-browser";
import { describe, expect, it } from "vitest";

interface Row {
  name: string;
  team: string;
  tags: string[];
  core: boolean;
  age: number;
  hired: string;
}

const DEFS: FilterDef<Row>[] = [
  { key: "name", type: "text", label: "Name" },
  {
    key: "team",
    type: "select",
    label: "Team",
    options: [
      { value: "Core", label: "Core" },
      { value: "Web", label: "Web" },
    ],
  },
  {
    key: "tags",
    type: "multiSelect",
    label: "Tags",
    options: [
      { value: "a", label: "A" },
      { value: "b", label: "B" },
    ],
  },
  { key: "core", type: "boolean", label: "Core" },
  { key: "age", type: "numberRange", label: "Age" },
  { key: "hired", type: "dateRange", label: "Hired" },
];

const COLUMNS = [
  { key: "name" },
  { key: "team" },
  { key: "tags" },
  { key: "core" },
  { key: "age" },
  { key: "hired" },
];

function memory(extra: ReturnType<typeof signal<ExtraFilters>>) {
  return {
    get extra() {
      return extra();
    },
    setExtra: (key: string, value: ExtraFilters[string]) => {
      extra.update((prev) => ({ ...prev, [key]: value }));
    },
    setExtras: (patch: ExtraFilters) => {
      extra.update((prev) => ({ ...prev, ...patch }));
    },
    allFilteredRows: [] as Row[],
    facets: {},
  };
}

@Component({
  imports: [AdaptFilterHeaderRow],
  template: `
    <table>
      <thead>
        <adapt-filter-header-row
          [enabled]="enabled()"
          [columns]="columns"
          [defs]="defs"
          [source]="source()"
          [labels]="labels"
          [classNames]="classes"
        />
      </thead>
    </table>
  `,
})
class RowHost {
  readonly labels = defaultLabels;
  readonly columns = COLUMNS;
  readonly defs = DEFS;
  readonly classes = {
    filterHeaderInput: "custom-header-input",
    filterHeaderMenu: "custom-header-menu",
  };
  readonly enabled = signal(true);
  readonly extra = signal<ExtraFilters>({});
  readonly source = computed(() => memory(this.extra));
}

@Component({
  imports: [AdaptFilterHeaderControl],
  template: `
    <adapt-filter-header-control
      [def]="def"
      [source]="source()"
      [labels]="labels"
    />
  `,
})
class ControlHost {
  readonly labels = defaultLabels;
  readonly def = DEFS[1]!;
  readonly extra = signal<ExtraFilters>({});
  readonly source = computed(() => memory(this.extra));
}

async function mountRow(prepare?: (host: RowHost) => void) {
  const fixture = TestBed.createComponent(RowHost);
  prepare?.(fixture.componentInstance);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const labeled = (name: string) =>
    [...element.querySelectorAll<HTMLElement>("[aria-label]")].filter(
      (node) => node.getAttribute("aria-label") === name
    );
  return { fixture, element, labeled, host: fixture.componentInstance };
}

describe("AdaptFilterHeaderRow", () => {
  it("writes every compact header widget", async () => {
    const { element, labeled, fixture, host } = await mountRow();
    expect(
      element.querySelector('[data-adapttable-part="filter-header-row"]')
    ).not.toBeNull();
    expect(
      element.querySelector('[data-adapttable-part="filter-header-input"]')
    ).not.toBeNull();
    expect(
      document.querySelector('[data-adapttable-part="filter-header-menu"]')
    ).toBeNull();

    const name = labeled("Name")[0] as HTMLInputElement;
    name.value = "Ada";
    name.dispatchEvent(new Event("input"));
    await fixture.whenStable();
    expect(name.value).toBe("Ada");

    const team = labeled("Team")[0] as HTMLSelectElement;
    team.value = "Web";
    team.dispatchEvent(new Event("change"));
    await fixture.whenStable();
    expect(team.value).toBe("Web");

    const tags = labeled("Tags").find((node) => node.tagName === "MAT-SELECT");
    if (!tags) throw new Error("Tags filter trigger was not rendered");
    const select = fixture.debugElement
      .query(By.directive(MatSelect))
      .injector.get(MatSelect);
    const menu = () =>
      document.querySelector('[data-adapttable-part="filter-header-menu"]');
    expect(tags.classList.contains("custom-header-input")).toBe(true);
    tags.click();
    await fixture.whenStable();
    expect(select.panelOpen).toBe(true);
    const panel = select.panel.nativeElement as HTMLElement;
    expect(menu()).toBe(panel);
    expect(panel.getAttribute("role")).toBe("listbox");
    expect(panel.classList.contains("adapt-material-overlay")).toBe(true);
    expect(panel.classList.contains("custom-header-menu")).toBe(true);
    const option = (caption: string) =>
      [...document.querySelectorAll<HTMLElement>("mat-option")].find(
        (node) => node.textContent?.trim() === caption
      );
    const first = option("A");
    const second = option("B");
    if (!first || !second) throw new Error("tag choices are not rendered");
    first.click();
    await fixture.whenStable();
    second.click();
    await fixture.whenStable();
    expect(tags.textContent).toContain("2");
    expect(host.extra().tags).toEqual(["a", "b"]);
    const closeTags = async () => {
      tags.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          keyCode: 27,
          bubbles: true,
        })
      );
      await fixture.whenStable();
      expect(select.panelOpen).toBe(false);
      expect(menu()).toBeNull();
    };
    await closeTags();
    tags.click();
    await fixture.whenStable();
    expect(select.panelOpen).toBe(true);
    const reopenedPanel = select.panel.nativeElement as HTMLElement;
    expect(reopenedPanel).not.toBe(panel);
    expect(menu()).toBe(reopenedPanel);
    expect(reopenedPanel.classList.contains("adapt-material-overlay")).toBe(
      true
    );
    expect(reopenedPanel.classList.contains("custom-header-menu")).toBe(true);
    const reopenedFirst = option("A");
    const reopenedSecond = option("B");
    if (!reopenedFirst || !reopenedSecond)
      throw new Error("tag choices were not restored on reopen");
    expect(reopenedFirst.getAttribute("aria-selected")).toBe("true");
    expect(reopenedSecond.getAttribute("aria-selected")).toBe("true");
    reopenedFirst.click();
    await fixture.whenStable();
    expect(host.extra().tags).toEqual(["b"]);
    expect(tags.textContent).toContain("B");
    await closeTags();

    const core = labeled("Core")[0] as HTMLSelectElement;
    core.value = "true";
    core.dispatchEvent(new Event("change"));
    await fixture.whenStable();
    expect(core.value).toBe("true");

    const age = labeled("Age")[0] as HTMLInputElement;
    expect(age.type).toBe("number");
    expect(
      fixture.debugElement
        .query(By.css('input[aria-label="Age"]'))
        .injector.get(MatInput).type
    ).toBe("number");
    age.value = "30";
    age.dispatchEvent(new Event("input"));
    await fixture.whenStable();
    expect(age.value).toBe("30");

    const hired = labeled("Hired")[0] as HTMLInputElement;
    expect(hired.type).toBe("date");
    expect(
      fixture.debugElement
        .query(By.css('input[aria-label="Hired"]'))
        .injector.get(MatInput).type
    ).toBe("date");
    hired.value = "2024-01-01";
    hired.dispatchEvent(new Event("input"));
    await fixture.whenStable();
    expect(hired.value).toBe("2024-01-01");
  });

  it("writes the upper bound of a between pair", async () => {
    const { labeled, fixture } = await mountRow((host) => {
      host.extra.set({ ageOp: "between", ageMin: "10", ageMax: "40" });
    });
    const bounds = labeled("Age") as HTMLInputElement[];
    expect(bounds).toHaveLength(2);
    const upper = bounds[1];
    if (!upper) throw new Error("upper bound is not rendered");
    upper.value = "50";
    upper.dispatchEvent(new Event("input"));
    await fixture.whenStable();
    expect(upper.value).toBe("50");
  });

  it("renders nothing when the row is disabled", async () => {
    const { element, host, fixture } = await mountRow((current) => {
      current.enabled.set(false);
    });
    expect(
      element.querySelector('[data-adapttable-part="filter-header-row"]')
    ).toBeNull();
    host.enabled.set(true);
    await fixture.whenStable();
    expect(
      element.querySelector('[data-adapttable-part="filter-header-row"]')
    ).not.toBeNull();
  });

  it("renders a lone header control", async () => {
    const fixture = TestBed.createComponent(ControlHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const select = (fixture.nativeElement as HTMLElement).querySelector(
      "select"
    );
    if (!select) throw new Error("Team filter is not rendered");
    select.value = "Core";
    select.dispatchEvent(new Event("change"));
    await fixture.whenStable();
    expect(select.value).toBe("Core");
  });
});
