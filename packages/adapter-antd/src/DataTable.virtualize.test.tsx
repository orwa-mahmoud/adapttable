/** Mobile-card windowing: the card list renders only the virtual slice. */
import type * as AdaptTableCore from "@adapttable/core";
import {
  createMemoryAdapter,
  useFrontendData,
  useTableVirtualization,
} from "@adapttable/core";
import { render, within } from "@testing-library/react";
import { ConfigProvider } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
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

// jsdom has no layout, so the real window virtualizer can't materialize a
// window; mock the core hook (defaulting to the real one) and drive an
// explicit slice for the windowed case — mirroring the MUI coverage suite.
vi.mock("@adapttable/core", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    useTableVirtualization: vi.fn(),
  };
});

let adapter: ReturnType<typeof createMemoryAdapter>;

beforeEach(async () => {
  const actual =
    await vi.importActual<typeof AdaptTableCore>("@adapttable/core");
  vi.mocked(useTableVirtualization).mockImplementation(
    actual.useTableVirtualization
  );
});

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
    vi.mocked(useTableVirtualization).mockReturnValue({
      enabled: true,
      rows: Array.from({ length: WINDOW }, (_, i) => ({
        row: ROWS[i + 5]!,
        index: i + 5,
        key: ROWS[i + 5]!.id,
      })),
      paddingTop: 320,
      paddingBottom: 2400,
      measureElement,
    });
    const { container } = mount({ isMobile: true, virtualize: true });
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
    const { container } = mount({ isMobile: true });
    const list = cardList(container);
    // The real hook stays disabled, so all 50 source rows render as cards.
    expect(within(list).getAllByRole("listitem")).toHaveLength(50);
  });
});
