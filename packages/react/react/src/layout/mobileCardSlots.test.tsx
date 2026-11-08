import { defaultConfirm, pinnedSummaryRowId } from "@adapttable/core";
import { insertExtraRows } from "@adapttable/core/binding";
import { renderHook } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import { useFrontendData } from "../source/useFrontendData";
import { createMemoryAdapter } from "../url/adapter";
import { useTableChrome } from "../useTableChrome";
import type { MobileCardSlot } from "./mobileCardsChrome";
import {
  type MobileCardBodyProps,
  type MobileCardEntry,
  type MobileCardListProps,
  mobileCardPropsEqual,
  type MobileCardSlotKit,
  mobileCardSlots,
} from "./mobileCardSlots";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "a", name: "Alice" },
  { id: "b", name: "Bob" },
];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
];

function useTable() {
  const source = useFrontendData<Row>({
    data: ROWS,
    columns,
    urlAdapter: createMemoryAdapter(""),
    paginationMode: "paged",
  });
  return useTableChrome<Row>({ source, columns, rowKey: (row) => row.id })
    .table;
}

/** A kit that records the entries it is handed. */
function recordingKit(): MobileCardSlotKit<Row> & {
  entries: MobileCardEntry<Row>[];
} {
  const entries: MobileCardEntry<Row>[] = [];
  return {
    entries,
    card: (entry) => {
      entries.push(entry);
      return { key: entry.key, props: entry.itemProps, content: null };
    },
    extraCell: (part, content) => createElement("div", { part }, content),
    groupCard: (entry) => entry.key,
  };
}

function slots(
  extra: Partial<MobileCardListProps<Row>>,
  kit: MobileCardSlotKit<Row>
): MobileCardSlot[] {
  const { result } = renderHook(() => {
    const table = useTable();
    return mobileCardSlots(
      {
        table,
        rows: ROWS,
        getRowId: (row) => row.id,
        confirm: defaultConfirm,
        ...extra,
      },
      kit
    );
  });
  return result.current;
}

describe("mobileCardSlots", () => {
  it("hands the kit one entry per row with the shared list-item props", () => {
    const onRowClick = vi.fn();
    const kit = recordingKit();
    const cards = slots(
      { onRowClick, rowClassName: (row) => `row-${row.id}` },
      kit
    );
    expect(cards.map((card) => card.key)).toEqual(["a", "b"]);
    const [first] = kit.entries;
    expect(first?.rowClass).toBe("row-a");
    expect(first?.itemProps).toMatchObject({
      role: "listitem",
      "data-adapttable-part": "card",
      "data-index": 0,
    });
    expect(first?.body.onRowClick).toBe(onRowClick);
    expect(first?.itemProps["aria-posinset"]).toBeUndefined();
  });

  it("states position and set size in a windowed list", () => {
    const kit = recordingKit();
    slots({ windowStart: 10, cardSetSize: 50 }, kit);
    expect(kit.entries[1]?.itemProps).toMatchObject({
      "aria-posinset": 12,
      "aria-setsize": 50,
    });
  });

  it("keeps a pinned total free of row interactions", () => {
    const kit = recordingKit();
    slots({ pinnedSummaryTop: [ROWS[0]!], onRowClick: vi.fn() }, kit);
    const total = kit.entries.find((entry) => entry.pinned);
    expect(total?.key).toBe(pinnedSummaryRowId("top", 0));
    expect(total?.body.onRowClick).toBeUndefined();
    expect(total?.body.onToggleSelect).toBeUndefined();
    expect(total?.itemProps["data-adapttable-part"]).not.toBe("card");
  });

  it("opens no detail without a detail renderer", () => {
    const kit = recordingKit();
    const expansion = {
      isExpanded: () => true,
      toggle: vi.fn(),
    } as unknown as MobileCardListProps<Row>["expansion"];
    slots({ expansion }, kit);
    expect(kit.entries[0]?.body.expanded).toBe(false);
    expect(kit.entries[0]?.body.onToggleExpand).toBeUndefined();
  });

  it("places extra rows with the kit's cell and props", () => {
    const kit = {
      ...recordingKit(),
      extraProps: (kind: string) => ({ "data-kind": kind }),
    };
    const cards = slots(
      {
        extraRows: [{ key: "sep", kind: "separator", beforeRowId: "b" }],
        assembly: { insertExtraRows },
      },
      kit
    );
    expect(cards.map((card) => card.key)).toEqual(["a", "sep", "b"]);
    const separator = cards[1];
    expect(separator?.props).toMatchObject({
      role: "separator",
      "data-kind": "separator",
    });
  });

  it("draws group cards and leaf cards from the grouping", () => {
    const kit = recordingKit();
    const toggle = vi.fn();
    const cards = slots(
      {
        grouping: {
          entries: [
            {
              kind: "group",
              key: "g1",
              label: "All",
              level: 0,
              leafIds: ["a"],
              collapsed: false,
            },
            { kind: "row", key: "a", row: ROWS[0]!, index: 0 },
          ] as unknown as NonNullable<
            MobileCardListProps<Row>["grouping"]
          >["entries"],
          collapsed: { toggle },
          showMore: vi.fn(),
        },
      },
      kit
    );
    expect(cards[0]).toMatchObject({
      key: "g1",
      props: { "data-passthrough": "" },
      content: "g1",
    });
    expect(cards[1]?.key).toBe("a");
  });
});

describe("mobileCardPropsEqual", () => {
  type Props = MobileCardBodyProps<Row> & { compact: boolean };
  const equal = mobileCardPropsEqual<Row, Props>(["compact"]);
  const base = { row: ROWS[0], compact: false } as unknown as Props;

  it("compares the shared inputs and the kit's own", () => {
    expect(equal(base, { ...base })).toBe(true);
    expect(equal(base, { ...base, compact: true })).toBe(false);
    expect(equal(base, { ...base, renderCard: () => null })).toBe(false);
  });

  it("ignores the fingerprinted inputs", () => {
    expect(equal(base, { ...base, editing: {} as Props["editing"] })).toBe(
      true
    );
  });
});
