/**
 * The table's locale: columns that read by `i18n` path show, filter, search
 * and sort that locale's field, from one prop on the table.
 */
import type { ColumnDef } from "@adapttable/vue";
import { afterEach, describe, expect, it } from "vitest";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";

import { DataTable } from "../src";
import { filters } from "../src/filters";

interface Person {
  id: string;
  team: string;
  teamAr: string;
}

const PEOPLE: readonly Person[] = [
  { id: "1", team: "Design", teamAr: "التصميم" },
  { id: "2", team: "Data", teamAr: "البيانات" },
  // First in English, last in Arabic: the sort shows which field it read.
  { id: "3", team: "Aardvark", teamAr: "يمام" },
];

const COLUMNS: readonly ColumnDef<Person>[] = [
  {
    key: "team",
    header: "Team",
    sortable: true,
    i18n: { ar: "teamAr" },
    filter: { type: "select", options: "auto" },
  },
];

const cleanup: (() => void)[] = [];
afterEach(() => {
  for (const clean of cleanup.splice(0)) clean();
  document.body.replaceChildren();
});

async function settle() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

async function mount() {
  const locale = shallowRef<string | undefined>("ar");
  const element = document.createElement("div");
  document.body.append(element);
  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(DataTable<Person>, {
          data: PEOPLE,
          columns: COLUMNS,
          rowKey: (row: Person) => row.id,
          urlSync: false,
          locale: locale.value,
          searchDebounceMs: 0,
          features: [filters<Person>([], { mode: "drawer" })],
        }),
    })
  );
  app.mount(element);
  cleanup.push(() => {
    app.unmount();
  });
  await settle();
  const cells = () =>
    [...element.querySelectorAll('td[data-column-key="team"]')].map((cell) =>
      cell.textContent.trim()
    );
  return { element, locale, cells };
}

describe("the table's locale", () => {
  it("shows the locale's field in the cells", async () => {
    const { locale, cells } = await mount();
    expect(cells()).toEqual(["التصميم", "البيانات", "يمام"]);
    locale.value = undefined;
    await settle();
    expect(cells()).toEqual(["Design", "Data", "Aardvark"]);
  });

  it("offers the locale's values as filter choices", async () => {
    const { element } = await mount();
    element
      .querySelector<HTMLButtonElement>(
        '[data-adapttable-part="filters-button"]'
      )
      ?.click();
    await settle();
    const choices = [
      ...document.querySelectorAll<HTMLOptionElement>(
        '[data-adapttable-part="filter-select"] option'
      ),
    ].map((option) => option.textContent.trim());
    expect(choices).toEqual(expect.arrayContaining(["التصميم", "البيانات"]));
    expect(choices).not.toContain("Design");
  });

  it("searches the locale's field", async () => {
    const { element, cells } = await mount();
    const search = element.querySelector<HTMLInputElement>(
      'input[type="search"]'
    )!;
    search.value = "التصميم";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
    expect(cells()).toEqual(["التصميم"]);
  });

  it("sorts by the locale's field", async () => {
    const { element, cells } = await mount();
    const header = element.querySelector<HTMLElement>(
      '[data-adapttable-part="header-cell"][data-column-key="team"]'
    )!;
    (header.querySelector("button") ?? header).click();
    await settle();
    // English order would lead with Aardvark's يمام.
    expect(cells()).toEqual(["البيانات", "التصميم", "يمام"]);
  });
});
