import { csvWriter, deferredExportWriter } from "@adapttable/core";
import { type ExportWriter } from "@adapttable/core/binding";
import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, shallowRef } from "vue";

import { EXPORT_CONTROL, EXPORT_MODEL } from "../src/actions/contracts";
import { extendFeature, slotRender } from "../src/adapter";
import { exportCsv } from "../src/export-csv";
import { useFrontendData } from "../src/source/useFrontendData";
import { useDataTableShell } from "../src/useDataTableShell";

interface Row {
  id: string;
  name: string;
}
const rows: readonly Row[] = [{ id: "a", name: "Ada" }];

function mount(writer: ExportWriter | ReturnType<typeof deferredExportWriter>) {
  const scope = effectScope();
  const shell = scope.run(() => {
    const source = useFrontendData({
      data: shallowRef(rows),
      columns: [{ key: "name" }],
      urlSync: false,
    });
    return useDataTableShell({
      source,
      columns: [{ key: "name" }],
      rowKey: (row: Row) => row.id,
      features: [
        extendFeature(exportCsv<Row>({ writer }), [
          slotRender(EXPORT_CONTROL, () => null),
        ]),
      ],
      urlSync: false,
    });
  });
  if (!shell) throw new Error("the table did not mount");
  const model = () => {
    const value = shell.state.get(EXPORT_MODEL).value;
    if (!value) throw new Error("no export model");
    return value;
  };
  return { scope, model };
}

function downloads() {
  return vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => undefined);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("an export writer that loads on demand", () => {
  it("starts loading once the table is up", async () => {
    const load = vi.fn(() => Promise.resolve(csvWriter));
    const { scope } = mount(deferredExportWriter("csv", load));
    await vi.waitFor(() => {
      expect(load).toHaveBeenCalledTimes(1);
    });
    scope.stop();
  });

  it("waits for a writer still loading, then downloads", async () => {
    const click = downloads();
    let finish: ((writer: ExportWriter) => void) | undefined;
    const { scope, model } = mount(
      deferredExportWriter(
        "csv",
        () =>
          new Promise<ExportWriter>((resolve) => {
            finish = resolve;
          })
      )
    );
    model().onExportCsv?.();
    expect(click).not.toHaveBeenCalled();
    finish?.(csvWriter);
    await vi.waitFor(() => {
      expect(click).toHaveBeenCalledTimes(1);
    });
    await vi.waitFor(() => {
      expect(model().exportStatus).toBe("done");
    });
    scope.stop();
  });

  it("reports a writer that cannot load and loads it again on the next export", async () => {
    const click = downloads();
    const load = vi
      .fn<() => Promise<ExportWriter>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(csvWriter);
    const { scope, model } = mount(deferredExportWriter("csv", load));
    await vi.waitFor(() => {
      expect(load).toHaveBeenCalledTimes(1);
    });
    model().onExportCsv?.();
    await vi.waitFor(() => {
      expect(model().exportStatus).toBe("failed");
    });
    expect(model().exportAnnouncement).toContain("Export failed");
    expect(model().exportDisabled).toBeFalsy();
    expect(click).not.toHaveBeenCalled();
    model().onExportCsv?.();
    await vi.waitFor(() => {
      expect(click).toHaveBeenCalledTimes(1);
    });
    expect(load).toHaveBeenCalledTimes(3);
    scope.stop();
  });

  it("downloads at once with a writer that builds at once", () => {
    const click = downloads();
    const idle = vi.fn();
    vi.stubGlobal("requestIdleCallback", idle);
    const { scope, model } = mount(csvWriter);
    model().onExportCsv?.();
    expect(click).toHaveBeenCalledTimes(1);
    expect(idle).not.toHaveBeenCalled();
    scope.stop();
  });
});
