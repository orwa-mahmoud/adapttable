import { afterEach, describe, expect, it } from "vitest";
import {
  createApp,
  defineComponent,
  effectScope,
  h,
  nextTick,
  shallowRef,
  watchEffect,
} from "vue";

import {
  DesktopTableChrome,
  MobileCardsChrome,
  type TableChromeSlots,
} from "../src/layout/tableChrome";
import { useRowSelection } from "../src/selection/selection";
import { useDataTableShell } from "../src/useDataTableShell";

interface Row {
  id: string;
}
const rows: readonly Row[] = [{ id: "a" }, { id: "b" }, { id: "c" }];
const rowKey = (row: Row) => row.id;
const scopes: (() => void)[] = [];
afterEach(() => scopes.splice(0).forEach((stop) => stop()));

/** What each reader of row `a`'s selected state saw, one entry per run. */
function readersOfA(selectedIds?: ReturnType<typeof shallowRef<string[]>>) {
  const scope = effectScope();
  scopes.push(() => scope.stop());
  return scope.run(() => {
    const selection = useRowSelection({
      rows,
      rowKey,
      ...(selectedIds ? { selectedIds } : {}),
    });
    const seen = { isSelected: [] as boolean[], checkbox: [] as boolean[] };
    watchEffect(() => seen.isSelected.push(selection.isSelected("a")), {
      flush: "sync",
    });
    watchEffect(
      () =>
        seen.checkbox.push(selection.rowCheckboxAttrs("a").checked === true),
      { flush: "sync" }
    );
    return { selection, seen };
  })!;
}

describe("row selection reads", () => {
  it("re-run a row's reader only when that row's selection changes", () => {
    const { selection, seen } = readersOfA();

    selection.toggle("b");
    selection.toggle("c");
    expect(seen).toEqual({ isSelected: [false], checkbox: [false] });

    selection.toggle("a");
    expect(seen).toEqual({
      isSelected: [false, true],
      checkbox: [false, true],
    });
  });

  it("follow controlled ids per row", () => {
    const ids = shallowRef<string[]>([]);
    const { selection, seen } = readersOfA(ids);

    ids.value = ["b"];
    ids.value = ["b", "c"];
    expect(seen).toEqual({ isSelected: [false], checkbox: [false] });

    ids.value = ["a", "b", "c"];
    expect(seen).toEqual({
      isSelected: [false, true],
      checkbox: [false, true],
    });
    expect(selection.isSelected("b")).toBe(true);
  });
});

describe("the body model under a selection change", () => {
  it("keeps every row model, and the selected row reads its new state", () => {
    const scope = effectScope();
    scopes.push(() => scope.stop());
    const shell = scope.run(() =>
      useDataTableShell<Row>(() => ({
        data: rows,
        columns: [{ key: "id" }],
        rowKey,
        selectable: true,
        urlSync: false,
        forceMobile: false,
      }))
    )!;
    const desktop = shell.desktop.value;
    const mobile = shell.mobile.value;
    const [first, second] = desktop.rows;
    expect(first?.attrs["aria-selected"]).toBe(false);

    shell.selection.value!.toggle("a");

    expect(shell.desktop.value).toBe(desktop);
    expect(shell.mobile.value).toBe(mobile);
    expect(first?.attrs["aria-selected"]).toBe(true);
    expect(first?.checkboxAttrs?.checked).toBe(true);
    expect(second?.attrs["aria-selected"]).toBe(false);
    expect(mobile.rows[0]?.attrs["data-selected"]).toBe("");
    expect(desktop.headerCheckboxAttrs?.indeterminate).toBe(true);
  });
});

describe("a controlled selection change", () => {
  it("keeps the body model when the host passes new ids", () => {
    const ids = shallowRef<string[]>([]);
    const scope = effectScope();
    scopes.push(() => scope.stop());
    const columns = [{ key: "id" }];
    // The host hands the table a fresh options object with only the ids new.
    const shell = scope.run(() =>
      useDataTableShell<Row>(() => ({
        data: rows,
        columns,
        rowKey,
        selectable: true,
        urlSync: false,
        forceMobile: false,
        selectedIds: ids.value,
      }))
    )!;
    const desktop = shell.desktop.value;

    ids.value = ["a"];

    expect(shell.desktop.value).toBe(desktop);
    expect(desktop.rows[0]?.attrs["aria-selected"]).toBe(true);
  });
});

describe("drawing a selection change", () => {
  it.each([false, true])(
    "redraws only the row whose selection changed, mobile=%s",
    async (mobile) => {
      const drawn: string[] = [];
      let shell: ReturnType<typeof useDataTableShell<Row>> | undefined;
      const root = document.createElement("div");
      const slots: TableChromeSlots<Row> = {
        SortButton: ({ attrs, content }) => h("button", attrs, [content]),
        SelectionCheckbox: (control) => {
          if (!control.header) drawn.push(String(control.attrs["aria-label"]));
          return h("input", { ...control.attrs, checked: control.checked });
        },
      };
      const app = createApp(
        defineComponent({
          setup() {
            shell = useDataTableShell<Row>(() => ({
              data: rows,
              columns: [{ key: "id" }],
              rowKey,
              selectable: true,
              urlSync: false,
              forceMobile: mobile,
              labels: { selectRow: "row" },
            }));
            return () =>
              mobile
                ? MobileCardsChrome({ model: shell!.mobile.value, slots })
                : DesktopTableChrome({ model: shell!.desktop.value, slots });
          },
        })
      );
      app.mount(root);
      scopes.push(() => app.unmount());
      expect(drawn).toHaveLength(rows.length);
      drawn.length = 0;

      shell!.selection.value!.toggle("b");
      await nextTick();

      expect(drawn).toEqual(["row"]);
      const selected = root.querySelectorAll(
        mobile ? '[data-selected=""]' : '[aria-selected="true"]'
      );
      expect(
        [...selected].map((node) => node.getAttribute("data-row-id"))
      ).toEqual(["b"]);
    }
  );
});
