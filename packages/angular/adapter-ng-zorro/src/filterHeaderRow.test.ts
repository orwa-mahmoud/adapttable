/**
 * NG-ZORRO header-filter controls: the same writes the React kit's header
 * harness covers, drawn through the compact row.
 */
import {
  defaultFilterRegistry,
  type FilterHeaderControlProps,
} from "@adapttable/angular";
import {
  defaultLabels,
  type ExtraFilters,
  type FilterDef,
} from "@adapttable/core";
import {
  AdaptFilterHeaderControl,
  AdaptFilterHeaderRow,
} from "@adapttable/ng-zorro/header-filters";
import { Component, computed, signal } from "@angular/core";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { getAllByLabelText, getByLabelText } from "@testing-library/dom";
import { describe, expect, it, vi } from "vitest";

import { AdaptHeaderFilterTrigger } from "../header-filters/headerFilterTrigger";

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
          [classNames]="{
            filterHeaderInput: 'custom-input',
            filterHeaderMenu: 'custom-menu',
          }"
        />
      </thead>
    </table>
  `,
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

@Component({
  imports: [AdaptHeaderFilterTrigger],
  template: `
    <div [dir]="direction()">
      <button type="button" class="outside">Outside</button>
      <adapt-header-filter-trigger [props]="props()" />
    </div>
  `,
})
class TriggerHost {
  readonly direction = signal<"ltr" | "rtl">("ltr");
  readonly extra = signal<ExtraFilters>({});
  readonly closeOnSelect = signal(false);
  readonly explicitRegistry = signal(false);
  readonly props = computed((): FilterHeaderControlProps<never> => ({
    def: {
      key: "team",
      type: "select",
      label: "Team",
      options: [
        { value: "Core", label: "Core" },
        { value: "Web", label: "Web" },
      ],
    },
    source: { ...memory(this.extra), allFilteredRows: [] },
    labels: defaultLabels,
    closeOnSelect: this.closeOnSelect(),
    ...(this.explicitRegistry() ? { registry: defaultFilterRegistry } : {}),
  }));
}

async function mountTrigger(prepare?: (host: TriggerHost) => void) {
  const fixture = TestBed.createComponent(TriggerHost);
  prepare?.(fixture.componentInstance);
  document.body.append(fixture.nativeElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const trigger = getByLabelText<HTMLButtonElement>(element, "Team");
  const panel = () =>
    document.querySelector<HTMLElement>(
      '[data-adapttable-part="filter-header-cell"]'
    );
  trigger.focus();
  trigger.click();
  await fixture.whenStable();
  return { fixture, element, trigger, panel, host: fixture.componentInstance };
}

async function mountRow(prepare?: (host: RowHost) => void) {
  const fixture = TestBed.createComponent(RowHost);
  prepare?.(fixture.componentInstance);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  document.body.append(element);
  const labeled = (name: string) =>
    getAllByLabelText<HTMLElement>(element, name);
  return { fixture, element, labeled, host: fixture.componentInstance };
}

async function selectOption<T>(
  fixture: ComponentFixture<T>,
  input: HTMLElement,
  caption: string
): Promise<void> {
  const select = input.closest("nz-select");
  if (!select) throw new Error("NG-ZORRO select is not rendered");
  select.querySelector<HTMLElement>("nz-select-top-control")!.click();
  await fixture.whenStable();
  const option = [
    ...document.querySelectorAll<HTMLElement>("nz-option-item"),
  ].find((node) => node.getAttribute("title") === caption);
  if (!option) throw new Error(`Option ${caption} is not rendered`);
  option.click();
  await fixture.whenStable();
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("AdaptFilterHeaderRow", () => {
  it("writes every compact header widget", async () => {
    const { element, labeled, fixture } = await mountRow();
    expect(
      element.querySelector('[data-adapttable-part="filter-header-row"]')
    ).not.toBeNull();
    expect(
      element.querySelector('[data-adapttable-part="filter-header-input"]')
    ).not.toBeNull();

    const name = labeled("Name")[0] as HTMLInputElement;
    name.value = "Ada";
    name.dispatchEvent(new Event("input"));
    await fixture.whenStable();
    expect(name.value).toBe("Ada");
    expect(name.classList.contains("ant-input")).toBe(true);
    expect(name.classList.contains("custom-input")).toBe(true);

    const team = labeled("Team")[0]!;
    await selectOption(fixture, team, "Web");
    expect(team.closest("nz-select")?.textContent).toContain("Web");
    expect(fixture.componentInstance.extra().team).toEqual(["Web"]);

    const tags = labeled("Tags").find((node) => node.tagName === "BUTTON");
    if (!tags) throw new Error("Tags filter trigger was not rendered");
    tags.click();
    await fixture.whenStable();
    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-adapttable-part="filter-header-menu"]')
      ).not.toBeNull();
    });
    const menu = document.querySelector(
      '[data-adapttable-part="filter-header-menu"]'
    );
    expect(menu).not.toBeNull();
    expect(menu?.classList.contains("custom-menu")).toBe(true);
    const box = (caption: string) =>
      getByLabelText<HTMLInputElement>(document.body, caption);
    const first = box("A");
    const second = box("B");
    if (!first || !second) throw new Error("tag checkboxes are not rendered");
    first.click();
    await fixture.whenStable();
    second.click();
    await fixture.whenStable();
    expect(tags.textContent).toContain("2");

    tags.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    await fixture.whenStable();
    expect(tags.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(tags);
    const core = labeled("Core")[0]!;
    await selectOption(fixture, core, defaultLabels.boolTrue);
    expect(core.closest("nz-select")?.textContent).toContain(
      defaultLabels.boolTrue
    );
    expect(fixture.componentInstance.extra().core).toBe("true");

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
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    document.body.append(element);
    const select = getByLabelText<HTMLElement>(element, "Team");
    await selectOption(fixture, select, "Core");
    expect(select.closest("nz-select")?.textContent).toContain("Core");
    expect(fixture.componentInstance.extra().team).toEqual(["Core"]);
  });
});

describe("header filter funnel overlays", () => {
  it("keeps its nested select inside the RTL panel and restores focus after two Escapes", async () => {
    const { fixture, trigger, panel, host } = await mountTrigger((current) => {
      current.direction.set("rtl");
    });
    expect(panel()?.dir).toBe("rtl");
    expect(panel()?.closest(".ant-popover")).not.toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    panel()!.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    const handled = new KeyboardEvent("keydown", {
      key: "Escape",
      cancelable: true,
    });
    handled.preventDefault();
    document.dispatchEvent(handled);
    await fixture.whenStable();
    expect(panel()).not.toBeNull();

    const select = panel()!.querySelector<HTMLElement>("nz-select")!;
    const input = select.querySelector<HTMLInputElement>("input")!;
    select.querySelector<HTMLElement>("nz-select-top-control")!.click();
    await fixture.whenStable();
    const option = [
      ...document.querySelectorAll<HTMLElement>("nz-option-item"),
    ].find((candidate) => candidate.getAttribute("title") === "Web")!;
    expect(panel()!.contains(option)).toBe(false);
    expect(option.closest<HTMLElement>(".cdk-overlay-pane")?.dir).toBe("rtl");
    option.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    await fixture.whenStable();
    expect(panel()).not.toBeNull();
    option.click();
    await fixture.whenStable();
    expect(host.extra().team).toBe("Web");
    expect(panel()).not.toBeNull();

    select.querySelector<HTMLElement>("nz-select-top-control")!.click();
    await fixture.whenStable();
    input.focus();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", cancelable: true })
    );
    await fixture.whenStable();
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(panel()).not.toBeNull();
    expect(document.activeElement).toBe(input);
    const escape = new KeyboardEvent("keydown", {
      key: "Escape",
      cancelable: true,
    });
    document.dispatchEvent(escape);
    await fixture.whenStable();
    expect(escape.defaultPrevented).toBe(true);
    expect(panel()).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
    fixture.destroy();
  });

  it("dismisses on outside pointer presses without stealing focus and removes its Escape listener", async () => {
    const { fixture, element, trigger, panel } = await mountTrigger();
    const outside = element.querySelector<HTMLButtonElement>(".outside")!;
    outside.focus();
    outside.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    await fixture.whenStable();
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(outside);
    trigger.click();
    await fixture.whenStable();
    expect(panel()).not.toBeNull();
    trigger.click();
    await fixture.whenStable();
    expect(panel()).toBeNull();
    trigger.click();
    await fixture.whenStable();
    expect(panel()).not.toBeNull();
    fixture.destroy();
    const escape = new KeyboardEvent("keydown", {
      key: "Escape",
      cancelable: true,
    });
    document.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(false);
    expect(panel()).toBeNull();
  });

  it("honors close-on-select with an explicitly supplied registry", async () => {
    const { fixture, trigger, panel, host } = await mountTrigger((current) => {
      current.closeOnSelect.set(true);
      current.explicitRegistry.set(true);
    });
    const input = panel()!.querySelector<HTMLInputElement>("nz-select input")!;
    await selectOption(fixture, input, "Core");
    expect(host.extra().team).toBe("Core");
    expect(panel()).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fixture.destroy();
  });
});
