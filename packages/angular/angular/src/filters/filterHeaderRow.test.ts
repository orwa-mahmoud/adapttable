/**
 * The compact header-filter row: one control per filter shape, pads and
 * spacers aligned with the leaf header, and nothing when the row is off.
 */
import {
  defaultFilterRegistry,
  defaultLabels,
  type ExtraFilters,
  type FilterDef,
  type FilterFormSource,
  type FilterTypeRegistry,
  type FilterTypeSpec,
  type FilterWidgetRenderProps,
  type TableLabels,
} from "@adapttable/core";
import type {
  FilterHeaderClassNames,
  FilterHeaderMultiProps,
  FilterHeaderRangeProps,
  FilterHeaderSearchProps,
  FilterHeaderSelectProps,
} from "@adapttable/core/binding";
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
import { describe, expect, it, vi } from "vitest";

import {
  AdaptFilterHeaderChrome,
  AdaptFilterHeaderControlChrome,
  type FilterHeaderSlots,
} from "./filterHeaderRow";

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
  { key: "note" },
];

@Component({
  selector: "test-search",
  template: `<input
    type="search"
    [attr.aria-label]="props().label"
    [value]="props().value"
    (input)="props().onChange($any($event.target).value)"
  />`,
})
class TestSearch {
  readonly props = input.required<FilterHeaderSearchProps>();
}

@Component({
  selector: "test-select",
  template: `<select
    [attr.aria-label]="props().label"
    [value]="props().value"
    (change)="props().onChange($any($event.target).value)"
  >
    @for (option of props().options; track option.value) {
      <option
        [value]="option.value"
        [selected]="option.value === props().value"
      >
        {{ option.label }}
      </option>
    }
  </select>`,
})
class TestSelect {
  readonly props = input.required<FilterHeaderSelectProps>();
}

@Component({
  selector: "test-range",
  template: `<input
    [attr.type]="props().type"
    [attr.aria-label]="props().label"
    [value]="props().value"
    (input)="props().onChange($any($event.target).value)"
  />`,
})
class TestRange {
  readonly props = input.required<FilterHeaderRangeProps>();
}

@Component({
  selector: "test-multi",
  template: `<span class="summary">{{ props().summary }}</span>
    @for (option of props().options; track option.value) {
      <label>
        <input
          type="checkbox"
          [checked]="props().selected.includes(option.value)"
          (change)="props().onToggle(option.value, $any($event.target).checked)"
        />{{ option.label }}
      </label>
    }`,
})
class TestMulti {
  readonly props = input.required<FilterHeaderMultiProps>();
}

const SLOTS: FilterHeaderSlots = {
  Search: TestSearch,
  Select: TestSelect,
  Range: TestRange,
  Multi: TestMulti,
};

function sourceFrom(
  extra: ReturnType<typeof signal<ExtraFilters>>
): FilterFormSource<Row> {
  return {
    get extra() {
      return extra();
    },
    setExtra: (key, value) => {
      extra.update((prev) => ({ ...prev, [key]: value }));
    },
    setExtras: (patch) => {
      extra.update((prev) => ({ ...prev, ...patch }));
    },
  };
}

