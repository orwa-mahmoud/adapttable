import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import {
  type ColumnDef,
  createMemoryAdapter,
  useFrontendData,
} from "@adapttable/react";
import { screen } from "@testing-library/react";
import { expect } from "vitest";

import type { ReactKitUnderTest } from "../kit";

/**
 * The shared `RenderCard.test.tsx` suite: behaviour every React kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function renderCardTests(
  kit: ReactKitUnderTest
): readonly ConformanceTest[] {
  const { DataTable, render } = kit;
  return collectConformanceTests(({ describe, it, beforeEach }) => {
    /**
     * A custom mobile card body.
     *
     * The thing worth testing is not that the host's markup appears — it is what
     * survives around it. Replacing the body must not cost the reader the list
     * semantics, the checkbox, the row actions or the detail panel, because those
     * are what make a card list usable and a custom card has no way to put them
     * back.
     */

    interface Row {
      id: string;
      name: string;
      city: string;
    }

    const ROWS: Row[] = [
      { id: "a", name: "Ada", city: "Dubai" },
      { id: "b", name: "Grace", city: "Riyadh" },
    ];

    const COLUMNS: ColumnDef<Row>[] = [
      { key: "name", header: "Name", accessor: (r) => r.name },
      { key: "city", header: "City", accessor: (r) => r.city, mobileLabel: "" },
    ];

    let adapter: ReturnType<typeof createMemoryAdapter>;

    type Override = Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">>;

    function Harness(props: Readonly<Override>) {
      const source = useFrontendData<Row>({
        data: ROWS,
        urlAdapter: adapter,
        columns: COLUMNS,
      });
      return (
        <DataTable
          source={source}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          forceMobile
          {...props}
        />
      );
    }

    beforeEach(() => {
      adapter = createMemoryAdapter("");
    });

    describe("renderCard", () => {
      it("hands over the same value the built-in would have rendered", () => {
        render(
          <Harness
            renderCard={(_row, card) => (
              <p>{card.fields.map((field) => field.value)}</p>
            )}
          />
        );

        expect(screen.getByText(/Dubai/)).toBeInTheDocument();
      });
    });
  });
}
