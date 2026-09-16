/** Mobile-card windowing: the card list renders only the virtual slice. */
import { createMemoryAdapter, useFrontendData } from "@adapttable/react";
import {
  KEYED_WINDOW,
  type KeyedWindowSlotProps,
  slotRender,
  type TableFeature,
} from "@adapttable/react/adapter";
import { render, within } from "@testing-library/react";
import { ConfigProvider } from "antd";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
  city: string;
}

// Far more rows than any virtual window, so a windowed render is unmistakably
// bounded well below the source count.
const ROWS: Row[] = Array.from({ length: 50 }, (_, i) => ({
  id: String(i),
  name: `Name ${i}`,
  city: `City ${i}`,
}));

const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
  { key: "city", header: "City", accessor: (r) => r.city },
];

/**
 * jsdom has no layout, so a real virtualizer materializes no window. antd asks
 * for its card window through `KEYED_WINDOW`, which only `virtualize` fills —
 * so a feature that fills the same slot with a fixed slice drives the windowed
 * path exactly as the real one does, and the seam itself is what is under test.
 */
function fixedWindow<TRow>(options: {
  from: number;
  count: number;
  paddingTop: number;
  paddingBottom: number;
  measureElement: (node: Element | null) => void;
}): TableFeature<TRow> {
  return {
    id: "virtualize",
    apply: () => ({ virtualize: true }),
    renders: [
      slotRender(KEYED_WINDOW, ({ children }: KeyedWindowSlotProps) =>
        children({
          enabled: true,
          indices: Array.from(
            { length: options.count },
            (_, i) => options.from + i
          ),
          paddingTop: options.paddingTop,
          paddingBottom: options.paddingBottom,
          measureElement: options.measureElement,
        })
      ),
    ],
  };
}

let adapter: ReturnType<typeof createMemoryAdapter>;

function mount(
  override: Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">> = {},
  url = "limit=100"
) {
  adapter = createMemoryAdapter(url);
  function Harness() {
    const source = useFrontendData<Row>({
      data: ROWS,
      urlAdapter: adapter,
      columns,
      paginationMode: "infinite",
    });
    return (
      <DataTable
        source={source}
        columns={columns}
        rowKey={(r) => r.id}
        {...override}
      />
    );
  }
  return render(
    <ConfigProvider>
      <Harness />
    </ConfigProvider>
  );
}

/** The card list `<ul>`, scoping card queries away from toolbar controls. */
function cardList(container: HTMLElement): HTMLElement {
  const list = container.querySelector<HTMLElement>(
    '[data-adapttable-part="cards"]'
  );
  expect(list).not.toBeNull();
  return list!;
}

describe("<DataTable> (Ant Design) mobile card windowing", () => {
  it("renders only the virtual slice, bracketed by top and bottom spacers", () => {
    const measureElement = vi.fn();
    // A 10-card window out of 50 source rows, with rows above and below it.
    const WINDOW = 10;
    const { container } = mount({
      forceMobile: true,
      features: [
        fixedWindow<Row>({
          from: 5,
          count: WINDOW,
          paddingTop: 320,
          paddingBottom: 2400,
          measureElement,
        }),
      ],
    });
    const list = cardList(container);
    const items = within(list).getAllByRole("listitem");
    // Only the windowed cards render — far fewer than the 50 source rows.
    expect(items).toHaveLength(WINDOW);
    expect(items.length).toBeLessThan(30);
    // Each rendered card carries its ORIGINAL source index for measurement.
    expect(items[0]).toHaveAttribute("data-index", "5");
    expect(within(list).getByText("Name 5")).toBeInTheDocument();
    // The virtualizer measures every rendered card.
    expect(measureElement).toHaveBeenCalled();
    // A top and a bottom spacer reserve the off-window scroll height.
    const spacers = Array.from(list.children).filter((el) =>
      el.hasAttribute("aria-hidden")
    );
    expect(spacers).toHaveLength(2);
  });

  it("renders every card when virtualize is off (no windowing)", () => {
    const { container } = mount({ forceMobile: true });
    const list = cardList(container);
    // The real hook stays disabled, so all 50 source rows render as cards.
    expect(within(list).getAllByRole("listitem")).toHaveLength(50);
  });
});

/**
 * antd's own virtualizer draws the body as a div grid — its rows are `<div>`s,
 * not `<tr>`s. Naming that body `tbody` on a `<tbody>` element puts a table
 * section inside antd's holder div and div rows inside a table section: invalid
 * both ways, and React says so at runtime. The part name still has to land, so
 * it lands on the element antd actually renders.
 */
describe("<DataTable> (Ant Design) virtual table body", () => {
  const bodyPart = (container: HTMLElement) => {
    const parts = container.querySelectorAll('[data-adapttable-part="tbody"]');
    expect(parts).toHaveLength(1);
    return parts[0]!;
  };

  it("names a div when antd virtualizes the body", () => {
    const { container } = mount({ virtualize: true });
    expect(bodyPart(container).tagName).toBe("DIV");
    // The invalid nesting this guards: no table section inside the holder.
    expect(container.querySelector("tbody")).toBeNull();
  });

  it("names the real tbody when it is not virtualized", () => {
    const { container } = mount();
    expect(bodyPart(container).tagName).toBe("TBODY");
  });

  it("keeps the tbody when grouping turns antd's virtualizer off", () => {
    // Grouping and antd's virtual mode are mutually exclusive, so the body is
    // a real section again even with `virtualize` asked for.
    const { container } = mount({ virtualize: true, groupBy: "city" });
    expect(bodyPart(container).tagName).toBe("TBODY");
  });
});
