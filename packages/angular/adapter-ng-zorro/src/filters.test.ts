import type { ColumnDef, FilterDef } from "@adapttable/angular";
import { filters } from "@adapttable/ng-zorro/filters";
import { headerFilters } from "@adapttable/ng-zorro/header-filters";
import { Component, getDebugNode, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { NzSelectComponent } from "ng-zorro-antd/select";

import { kitSelector } from "../testUtils";
import { AdaptDataTable } from "./dataTable";
import type { FiltersMode } from "./tableFilters";

interface Person {
  id: string;
  name: string;
  city: string;
  age: number;
  active: boolean;
  joined: string;
  team: string;
}

const PEOPLE: Person[] = [
  {
    id: "1",
    name: "Ada",
    city: "Dubai",
    age: 36,
    active: true,
    joined: "2020-01-10",
    team: "a",
  },
  {
    id: "2",
    name: "Grace",
    city: "Amman",
    age: 28,
    active: false,
    joined: "2021-06-01",
    team: "b",
  },
  {
    id: "3",
    name: "Linus",
    city: "Dubai",
    age: 54,
    active: true,
    joined: "2019-03-15",
    team: "b",
  },
];

const COLUMNS: ColumnDef<Person>[] = [
  { key: "name", accessor: (row) => row.name },
  { key: "city", accessor: (row) => row.city },
  { key: "age", accessor: (row) => row.age },
];

const DEFS: FilterDef<Person>[] = [
  { key: "name", type: "text" },
  {
    key: "city",
    type: "select",
    options: [
      { value: "Dubai", label: "Dubai" },
      { value: "Amman", label: "Amman" },
    ],
  },
  { key: "age", type: "numberRange" },
  { key: "active", type: "boolean" },
  { key: "joined", type: "dateRange" },
  {
    key: "team",
    type: "multiSelect",
    options: [
      { value: "a", label: "A" },
      { value: "b", label: "B" },
    ],
  },
];

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="data"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="false"
      [features]="features()"
      [filtersMode]="mode()"
      [labels]="labels()"
    />
  `,
})
class Host {
  readonly features = input([filters(DEFS)]);
  readonly mode = input<FiltersMode>("popover");
  readonly labels = input<{ filterAll?: string } | undefined>(undefined);
  readonly data = PEOPLE;
  readonly columns = COLUMNS;
  readonly rowKey = (row: Person) => row.id;
}

async function mount(
  features = [filters(DEFS)],
  mode: FiltersMode = "popover"
) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentRef.setInput("features", features);
  fixture.componentRef.setInput("mode", mode);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  document.body.append(element);
  const part = <T extends HTMLElement>(
    name: string,
    root: ParentNode = element
  ) =>
    root.querySelector<T>(kitSelector(name)) ??
    (root === element ? document.querySelector<T>(kitSelector(name)) : null);
  const parts = <T extends HTMLElement>(
    name: string,
    root: ParentNode = element
  ) => {
    const local = [...root.querySelectorAll<T>(kitSelector(name))];
    return local.length || root !== element
      ? local
      : [...document.querySelectorAll<T>(kitSelector(name))];
  };
  const ids = () => parts("row").map((row) => row.dataset.rowId);
  const settle = () => fixture.whenStable();
  const field = (caption: string) =>
    parts("filter-field").find(
      (candidate) =>
        part("filter-label", candidate)?.textContent?.trim() === caption
    );
  const type = async (control: Element | null | undefined, value: string) => {
    if (!control) throw new Error("target is not rendered");
    if (control.matches("nz-select")) {
      const select = getDebugNode(control)?.injector.get(NzSelectComponent);
      if (!select) throw new Error("NG-ZORRO select is not rendered");
      const choice = select.listOfContainerItem.find(
        (item) => item.nzValue === value
      );
      if (!choice) throw new Error(`No select option for ${value}`);
      control.querySelector<HTMLElement>("nz-select-top-control")!.click();
      await settle();
      const popup = select.cdkConnectedOverlay.overlayRef.overlayElement;
      const option = [
        ...popup.querySelectorAll<HTMLElement>("nz-option-item"),
      ].find((item) => item.getAttribute("title") === String(choice.nzLabel));
      if (!option)
        throw new Error(`Option ${String(choice.nzLabel)} is not visible`);
      option.click();
      await settle();
      return;
    }
    const target =
      control instanceof HTMLInputElement
        ? control
        : control.querySelector<HTMLInputElement>("input");
    if (!target) throw new Error("input is not rendered");
    target.value = value;
    target.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
  };
  const openFilters = async () => {
    part<HTMLButtonElement>("filters-button")!.click();
    await settle();
  };
  return {
    fixture,
    element,
    part,
    parts,
    ids,
    settle,
    field,
    type,
    openFilters,
  };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("the NG-ZORRO Angular filters", () => {
  it("opens an anchored popover from the Filters button, and closes it", async () => {
    const { part, openFilters, settle } = await mount();
    const button = part<HTMLButtonElement>("filters-button");
    expect(button?.getAttribute("aria-expanded")).toBe("false");
    await openFilters();
    expect(button?.getAttribute("aria-expanded")).toBe("true");
    expect(part("filters-popover")).not.toBeNull();
    expect(part("filters-backdrop")).toBeNull();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await settle();
    expect(part("filters-popover")).toBeNull();
    expect(document.activeElement).toBe(button);
    await openFilters();
    document.body.click();
    await settle();
    expect(part("filters-popover")).toBeNull();
  });

  it("filters by text, and counts and chips what is set", async () => {
    const { part, parts, ids, field, type, openFilters } = await mount();
    await openFilters();
    await type(part("filter-input", field("Name")), "li");
    expect(ids()).toEqual(["3"]);
    expect(
      part("filters-count")
        ?.querySelector("nz-badge-sup")
        ?.getAttribute("title")
    ).toBe("1");
    expect(parts("chip")[0]?.textContent).toContain("Name");
    expect(part("filters-title")?.textContent).toContain("(1)");
  });

  it("changes a text filter's operator", async () => {
    const { part, ids, field, type, openFilters } = await mount();
    await openFilters();
    await type(part("filter-input", field("Name")), "a");
    await type(part("filter-operator", field("Name")), "startsWith");
    expect(ids()).toEqual(["1"]);
  });

  it("filters by a select, a yes/no and a group of checkboxes", async () => {
    const { part, parts, ids, field, type, openFilters, settle } =
      await mount();
    await openFilters();
    await type(part("filter-select", field("City")), "Dubai");
    expect(ids()).toEqual(["1", "3"]);
    await type(part("filter-select", field("Active")), "true");
    expect(ids()).toEqual(["1", "3"]);
    const boxes = parts<HTMLInputElement>("filter-checkbox", field("Team")).map(
      (label) => label.querySelector("input")
    );
    boxes[1]!.click();
    await settle();
    expect(ids()).toEqual(["3"]);
    boxes[1]!.click();
    await settle();
    expect(ids()).toEqual(["1", "3"]);
  });

  it("filters by a number range and a relative date", async () => {
    const { part, parts, ids, field, type, openFilters } = await mount();
    await openFilters();
    const age = field("Age");
    await type(part("filter-operator", age), "gt");
    await type(parts("filter-input", age)[0], "30");
    expect(ids()).toEqual(["1", "3"]);
    await type(part("filter-operator", age), "between");
    const [from, to] = parts<HTMLInputElement>("filter-input", age);
    await type(from, "30");
    await type(to, "40");
    expect(ids()).toEqual(["1"]);
    await type(part("filter-operator", age), "");
    expect(ids()).toEqual(["1", "2", "3"]);
    const joined = field("Joined");
    await type(part("filter-operator", joined), "relative");
    const preset = parts<HTMLSelectElement>("filter-input", joined)[0];
    await type(preset, "last");
    const count = parts<HTMLInputElement>("filter-input", joined)[1];
    expect(count?.querySelector("input")?.getAttribute("role")).toBe(
      "spinbutton"
    );
    await type(count, "3");
    expect(part("filters-count")).not.toBeNull();
  });

  it("removes a chip, and clears every filter", async () => {
    const { part, parts, ids, field, type, openFilters, settle } =
      await mount();
    await openFilters();
    await type(part("filter-select", field("City")), "Amman");
    expect(ids()).toEqual(["2"]);
    parts<HTMLButtonElement>("chip-remove")[0]!.click();
    await settle();
    expect(ids()).toEqual(["1", "2", "3"]);
    // The chip sits outside the popover, so removing one closed it.
    expect(part("filters-popover")).toBeNull();
    await openFilters();
    await type(part("filter-select", field("City")), "Amman");
    expect(ids()).toEqual(["2"]);
    part<HTMLButtonElement>("filters-clear")!.click();
    await settle();
    expect(ids()).toEqual(["1", "2", "3"]);
    expect(part("chips")).toBeNull();
  });

  it("builds a nested AND/OR filter", async () => {
    const { part, parts, ids, settle, type, openFilters } = await mount();
    await openFilters();
    const summary = part("filter-tree-summary");
    expect(summary?.textContent).toContain("Advanced");
    const tree = part("filter-tree");
    if (!tree) throw new Error("tree is not rendered");
    tree.querySelector<HTMLElement>(".ant-collapse-header")!.click();
    await settle();
    const addCondition = () =>
      [...(part("filter-tree-actions")?.querySelectorAll("button") ?? [])][0];
    addCondition()!.click();
    await settle();
    const condition = part("filter-tree-condition");
    expect(condition).not.toBeNull();
    await type(part("filter-input", condition ?? undefined), "Ada");
    expect(ids()).toEqual(["1"]);
    const chips = parts("chip");
    expect(chips.length).toBeGreaterThan(1);
    [
      ...(part("filter-tree-actions")?.querySelectorAll("button") ?? []),
    ][1]!.click();
    await settle();
    expect(parts("filter-tree-group")).toHaveLength(2);
    await type(
      part("filter-operator", part("filter-tree-group") ?? undefined),
      "or"
    );
    parts<HTMLButtonElement>("filter-tree-remove")[0]!.click();
    await settle();
    expect(ids()).toEqual(["1", "2", "3"]);
  });

  it("opens a drawer with a backdrop in drawer mode, and traps focus in it", async () => {
    const { part, openFilters, settle } = await mount(
      [filters(DEFS)],
      "drawer"
    );
    const button = part<HTMLButtonElement>("filters-button");
    expect(button?.hasAttribute("aria-expanded")).toBe(false);
    await openFilters();
    const panel = part("filters-panel");
    expect(panel).not.toBeNull();
    expect(part("filters-backdrop")).not.toBeNull();
    expect(document.activeElement).toBe(panel);
    const last = part<HTMLButtonElement>("filters-done");
    last!.focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", shiftKey: true })
    );
    part<HTMLButtonElement>("filters-done")!.click();
    await settle();
    expect(part("filters-panel")).toBeNull();
    await openFilters();
    part<HTMLButtonElement>("filters-backdrop")!.click();
    await settle();
    expect(part("filters-panel")).toBeNull();
    await openFilters();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await settle();
    expect(part("filters-panel")).toBeNull();
  });

  it("puts a funnel on each filterable header", async () => {
    const { part, parts, ids, field, type, settle, element } = await mount([
      filters(DEFS),
      headerFilters(),
    ]);
    const triggers = parts("filter-header-trigger");
    expect(triggers).toHaveLength(3);
    const trigger = triggers[1];
    if (!trigger) throw new Error("trigger is not rendered");
    trigger.querySelector<HTMLButtonElement>("button")!.click();
    await settle();
    expect(part("filter-header-cell")).not.toBeNull();
    await type(part("filter-select", field("City")), "Amman");
    expect(ids()).toEqual(["2"]);
    expect(trigger.querySelector("button")?.hasAttribute("data-active")).toBe(
      true
    );
    element.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    document.body.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true })
    );
    await settle();
  });

  it("keeps focus inside the drawer in both directions", async () => {
    const { part, parts, openFilters } = await mount([filters(DEFS)], "drawer");
    await openFilters();
    const panel = part("filters-panel");
    if (!panel) throw new Error("panel is not rendered");
    const focusables = [
      ...panel.querySelectorAll<HTMLElement>("button, input, select"),
    ];
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    // CDK traps browser Tab movement with focus sentinels. Dispatching a
    // synthetic key does not perform the browser's native focus movement.
    for (const control of focusables)
      Object.defineProperty(control, "offsetHeight", {
        configurable: true,
        value: 20,
      });
    const anchors = [
      ...document.querySelectorAll<HTMLElement>(".cdk-focus-trap-anchor"),
    ];
    expect(anchors).toHaveLength(2);
    first!.focus();
    anchors[0]!.focus();
    expect(document.activeElement).toBe(last);
    anchors[1]!.focus();
    expect(document.activeElement).toBe(first);
    part<HTMLButtonElement>("filters-button")!.focus();
    anchors[1]!.focus();
    expect(document.activeElement).toBe(first);
    expect(parts("filters-panel")).toHaveLength(1);
  });

  it("keeps the popover open for a press inside it or on a removed node", async () => {
    const { part, openFilters, settle } = await mount();
    await openFilters();
    part("filters-popover")!.click();
    document.createElement("div").click();
    const detached = document.createElement("span");
    document.body.append(detached);
    detached.addEventListener("click", () => {
      detached.remove();
    });
    detached.click();
    await settle();
    expect(part("filters-popover")).not.toBeNull();
  });

  it("closes outside a focused field, and closes once when its open button is pressed", async () => {
    const { part, openFilters, settle } = await mount();
    await openFilters();
    const input = part("filters-popover")?.querySelector("input");
    input!.focus();
    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();
    outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    outside.click();
    await settle();
    expect(part("filters-popover")).toBeNull();
    await openFilters();
    const button = part<HTMLButtonElement>("filters-button");
    button!.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    button!.click();
    await settle();
    expect(part("filters-popover")).toBeNull();
  });

  it("ignores other keys in the drawer", async () => {
    const { part, openFilters, settle } = await mount(
      [filters(DEFS)],
      "drawer"
    );
    await openFilters();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    await settle();
    expect(part("filters-panel")).not.toBeNull();
  });

  it("offers header funnels without the Filters button", async () => {
    const { part, parts } = await mount([filters(), headerFilters()]);
    expect(part("filters-button")).not.toBeNull();
    const headerOnly = await mount([headerFilters()]);
    expect(headerOnly.part("filters-button")).toBeNull();
    expect(parts("filter-header-trigger")).toHaveLength(0);
  });

  it("filters by a checklist of every value, with counts and search", async () => {
    const { part, parts, ids, settle, openFilters } = await mount([
      filters<Person>([{ key: "city", type: "checklist" }]),
    ]);
    await openFilters();
    const boxes = () =>
      parts<HTMLInputElement>("filter-checkbox").map((label) =>
        label.querySelector("input")
      );
    expect(boxes()).toHaveLength(2);
    expect(part("filter-checklist-count")!.textContent).toBe("(1)");
    boxes()[0]!.click();
    await settle();
    expect(ids()).toHaveLength(1);
    const search = part<HTMLInputElement>("filter-checklist-search");
    if (search) {
      search.value = "zzz";
      search.dispatchEvent(new Event("input"));
      await settle();
    }
    expect(boxes()).toHaveLength(0);
    const [, clear] = [
      ...(part("filter-checklist-actions")?.querySelectorAll("button") ?? []),
    ];
    clear!.click();
    await settle();
    expect(ids()).toHaveLength(3);
  });

  it("says nothing matched when a filter leaves no rows", async () => {
    const { part, field, type, openFilters } = await mount();
    await openFilters();
    await type(part("filter-input", field("Name")), "nobody");
    expect(part("empty")?.textContent).toContain("No results");
  });
});

describe("filters select labels (NG-ZORRO Angular)", () => {
  it("offers the no-restriction option in the host's language", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentRef.setInput("labels", { filterAll: "Tous" });
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    document.body.append(element);
    element
      .querySelector<HTMLButtonElement>(kitSelector("filters-button"))!
      .click();
    await fixture.whenStable();
    const city = document.querySelector<HTMLElement>(
      '[data-adapttable-part="filter-select"]'
    )!;
    expect(city.querySelector("nz-select-item")?.textContent?.trim()).toBe(
      "Tous"
    );
    city.querySelector<HTMLElement>("nz-select-top-control")!.click();
    await fixture.whenStable();
    expect(
      [...document.querySelectorAll("nz-option-item")].map((option) =>
        option.textContent?.trim()
      )
    ).toEqual(["Tous", "Dubai", "Amman"]);
    expect(
      getDebugNode(city)?.injector.get(NzSelectComponent).listOfValue
    ).toEqual([""]);
  });
});
