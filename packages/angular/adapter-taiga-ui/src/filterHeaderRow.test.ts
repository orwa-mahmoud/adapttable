import { chooseTaigaOption } from "./taigaTestHelpers";
import { AdaptTaigaRoot } from "./taigaRoot";
import {
  defaultLabels,
  type ExtraFilters,
  type FilterDef,
} from "@adapttable/core";
import {
  AdaptFilterHeaderControl,
  AdaptFilterHeaderRow,
} from "@adapttable/taiga-ui/header-filters";
import { Component, computed, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

/**
 * Native header-filter controls: the same writes the React kit's header
 * harness covers, drawn through the compact row.
 */

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
  imports: [AdaptTaigaRoot, AdaptFilterHeaderRow],
  template: `<adapt-taiga-root>
    <table>
      <thead>
        <adapt-filter-header-row
          [enabled]="enabled()"
          [columns]="columns"
          [defs]="defs"
          [source]="source()"
          [labels]="labels"
        />
      </thead>
    </table>
  </adapt-taiga-root>`,
})
class RowHost {
  readonly labels = defaultLabels;
  readonly columns = COLUMNS;
  readonly defs = DEFS;
  readonly enabled = signal(true);
  readonly extra = signal<ExtraFilters>({});
  readonly source = computed(() => memory(this.extra));
}

@Component({
  imports: [AdaptTaigaRoot, AdaptFilterHeaderControl],
  template: `<adapt-taiga-root>
    <adapt-filter-header-control
      [def]="def"
      [source]="source()"
      [labels]="labels"
    />
  </adapt-taiga-root>`,
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
  document.body.append(fixture.nativeElement as HTMLElement);
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
    const { element, labeled, fixture } = await mountRow();
    expect(
      element.querySelector('[data-adapttable-part="filter-header-row"]')
    ).not.toBeNull();
    expect(
      element.querySelector('[data-adapttable-part="filter-header-input"]')
    ).not.toBeNull();
    expect(
      element.querySelector('[data-adapttable-part="filter-header-menu"]')
    ).toBeNull();

    const name = labeled("Name")[0] as HTMLInputElement;
    name.value = "Ada";
    name.dispatchEvent(new Event("input"));
    await fixture.whenStable();
    expect(name.value).toBe("Ada");

    const team = labeled("Team")[0] as HTMLInputElement;
    await chooseTaigaOption(fixture, team, "Web");
    await fixture.whenStable();
    expect(team.value).toBe("Web");

    const tags = labeled("Tags").find((node) => node.tagName === "BUTTON");
    if (!tags) throw new Error("Tags filter trigger was not rendered");
    tags.click();
    await fixture.whenStable();
    expect(
      element.querySelector('[data-adapttable-part="filter-header-menu"]')
    ).not.toBeNull();
    const box = (caption: string) => {
      const label = [...element.querySelectorAll("label")].find((node) =>
        node.textContent?.includes(caption)
      );
      return label?.querySelector("input");
    };
    const first = box("A");
    const second = box("B");
    if (!first || !second) throw new Error("tag checkboxes are not rendered");
    first.click();
    await fixture.whenStable();
    second.click();
    await fixture.whenStable();
    expect(tags.textContent).toContain("2");

    const core = labeled("Core")[0] as HTMLInputElement;
    tags.click();
    await fixture.whenStable();
    await chooseTaigaOption(fixture, core, "true");
    await fixture.whenStable();
    expect(core.value).toBe(defaultLabels.boolTrue);

    const age = labeled("Age")[0] as HTMLInputElement;
    age.value = "30";
    age.dispatchEvent(new Event("input"));
    await fixture.whenStable();
    expect(age.value).toBe("30");

    const hired = labeled("Hired")[0] as HTMLInputElement;
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
    document.body.append(fixture.nativeElement as HTMLElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const select = (fixture.nativeElement as HTMLElement).querySelector(
      "input[tuiSelect]"
    );
    if (!select) throw new Error("Team filter is not rendered");
    await chooseTaigaOption(fixture, select, "Core");
    await fixture.whenStable();
    expect(select.value).toBe("Core");
  });
});
