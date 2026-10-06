import {
  type ColumnDef,
  type FilterDef,
  type FilterFormSource,
  filterRuntimeFor,
  type FilterTypeSpec,
  injectDataTable,
  injectFrontendData,
  type TableLabels,
} from "@adapttable/angular";
import {
  defaultFilterRegistry,
  type FilterWidgetRenderProps,
} from "@adapttable/angular/adapter";
import { filters, filterTypes } from "@adapttable/ng-bootstrap/filters";
import { headerFilters } from "@adapttable/ng-bootstrap/header-filters";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
  type TemplateRef,
  viewChild,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { AdaptHeaderFilterTrigger } from "../header-filters/headerFilterTrigger";
import {
  clickBootstrapControl,
  ngBootstrapPart,
  settleBootstrap,
} from "../testUtils";
import { AdaptAutoFilterForm } from "./components/autoFilterForm";
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
    <ng-template #custom let-props let-source="source" let-labels="labels">
      <input
        data-custom-filter
        [attr.aria-label]="props.def.label"
        [placeholder]="labels.search"
        [value]="source.extra[props.def.key] ?? ''"
        (input)="source.setExtra(props.def.key, $any($event.target).value)"
      />
    </ng-template>
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
  readonly labels = input<Partial<TableLabels> | undefined>(undefined);
  readonly custom =
    viewChild.required<TemplateRef<FilterWidgetRenderProps<Person>>>("custom");
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
  await settleBootstrap(fixture);
  const element = fixture.nativeElement as HTMLElement;
  document.body.append(element);
  const part = <T extends HTMLElement>(
    name: string,
    root: ParentNode = element
  ) => root.querySelector<T>(ngBootstrapPart(name));
  const parts = <T extends HTMLElement>(
    name: string,
    root: ParentNode = element
  ) => [...root.querySelectorAll<T>(ngBootstrapPart(name))];
  const ids = () => parts("row").map((row) => row.dataset.rowId);
  const settle = () => settleBootstrap(fixture);
  const field = (caption: string) =>
    parts("filter-field").find(
      (candidate) =>
        part("filter-label", candidate)?.textContent?.trim() === caption
    );
  const type = async (control: Element | null | undefined, value: string) => {
    const target = control as HTMLInputElement | HTMLSelectElement | null;
    if (!target) throw new Error("target is not rendered");
    target.value = value;
    target.dispatchEvent(
      new Event(target instanceof HTMLSelectElement ? "change" : "input")
    );
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

describe("the unstyled Angular filters", () => {
  it("opens an anchored popover from the Filters button, and closes it", async () => {
    const { part, openFilters, settle } = await mount();
    const button = part<HTMLButtonElement>("filters-button");
    expect(button?.getAttribute("aria-expanded")).toBe("false");
    await openFilters();
    expect(button?.getAttribute("aria-expanded")).toBe("true");
    expect(part("filters-popover")).not.toBeNull();
    expect(part("filters-backdrop")).toBeNull();
    (document.activeElement ?? document).dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await settle();
    expect(part("filters-popover")).toBeNull();
    expect(document.activeElement).toBe(button);
    await openFilters();
    clickBootstrapControl(document.body);
    await settle();
    expect(part("filters-popover")).toBeNull();
  });

  it("filters by text, and counts and chips what is set", async () => {
    const { part, parts, ids, field, type, openFilters } = await mount();
    await openFilters();
    await type(part("filter-input", field("Name")), "li");
    expect(ids()).toEqual(["3"]);
    expect(part("filters-count")?.textContent).toBe("1");
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
    expect(count?.type).toBe("number");
    await type(count, "3");
    expect(part("filters-count")).not.toBeNull();
  });

  it("removes a chip, and clears every filter", async () => {
    const { part, parts, ids, field, type, openFilters, settle } =
      await mount();
    await openFilters();
    await type(part("filter-select", field("City")), "Amman");
    expect(ids()).toEqual(["2"]);
    clickBootstrapControl(parts<HTMLButtonElement>("chip-remove")[0]!);
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
    const tree = part<HTMLElement>("filter-tree");
    if (!tree) throw new Error("tree is not rendered");
    summary!.click();
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
    expect(
      panel === document.activeElement ||
        panel?.contains(document.activeElement)
    ).toBe(true);
    const last = part<HTMLButtonElement>("filters-done");
    last!.focus();
    (document.activeElement ?? document).dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
        cancelable: true,
      })
    );
    (document.activeElement ?? document).dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    part<HTMLButtonElement>("filters-done")!.click();
    await settle();
    expect(part("filters-panel")).toBeNull();
    await openFilters();
    clickBootstrapControl(part<HTMLButtonElement>("filters-backdrop")!);
    await settle();
    expect(part("filters-panel")).toBeNull();
    await openFilters();
    (document.activeElement ?? document).dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await settle();
    expect(part("filters-panel")).toBeNull();
  });

  it("lets a standalone native header filter use the built-in registry", async () => {
    @Component({
      imports: [AdaptHeaderFilterTrigger],
      template: `<adapt-header-filter-trigger [props]="props()" />`,
    })
    class StandaloneHeader {
      readonly source = injectFrontendData({
        data: PEOPLE,
        columns: COLUMNS,
        urlSync: false,
        forceMobile: false,
      });
      readonly table = injectDataTable({
        source: this.source,
        columns: COLUMNS,
        rowKey: (row: Person) => row.id,
      });
      readonly props = computed(() => ({
        def: { key: "name", type: "text" },
        labels: this.table.labels(),
        source: this.source(),
      }));
    }
    const fixture = TestBed.createComponent(StandaloneHeader);
    document.body.append(fixture.nativeElement);
    fixture.autoDetectChanges();
    await settleBootstrap(fixture);
    const root = fixture.nativeElement as HTMLElement;
    const trigger = root.querySelector<HTMLButtonElement>(
      '[data-adapttable-part="filter-header-trigger"] button'
    )!;
    trigger.focus();
    trigger.click();
    await settleBootstrap(fixture);
    const field = root.querySelector<HTMLInputElement>(
      '[data-adapttable-part="filter-input"]'
    )!;
    expect(field).not.toBeNull();
    field.value = "Ada";
    field.dispatchEvent(new Event("input"));
    await settleBootstrap(fixture);
    expect(fixture.componentInstance.source().extra.name).toBe("Ada");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    fixture.destroy();
  });

  it("puts a funnel on each filterable header", async () => {
    const { part, parts, ids, field, type, settle, element } = await mount([
      filters(DEFS),
      headerFilters(),
    ]);
    const triggers = parts<HTMLElement>("filter-header-trigger");
    expect(triggers).toHaveLength(3);
    const trigger = triggers[1];
    if (!trigger) throw new Error("trigger is not rendered");
    trigger.querySelector("button")!.click();
    await settle();
    expect(part("filter-header-cell", trigger)).not.toBeNull();
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
    first!.focus();
    (document.activeElement ?? document).dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    expect(document.activeElement).toBe(last);
    (document.activeElement ?? document).dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
        cancelable: true,
      })
    );
    expect(document.activeElement).toBe(first);
    panel.focus();
    panel.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    expect(document.activeElement).toBe(last);
    last!.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
        cancelable: true,
      })
    );
    expect(document.activeElement).toBe(first);
    expect(parts("filters-panel")).toHaveLength(1);
  });

  it("keeps the native popover open for inside presses, including a target removed by its action", async () => {
    const { part, openFilters, settle } = await mount();
    await openFilters();
    const popover = part("filters-popover")!;
    clickBootstrapControl(popover);
    await settle();
    expect(part("filters-popover")).toBe(popover);
    const removedInside = document.createElement("button");
    popover.append(removedInside);
    removedInside.addEventListener("click", () => removedInside.remove());
    clickBootstrapControl(removedInside);
    await settle();
    expect(removedInside.isConnected).toBe(false);
    expect(part("filters-popover")).toBe(popover);
    clickBootstrapControl(document.createElement("div"));
    await settle();
    expect(part("filters-popover")).toBe(popover);
  });

  it("dismisses an outside press while a field is focused and closes once through the trigger", async () => {
    const { part, openFilters, settle } = await mount();
    await openFilters();
    const input =
      part("filters-popover")!.querySelector<HTMLInputElement>("input")!;
    input.focus();
    expect(document.activeElement).toBe(input);
    clickBootstrapControl(input);
    await settle();
    expect(part("filters-popover")?.contains(input)).toBe(true);
    expect(document.activeElement).toBe(input);
    clickBootstrapControl(document.body);
    await settle();
    expect(part("filters-popover")).toBeNull();
    const button = part<HTMLButtonElement>("filters-button")!;
    expect(button.getAttribute("aria-expanded")).toBe("false");
    await openFilters();
    expect(button.getAttribute("aria-expanded")).toBe("true");
    button.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    clickBootstrapControl(button);
    await settle();
    expect(part("filters-popover")).toBeNull();
    expect(button.getAttribute("aria-expanded")).toBe("false");
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

describe("filters select labels (unstyled Angular)", () => {
  it("offers the no-restriction option in the host's language", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentRef.setInput("labels", { filterAll: "Tous" });
    fixture.autoDetectChanges();
    await settleBootstrap(fixture);
    const element = fixture.nativeElement as HTMLElement;
    document.body.append(element);
    element
      .querySelector<HTMLButtonElement>(
        '[data-ng-bootstrap-part="filters-button"]'
      )!
      .click();
    await settleBootstrap(fixture);
    const city = [
      ...element.querySelectorAll<HTMLSelectElement>(
        '[data-adapttable-part="filter-select"]'
      ),
    ][0]!;
    expect(
      [...city.options].map((option) => option.textContent.trim())
    ).toEqual(["Tous", "Dubai", "Amman"]);
    expect(city.value).toBe("");
  });
});

const customCreated = vi.fn();
const customDestroyed = vi.fn();

@Component({
  selector: "test-custom-filter",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<input
    data-custom-filter
    [attr.aria-label]="def().label"
    [placeholder]="labels().search"
    [value]="source().extra[def().key] ?? ''"
    (input)="source().setExtra(def().key, $any($event.target).value)"
  />`,
})
class CustomFilter {
  readonly def = input.required<FilterDef<Person>>();
  readonly source = input.required<FilterFormSource<Person>>();
  readonly labels = input.required<Required<TableLabels>>();

  constructor() {
    customCreated();
    inject(DestroyRef).onDestroy(customDestroyed);
  }
}

function customSpec(render: FilterTypeSpec["render"]): FilterTypeSpec {
  return { ...defaultFilterRegistry.get("text")!, type: "custom", render };
}

const CUSTOM_DEFS: readonly FilterDef<Person>[] = [
  { key: "name", type: "custom", label: "Person" },
];

@Component({
  imports: [AdaptAutoFilterForm],
  template: `
    <ng-template #custom let-props let-source="source" let-labels="labels">
      <input
        data-custom-filter
        [attr.aria-label]="props.def.label"
        [placeholder]="labels.search"
        [value]="source.extra[props.def.key] ?? ''"
        (input)="source.setExtra(props.def.key, $any($event.target).value)"
      />
    </ng-template>
    @if (customTemplate()) {
      <adapt-auto-filter-form
        [defs]="defs()"
        [source]="source()"
        [labels]="table.labels()"
        [registry]="filterModel.runtime().registry"
      />
    }
    @for (row of source().rows; track row.id) {
      <span data-filtered-row [attr.data-row-id]="row.id">{{ row.name }}</span>
    }
  `,
})
class AutoFilterFormHost {
  readonly defs = signal<readonly FilterDef<Person>[]>(CUSTOM_DEFS);
  readonly columns = computed(() =>
    this.defs().map((def) => ({ key: def.key, filter: def }))
  );
  readonly customTemplate =
    viewChild<TemplateRef<FilterWidgetRenderProps<Person>>>("custom");
  readonly render = vi.fn(() => this.customTemplate() ?? "");
  readonly filterModel = filterRuntimeFor<Person>({
    columns: this.columns,
    defs: undefined,
    data: PEOPLE,
    filterTypes: [customSpec(this.render)],
  });
  readonly source = injectFrontendData({
    data: PEOPLE,
    columns: this.columns,
    urlSync: false,
    forceMobile: false,
    filterFn: this.filterModel.filterFn,
  });
  readonly table = injectDataTable({
    source: this.source,
    columns: COLUMNS,
    rowKey: (row) => row.id,
  });
}

describe("registered Angular form renderers", () => {
  it("renders a real component before the widget, updates it, and destroys it on close", async () => {
    customCreated.mockClear();
    customDestroyed.mockClear();
    const { fixture, part, ids, openFilters, settle, type } = await mount([
      filters(CUSTOM_DEFS),
      filterTypes([customSpec(() => CustomFilter)]),
    ]);
    await openFilters();
    const field = () =>
      document.querySelector<HTMLInputElement>("[data-custom-filter]")!;
    expect(
      [
        ...document.querySelectorAll<HTMLInputElement>("[data-custom-filter]"),
      ].map((input) => input.getAttribute("aria-label"))
    ).toEqual(["Person"]);
    const original = field();
    expect(original.getAttribute("aria-label")).toBe("Person");
    expect(part("filter-input")).toBeNull();
    await type(original, "Grace");
    expect(ids()).toEqual(["2"]);
    fixture.componentRef.setInput("labels", { search: "Find a person" });
    await settle();
    expect(field()).toBe(original);
    expect(field().value).toBe("Grace");
    expect(field().placeholder).toBe("Find a person");
    expect(customCreated).toHaveBeenCalledTimes(1);
    expect(customDestroyed).not.toHaveBeenCalled();

    (document.activeElement ?? document).dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await settle();
    expect(field()).toBeNull();
    expect(customDestroyed).toHaveBeenCalledTimes(1);
    await openFilters();
    expect(field().value).toBe("Grace");
    expect(customCreated).toHaveBeenCalledTimes(2);
    fixture.destroy();
    expect(customDestroyed).toHaveBeenCalledTimes(2);
  });

  it("binds a template's named and implicit context to the live filter source", async () => {
    const template: { current?: TemplateRef<FilterWidgetRenderProps<Person>> } =
      {};
    const render = vi.fn(() => template.current ?? "");
    const { fixture, ids, openFilters, settle, type } = await mount([
      filters(CUSTOM_DEFS),
      filterTypes([customSpec(render)]),
    ]);
    template.current = fixture.componentInstance.custom();
    await openFilters();
    const field = () =>
      document.querySelector<HTMLInputElement>("[data-custom-filter]")!;
    expect(
      [
        ...document.querySelectorAll<HTMLInputElement>("[data-custom-filter]"),
      ].map((input) => input.getAttribute("aria-label"))
    ).toEqual(["Person"]);
    const original = field();
    expect(original.getAttribute("aria-label")).toBe("Person");
    expect(render).toHaveBeenCalledWith(
      expect.objectContaining({
        def: expect.objectContaining({ key: "name", type: "custom" }),
        source: expect.objectContaining({ setExtra: expect.any(Function) }),
      })
    );
    await type(original, "li");
    expect(ids()).toEqual(["3"]);
    fixture.componentRef.setInput("labels", { search: "Find a person" });
    await settle();
    expect(field()).toBe(original);
    expect(field().value).toBe("li");
    expect(field().placeholder).toBe("Find a person");
  });

  it("replaces live custom form definitions and binds template writes to the current source", async () => {
    const fixture = TestBed.createComponent(AutoFilterFormHost);
    fixture.autoDetectChanges();
    await settleBootstrap(fixture);
    const host = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;
    const field = () =>
      element.querySelector<HTMLInputElement>("[data-custom-filter]")!;
    const ids = () =>
      [...element.querySelectorAll<HTMLElement>("[data-filtered-row]")].map(
        (row) => row.dataset.rowId
      );
    const type = async (value: string) => {
      field().value = value;
      field().dispatchEvent(new Event("input"));
      await settleBootstrap(fixture);
    };
    expect(
      [
        ...element.querySelectorAll<HTMLInputElement>("[data-custom-filter]"),
      ].map((input) => input.getAttribute("aria-label"))
    ).toEqual(["Person"]);
    await type("li");
    expect(host.source().extra).toEqual({ name: "li" });
    expect(ids()).toEqual(["3"]);

    host.defs.set([{ key: "city", type: "custom", label: "Home city" }]);
    await settleBootstrap(fixture);
    expect(field().getAttribute("aria-label")).toBe("Home city");
    expect(field().value).toBe("");
    expect(host.render).toHaveBeenLastCalledWith({
      def: host.defs()[0],
      source: host.source(),
      labels: host.table.labels(),
      className: undefined,
    });
    await type("Dubai");
    expect(host.source().extra).toEqual({ name: "li", city: "Dubai" });
    expect(ids()).toEqual(["1", "3"]);

    host.source().setExtra("city", "Amman");
    await settleBootstrap(fixture);
    expect(field().value).toBe("Amman");
    expect(ids()).toEqual(["2"]);
  });

  it.each([
    { value: "Custom caption", text: "Custom caption" },
    { value: 7, text: "7" },
    { value: undefined, text: null },
    { value: 0, text: null },
    { value: {}, text: null },
  ])(
    "renders text or uses the kit widget for $value",
    async ({ value, text }) => {
      const { part, openFilters } = await mount([
        filters(CUSTOM_DEFS),
        filterTypes([
          customSpec(value === undefined ? undefined : () => value),
        ]),
      ]);
      await openFilters();
      if (text) {
        expect(part("filters-form")?.textContent).toContain(text);
        expect(part("filter-input")).toBeNull();
      } else {
        expect(part("filter-input")).not.toBeNull();
        expect(part("filter-input")?.classList.contains("ant-input")).toBe(
          false
        );
        expect(part("filters-form")?.textContent).not.toContain(
          "[object Object]"
        );
      }
    }
  );
});
