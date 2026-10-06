import type { ColumnDef } from "@adapttable/vue";
import {
  DesktopTableChrome,
  MobileCardsChrome,
  useDataTableShell,
} from "@adapttable/vue/adapter";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  createSSRApp,
  defineComponent,
  h,
  nextTick,
  shallowRef,
} from "vue";
import { renderToString } from "vue/server-renderer";

import { naiveTableControls } from "../src/controls/table";

interface Row {
  id: string;
  name: string;
  team: string;
}
const rows: readonly Row[] = [
  { id: "bea", name: "Bea", team: "Design" },
  { id: "ada", name: "Ada", team: "Core" },
];
const columns: readonly ColumnDef<Row>[] = [
  { key: "name", sortable: true },
  { key: "team", sortable: true },
];
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  vi.restoreAllMocks();
});
function fixture(mobile: boolean, dir: "ltr" | "rtl" = "ltr") {
  return defineComponent({
    setup() {
      const selectedIds = shallowRef<string[]>([]);
      const shell = useDataTableShell<Row>(() => ({
        data: rows,
        columns,
        rowKey: (row) => row.id,
        urlSync: false,
        forceMobile: mobile,
        dir,
        selectable: true,
        selectedIds: selectedIds.value,
        onSelectionChange: (ids) => {
          selectedIds.value = ids;
        },
      }));
      return () =>
        h("div", { dir }, [
          mobile
            ? h(MobileCardsChrome<Row>, {
                model: shell.mobile.value,
                slots: naiveTableControls<Row>(),
              })
            : h(DesktopTableChrome<Row>, {
                model: shell.desktop.value,
                slots: naiveTableControls<Row>(),
              }),
        ]);
    },
  });
}
function mount(mobile: boolean, dir: "ltr" | "rtl" = "ltr") {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(fixture(mobile, dir));
  app.mount(host);
  cleanups.push(() => {
    app.unmount();
    host.remove();
  });
  return host;
}

describe("Naive UI table Chrome integration", () => {
  it("sorts through the binding using actual Naive buttons", async () => {
    const host = mount(false);
    const sort = host.querySelector<HTMLButtonElement>(
      '[data-adapttable-part="sort-button"]'
    )!;
    expect(sort.tagName).toBe("BUTTON");
    expect(sort.classList.contains("n-button")).toBe(true);
    sort.click();
    await nextTick();
    expect(host.querySelector("tbody tr")!.textContent).toContain("Ada");
    sort.click();
    await nextTick();
    expect(host.querySelector("tbody tr")!.textContent).toContain("Bea");
  });

  it.each([false, true])(
    "selects a row and exposes mixed state (mobile=%s)",
    async (mobile) => {
      const host = mount(mobile, "rtl");
      const checkboxes =
        host.querySelectorAll<HTMLElement>('[role="checkbox"]');
      expect(checkboxes.length).toBeGreaterThanOrEqual(2);
      expect(
        [...checkboxes].every((checkbox) =>
          checkbox.classList.contains("n-checkbox")
        )
      ).toBe(true);
      checkboxes[checkboxes.length - 1]!.click();
      await nextTick();
      const selectedRow = host.querySelector('[data-row-id="ada"]')!;
      expect(
        checkboxes[checkboxes.length - 1]!.getAttribute("aria-checked")
      ).toBe("true");
      if (mobile) expect(selectedRow.getAttribute("data-selected")).toBe("");
      else expect(selectedRow.getAttribute("aria-selected")).toBe("true");
      expect(host.firstElementChild!.getAttribute("dir")).toBe("rtl");
      if (!mobile)
        expect(checkboxes[0]!.getAttribute("aria-checked")).toBe("mixed");
    }
  );

  it.each([false, true])(
    "hydrates the same semantic table without mismatches (mobile=%s)",
    async (mobile) => {
      const component = fixture(mobile);
      const markup = await renderToString(createSSRApp(component));
      const host = document.createElement("div");
      host.innerHTML = markup;
      document.body.append(host);
      const warn = vi.spyOn(console, "warn");
      const error = vi.spyOn(console, "error");
      const app = createSSRApp(component);
      app.mount(host);
      cleanups.push(() => {
        app.unmount();
        host.remove();
      });
      await nextTick();
      expect(warn.mock.calls.flat().join(" ")).not.toMatch(
        /hydration|mismatch/i
      );
      expect(error.mock.calls.flat().join(" ")).not.toMatch(
        /hydration|mismatch/i
      );
      expect(host.textContent).toContain("Ada");
      expect(host.querySelectorAll('[role="checkbox"]')).not.toHaveLength(0);
    }
  );
});
