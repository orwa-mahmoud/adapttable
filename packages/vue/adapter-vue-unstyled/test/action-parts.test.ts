import type { ExportProgressSurfaceSlotProps } from "@adapttable/vue/adapter";
import { describe, expect, it, vi } from "vitest";
import { h, shallowRef } from "vue";

import { DataTable } from "../src";
import { nativeExportSlots } from "../src/actions/nativeControls";
import { bulkActions } from "../src/bulk-actions";
import { find, mountNative, part, tick } from "./filter-editing-helpers";

describe("native action semantic parts", () => {
  it("keeps bulk count and clear hooks on their actual controls without inventing new part names", async () => {
    const selection = vi.fn();
    const { host } = mountNative(() =>
      h(DataTable<{ id: string }>, {
        data: [{ id: "one" }],
        columns: [{ key: "id" }],
        rowKey: (row: { id: string }) => row.id,
        selectable: true,
        defaultSelectedIds: ["one"],
        "onUpdate:selectedIds": selection,
        urlSync: false,
        classNames: { bulkBar: "bulk", bulkCount: "count", bulkClear: "clear" },
        features: [
          bulkActions([{ key: "run", label: "Run", onClick: () => undefined }]),
        ],
      })
    );
    await tick();
    const bar = find(host, part("bulk-bar"));
    expect(bar.className).toBe("bulk");
    const count = find(bar, "output.count");
    expect(count.textContent).toContain("1");
    expect(count.hasAttribute("data-adapttable-part")).toBe(false);
    const clear = find<HTMLButtonElement>(bar, "button.clear");
    expect(clear.type).toBe("button");
    expect(clear.textContent).toBe("Clear all");
    expect(clear.hasAttribute("data-adapttable-part")).toBe(false);
    clear.click();
    await tick();
    expect(selection).toHaveBeenLastCalledWith([]);
    expect(host.querySelector(part("bulk-bar"))).toBeNull();
  });
  it("uses canonical progress message and actions parts for both progress and errors", async () => {
    const cancel = vi.fn();
    const retry = vi.fn();
    const dismiss = vi.fn();
    const state = shallowRef<ExportProgressSurfaceSlotProps>({
      status: "busy",
      heading: "Exporting rows",
      message: "Halfway",
      error: "",
      progress: 50,
      progressLabel: "50 percent",
      cancel: { label: "Cancel export", onAction: cancel },
      retry: undefined,
      dismiss: undefined,
      download: undefined,
    });
    const slots = nativeExportSlots({
      exportProgress: "surface",
      exportProgressMessage: "message",
      exportProgressButton: "action",
    });
    const { host } = mountNative(() => slots.Surface(state.value));
    await tick();
    const surface = find(host, part("export-progress-surface"));
    expect(surface.tagName).toBe("SECTION");
    expect(surface.className).toBe("surface");
    expect(surface.getAttribute("aria-label")).toBe("Exporting rows");
    expect(find(surface, "h3").hasAttribute("data-adapttable-part")).toBe(
      false
    );
    expect(
      find<HTMLProgressElement>(surface, part("export-progress-bar")).value
    ).toBe(50);
    const actions = find(surface, part("export-progress-actions"));
    const cancelButton = find<HTMLButtonElement>(
      actions,
      part("export-progress-cancel")
    );
    expect(cancelButton.className).toBe("action");
    cancelButton.click();
    expect(cancel).toHaveBeenCalledOnce();
    state.value = {
      ...state.value,
      status: "failed",
      message: "",
      error: "Connection lost",
      cancel: undefined,
      retry: { label: "Retry export", onAction: retry },
      dismiss: { label: "Dismiss", onAction: dismiss },
    };
    await tick();
    const error = find(
      surface,
      `${part("export-progress-message")}[role="alert"]`
    );
    expect(error.className).toBe("message");
    expect(error.textContent).toBe("Connection lost");
    expect(surface.querySelector(part("export-progress-bar"))).toBeNull();
    find(actions, part("export-progress-retry")).click();
    find(actions, part("export-progress-dismiss")).click();
    expect(retry).toHaveBeenCalledOnce();
    expect(dismiss).toHaveBeenCalledOnce();
  });
});
