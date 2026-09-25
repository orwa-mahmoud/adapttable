import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import type { EditConflictPolicy } from "../editing/editConflict";
import {
  type DataTableShellResult,
  useDataTableShell,
} from "../useDataTableShell";
import { DataTableShellView } from "./chromeBodyGate";
import { batchEditing, editing, rowEditing } from "./editing";
import { FeatureProviders } from "./providers";
import { applyTableFeatures, type TableFeature } from "./tableFeature";
import { tree } from "./tree";

/**
 * What an open editor and an expanding tree do when the host's data moves
 * underneath them: the table answers by the composed policy, and a node whose
 * children failed to arrive closes again.
 */
interface Row {
  id: string;
  name: string;
  parentId?: string;
}
const ROWS: Row[] = [
  { id: "a", name: "Alice" },
  { id: "b", name: "Bob" },
];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, editable: true },
];

const noForm = () => null;

function harness(features: readonly TableFeature<Row>[]) {
  let latest: DataTableShellResult<Row> | undefined;
  function Shell({ data }: { readonly data: readonly Row[] }) {
    const props = applyTableFeatures({
      features,
      data: [...data],
      columns,
      rowKey: (r: Row) => r.id,
      urlSync: false,
      forceMobile: false,
    });
    const shell = useDataTableShell(props, noForm);
    return (
      <FeatureProviders props={props}>
        <DataTableShellView<Row> shell={shell}>
          {(view) => {
            latest = view;
            return null;
          }}
        </DataTableShellView>
      </FeatureProviders>
    );
  }
  const { rerender } = render(<Shell data={ROWS} />);
  return {
    view: () => {
      if (!latest) throw new Error("the shell never rendered");
      return latest;
    },
    setData: (data: readonly Row[]) => {
      rerender(<Shell data={data} />);
    },
  };
}

const renamed = (name: string): Row[] => [{ id: "a", name }, ROWS[1]!];

describe("a cell editor open while its row changes", () => {
  function openCell(policy: EditConflictPolicy) {
    const table = harness([
      editing<Row>(vi.fn(), { editConflictPolicy: policy }),
    ]);
    const state = () => table.view().chrome.editing!.state;
    act(() => {
      state().begin("a", "name", "Alice", ROWS[0]);
    });
    act(() => {
      state().setDraft("Mine");
    });
    return { table, state };
  }

  it("keeps the reader's draft under the keep policy", () => {
    const { table, state } = openCell("keep");

    table.setData(renamed("Alicia"));

    expect(state().draft).toBe("Mine");
    // The editor now measures against the row that arrived.
    expect(state().openedRow()).toEqual({ id: "a", name: "Alicia" });
    expect(table.view().chrome.editing?.conflict?.current).toBeNull();
  });

  it("takes the incoming value under the take policy", () => {
    const { table, state } = openCell("take");

    table.setData(renamed("Alicia"));

    expect(state().draft).toBe("Alicia");
    expect(table.view().chrome.editing?.conflict?.current).toBeNull();
  });
});

describe("a row form open while its row changes", () => {
  function openRow(policy: EditConflictPolicy) {
    const table = harness([
      rowEditing<Row>(vi.fn(), { editConflictPolicy: policy }),
    ]);
    const form = () => table.view().chrome.editing!.rowEditing!;
    act(() => {
      form().begin(ROWS[0]!, "a");
    });
    act(() => {
      form().setDraft("name", "Mine");
    });
    return { table, form };
  }

  it("keeps the field the reader typed in under the keep policy", () => {
    const { table, form } = openRow("keep");

    table.setData(renamed("Alicia"));

    expect(form().draftFor("name")).toBe("Mine");
  });

  it("takes what arrived under the take policy", () => {
    const { table, form } = openRow("take");

    table.setData(renamed("Alicia"));

    expect(form().draftFor("name")).toBe("Alicia");
  });
});

describe("a batch draft whose row changes", () => {
  it("takes what arrived under the take policy", () => {
    const table = harness([
      batchEditing<Row>(vi.fn(), { editConflictPolicy: "take" }),
    ]);
    const batch = () => table.view().chrome.editing!.batch!;
    act(() => {
      batch().setDraft(ROWS[0]!, "a", "name", "Mine");
    });
    expect(batch().draftFor(ROWS[0]!, "a", "name")).toBe("Mine");

    const next = renamed("Alicia");
    table.setData(next);

    expect(batch().draftFor(next[0]!, "a", "name")).toBe("Alicia");
  });
});

describe("a lazily loaded tree node", () => {
  const PARENT: Row[] = [{ id: "p", name: "Parent" }];

  function lazyTree() {
    const pending: { reject?: (reason: Error) => void } = {};
    const onLoadChildren = vi.fn(
      () =>
        new Promise<void>((_resolve, fail) => {
          pending.reject = fail;
        })
    );
    const table = harness([
      tree<Row>({
        getParentId: (row) => row.parentId,
        hasChildren: (row) => row.id === "p",
        onLoadChildren,
      }),
    ]);
    table.setData(PARENT);
    return {
      table,
      onLoadChildren,
      fail: async () => {
        await act(async () => {
          pending.reject?.(new Error("offline"));
          await Promise.resolve();
        });
      },
    };
  }

  it("closes again when its children fail to arrive", async () => {
    const { table, onLoadChildren, fail } = lazyTree();
    const expansion = () => table.view().chrome.tree!.expansion;

    act(() => {
      expansion().toggle("p");
    });
    expect(onLoadChildren).toHaveBeenCalledTimes(1);
    expect(expansion().isExpanded("p")).toBe(true);

    await fail();

    // Closed, so the next click is a retry rather than a close.
    expect(expansion().isExpanded("p")).toBe(false);
  });

  it("stays closed when the reader closed it before the failure", async () => {
    const { table, fail } = lazyTree();
    const expansion = () => table.view().chrome.tree!.expansion;

    act(() => {
      expansion().toggle("p");
    });
    act(() => {
      expansion().toggle("p");
    });
    expect(expansion().isExpanded("p")).toBe(false);

    await fail();

    expect(expansion().isExpanded("p")).toBe(false);
  });
});
