import { render } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";

import { batchEditing } from "./editing";
import { grouping } from "./grouping";
import { FeatureProviders, useTableRuntime } from "./providers";
import { tree } from "./tree";
import { applyTableFeatures } from "./tableFeature";
import { useFrontendData } from "../source/useFrontendData";
import type { ColumnDef } from "../types";
import { createMemoryAdapter } from "../url/adapter";
import { useTableChrome } from "../useTableChrome";
import { ChromeExtrasGate } from "./chromeExtrasGate";

interface Row {
  id: string;
  name: string;
  score: number;
}

const ROWS: Row[] = [
  { id: "a", name: "Alice", score: 3 },
  { id: "b", name: "Bob", score: 4 },
];

function Probe<TRow>({
  features,
  columns,
  extraProps,
  onView,
}: {
  features: Parameters<typeof applyTableFeatures<TRow>>[0]["features"];
  columns: readonly ColumnDef<TRow>[];
  extraProps?: Record<string, unknown>;
  onView: (
    view: ReturnType<ReturnType<typeof useTableRuntime<TRow>>["view"]>
  ) => void;
}) {
  const applied = applyTableFeatures({ features, columns });
  function Table() {
    const source = useFrontendData<TRow>({
      data: ROWS as unknown as readonly TRow[],
      urlAdapter: createMemoryAdapter(""),
      columns,
      paginationMode: "paged",
    });
    const props = {
      ...applied,
      source,
      columns,
      rowKey: (row: TRow) => (row as Row).id,
      ...extraProps,
    };
    const chrome = useTableChrome<TRow>(props);
    return (
      <ChromeExtrasGate chrome={chrome} props={props}>
        {() => <Reader onView={onView} />}
      </ChromeExtrasGate>
    );
  }
  function Reader({
    onView: publish,
  }: {
    onView: (
      view: ReturnType<ReturnType<typeof useTableRuntime<TRow>>["view"]>
    ) => void;
  }) {
    const runtime = useTableRuntime<TRow>();
    useEffect(() => {
      publish(runtime.view());
    });
    return null;
  }
  return (
    <FeatureProviders props={applied}>
      <Table />
    </FeatureProviders>
  );
}

describe("ChromeExtrasGate runtime publish", () => {
  it("labels rows from format, accessor, or id and exposes grouping labels", () => {
    const views: ReturnType<ReturnType<typeof useTableRuntime<Row>>["view"]>[] =
      [];
    const columns: ColumnDef<Row>[] = [
      {
        key: "name",
        header: "Name",
        formatValue: (row) => row.name,
      },
      {
        key: "score",
        header: <span>Score</span>,
        mobileLabel: "Score",
        accessor: (row) => row.score,
      },
      { key: "id" },
    ];
    render(
      <Probe
        features={[grouping("name"), batchEditing(() => undefined)]}
        columns={columns}
        extraProps={{ groupBy: "name" }}
        onView={(view) => views.push(view)}
      />
    );
    const view = views.at(-1);
    expect(view?.rowLabel(ROWS[0]!)).toBe("Alice");
    expect(view?.groupingState?.columnLabel("name")).toBe("Name");
    expect(view?.groupingState?.columnLabel("score")).toBe("Score");
    expect(view?.groupingState?.columnLabel("missing")).toBe("missing");
    expect(view?.editing?.stageCell).toEqual(expect.any(Function));
    view?.editing?.stageCell?.(ROWS[0]!, "a", "name", "Ada");
  });

  it("falls back to the row id and publishes tree rows", () => {
    const views: ReturnType<ReturnType<typeof useTableRuntime<Row>>["view"]>[] =
      [];
    render(
      <Probe
        features={[tree({ getParentId: () => undefined })]}
        columns={[{ key: "id", accessor: () => ({}) }]}
        onView={(view) => views.push(view)}
      />
    );
    const view = views.at(-1);
    expect(view?.rowLabel(ROWS[0]!)).toBe("a");
    expect(view?.tree).toBeDefined();
  });
});
