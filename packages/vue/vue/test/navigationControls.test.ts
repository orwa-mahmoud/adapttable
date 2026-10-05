import { createMemoryAdapter } from "@adapttable/core";
import { afterEach, expect, it, vi } from "vitest";
import { createApp, effectScope, h, nextTick, shallowRef } from "vue";

import {
  FillHandleChrome,
  FindBarChrome,
} from "../src/navigation/navigationChrome";
import { useFindInTable } from "../src/navigation/useFindInTable";
import { useGridFocus } from "../src/navigation/useGridFocus";

const rows = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Grace" },
];
const columns = [{ key: "name" }];
const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0).reverse()) stop();
});
function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Expected fixture value");
  return value;
}
async function settle() {
  await nextTick();
  await nextTick();
}
function findView() {
  let find:
    ReturnType<typeof useFindInTable<(typeof rows)[number]>> | undefined;
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp({
    setup() {
      find = useFindInTable({
        rows,
        columns,
        urlAdapter: createMemoryAdapter(),
      });
      return () =>
        h("div", [
          h(
            "button",
            {
              id: "find-trigger",
              onClick: () => find?.state.value.openBar?.(),
            },
            "Find"
          ),
          h("button", { id: "other-action" }, "Other action"),
          FindBarChrome({
            find: required(find).state.value,
            slots: {
              Search: (control) =>
                h("input", {
                  ref: (element) =>
                    control.focusRef(
                      element instanceof HTMLInputElement ? element : null
                    ),
                  value: control.value,
                  "aria-label": control.label,
                  onInput: (event: Event) =>
                    control.onChange((event.target as HTMLInputElement).value),
                  onKeydown: control.onKeyDown,
                }),
              Button: (control) =>
                h(
                  "button",
                  {
                    "data-part": control.part,
                    disabled: control.disabled,
                    onClick: control.onClick,
                  },
                  control.label
                ),
            },
          }),
        ]);
    },
  });
  app.mount(root);
  stops.push(() => {
    app.unmount();
    root.remove();
  });
  return {
    root,
    find: required(find),
    trigger: required(root.querySelector<HTMLButtonElement>("#find-trigger")),
  };
}
it("focuses the find input, walks hits with its own keys and restores the opener on Escape", async () => {
  const view = findView();
  view.trigger.focus();
  view.trigger.click();
  await settle();
  const input = required(view.root.querySelector<HTMLInputElement>("input"));
  expect(document.activeElement).toBe(input);
  input.value = "a";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await settle();
  expect(view.root.querySelector("output")?.textContent).toBe("1 of 2");
  const unrelated = new KeyboardEvent("keydown", {
    key: "ArrowLeft",
    bubbles: true,
    cancelable: true,
  });
  input.dispatchEvent(unrelated);
  expect(unrelated.defaultPrevented).toBe(false);
  const next = new KeyboardEvent("keydown", {
    key: "Enter",
    bubbles: true,
    cancelable: true,
  });
  input.dispatchEvent(next);
  await settle();
  expect(next.defaultPrevented).toBe(true);
  expect(view.root.querySelector("output")?.textContent).toBe("2 of 2");
  input.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Enter",
      shiftKey: true,
      bubbles: true,
    })
  );
  await settle();
  expect(view.find.state.value.index).toBe(0);
  input.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    })
  );
  await settle();
  expect(view.root.querySelector("input")).toBeNull();
  expect(document.activeElement).toBe(view.trigger);
});
it("does not take focus back from a subsequent host action when the find bar closes", async () => {
  const view = findView();
  view.trigger.focus();
  view.trigger.click();
  await settle();
  const other = required(
    view.root.querySelector<HTMLButtonElement>("#other-action")
  );
  other.focus();
  required(
    view.root.querySelector<HTMLButtonElement>('[data-part="find-close"]')
  ).click();
  await settle();
  expect(view.root.querySelector("input")).toBeNull();
  expect(document.activeElement).toBe(other);
});
it("places the fill handle only at the selected logical corner on a later page", () => {
  const scope = effectScope();
  stops.push(() => scope.stop());
  const fill = vi.fn();
  const options = shallowRef({
    enabled: true,
    rows,
    columns,
    rowCount: 22,
    firstRowIndex: 20,
    onFill: fill,
  });
  const focus = required(scope.run(() => useGridFocus(options)));
  focus.value.selectRange({
    anchor: { row: 20, col: 0 },
    head: { row: 21, col: 0 },
  });
  const draw = vi.fn((props: { label: string }) => props.label);
  expect(
    FillHandleChrome({
      focus: focus.value,
      firstRowIndex: 20,
      windowIndex: 0,
      col: 0,
      slots: { Handle: draw },
    })
  ).toBeNull();
  expect(
    FillHandleChrome({
      focus: focus.value,
      firstRowIndex: 20,
      windowIndex: 1,
      col: 0,
      slots: { Handle: draw },
    })
  ).toBe(focus.value.fillHandleLabel);
  expect(draw).toHaveBeenCalledOnce();
  expect(draw.mock.calls[0]?.[0]).toHaveProperty("handleProps.onMousedown");
  options.value = { ...options.value, enabled: false };
  expect(
    FillHandleChrome({
      focus: focus.value,
      windowIndex: 1,
      col: 0,
      slots: { Handle: draw },
    })
  ).toBeNull();
  expect(fill).not.toHaveBeenCalled();
});
it("keeps nested controls and consumed keyboard events outside grid navigation", async () => {
  let focus: ReturnType<typeof useGridFocus<(typeof rows)[number]>> | undefined;
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp({
    setup() {
      focus = useGridFocus({
        enabled: true,
        rows,
        columns,
        rowCount: rows.length,
      });
      return () =>
        h("table", required(focus).value.getGridProps(), [
          h("thead", [
            h("tr", [
              h("th", required(focus).value.getColumnHeaderProps(0), [
                h("button", { id: "column-action" }, "Column action"),
              ]),
            ]),
          ]),
          h(
            "tbody",
            rows.map((row, index) =>
              h("tr", { key: row.id }, [
                h("td", required(focus).value.getCellPropsAt(index, 0), [
                  row.name,
                  h("input", { "data-row-input": row.id }),
                ]),
              ])
            )
          ),
        ]);
    },
  });
  app.mount(root);
  stops.push(() => {
    app.unmount();
    root.remove();
  });
  await settle();
  const grid = required(focus);
  grid.value.focusCell({ row: 0, col: 0 });
  await settle();
  const cell = required(
    root.querySelector<HTMLElement>('[data-grid-cell="0:0"]')
  );
  const input = required(cell.querySelector<HTMLInputElement>("input"));
  required(root.querySelector<HTMLButtonElement>("#column-action")).click();
  expect(grid.value.range).toBeNull();
  const headerClick = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
  });
  headerClick.preventDefault();
  required(root.querySelector("th")).dispatchEvent(headerClick);
  expect(grid.value.range).toBeNull();
  input.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  input.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
  input.dispatchEvent(
    new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
  );
  expect(grid.value.active).toEqual({ row: 0, col: 0 });
  expect(grid.value.range).toBeNull();
  for (const init of [{ altKey: true }, { isComposing: true }]) {
    cell.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, ...init })
    );
    expect(grid.value.active).toEqual({ row: 0, col: 0 });
  }
  const consumed = new KeyboardEvent("keydown", {
    key: "ArrowDown",
    bubbles: true,
    cancelable: true,
  });
  consumed.preventDefault();
  cell.dispatchEvent(consumed);
  expect(grid.value.active).toEqual({ row: 0, col: 0 });
  cell.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "ArrowDown",
      bubbles: true,
      cancelable: true,
    })
  );
  await settle();
  expect(grid.value.active).toEqual({ row: 1, col: 0 });
  expect(document.activeElement).toBe(
    root.querySelector('[data-grid-cell="1:0"]')
  );
});
