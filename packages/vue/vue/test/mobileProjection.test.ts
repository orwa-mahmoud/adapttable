/**
 * A desktop table never builds its card projection; a table that turns into
 * cards builds it when the cards are drawn.
 */
import { describe, expect, it, vi } from "vitest";
import {
  computed,
  createApp,
  defineComponent,
  h,
  nextTick,
  shallowRef,
} from "vue";

import type { ColumnDef } from "../src/columnDef";
import {
  DesktopTableChrome,
  MobileCardsChrome,
  type TableChromeSlots,
} from "../src/layout/tableChrome";
import type * as TableModels from "../src/layout/tableModels";
import { useDataTableShell } from "../src/useDataTableShell";

const counts = vi.hoisted(() => ({ cards: 0 }));

vi.mock("../src/layout/tableModels", async (importOriginal) => {
  const actual = await importOriginal<typeof TableModels>();
  return {
    ...actual,
    useMobileCardsModel: (
      ...args: Parameters<typeof actual.useMobileCardsModel>
    ) => {
      const model = actual.useMobileCardsModel(...args);
      return computed(() => {
        counts.cards += 1;
        return model.value;
      });
    },
  };
});

interface Row {
  id: string;
  name: string;
}
const columns: readonly ColumnDef<Row>[] = [{ key: "name" }];
const slots: TableChromeSlots<Row> = {
  SortButton: (props) => h("button", props.attrs, [props.content]),
  SelectionCheckbox: (props) => h("input", props.attrs),
};

describe("the card projection", () => {
  it("is not built while the table draws desktop rows, and is when it draws cards", async () => {
    const data = shallowRef<readonly Row[]>(
      Array.from({ length: 1000 }, (_, index) => ({
        id: String(index),
        name: `Person ${index}`,
      }))
    );
    const mobile = shallowRef(false);
    const element = document.createElement("div");
    document.body.append(element);
    const app = createApp(
      defineComponent({
        setup() {
          const shell = useDataTableShell<Row>(() => ({
            data: data.value,
            columns,
            rowKey: (row) => row.id,
            urlSync: false,
            forceMobile: mobile,
            defaults: { limit: 50 },
          }));
          return () =>
            shell.table.isMobile.value
              ? MobileCardsChrome({ model: shell.mobile.value, slots })
              : DesktopTableChrome({ model: shell.desktop.value, slots });
        },
      })
    );
    app.mount(element);
    await nextTick();
    expect(element.querySelectorAll("tbody tr").length).toBeGreaterThan(0);
    data.value = data.value.map((row) => ({ ...row, name: `${row.name}!` }));
    await nextTick();
    expect(counts.cards).toBe(0);

    mobile.value = true;
    await nextTick();
    expect(counts.cards).toBeGreaterThan(0);
    expect(element.querySelectorAll("article").length).toBeGreaterThan(0);

    mobile.value = false;
    await nextTick();
    const afterLeaving = counts.cards;
    data.value = data.value.map((row) => ({ ...row, name: `${row.name}?` }));
    await nextTick();
    expect(counts.cards).toBe(afterLeaving);
    app.unmount();
    element.remove();
  });
});
