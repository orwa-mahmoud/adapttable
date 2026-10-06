import { useBatchEditing, useRowEditing } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, defineComponent, effectScope, h, shallowRef } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { provideClassNames } from "../src/classNamesContext";
import { densityChooser } from "../src/density";
import {
  NativeBatchEditBar,
  NativeRowEditActions,
} from "../src/editing/NativeEditingActions";
import { NativeHistoryButtons } from "../src/editing/NativeHistoryButtons";
import { filters } from "../src/filters";
import { grouping } from "../src/grouping";
import {
  savedViews,
  SavedViewsPanel,
  type SavedViewsPanelProps,
} from "../src/saved-views";
import {
  click,
  find,
  mountNative,
  part,
  tick,
  write,
} from "./filter-editing-helpers";

const rows = [
  { id: "a", name: "Ada", team: "Core", score: 2 },
  { id: "b", name: "Bea", team: "Core", score: 3 },
];
const columns = [{ key: "name", editable: true }, { key: "score" }];
const labels = resolveLabels(undefined);
function expectPart(
  root: ParentNode,
  name: string,
  tag: string,
  className?: string
) {
  const node = find(root, part(name));
  expect(node.tagName).toBe(tag);
  if (className) expect(node.classList.contains(className)).toBe(true);
  return node;
}
function markup(html: string) {
  const root = document.createElement("div");
  root.innerHTML = html;
  return root;
}

