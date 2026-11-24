/**
 * Feature families: every member of an area, built by one call and passed to
 * `features` as one entry. Each test reads the members' own controls, so a
 * family that dropped a member, or one the table did not unfold, fails here.
 */
import { describe, expect, it, vi } from "vitest";
import { h } from "vue";

import { DataTable } from "../src";
import { columnLayoutFamily } from "../src/column-layout";
import { editingFamily } from "../src/editing";
import { filteringFamily } from "../src/filtering";
import {
  deferred,
  find,
  mountNative,
  part,
  tick,
  write,
} from "./filter-editing-helpers";

const rows = [
  { id: "a", name: "Ada", team: "Math" },
  { id: "g", name: "Grace", team: "Computing" },
];
type Row = (typeof rows)[number];

function table(features: unknown) {
  return mountNative(() =>
    h(DataTable<Row>, {
      data: rows,
      columns: [
        { key: "name", editable: true },
        { key: "team", sortable: true },
      ],
      rowKey: (row: Row) => row.id,
      urlSync: false,
      searchable: false,
      features: features as never,
    })
  );
}

describe("native feature families", () => {
  it("editingFamily edits a cell, marks it until the host confirms, and offers undo", async () => {
    const request = deferred<void>();
    const commit = vi.fn(() => request.promise);
    const { host } = table([editingFamily<Row>(commit)]);
    await tick();

    expect(host.querySelector(part("undo-button"))).not.toBeNull();
    const activate = find<HTMLButtonElement>(host, part("edit-cell-activate"));
    activate.focus();
    activate.dispatchEvent(
      new KeyboardEvent("keydown", { key: "F2", bubbles: true })
    );
    await tick();
    const input = find<HTMLInputElement>(host, part("edit-cell-editor"));
    await write(input, "Augusta");
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await tick();

    expect(commit).toHaveBeenCalledExactlyOnceWith(rows[0], "name", "Augusta");
    expect(find(host, "[data-edit-unit]").hasAttribute("data-dirty")).toBe(
      true
    );
  });

  it("filteringFamily draws the filter panel trigger and the header filter triggers", async () => {
    const { host } = table([
      filteringFamily<Row>([
        {
          key: "team",
          type: "select",
          options: [
            { value: "Math", label: "Math" },
            { value: "Computing", label: "Computing" },
          ],
        },
      ]),
    ]);
    await tick();

    expect(host.querySelector(part("filters-button"))).not.toBeNull();
    expect(host.querySelector(part("filter-header-trigger"))).not.toBeNull();
  });

  it("columnLayoutFamily draws the columns menu and resize handles", async () => {
    const { host } = table([columnLayoutFamily()]);
    await tick();

    expect(host.querySelector(part("column-menu-button"))).not.toBeNull();
    expect(host.querySelector(part("resize-handle"))).not.toBeNull();
  });

  it("composes two families in one list", async () => {
    const { host } = table([columnLayoutFamily(), editingFamily<Row>(vi.fn())]);
    await tick();

    expect(host.querySelector(part("column-menu-button"))).not.toBeNull();
    expect(host.querySelector(part("undo-button"))).not.toBeNull();
    expect(host.querySelector(part("edit-cell-activate"))).not.toBeNull();
  });
});
