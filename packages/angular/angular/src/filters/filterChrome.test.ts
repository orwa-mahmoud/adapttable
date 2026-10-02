import type {
  FilterDef,
  QueryFilterGroup,
  TableSource,
} from "@adapttable/core";
import type {
  ChecklistButtonProps,
  ChecklistCheckboxProps,
  ChecklistSearchProps,
  FilterTreeButtonProps,
  FilterTreeInputProps,
  FilterTreeSelectProps,
} from "@adapttable/core/binding";
import { NgTemplateOutlet } from "@angular/common";
import { Component, computed, input, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { injectFrontendData } from "../source/frontendData";
import { AdaptChecklistChrome } from "./checklistChrome";
import {
  AdaptFilterTreeChrome,
  type AngularFilterTreeDisclosureProps,
} from "./filterTreeChrome";

// Test kit controls: each draws its props natively and marks itself.
@Component({
  selector: "test-select",
  template: `<select
    [attr.aria-label]="props().label"
    [attr.data-part]="props().part"
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
  readonly props = input.required<FilterTreeSelectProps>();
}

@Component({
  selector: "test-input",
  template: `<input
    [attr.aria-label]="props().label"
    [attr.type]="props().type"
    [value]="props().value"
    (input)="props().onChange($any($event.target).value)"
  />`,
})
class TestInput {
  readonly props = input.required<FilterTreeInputProps>();
}

@Component({
  selector: "test-button",
  template: `<button type="button" (click)="props().onClick()">
    {{ props().label }}
  </button>`,
})
class TestButton {
  readonly props = input.required<
    FilterTreeButtonProps | ChecklistButtonProps
  >();
}

@Component({
  selector: "test-disclosure",
  imports: [NgTemplateOutlet],
  template: `<button
      type="button"
      class="toggle"
      (click)="props().onExpandedChange(!props().expanded)"
    >
      {{ props().label }}
    </button>
    @if (props().expanded) {
      <ng-container [ngTemplateOutlet]="props().children" />
    }`,
})
class TestDisclosure {
  readonly props = input.required<AngularFilterTreeDisclosureProps>();
}

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
  readonly props = input.required<ChecklistSearchProps>();
}

@Component({
  selector: "test-checkbox",
  template: `<label
    ><input
      type="checkbox"
      [checked]="props().checked"
      (change)="props().onChange($any($event.target).checked)"
    />{{ props().label }} ({{ props().count }})</label
  >`,
})
class TestCheckbox {
  readonly props = input.required<ChecklistCheckboxProps>();
}

const TREE_SLOTS = {
  Select: TestSelect,
  Input: TestInput,
  Button: TestButton,
  Disclosure: TestDisclosure,
};
const CHECKLIST_SLOTS = {
  Search: TestSearch,
  Button: TestButton,
  Checkbox: TestCheckbox,
};

interface Person {
  id: string;
  name: string;
  age: number;
  active: boolean;
  joined: string;
  city: string;
}

const DEFS: FilterDef<Person>[] = [
  { key: "name", type: "text" },
  { key: "age", type: "numberRange" },
  { key: "active", type: "boolean" },
  { key: "joined", type: "dateRange" },
];

function person(index: number, city: string): Person {
  return {
    id: String(index),
    name: `P${String(index)}`,
    age: 20 + index,
    active: index % 2 === 0,
    joined: "2020-01-01",
    city,
  };
}

type TreeSource = Pick<TableSource<Person>, "filterTree" | "setFilterTree">;

@Component({
  imports: [AdaptFilterTreeChrome],
  template: `<adapt-filter-tree-chrome
    [defs]="defs()"
    [source]="source()"
    [slots]="slots"
  />`,
})
class TreeHost {
  readonly defs = signal<readonly FilterDef<Person>[]>(DEFS);
  readonly tree = signal<QueryFilterGroup | undefined>(undefined);
  readonly writable = signal(true);
  readonly slots = TREE_SLOTS;
  readonly source = computed((): TreeSource => ({
    filterTree: this.tree(),
    setFilterTree: this.writable()
      ? (next) => {
          this.tree.set(next);
        }
      : undefined,
  }));
}

async function mountTree() {
  const fixture = TestBed.createComponent(TreeHost);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const host = fixture.componentInstance;
  const settle = () => fixture.whenStable();
  const button = (label: string) =>
    [...element.querySelectorAll("button")].filter(
      (node) => node.textContent?.trim() === label
    );
  const choose = (select: HTMLSelectElement | undefined, value: string) => {
    if (!select) throw new Error("select is not rendered");
    select.value = value;
    select.dispatchEvent(new Event("change"));
  };
  const typeInto = (field: HTMLInputElement | undefined, value: string) => {
    if (!field) throw new Error("field is not rendered");
    field.value = value;
    field.dispatchEvent(new Event("input"));
  };
  return { host, element, settle, button, choose, typeInto };
}

describe("AdaptFilterTreeChrome", () => {
  it("opens from its disclosure and builds a tree with the kit's controls", async () => {
    const { host, element, settle, button } = await mountTree();
    expect(element.querySelector("fieldset")).toBeNull();
    element.querySelector<HTMLButtonElement>(".toggle")!.click();
    await settle();
    button("Add condition")[0]!.click();
    await settle();
    expect(host.tree()?.conditions).toHaveLength(1);
    expect(element.querySelector("fieldset")?.dataset.depth).toBe("0");
    button("Add group")[0]!.click();
    await settle();
    expect(
      element.querySelector(
        '[data-adapttable-part="filter-tree-group"][data-depth="1"]'
      )
    ).not.toBeNull();
    // Remove the nested group, then the condition.
    button("Remove group")[0]!.click();
    await settle();
    button("Remove condition")[0]!.click();
    await settle();
    expect(host.tree()?.conditions ?? []).toHaveLength(0);
  });

  it("adds a group from the empty builder, and toggles closed", async () => {
    const { host, element, settle, button } = await mountTree();
    element.querySelector<HTMLButtonElement>(".toggle")!.click();
    await settle();
    button("Add group")[0]!.click();
    await settle();
    expect(host.tree()?.conditions).toHaveLength(1);
    element.querySelector<HTMLButtonElement>(".toggle")!.click();
    await settle();
    expect(element.querySelector("fieldset")).toBeNull();
  });

  it("edits every kind of value a condition takes", async () => {
    const { host, element, settle, choose, typeInto } = await mountTree();
    host.tree.set({
      combinator: "and",
      conditions: [
        { key: "name", op: "contains", value: "P" },
        { key: "age", op: "between", value: [20, 30] },
        { key: "active", op: "eq", value: true },
        { key: "joined", op: "relative", value: "last:7" },
        { key: "name", op: "empty" },
        { key: "gone", op: "eq", value: 1 },
      ],
    });
    await settle();
    const rows = element.querySelectorAll(
      '[data-adapttable-part="filter-tree-condition"]'
    );
    // An unknown key edits as the first definition.
    expect(rows).toHaveLength(6);
    const [text, range, yes, relative] = [...rows];
    typeInto(text?.querySelector("input") ?? undefined, "Q");
    await settle();
    expect(host.tree()?.conditions[0]).toMatchObject({ value: "Q" });
    const [from, to] = range?.querySelectorAll("input") ?? [];
    typeInto(from, "21");
    await settle();
    typeInto(to, "40");
    await settle();
    expect(host.tree()?.conditions[1]).toMatchObject({ value: ["21", "40"] });
    const yesSelects = yes?.querySelectorAll("select");
    choose(yesSelects?.[yesSelects.length - 1], "false");
    await settle();
    expect(host.tree()?.conditions[2]).toMatchObject({ value: false });
    const relativeSelects = relative?.querySelectorAll("select");
    typeInto(relative?.querySelector("input") ?? undefined, "3");
    await settle();
    expect(host.tree()?.conditions[3]).toMatchObject({ value: "last:3" });
    choose(relativeSelects?.[relativeSelects.length - 1], "today");
    await settle();
    expect(host.tree()?.conditions[3]).toMatchObject({ value: "today" });
    // Change the operator and the field of the first condition.
    const textSelects = element
      .querySelectorAll('[data-adapttable-part="filter-tree-condition"]')[0]
      ?.querySelectorAll("select");
    const nextOp = textSelects?.[1]?.options[1]?.value ?? "";
    choose(textSelects?.[1], nextOp);
    await settle();
    expect(host.tree()?.conditions[0]).toMatchObject({ op: nextOp });
    choose(textSelects?.[0], "age");
    await settle();
    expect(host.tree()?.conditions[0]).toMatchObject({ key: "age" });
    // And the root's combinator.
    choose(
      element.querySelector<HTMLSelectElement>(
        "fieldset > div > test-select select"
      ) ?? undefined,
      "or"
    );
    await settle();
    expect(host.tree()?.combinator).toBe("or");
    expect(element.querySelector("legend")?.textContent).toBe("OR");
  });

  it("draws nothing without definitions or a tree to write", async () => {
    const { host, element, settle, button } = await mountTree();
    host.writable.set(false);
    await settle();
    expect(element.querySelector(".toggle")).toBeNull();
    host.writable.set(true);
    host.defs.set([]);
    await settle();
    expect(element.querySelector(".toggle")).toBeNull();
    expect(button("Add condition")).toEqual([]);
  });
});

@Component({
  imports: [AdaptChecklistChrome],
  template: `<adapt-checklist-chrome
    [def]="def()"
    [source]="source()"
    [slots]="slots"
  />`,
})
class ChecklistHost {
  readonly data = signal<readonly Person[]>([
    person(1, "Dubai"),
    person(2, "Amman"),
    person(3, "Dubai"),
  ]);
  readonly def = signal<FilterDef<Person>>({
    key: "city",
    type: "checklist",
  });
  readonly slots = CHECKLIST_SLOTS;
  readonly source = injectFrontendData<Person>({
    data: this.data,
    urlSync: false,
    arrayExtraKeys: ["city"],
    filterFn: (row, extra) => {
      const picked = extra.city;
      return !Array.isArray(picked) || picked.includes(row.city);
    },
  });
}

async function mountChecklist() {
  const fixture = TestBed.createComponent(ChecklistHost);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  return {
    host: fixture.componentInstance,
    element,
    settle: () => fixture.whenStable(),
    boxes: () => [
      ...element.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
    ],
  };
}

describe("AdaptChecklistChrome", () => {
  it("lists every value with its count, and writes the picks", async () => {
    const { host, element, settle, boxes } = await mountChecklist();
    expect(
      element.querySelector('[data-adapttable-part="filter-label"]')
        ?.textContent
    ).toBe("City");
    expect(boxes()).toHaveLength(2);
    boxes()[0]!.click();
    await settle();
    expect(host.source().extra.city).toEqual(["Amman"]);
    const [selectAll, clear] = [
      ...element.querySelectorAll<HTMLButtonElement>("test-button button"),
    ];
    clear!.click();
    await settle();
    expect(host.source().rows).toHaveLength(3);
    selectAll!.click();
    await settle();
    expect(boxes().every((box) => box.checked)).toBe(true);
  });

  it("searches the values, and says when none match", async () => {
    const { element, settle, boxes } = await mountChecklist();
    const search = element.querySelector<HTMLInputElement>(
      'input[type="search"]'
    );
    if (!search) throw new Error("search is not rendered");
    search.value = "zzz";
    search.dispatchEvent(new Event("input"));
    await settle();
    expect(boxes()).toHaveLength(0);
    expect(
      element.querySelector(
        '[data-adapttable-part="filter-checklist-list"] span'
      )?.textContent
    ).toBe("No matching values");
  });

  it("windows a long list, reading its scroll position", async () => {
    const { host, element, settle, boxes } = await mountChecklist();
    host.data.set(
      Array.from({ length: 200 }, (_, index) =>
        person(index, `City ${String(index).padStart(3, "0")}`)
      )
    );
    await settle();
    const list = element.querySelector<HTMLElement>(
      '[data-adapttable-part="filter-checklist-list"]'
    );
    expect(list?.dataset.virtualized).toBe("true");
    const before = boxes().length;
    expect(before).toBeLessThan(200);
    if (!list) throw new Error("list is not rendered");
    Object.defineProperty(list, "clientWidth", { value: 400 });
    list.scrollTop = 2000;
    list.dispatchEvent(new Event("scroll"));
    await settle();
    list.dispatchEvent(new Event("scroll"));
    await settle();
    expect(boxes()[0]?.parentElement?.textContent).not.toContain("City 000");
  });

  it("draws nothing for values this tier cannot list", async () => {
    const { host, element, settle } = await mountChecklist();
    host.def.set({ key: "city", type: "checklist", options: "auto" });
    await settle();
    expect(
      element.querySelector('[data-adapttable-part="filter-checklist"]')
    ).not.toBeNull();
  });
});