describe("canonical composition parts and class targets", () => {
  it("SSR locates row/batch/history buttons through the real Chrome forwarding paths", async () => {
    const commit = vi.fn();
    const scope = effectScope();
    const { row, batch } = scope.run(() => {
      const row = useRowEditing<(typeof rows)[number]>({
        enabled: true,
        columns,
        onRowEdit: commit,
      });
      const batch = useBatchEditing<(typeof rows)[number]>({
        enabled: true,
        columns,
        onBatchEdit: commit,
      });
      row.value.begin(rows[0]!, "a");
      batch.value.setDraft(rows[0]!, "a", "name", "Changed");
      return { row, batch };
    })!;
    const Root = defineComponent({
      setup() {
        provideClassNames(() => ({
          undoButton: "undo",
          redoButton: "redo",
          rowEditButton: "row-action",
          batchEditButton: "batch-action",
        }));
        return () =>
          h("div", [
            h(NativeHistoryButtons, {
              density: "comfortable",
              onDensityChange: () => undefined,
              labels,
              onUndo: commit,
              onRedo: commit,
              canUndo: true,
              canRedo: false,
              undoLabel: "Undo",
              redoLabel: "Redo",
            }),
            h(NativeRowEditActions<(typeof rows)[number]>, {
              rowEditing: row.value,
              row: rows[0]!,
              rowId: "a",
              labels,
            }),
            h(NativeBatchEditBar<(typeof rows)[number]>, {
              batch: batch.value,
              labels,
            }),
          ]);
      },
    });
    const root = markup(await renderToString(createSSRApp(Root)));
    expectPart(root, "undo-button", "BUTTON", "undo");
    expectPart(root, "redo-button", "BUTTON", "redo");
    expectPart(root, "row-edit-save", "BUTTON", "row-action");
    expectPart(root, "row-edit-cancel", "BUTTON", "row-action");
    expectPart(root, "batch-edit-count", "OUTPUT");
    expectPart(root, "batch-edit-save", "BUTTON", "batch-action");
    expectPart(root, "batch-edit-cancel", "BUTTON", "batch-action");
    expect(
      root.querySelector(
        '[data-adapttable-part="undo"], [data-adapttable-part="redo"], [data-adapttable-part="edit-history"]'
      )
    ).toBeNull();
    expect(commit).not.toHaveBeenCalled();
    scope.stop();
  });

  it.each([false, true])(
    "SSR keeps group labels and aggregates on their semantic elements, mobile=%s",
    async (mobile) => {
      const root = markup(
        await renderToString(
          createSSRApp({
            render: () =>
              h(DataTable<(typeof rows)[number]>, {
                data: rows,
                columns,
                rowKey: (row) => row.id,
                urlSync: false,
                forceMobile: mobile,
                selectable: true,
                classNames: {
                  groupLabel: "caption",
                  groupCell: "group-cell",
                  groupCard: "group-card",
                  groupSelect: "select",
                  groupCheckbox: "legacy-select",
                  groupFooterRow: "footer",
                  groupFooterCell: "footer-cell",
                  groupAggregate: "aggregate",
                },
                features: [
                  grouping<(typeof rows)[number]>("team", {
                    groupFooters: true,
                    groupAggregates: (data) => ({
                      score: data.reduce((sum, row) => sum + row.score, 0),
                    }),
                  }),
                ],
              }),
          })
        )
      );
      const label = expectPart(root, "group-label", "SPAN", "caption");
      expect(label.textContent).toBe("Core");
      expect(label.querySelector("button, input")).toBeNull();
      const select = expectPart(root, "group-select", "INPUT", "select");
      expect(select.classList.contains("legacy-select")).toBe(true);
      expectPart(root, "group-aggregate", mobile ? "SPAN" : "TD", "aggregate");
      if (mobile) expectPart(root, "group-card", "DIV", "group-card");
      else {
        expectPart(root, "group-cell", "TD", "group-cell");
        const footer = expectPart(root, "group-footer-row", "TR", "footer");
        expectPart(footer, "group-footer-cell", "TD", "footer-cell");
        expect(
          footer.querySelectorAll(part("group-toggle-spacer"))
        ).toHaveLength(2);
      }
    }
  );

  it("SSR locates menu and density parts emitted by binding attrs and preserves class aliases", async () => {
    const root = markup(
      await renderToString(
        createSSRApp({
          render: () =>
            h(DataTable<(typeof rows)[number]>, {
              data: rows,
              columns,
              rowKey: (row) => row.id,
              urlSync: false,
              classNames: {
                densityToggle: "density",
                densitySelect: "legacy-density",
                viewsMenu: "menu",
                viewsButton: "views",
              },
              features: [
                densityChooser(),
                savedViews({ storageKey: "parts", storage: null }),
              ],
            }),
        })
      )
    );
    const density = expectPart(root, "density-toggle", "SELECT", "density");
    expect(density.classList.contains("legacy-density")).toBe(true);
    expectPart(root, "views-menu", "DIV", "menu");
    expectPart(root, "views-button", "BUTTON", "views");
  });

  it("keeps SavedViews management classes on the surface, row, buttons and stable rename input", async () => {
    const rename = vi.fn();
    const props = shallowRef<SavedViewsPanelProps>({
      views: [
        { name: "Team", search: "" },
        { name: "Protected", search: "", isDefault: true, readOnly: true },
      ],
      onApply: vi.fn(),
      onRename: rename,
      onMove: vi.fn(),
      onSetDefault: vi.fn(),
      onRemove: vi.fn(),
      footer: "Note",
      className: "existing",
      classNames: {
        viewsPanel: "panel",
        viewsRow: "view-row",
        viewsItem: "apply",
        viewsDelete: "control",
        viewsInput: "rename",
      },
    });
    const render = () => h(SavedViewsPanel, props.value);
    const root = markup(await renderToString(createSSRApp({ render })));
    const panel = expectPart(root, "saved-views-panel", "SECTION", "panel");
    expect(panel.classList.contains("existing")).toBe(true);
    expectPart(panel, "saved-views-title", "H2");
    expectPart(panel, "saved-views-footer", "SPAN");
    const row = expectPart(panel, "saved-view-row", "DIV", "view-row");
    const caption = expectPart(row, "saved-view-caption", "DIV");
    expect(find(caption, "button").className).toBe("apply");
    expect(
      find(expectPart(row, "saved-view-controls", "DIV"), "button").className
    ).toBe("control");
    expectPart(panel, "saved-view-readonly", "SPAN");
    expectPart(panel, "saved-view-default", "SPAN");
    const view = mountNative(render);
    find(view.host, `button[aria-label="${labels.renameView}"]`).click();
    await tick();
    const input = find<HTMLInputElement>(view.host, "input.rename");
    await write(input, "Renamed");
    props.value = {
      ...props.value,
      classNames: { ...props.value.classNames, viewsInput: "changed" },
    };
    await tick();
    expect(find(view.host, "input.changed")).toBe(input);
    expect(input.value).toBe("Renamed");
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await tick();
    expect(rename).toHaveBeenCalledExactlyOnceWith("Team", "Renamed");
  });

  it("puts filter surface/header/body/footer classes on the actual native drawer and closes once", async () => {
    const view = mountNative(() =>
      h(DataTable<(typeof rows)[number]>, {
        data: rows,
        columns,
        rowKey: (row) => row.id,
        urlSync: false,
        classNames: {
          filtersAnchor: "anchor",
          filtersButton: "trigger",
          filtersIcon: "icon",
          filtersPanel: "panel",
          filtersHeader: "header",
          filtersTitle: "title",
          filtersBody: "body",
          filtersFooter: "footer",
          filtersActions: "legacy-actions",
          filtersClose: "close",
        },
        features: [
          filters<(typeof rows)[number]>([{ key: "name", type: "text" }], {
            mode: "drawer",
          }),
        ],
      })
    );
    const anchor = expectPart(view.host, "filters-anchor", "DIV", "anchor");
    expectPart(anchor, "filters-button", "BUTTON", "trigger");
    expectPart(anchor, "filters-icon", "svg", "icon");
    await click(view.host, "filters-button");
    const panel = expectPart(document.body, "filters-panel", "DIV", "panel");
    const dialog = panel.closest("dialog");
    expect(dialog?.hasAttribute("data-adapttable-filter-dialog")).toBe(true);
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.open).toBe(true);
    expectPart(panel, "filters-header", "HEADER", "header");
    expectPart(panel, "filters-title", "H3", "title");
    expectPart(panel, "filters-body", "DIV", "body");
    const footer = expectPart(panel, "filters-footer", "FOOTER", "footer");
    expect(footer.classList.contains("legacy-actions")).toBe(true);
    expectPart(panel, "filters-close", "BUTTON", "close").click();
    await tick();
    expect(document.body.querySelector(part("filters-panel"))).toBeNull();
    expect(
      find(view.host, part("filters-button")).getAttribute("aria-expanded")
    ).toBe("false");
  });
});
