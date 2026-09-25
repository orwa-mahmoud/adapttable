/**
 * Documented `classNames` keys reach the DOM.
 *
 * A class map that silently drops a key is worse than one that never offered
 * it: the docs promise a styling hook, the app ships without it, and nothing
 * fails. These are the keys the checklist and the tree builder hand their kit
 * slots.
 */
import type { QueryFilterGroup } from "@adapttable/core";
import { fireEvent, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { defaultLabels, type ExtraFilters, type FilterDef } from "../index";
import { renderBaseUi } from "../test-utils";
import { ChecklistFilter } from "./ChecklistFilter";
import { FilterTreeBuilder } from "./FilterTreeBuilder";

interface Row {
  name: string;
  team: string;
}

const ROWS: Row[] = [
  { name: "Ada", team: "Core" },
  { name: "Alan", team: "Web" },
];

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
];

/** Any element carrying `cls`, whatever kit element ended up with it. */
const withClass = (cls: string) => document.querySelectorAll(`.${cls}`);

function Checklist() {
  const [extra, setExtra] = useState<ExtraFilters>({});
  return (
    <ChecklistFilter
      def={{ key: "team", type: "checklist", label: "Team" }}
      source={{
        extra,
        setExtra: (key, value) =>
          setExtra((prev) => ({ ...prev, [key]: value })),
        allFilteredRows: ROWS,
      }}
      labels={defaultLabels}
      classNames={{
        filterChecklistSearch: "search-cls",
        filterCheckbox: "box-cls",
        filterChecklistCount: "count-cls",
      }}
    />
  );
}

function TreeBuilder() {
  const [filterTree, setFilterTree] = useState<QueryFilterGroup | undefined>({
    combinator: "and",
    conditions: [{ key: "name", op: "contains", value: "a" }],
  });
  return (
    <FilterTreeBuilder
      defs={DEFS}
      source={{ filterTree, setFilterTree }}
      labels={defaultLabels}
      classNames={{
        filterSelect: "select-cls",
        filterInput: "input-cls",
        filterTreeRemove: "remove-cls",
      }}
    />
  );
}

describe("documented classNames (base-ui)", () => {
  it("puts filterChecklistSearch on the checklist's search field", () => {
    renderBaseUi(<Checklist />);
    expect(withClass("search-cls").length).toBeGreaterThan(0);
  });

  it("puts filterCheckbox on each checklist option", () => {
    renderBaseUi(<Checklist />);
    // One per distinct value, and the class is on the part it names.
    expect(withClass("box-cls")).toHaveLength(2);
    expect(
      document.querySelector('[data-adapttable-part="filter-checkbox"]')
    ).toHaveClass("box-cls");
  });

  it("puts filterChecklistCount on each option's count", () => {
    renderBaseUi(<Checklist />);
    expect(withClass("count-cls")).toHaveLength(2);
  });

  it("still drives the checklist with the classes applied", () => {
    renderBaseUi(<Checklist />);
    fireEvent.change(screen.getByLabelText("Search values"), {
      target: { value: "Co" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /Core/ }));
    expect(screen.getByRole("checkbox", { name: /Core/ })).toBeChecked();
  });

  it("puts filterSelect and filterInput on the tree builder's controls", () => {
    renderBaseUi(<TreeBuilder />);
    expect(withClass("select-cls").length).toBeGreaterThan(0);
    expect(withClass("input-cls").length).toBeGreaterThan(0);
  });

  it("puts filterTreeRemove on the tree builder's remove button", () => {
    renderBaseUi(<TreeBuilder />);
    expect(withClass("remove-cls").length).toBeGreaterThan(0);
  });
});