@Component({
  imports: [AdaptFilterHeaderChrome],
  template: `
    <table>
      <thead>
        <adapt-filter-header-chrome
          [enabled]="enabled()"
          [columns]="columns()"
          [defs]="defs()"
          [source]="source()"
          [labels]="labels"
          [slots]="slots"
          [registry]="registry()"
          [expandable]="expandable()"
          [showReorder]="showReorder()"
          [selection]="selection()"
          [showActions]="showActions()"
          [columnSpacers]="spacers()"
          [stickyAttr]="sticky()"
          [pinSide]="pin()"
          [cellStyle]="styleFor()"
          [padStyle]="pad()"
          [classNames]="classes()"
        />
      </thead>
    </table>
  `,
})
class Host {
  readonly labels = defaultLabels;
  readonly slots = SLOTS;
  readonly extra = signal<ExtraFilters>({});
  readonly enabled = signal(true);
  readonly columns = signal(COLUMNS);
  readonly defs = signal<readonly FilterDef<Row>[]>(DEFS);
  readonly registry = signal<FilterTypeRegistry | undefined>(undefined);
  readonly expandable = signal(false);
  readonly showReorder = signal(false);
  readonly selection = signal(false);
  readonly showActions = signal(false);
  readonly spacers = signal<{ start: number; end: number } | undefined>(
    undefined
  );
  readonly sticky = signal<true | undefined>(undefined);
  readonly classes = signal<FilterHeaderClassNames | undefined>(undefined);
  readonly pin = signal<
    ((key: string) => "start" | "end" | undefined) | undefined
  >(undefined);
  readonly styleFor = signal<
    | ((column: {
        readonly key: string;
      }) => Readonly<Record<string, string>> | undefined)
    | undefined
  >(undefined);
  readonly pad = signal<Readonly<Record<string, string>> | undefined>(
    undefined
  );
  readonly source = computed(() => sourceFrom(this.extra));
}

async function mount(prepare?: (host: Host) => void) {
  const fixture = TestBed.createComponent(Host);
  prepare?.(fixture.componentInstance);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const labeled = (name: string) =>
    [...element.querySelectorAll<HTMLElement>("[aria-label]")].filter(
      (node) => node.getAttribute("aria-label") === name
    );
  const typeInto = (field: HTMLInputElement | undefined, value: string) => {
    if (!field) throw new Error("field is not rendered");
    field.value = value;
    field.dispatchEvent(new Event("input"));
  };
  const choose = (field: HTMLSelectElement | undefined, value: string) => {
    if (!field) throw new Error("select is not rendered");
    field.value = value;
    field.dispatchEvent(new Event("change"));
  };
  return {
    host: fixture.componentInstance,
    element,
    fixture,
    labeled,
    typeInto,
    choose,
  };
}

const row = (element: HTMLElement) =>
  element.querySelector<HTMLElement>(
    '[data-adapttable-part="filter-header-row"]'
  );

