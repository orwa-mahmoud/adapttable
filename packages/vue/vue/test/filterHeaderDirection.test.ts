import { type FilterFormSource, resolveLabels } from "@adapttable/core";
import { expect, it, vi } from "vitest";
import { createApp, h, nextTick, shallowRef } from "vue";

import type { FilterHeaderControlOptions } from "../src/filters/filterHeaderControl";
import { FilterHeaderRowChrome } from "../src/filters/filterHeaderRow";

interface Row {
  name: string;
}
it("forwards live direction to the same row and control without changing filter state", async () => {
  const dir = shallowRef<"ltr" | "rtl" | undefined>("rtl");
  const source: FilterFormSource<Row> = {
    extra: { name: "Ada" },
    setExtra: vi.fn(),
    setExtras: vi.fn(),
  };
  const seen: ("ltr" | "rtl" | undefined)[] = [];
  const control = (props: FilterHeaderControlOptions<Row>) => {
    seen.push(props.dir);
    expect(props.source).toBe(source);
    return h("button", { dir: props.dir }, String(props.source.extra.name));
  };
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(() =>
    h("table", [
      h("thead", [
        FilterHeaderRowChrome<Row>({
          columns: [{ key: "name" }],
          defs: [{ key: "name", type: "text" }],
          source,
          labels: resolveLabels({}),
          dir: dir.value,
          controls: { Control: control },
        }),
      ]),
    ])
  );
  app.mount(root);
  const row = root.querySelector("tr");
  const button = root.querySelector("button");
  expect(row).not.toBeNull();
  expect(button).not.toBeNull();
  try {
    for (const value of ["ltr", "rtl", undefined] as const) {
      dir.value = value;
      await nextTick();
      expect(root.querySelector("tr")).toBe(row);
      expect(root.querySelector("button")).toBe(button);
      expect(row?.getAttribute("dir")).toBe(value ?? null);
      expect(button?.getAttribute("dir")).toBe(value ?? null);
      expect(button?.textContent).toBe("Ada");
    }
    expect(seen).toEqual(["rtl", "ltr", "rtl", undefined]);
    expect(source.setExtra).not.toHaveBeenCalled();
    expect(source.setExtras).not.toHaveBeenCalled();
  } finally {
    app.unmount();
    root.remove();
  }
});
