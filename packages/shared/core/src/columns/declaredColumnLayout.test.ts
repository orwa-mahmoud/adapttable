import { describe, expect, it } from "vitest";

import type { ColumnModel } from "../columnModel";
import { declaredColumnLayout } from "./declaredColumnLayout";

/**
 * The column layout of a table that composed no layout-owning feature.
 *
 * An adapter asks the same questions of every table — which columns are
 * visible, is this one hidden, where does a pinned one sit — and calls the same
 * mutators from its Columns menu. Without the feature those mutators have
 * nothing to write to, so each one has to be inert rather than absent: the host
 * still declared what it declared, and nothing the user does can move it.
 */
interface Row {
  id: string;
  name: string;
  secret: string;
}

const columns = [
  { key: "name", header: "Name", exportValue: (r: Row) => r.name },
  {
    key: "secret",
    header: "Secret",
    exportValue: (r: Row) => r.secret,
    hidden: true,
  },
] as ColumnModel<Row>[];

describe("declaredColumnLayout", () => {
  it("honours the hidden flag the host declared", () => {
    const layout = declaredColumnLayout(columns);

    expect(layout.visibleColumns.map((c) => c.key)).toEqual(["name"]);
    expect(layout.isHidden("secret")).toBe(true);
    expect(layout.isHidden("name")).toBe(false);
  });

  it("pins nothing, because pinning is a feature", () => {
    const layout = declaredColumnLayout(columns);

    expect(layout.pinOffset("name")).toBeUndefined();
    expect(layout.state.pinned).toEqual({});
    expect(layout.state.hidden).toEqual([]);
  });

  it("takes every mutation without changing what it shows", () => {
    const layout = declaredColumnLayout(columns);
    const before = layout.visibleColumns;

    expect(() => {
      layout.setHidden("name", true);
      layout.toggleVisible("name");
      layout.setPinned("name", "start");
      layout.move("name", 1);
      layout.setWidth("name", 240);
      layout.reset();
      layout.toggleColumnGroup("group");
    }).not.toThrow();

    // The point of the stand-in: a Columns menu can be wired to it and the
    // declared layout still wins.
    expect(layout.visibleColumns).toBe(before);
    expect(layout.isHidden("name")).toBe(false);
    expect(layout.pinOffset("name")).toBeUndefined();
  });
});