describe("AdaptFilterHeaderChrome", () => {
  it("replaces options on mounted same-key controls and discards late loaders", async () => {
    let resolve:
      ((options: { value: string; label: string }[]) => void) | undefined;
    const pending = new Promise<{ value: string; label: string }[]>((done) => {
      resolve = done;
    });
    const { host, element, labeled, choose, fixture } = await mount(
      (instance) => {
        instance.defs.set(
          DEFS.map((def) =>
            def.key === "team" || def.key === "tags"
              ? { ...def, options: () => pending }
              : def
          )
        );
      }
    );
    const select = labeled("Team")[0] as HTMLSelectElement;
    host.defs.update((defs) =>
      defs.map((def) =>
        def.key === "team" || def.key === "tags"
          ? { ...def, options: [{ value: "new", label: "Current" }] }
          : def
      )
    );
    await fixture.whenStable();
    resolve?.([{ value: "old", label: "Obsolete" }]);
    await fixture.whenStable();
    expect(labeled("Team")[0]).toBe(select);
    expect(
      [...select.options].map((option) => option.textContent?.trim())
    ).toContain("Current");
    expect(element.textContent).not.toContain("Obsolete");
    choose(select, "new");
    const checkbox =
      element.querySelector<HTMLInputElement>("test-multi input");
    if (!checkbox) throw new Error("Missing current checkbox");
    expect(checkbox.closest("label")?.textContent).toContain("Current");
    checkbox.click();
    await fixture.whenStable();
    expect(host.extra()).toMatchObject({ team: ["new"], tags: ["new"] });
  });

  it("writes every compact header widget", async () => {
    const { element, labeled, typeInto, choose, fixture } = await mount();
    expect(row(element)?.getAttribute("aria-label")).toBe(
      defaultLabels.headerFilters
    );
    const name = labeled("Name")[0] as HTMLInputElement;
    typeInto(name, "Ada");
    await fixture.whenStable();
    expect(name.value).toBe("Ada");
    const team = labeled("Team")[0] as HTMLSelectElement;
    choose(team, "Web");
    await fixture.whenStable();
    expect(team.value).toBe("Web");
    const tags = element.querySelector(".summary");
    const box = (caption: string) => {
      const label = [...element.querySelectorAll("label")].find((node) =>
        node.textContent?.includes(caption)
      );
      return label?.querySelector("input");
    };
    const first = box("A");
    const second = box("B");
    if (!first || !second) throw new Error("tag checkboxes are not rendered");
    first.checked = true;
    first.dispatchEvent(new Event("change"));
    await fixture.whenStable();
    second.checked = true;
    second.dispatchEvent(new Event("change"));
    await fixture.whenStable();
    expect(tags?.textContent ?? "").toContain("(2)");
    const core = labeled("Core")[0] as HTMLSelectElement;
    choose(core, "true");
    await fixture.whenStable();
    expect(core.value).toBe("true");
    const age = labeled("Age")[0] as HTMLInputElement;
    expect(labeled("Age")).toHaveLength(1);
    typeInto(age, "30");
    await fixture.whenStable();
    expect(age.value).toBe("30");
    const hired = labeled("Hired")[0] as HTMLInputElement;
    expect(hired.type).toBe("date");
    typeInto(hired, "2024-01-01");
    await fixture.whenStable();
    expect(hired.value).toBe("2024-01-01");
    expect(
      element.querySelector('[data-column-key="note"]')?.textContent?.trim()
    ).toBe("");
  });

  it("writes the upper bound of a between pair", async () => {
    const { labeled, typeInto, fixture } = await mount((host) => {
      host.extra.set({ ageOp: "between", ageMin: "10", ageMax: "40" });
    });
    const bounds = labeled("Age") as HTMLInputElement[];
    expect(bounds).toHaveLength(2);
    typeInto(bounds[1], "50");
    await fixture.whenStable();
    expect(bounds[1]?.value).toBe("50");
  });

  it("pads the row, sticks cells, and hides when disabled or empty", async () => {
    const { host, element, fixture } = await mount();
    expect(
      element.querySelector('[data-adapttable-part="expand-header"]')
    ).toBeNull();
    host.expandable.set(true);
    host.showReorder.set(true);
    host.selection.set(true);
    host.showActions.set(true);
    host.spacers.set({ start: 12, end: 8 });
    host.sticky.set(true);
    host.pad.set({ width: "24px" });
    host.pin.set((key) => (key === "name" ? "start" : undefined));
    host.styleFor.set((column) =>
      column.key === "name" ? { width: "80px" } : undefined
    );
    host.classes.set({
      filterHeaderRow: "row",
      headerCell: "cell",
      filterHeaderCell: "filter",
      expandHeader: "expand",
      filterHeaderInput: "input",
      filterHeaderMenu: "menu",
    });
    await fixture.whenStable();
    expect(row(element)?.className).toContain("row");
    expect(
      element.querySelector('[data-adapttable-part="expand-header"]')?.className
    ).toContain("expand");
    expect(
      element.querySelector('[data-adapttable-part="reorder-header"]')
    ).not.toBeNull();
    expect(
      element.querySelector('[data-adapttable-part="selection-header"]')
    ).not.toBeNull();
    expect(
      element.querySelector('[data-adapttable-part="actions-header"]')
    ).not.toBeNull();
    expect(
      element.querySelector('[data-adapttable-part="column-spacer-start"]')
    ).not.toBeNull();
    expect(
      element.querySelector('[data-adapttable-part="column-spacer-end"]')
    ).not.toBeNull();
    const nameCell = element.querySelector('[data-column-key="name"]');
    expect(nameCell?.getAttribute("data-sticky")).toBe("true");
    expect(nameCell?.getAttribute("data-pinned")).toBe("start");
    expect((nameCell as HTMLElement).style.width).toBe("80px");
    host.enabled.set(false);
    await fixture.whenStable();
    expect(row(element)).toBeNull();
    host.enabled.set(true);
    host.defs.set([]);
    await fixture.whenStable();
    expect(row(element)).toBeNull();
  });

  it("shows a custom caption and falls through when the render is empty", async () => {
    const registry: FilterTypeRegistry = {
      get: (type) => {
        if (type === "note") {
          return { render: () => "Pinned" } as unknown as FilterTypeSpec;
        }
        if (type === "blank") {
          return {
            render: () => "",
            widget: "text",
          } as unknown as FilterTypeSpec;
        }
        if (type === "count") {
          return { render: () => 3 } as unknown as FilterTypeSpec;
        }
        if (type === "zero") {
          return {
            render: () => 0,
            widget: "text",
          } as unknown as FilterTypeSpec;
        }
        return undefined;
      },
      has: () => true,
      types: () => ["note", "blank", "count", "zero"],
    };
    const { element, labeled } = await mount((host) => {
      host.registry.set(registry);
      host.columns.set([
        { key: "note" },
        { key: "blank" },
        { key: "count" },
        { key: "zero" },
      ]);
      host.defs.set([
        { key: "note", type: "note", label: "Note" },
        { key: "blank", type: "blank", label: "Blank" },
        { key: "count", type: "count", label: "Count" },
        { key: "zero", type: "zero", label: "Zero" },
      ]);
    });
    expect(
      element.querySelector('[data-column-key="note"]')?.textContent?.trim()
    ).toBe("Pinned");
    expect(
      element.querySelector('[data-column-key="count"]')?.textContent?.trim()
    ).toBe("3");
    expect(labeled("Blank")).toHaveLength(1);
    expect(labeled("Zero")).toHaveLength(1);
    expect(element.querySelector('[data-column-key="note"] input')).toBeNull();
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
    [class]="className()"
    [placeholder]="labels().search"
    [value]="source().extra[def().key] ?? ''"
    (input)="source().setExtra(def().key, $any($event.target).value)"
  />`,
})
class CustomFilter {
  readonly def = input.required<FilterDef<Row>>();
  readonly source = input.required<FilterFormSource<Row>>();
  readonly labels = input.required<Required<TableLabels>>();
  readonly className = input<string>();

  constructor() {
    customCreated();
    inject(DestroyRef).onDestroy(customDestroyed);
  }
}

@Component({
  imports: [AdaptFilterHeaderControlChrome],
  template: `
    <ng-template
      #custom
      let-props
      let-source="source"
      let-labels="labels"
      let-className="className"
    >
      <input
        data-custom-filter
        [attr.aria-label]="props.def.label"
        [class]="className"
        [placeholder]="labels.search"
        [value]="source.extra[props.def.key] ?? ''"
        (input)="source.setExtra(props.def.key, $any($event.target).value)"
      />
    </ng-template>
    <adapt-filter-header-control-chrome
      [def]="def()"
      [source]="source()"
      [labels]="labels()"
      [className]="className()"
      [registry]="registry()"
      [slots]="slots"
    />
  `,
})
class RendererHost {
  readonly slots = SLOTS;
  readonly extra = signal<ExtraFilters>({ name: "Ada" });
  readonly def = signal<FilterDef<Row>>({
    key: "name",
    type: "custom",
    label: "Name",
  });
  readonly source = signal(sourceFrom(this.extra));
  readonly labels = signal(defaultLabels);
  readonly className = signal("custom-class");
  readonly render = signal<FilterTypeSpec["render"]>(undefined);
  readonly custom =
    viewChild.required<TemplateRef<FilterWidgetRenderProps<Row>>>("custom");
  readonly registry = computed((): FilterTypeRegistry => {
    const spec: FilterTypeSpec = {
      ...defaultFilterRegistry.get("text")!,
      type: "custom",
      render: this.render(),
    };
    return {
      get: (type) =>
        type === "custom" ? spec : defaultFilterRegistry.get(type),
      has: (type) => type === "custom" || defaultFilterRegistry.has(type),
      types: () => [...defaultFilterRegistry.types(), "custom"],
    };
  });
}

describe("registered Angular header-filter renderers", () => {
  it("binds template props, live values, and host writes across input changes", async () => {
    const fixture = TestBed.createComponent(RendererHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const render = vi.fn(() => host.custom());
    host.render.set(render);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const field = () =>
      element.querySelector<HTMLInputElement>("[data-custom-filter]")!;
    expect(
      [
        ...element.querySelectorAll<HTMLInputElement>("[data-custom-filter]"),
      ].map((input) => input.value)
    ).toEqual(["Ada"]);
    const original = field();
    expect(original.value).toBe("Ada");
    expect(original.className).toBe("custom-class");
    expect(render).toHaveBeenLastCalledWith({
      def: host.def(),
      source: host.source(),
      labels: host.labels(),
      className: "custom-class",
    });
    original.value = "Grace";
    original.dispatchEvent(new Event("input"));
    await fixture.whenStable();
    expect(host.extra()).toEqual({ name: "Grace" });
    host.extra.set({ name: "Linus" });
    host.labels.set({ ...defaultLabels, search: "Chercher" });
    host.className.set("updated-class");
    await fixture.whenStable();
    expect(field()).toBe(original);
    expect(field().value).toBe("Linus");
    expect(field().placeholder).toBe("Chercher");
    expect(field().className).toBe("updated-class");

    const replacement = signal<ExtraFilters>({ team: "Core" });
    host.source.set(sourceFrom(replacement));
    host.def.set({ key: "team", type: "custom", label: "Team" });
    await fixture.whenStable();
    expect(field().value).toBe("Core");
    expect(field().getAttribute("aria-label")).toBe("Team");
    field().value = "Web";
    field().dispatchEvent(new Event("input"));
    await fixture.whenStable();
    expect(replacement()).toEqual({ team: "Web" });
    expect(host.extra()).toEqual({ name: "Linus" });
  });

  it("updates component inputs without recreating it and destroys replaced renderers", async () => {
    customCreated.mockClear();
    customDestroyed.mockClear();
    const fixture = TestBed.createComponent(RendererHost);
    const host = fixture.componentInstance;
    host.render.set(() => CustomFilter);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const field = () =>
      element.querySelector<HTMLInputElement>("[data-custom-filter]")!;
    expect(
      [
        ...element.querySelectorAll<HTMLInputElement>("[data-custom-filter]"),
      ].map((input) => input.value)
    ).toEqual(["Ada"]);
    const original = field();
    expect(original.value).toBe("Ada");
    original.value = "Grace";
    original.dispatchEvent(new Event("input"));
    await fixture.whenStable();
    expect(host.extra()).toEqual({ name: "Grace" });
    host.extra.set({ name: "Linus" });
    host.labels.set({ ...defaultLabels, search: "Chercher" });
    host.className.set("updated-class");
    host.render.set(() => CustomFilter);
    await fixture.whenStable();
    expect(field()).toBe(original);
    expect(field().value).toBe("Linus");
    expect(field().placeholder).toBe("Chercher");
    expect(field().className).toBe("updated-class");
    expect(customCreated).toHaveBeenCalledTimes(1);
    expect(customDestroyed).not.toHaveBeenCalled();

    host.render.set(() => host.custom());
    await fixture.whenStable();
    expect(field()).not.toBe(original);
    expect(customDestroyed).toHaveBeenCalledTimes(1);
    host.render.set(() => CustomFilter);
    await fixture.whenStable();
    expect(customCreated).toHaveBeenCalledTimes(2);
    fixture.destroy();
    expect(customDestroyed).toHaveBeenCalledTimes(2);
  });

  it.each([undefined, null, false, "", 0, {}, () => "foreign renderer"])(
    "uses the kit widget for an empty or unsupported result: %s",
    async (value) => {
      const fixture = TestBed.createComponent(RendererHost);
      fixture.componentInstance.render.set(
        value === undefined ? undefined : () => value
      );
      fixture.autoDetectChanges();
      await fixture.whenStable();
      const element = fixture.nativeElement as HTMLElement;
      expect(element.querySelector("test-search input")).not.toBeNull();
      expect(element.querySelector("[data-custom-filter]")).toBeNull();
      expect(element.textContent).not.toContain("[object Object]");
    }
  );
});
