import {
  cellEditingView,
  type ConfirmHandler,
  createCellEditSession,
  resolveLabels,
  type RowAction,
  type TableDensity,
} from "@adapttable/core";
import {
  DENSITY_STATE,
  type HeaderGroupCell,
  slotRender,
  TOOLBAR_EXTRAS,
} from "@adapttable/core/binding";
import { expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  effectScope,
  h,
  nextTick,
  shallowRef,
} from "vue";

import { ColumnGroupToggleChrome } from "../src/columns/columnGroupToggle";
import type {
  FeatureMountContext,
  TableFeature,
} from "../src/features/tableFeature";
import {
  COLUMN_RESIZE_MODEL,
  editableCellSlotKey,
  editHistoryModelKey,
  editingModelKey,
  headerFilterModelKey,
  headerFilterSlotKey,
  type RowActionControlsProjector,
  rowActionsModelKey,
  type TableBodyProjector,
} from "../src/layout/modelChannels";
import {
  DesktopTableChrome,
  MobileCardsChrome,
  type TableChromeSlots,
} from "../src/layout/tableChrome";
import type { TableBodySlot } from "../src/layout/tableModels";
import {
  useDataTableShell,
  type UseDataTableShellOptions,
  type UseDataTableShellResult,
} from "../src/useDataTableShell";
interface Row {
  id: string;
  name: string;
}
const data: readonly Row[] = [{ id: "a", name: "Ada" }];
const columns = [{ key: "id" }, { key: "name", sortable: true }];
const native: TableChromeSlots<Row> = {
  SortButton: (props) => h("button", props.attrs, [props.content]),
  SelectionCheckbox: (props) => h("input", props.attrs),
  ResizeHandle: (props) => h("button", props.attrs, "resize"),
  RowActions: (props) =>
    h(
      "div",
      props.controls.map((control) =>
        h("button", { ...control.attrs, key: control.key }, control.label)
      )
    ),
  ColumnGroupToggle: (props) =>
    ColumnGroupToggleChrome({
      ...props,
      slots: {
        Button: (button) =>
          h(
            "button",
            {
              class: button.className,
              "aria-label": button.label,
              "aria-expanded": button.expanded,
              onClick: button.onClick,
            },
            "toggle"
          ),
      },
    }),
  GroupRow: (props) =>
    props.mobile
      ? h("div", { "data-group": true }, props.slot.entry.label)
      : h("tr", { "data-group": true }, [
          h("td", { colspan: props.columnCount }, props.slot.entry.label),
        ]),
};
function fixture(
  options: () => UseDataTableShellOptions<Row>,
  slots: TableChromeSlots<Row> = native
) {
  let shell: UseDataTableShellResult<Row> | undefined;
  const root = document.createElement("div");
  const app = createApp(
    defineComponent({
      setup() {
        shell = useDataTableShell(options);
        return () => {
          if (!shell) return null;
          const classNames = {
            table: "table",
            th: "th",
            td: "td",
            tr: "tr",
            thead: "thead",
            tbody: "tbody",
            selectionHeader: "select-head",
            selectionCell: "select-cell",
            selectionCheckbox: "check",
            sortButton: "sort",
            columnGroup: "group",
            columnGroupToggle: "group-toggle",
            resizeHandle: "resize",
            cards: "cards",
            card: "card",
            cardFields: "fields",
            cardLabel: "label",
            cardValue: "value",
            cardActions: "actions",
            actionsHeader: "actions-head",
            actionsCell: "actions-cell",
            filterHeaderTrigger: "header-filter",
          };
          return shell.table.isMobile.value
            ? MobileCardsChrome({
                model: shell.mobile.value,
                slots,
                classNames,
              })
            : DesktopTableChrome({
                model: shell.desktop.value,
                slots,
                classNames,
              });
        };
      },
    })
  );
  app.mount(root);
  if (!shell) throw new Error("missing shell");
  return { root, shell, stop: () => app.unmount() };
}
it("renders optional editing, filter, resize and row-action channels on semantic targets and retracts them", async () => {
  const edited = vi.fn();
  const actionCalled = vi.fn();
  const resized = vi.fn();
  const action: RowAction<Row> = {
    key: "do",
    label: "Do",
    onClick: actionCalled,
  };
  const controls: RowActionControlsProjector<Row> = (input) =>
    input.actions.map((item) => ({
      key: item.key,
      label: item.label,
      action: item,
      attrs: {
        type: "button",
        onClick: () => {
          if (input.enabled()) item.onClick?.(input.row);
        },
      },
    }));
  const feature: TableFeature<Row> = {
    id: "controls",
    apply: () => ({ rowActionControls: controls }),
    mount: (context) => {
      const session = createCellEditSession<Row>();
      context.state.set(editingModelKey<Row>(), {
        state: cellEditingView(session, session.getSnapshot()),
        onCellEdit: edited,
      });
      context.state.set(COLUMN_RESIZE_MODEL, {
        attrs: (key) =>
          key === "name"
            ? { onKeyDown: resized, "aria-label": "resize-name" }
            : undefined,
      });
      context.state.set(rowActionsModelKey<Row>(), {
        canAdd: false,
        addRow: () => undefined,
        actions: [],
        rowActions: [action],
        hasRowActions: true,
        hostActions: [action],
      });
      context.state.set(headerFilterModelKey<Row>(), {
        controls: new Map([
          [
            "name",
            {
              def: { key: "name", type: "text" },
              source: context.table.source.value,
              labels: context.table.labels.value,
            },
          ],
        ]),
      });
    },
    renders: [
      slotRender(editableCellSlotKey<Row>(), (props) =>
        h("span", { "data-editor": props.column.key }, [props.display])
      ),
      slotRender(headerFilterSlotKey<Row>(), (props) =>
        h("input", { class: props.className, "data-filter": props.def.key })
      ),
    ],
  };
  const features = shallowRef<readonly TableFeature<Row>[]>([feature]);
  const mobile = shallowRef(false);
  const current = fixture(() => ({
    data,
    columns: columns.map((column) => ({ ...column, editable: true })),
    rowKey: (row) => row.id,
    urlSync: false,
    features,
    forceMobile: mobile,
  }));
  await nextTick();
  expect(current.root.querySelectorAll("[data-editor]")).toHaveLength(2);
  expect(current.root.querySelector("input.header-filter")).not.toBeNull();
  current.root
    .querySelector(".resize")
    ?.dispatchEvent(new KeyboardEvent("keydown"));
  expect(resized).toHaveBeenCalledOnce();
  current.root
    .querySelector<HTMLButtonElement>(".actions-cell button")!
    .click();
  expect(actionCalled).toHaveBeenCalledExactlyOnceWith(data[0]);
  expect(current.root.querySelectorAll("thead th")).toHaveLength(3);
  expect(current.root.querySelector(".actions-head")?.textContent).toBe(
    current.shell.table.labels.value.actions
  );
  expect(current.shell.runtime.view()?.actions?.row).toHaveLength(1);
  expect(current.shell.runtime.view()?.editing?.onCellEdit).toBe(edited);
  mobile.value = true;
  await nextTick();
  expect(current.root.querySelector(".actions button")).not.toBeNull();
  expect(current.root.querySelectorAll("[data-editor]")).toHaveLength(2);
  features.value = [];
  await nextTick();
  expect(current.root.querySelector("[data-editor]")).toBeNull();
  expect(current.shell.runtime.view()?.editing).toBeUndefined();
  current.stop();
});
it("renders projected groups, pads, extras and summary rows in desktop/mobile without duplicating content", async () => {
  const projector: TableBodyProjector<Row> = (input) => {
    const row = input.desktop.rows[0]!;
    const bodySlots: readonly TableBodySlot<Row>[] = [
      {
        kind: "virtualPad",
        key: "pad-top",
        height: 20,
        colSpan: input.desktop.columnCount,
      },
      {
        kind: "group",
        key: "group",
        entry: {
          kind: "group",
          key: "group",
          value: "G",
          label: "Group",
          level: 0,
          groupBy: "name",
          path: ["G"],
          leafRows: data,
          leafIds: ["a"],
          collapsed: false,
        },
      },
      {
        kind: "row",
        key: row.key,
        wiring: { ...row, summary: true, checkboxAttrs: undefined },
      },
      {
        kind: "extra",
        key: "extra",
        extraKind: "fullWidth",
        colSpan: 3,
        coveredSlots: new Set([1]),
        render: () => "Only once",
        fillStyle: { height: 20 },
      },
      { kind: "extra", key: "separator", extraKind: "separator", colSpan: 3 },
      {
        kind: "virtualPad",
        key: "pad-bottom",
        height: 10,
        colSpan: input.desktop.columnCount,
      },
    ];
    return {
      desktop: { ...input.desktop, bodySlots },
      mobile: { ...input.mobile, bodySlots },
    };
  };
  const mobile = shallowRef(false);
  const current = fixture(() => ({
    data,
    columns,
    rowKey: (row) => row.id,
    urlSync: false,
    forceMobile: mobile,
    selectable: true,
    features: [{ id: "body", apply: () => ({ bodyModel: projector }) }],
  }));
  expect(
    current.root.querySelectorAll('[data-adapttable-part="full-width-cell"]')
  ).toHaveLength(2);
  expect(current.root.textContent?.match(/Only once/g)).toHaveLength(1);
  expect(current.root.querySelector("[data-group]")).not.toBeNull();
  expect(current.root.querySelector("tbody input")).toBeNull();
  expect(
    current.root
      .querySelector('[data-adapttable-part="virtual-spacer"] td')
      ?.getAttribute("colspan")
  ).toBe("3");
  mobile.value = true;
  await nextTick();
  expect(current.root.querySelector("article")).not.toBeNull();
  expect(current.root.textContent?.match(/Only once/g)).toHaveLength(1);
  current.stop();
});
it("uses required adapter group buttons and keeps custom headers out of nested sort buttons", async () => {
  const current = fixture(() => ({
    data,
    rowKey: (row) => row.id,
    urlSync: false,
    selectable: true,
    collapsibleColumnGroups: true,
    columns: [
      {
        header: "Person",
        collapsedKey: "name",
        children: [
          { key: "id" },
          {
            key: "name",
            sortable: true,
            headerCell: (context) =>
              h(
                "button",
                { "data-custom-header": true, onClick: context.toggleSort },
                context.label
              ),
          },
        ],
      },
    ],
  }));
  expect(current.root.querySelector("button button")).toBeNull();
  current.root
    .querySelector<HTMLButtonElement>("[data-custom-header]")!
    .click();
  await nextTick();
  expect(current.shell.table.sortBy.value).toBe("name");
  expect(
    current.root
      .querySelector<HTMLButtonElement>(".group-toggle")
      ?.getAttribute("aria-expanded")
  ).toBe("true");
  current.root.querySelector<HTMLButtonElement>(".group-toggle")!.click();
  await nextTick();
  expect(current.shell.table.columns.value.map((column) => column.key)).toEqual(
    ["name"]
  );
  current.root.querySelector<HTMLButtonElement>(".group-toggle")!.click();
  await nextTick();
  expect(current.shell.table.columns.value).toHaveLength(2);
  current.stop();
});
it("rejects missing mandatory controls and hides noncollapsible group buttons", () => {
  const labels = resolveLabels(undefined);
  const cell: HeaderGroupCell = {
    key: "g",
    label: null,
    span: 1,
    id: null,
    collapsed: false,
    collapsible: false,
    hideLabel: false,
  };
  expect(
    ColumnGroupToggleChrome({
      cell,
      labels,
      onToggle: vi.fn(),
      slots: { Button: () => null },
    }).children
  ).toBeNull();
  expect(() =>
    ColumnGroupToggleChrome({
      cell: { ...cell, id: "g", collapsible: true },
      labels,
      onToggle: vi.fn(),
      slots: {} as never,
    })
  ).toThrow("required adapter control slot");
  const result = ColumnGroupToggleChrome({
    cell: { ...cell, id: "g", collapsible: true, collapsed: true },
    labels,
    onToggle: vi.fn(),
    slots: { Button: (props) => props.label },
  });
  expect(result.children).toEqual([labels.expandColumnGroup]);
  const scope = effectScope();
  const shell = scope.run(() =>
    useDataTableShell({
      data,
      columns,
      rowKey: (row: Row) => row.id,
      urlSync: false,
    })
  );
  if (!shell) throw new Error("missing shell");
  expect(() =>
    DesktopTableChrome({ model: shell.desktop.value, slots: {} as never })
  ).toThrow("SortButton");
  scope.stop();
});
it("provides real density updates and typed toolbar renders while retaining controlled authority", () => {
  const scope = effectScope();
  const controlled = shallowRef<TableDensity>();
  const changed = vi.fn();
  const featureDensity = shallowRef<TableDensity>("compact");
  const shell = scope.run(() =>
    useDataTableShell({
      data,
      columns,
      rowKey: (row: Row) => row.id,
      urlSync: false,
      density: controlled,
      onDensityChange: changed,
      features: [
        {
          id: "toolbar",
          mount: (context) =>
            context.state.set(DENSITY_STATE, {
              density: featureDensity.value,
              setDensity: (value) => {
                featureDensity.value = value;
                context.state.set(DENSITY_STATE, {
                  density: value,
                  setDensity: (next) => {
                    featureDensity.value = next;
                  },
                });
              },
            }),
          renders: [
            slotRender(
              TOOLBAR_EXTRAS,
              (props) => `${props.density}:${props.classNames?.toolbar ?? ""}`
            ),
          ],
        },
      ],
    })
  );
  if (!shell) throw new Error("missing shell");
  expect(shell.density.value).toBe("compact");
  expect(shell.renderToolbarExtras({ toolbar: "kit" })).toEqual([
    "compact:kit",
  ]);
  shell.toolbarExtrasProps.value.onDensityChange("comfortable");
  expect(shell.density.value).toBe("comfortable");
  controlled.value = "compact";
  shell.setDensity("comfortable");
  expect(shell.density.value).toBe("compact");
  expect(changed).toHaveBeenCalledTimes(2);
  scope.stop();
  const second = effectScope();
  const local = second.run(() =>
    useDataTableShell({
      data,
      columns,
      rowKey: (row: Row) => row.id,
      urlSync: false,
    })
  );
  if (!local) throw new Error("missing shell");
  local.setDensity("compact");
  expect(local.density.value).toBe("compact");
  expect(local.renderToolbarExtras()).toEqual([]);
  second.stop();
});

