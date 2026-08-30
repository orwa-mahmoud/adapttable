import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { RowReorderState } from "../rows/rowReorder";
import {
  FeatureProviders,
  useFeatureState,
  usePublishTableRuntime,
} from "./providers";
import { ROW_REORDER, rowReorder } from "./row-reorder";
import { applyTableFeatures } from "./tableFeature";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bob" },
  { id: "c", name: "Cleo" },
];

/**
 * Stands in for the chrome: publishes the rows and labels the provider reads,
 * then renders whatever the feature made available.
 */
function Chrome({
  labels,
  onState,
}: {
  readonly labels?: Record<string, unknown>;
  readonly onState?: (state: RowReorderState<Row>) => void;
}) {
  usePublishTableRuntime(ROWS, labels);
  const reorder = useFeatureState(ROW_REORDER) as
    RowReorderState<Row> | undefined;
  if (!reorder) return <span data-testid="state">absent</span>;
  onState?.(reorder);
  return (
    <div>
      <span data-testid="state">present</span>
      <span data-testid="announcement">{reorder.announcement}</span>
      <span data-testid="lifted">{String(reorder.lifted?.rowId)}</span>
      {ROWS.map((row, index) => (
        <button
          key={row.id}
          type="button"
          data-testid={`row-${row.id}`}
          {...reorder.dragProps(row.id, index)}
          onKeyDown={(event) =>
            reorder.handleKeyDown(event, row.id, index, row, 0, ROWS.length)
          }
        >
          {row.name}
        </button>
      ))}
    </div>
  );
}

function mount(
  feature: ReturnType<typeof rowReorder<Row>> | undefined,
  labels?: Record<string, unknown>,
  onState?: (state: RowReorderState<Row>) => void
) {
  const props = applyTableFeatures({ features: feature ? [feature] : [] });
  return render(
    <FeatureProviders props={props}>
      <Chrome labels={labels} onState={onState} />
    </FeatureProviders>
  );
}

describe("rowReorder", () => {
  it("carries the handler and a provider on one feature object", () => {
    const handler = vi.fn();
    const feature = rowReorder<Row>(handler);
    expect(feature.id).toBe("row-reorder");
    expect(feature.provider).toBeDefined();
    // The handler travels on the feature so one stable component serves every
    // call of the factory.
    expect(feature).toMatchObject({ onRowReorder: handler });
  });

  it("publishes nothing when the feature is not composed", () => {
    mount(undefined);
    expect(screen.getByTestId("state")).toHaveTextContent("absent");
  });

  it("publishes reorder state when it is", () => {
    mount(rowReorder<Row>(vi.fn()));
    expect(screen.getByTestId("state")).toHaveTextContent("present");
  });

  // The same factory called twice must be the same component, or a rerender
  // would remount the provider and drop a drag in flight.
  it("uses one component for every call of the factory", () => {
    const first = rowReorder<Row>(vi.fn());
    const second = rowReorder<Row>(vi.fn());
    expect(first.provider?.Provider).toBe(second.provider?.Provider);
  });

  it("reads the rows the chrome published", () => {
    const handler = vi.fn();
    let state: RowReorderState<Row> | undefined;
    mount(rowReorder<Row>(handler), undefined, (next) => {
      state = next;
    });

    // A drop carries the dragged row, which the provider looks up through the
    // runtime rather than holding itself.
    const data = new Map<string, string>();
    const transfer = {
      setData: (type: string, value: string) => data.set(type, value),
      getData: (type: string) => data.get(type) ?? "",
      effectAllowed: "",
      dropEffect: "",
    };
    const start = state!.dragProps("a", 0);
    start.onDragStart({
      dataTransfer: transfer,
      preventDefault: () => undefined,
    } as never);
    const drop = state!.dropProps(2, ROWS[2]!, 0);
    drop.onDrop({
      dataTransfer: transfer,
      preventDefault: () => undefined,
    } as never);

    expect(handler).toHaveBeenCalledWith(0, 2, ROWS[0]);
  });

  it("speaks with the table's labels once they resolve", () => {
    mount(rowReorder<Row>(vi.fn()), {
      rowLifted: (position: number) => `picked up at ${String(position)}`,
    });
    fireEvent.keyDown(screen.getByTestId("row-a"), { key: " " });
    expect(screen.getByTestId("announcement")).toHaveTextContent(
      "picked up at 1"
    );
  });

  // A provider mounts above the chrome, so on the very first paint there may be
  // no labels yet. It still has to be able to speak.
  it("falls back to English before the table has published labels", () => {
    mount(rowReorder<Row>(vi.fn()));
    fireEvent.keyDown(screen.getByTestId("row-a"), { key: " " });
    expect(screen.getByTestId("announcement")).toHaveTextContent(
      "Row lifted, position 1"
    );
  });

  it("falls back for a label the table did not provide", () => {
    mount(rowReorder<Row>(vi.fn()), { rowMoved: () => "moved" });
    fireEvent.keyDown(screen.getByTestId("row-a"), { key: " " });
    expect(screen.getByTestId("announcement")).toHaveTextContent(
      "Row lifted, position 1"
    );
  });

  it("moves a row with the keyboard and reports where it landed", () => {
    const handler = vi.fn();
    mount(rowReorder<Row>(handler), {
      rowMoved: (from: number, to: number) =>
        `${String(from)} became ${String(to)}`,
    });
    const row = screen.getByTestId("row-a");
    fireEvent.keyDown(row, { key: " " });
    expect(screen.getByTestId("lifted")).toHaveTextContent("a");
    fireEvent.keyDown(row, { key: "ArrowDown" });
    fireEvent.keyDown(row, { key: " " });
    expect(handler).toHaveBeenCalledWith(0, 1, ROWS[0]);
    expect(screen.getByTestId("announcement")).toHaveTextContent("1 became 2");
  });

  it("cancels a lift on Escape", () => {
    const handler = vi.fn();
    mount(rowReorder<Row>(handler), {
      rowReorderCancelled: "put back",
    });
    const row = screen.getByTestId("row-a");
    fireEvent.keyDown(row, { key: " " });
    fireEvent.keyDown(row, { key: "Escape" });
    expect(handler).not.toHaveBeenCalled();
    expect(screen.getByTestId("announcement")).toHaveTextContent("put back");
  });
});
