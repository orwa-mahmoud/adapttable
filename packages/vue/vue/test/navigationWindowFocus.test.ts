import { afterEach, expect, it } from "vitest";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";

import { useGridFocus } from "../src/navigation/useGridFocus";

const stops: (() => void)[] = [];
afterEach(() => stops.splice(0).forEach((stop) => stop()));
it("focuses a revealed DOM window when its logical rows and column data stay unchanged", async () => {
  const visible = shallowRef(0);
  const rows = [{ id: "first" }, { id: "last" }];
  let grid: ReturnType<typeof useGridFocus<{ id: string }>> | undefined;
  const Table = defineComponent({
    setup() {
      grid = useGridFocus({
        enabled: true,
        rows,
        rowCount: 2,
        columns: [{ key: "id" }],
        scrollToRow: () => undefined,
      });
      return () =>
        h("table", grid!.value.getGridProps(), [
          h("tbody", [
            h("tr", { key: visible.value }, [
              h(
                "td",
                grid!.value.getCellProps({ row: visible.value, col: 0 }),
                rows[visible.value]!.id
              ),
            ]),
          ]),
        ]);
    },
  });
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(Table);
  app.mount(root);
  stops.push(() => {
    app.unmount();
    root.remove();
  });
  grid!.value.focusCell({ row: 1, col: 0 });
  await nextTick();
  expect(document.activeElement?.textContent).not.toBe("last");
  visible.value = 1;
  await nextTick();
  expect(document.activeElement).toBe(
    root.querySelector('[data-grid-cell="1:0"]')
  );
});