it("routes confirmation through the adapter and keeps toolbar history callbacks real", async () => {
  const scope = effectScope();
  const confirm = shallowRef<ConfirmHandler>();
  const run = vi.fn();
  const undo = vi.fn(() => 1);
  const redo = vi.fn(() => 1);
  let context: FeatureMountContext<Row> | undefined;
  const actions: RowAction<Row>[] = [{ key: "do", label: "Do", onClick: run }];
  const projector: RowActionControlsProjector<Row> = (props) =>
    actions.map((action) => ({
      key: action.key,
      label: action.label,
      action,
      attrs: {
        onClick: () =>
          props.confirm({
            title: "Confirm",
            message: "Proceed?",
            confirmLabel: "Do",
            cancelLabel: props.cancelLabel,
            onConfirm: () => {
              if (props.enabled()) run();
            },
          }),
      },
    }));
  const shell = scope.run(() =>
    useDataTableShell(() => ({
      data,
      columns,
      rowKey: (row: Row) => row.id,
      urlSync: false,
      confirm: confirm.value,
      features: [
        {
          id: "actions",
          apply: () => ({
            rowActionControls: projector,
            undoRedoButtons: true,
          }),
          mount: (current) => {
            context = current;
            current.state.set(rowActionsModelKey<Row>(), {
              canAdd: false,
              addRow: () => undefined,
              actions: [],
              rowActions: actions,
              hostActions: actions,
              hasRowActions: true,
            });
            current.state.set(editHistoryModelKey<Row>(), {
              enabled: true,
              canUndo: true,
              canRedo: false,
              undo,
              redo,
              clear: () => undefined,
              record: () => undefined,
            });
          },
        },
      ],
    }))
  );
  if (!shell || !context) throw new Error("missing shell");
  const click = shell.desktop.value.rows[0]?.actionControls?.[0]?.attrs
    .onClick as () => void;
  expect(click).toBeTypeOf("function");
  expect(click).toThrow("requires the adapter");
  confirm.value = (request) => request.onConfirm();
  click();
  expect(run).toHaveBeenCalledOnce();
  shell.toolbarExtrasProps.value.onUndo?.();
  shell.toolbarExtrasProps.value.onRedo?.();
  expect(undo).toHaveBeenCalledOnce();
  expect(redo).toHaveBeenCalledOnce();
  expect(shell.toolbarExtrasProps.value.canUndo).toBe(true);
  expect(shell.runtime.labels()).toBeDefined();
  expect(shell.runtime.featureIds()).toEqual(["actions"]);
  await context.flushAdmission();
  scope.stop();
  expect(shell.runtime.featureIds()).toEqual([]);
  await context.flushAdmission();
});
