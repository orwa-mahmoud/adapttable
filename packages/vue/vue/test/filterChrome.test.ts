import {
  type FilterFormSource,
  type QueryFilterGroup,
  resolveLabels,
} from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";
import {
  computed,
  createApp,
  defineComponent,
  effectScope,
  h,
  nextTick,
  shallowRef,
} from "vue";

import {
  EditableCellChrome,
  useEditableCellModel,
  useTableEditing,
} from "../src/editing";
import {
  ChecklistChrome,
  FilterFieldChrome,
  type FilterFieldSlots,
  FilterTreeChrome,
  useChecklistModel,
  useFilterField,
  useFilterOptions,
  useFilterTreeModel,
} from "../src/filters";
import { HeaderFilterChrome, useHeaderFilter } from "../src/header-filters";
interface Row {
  id: string;
  name: string;
}
const data: readonly Row[] = [
  { id: "1", name: "Ada" },
  { id: "2", name: "Grace" },
];
const labels = resolveLabels(undefined);
function bag() {
  const extra = shallowRef<FilterFormSource<Row>["extra"]>({});
  const source = computed<FilterFormSource<Row>>(() => ({
    extra: extra.value,
    setExtra: (key, value) => {
      extra.value = { ...extra.value, [key]: value };
    },
    setExtras: (patch) => {
      extra.value = { ...extra.value, ...patch };
    },
    allFilteredRows: data,
  }));
  return { source, extra };
}
describe("structural Vue filter Chrome", () => {
  it("routes nested tree choices and removals through the current source", () => {
    const scope = effectScope();
    const tree = shallowRef<QueryFilterGroup>();
    const model = scope.run(() =>
      useFilterTreeModel<Row>(() => ({
        defs: [{ key: "name", type: "text" }],
        source: {
          filterTree: tree.value,
          setFilterTree: (value) => {
            tree.value = value;
          },
        },
      }))
    )!;
    model.value.actions.addGroup([]);
    model.value.actions.addCondition([0]);
    expect(tree.value?.conditions).toHaveLength(1);
    const select = vi.fn((props) => h("i", props.label));
    const button = vi.fn((props) => h("b", props.label));
    FilterTreeChrome({
      model: model.value,
      controls: {
        Select: select,
        Input: (props) => h("i", props.value),
        Button: button,
        Disclosure: (props) => props.children,
      },
    });
    const field = select.mock.calls.find(
      (call) => call[0].label === labels.filterField
    )?.[0];
    expect(field).toBeDefined();
    const remove = button.mock.calls.find(
      (call) => call[0].label === labels.filterRemoveCondition
    )?.[0];
    remove?.onClick();
    expect(JSON.stringify(tree.value)).not.toContain('"key":"name"');
    scope.stop();
  });
  it("checklist selection/search use shared model and omit unavailable source", () => {
    const scope = effectScope();
    const { source, extra } = bag();
    const model = scope.run(() =>
      useChecklistModel(() => ({
        def: { key: "name", type: "checklist" },
        source: source.value,
      }))
    )!;
    expect(model.value.state.items).toHaveLength(2);
    model.value.state.setQuery("ada");
    model.value.state.selectAllVisible();
    expect(extra.value.name).toEqual(["Ada"]);
    expect(model.value.state.visible).toHaveLength(1);
    const node = ChecklistChrome({
      model: model.value,
      controls: {
        Search: (props) => h("i", props.label),
        Button: (props) => h("b", props.label),
        Checkbox: (props) => h("u", props.label),
      },
    });
    expect(node).toBeTruthy();
    scope.stop();
  });
  it("header overlay toggles, remounts after dismissal and restores trigger focus on Escape", () => {
    const scope = effectScope();
    const { source } = bag();
    const model = scope.run(() =>
      useHeaderFilter(() => ({
        id: "test",
        def: { key: "name", type: "text" },
        source: source.value,
        labels,
        dir: "rtl" as const,
      }))
    )!;
    const anchor = document.createElement("button");
    document.body.append(anchor);
    model.value.trigger.triggerRef(anchor);
    model.value.trigger.onClick();
    expect(model.value.open).toBe(true);
    const key = model.value.resetKey;
    model.value.close("escape");
    expect(model.value.open).toBe(false);
    expect(model.value.resetKey).toBe(key + 1);
    expect(document.activeElement).toBe(anchor);
    const surface = vi.fn((props) => props.children);
    HeaderFilterChrome({
      model: model.value,
      controls: { Trigger: () => null, Field: () => null, Popover: surface },
    });
    expect(surface.mock.calls[0]?.[0].dir).toBe("rtl");
    scope.stop();
    anchor.remove();
  });
  it("throws clearly when a required native field control is absent", () => {
    const scope = effectScope();
    const { source } = bag();
    const model = scope.run(() =>
      useFilterField({
        id: "field",
        def: { key: "name", type: "text" },
        source: source.value,
        labels,
      })
    )!;
    const missing = {
      Input: () => null,
      Checkbox: () => null,
    } as unknown as FilterFieldSlots;
    expect(() =>
      FilterFieldChrome({ model: model.value, controls: missing })
    ).toThrow("requires the select control slot");
    scope.stop();
  });
  it("does not start a queued option loader after disposal", async () => {
    const load = vi.fn(() => Promise.resolve([]));
    const scope = effectScope();
    scope.run(() =>
      useFilterOptions({ key: "name", type: "select", options: load })
    );
    scope.stop();
    await Promise.resolve();
    await Promise.resolve();
    expect(load).not.toHaveBeenCalled();
  });
});
describe("native-independent editor focus contract", () => {
  it("opens on F2, focuses the actual supplied input, cancels on Escape and restores focus", async () => {
    const commit = vi.fn();
    const row = data[0]!;
    const column = { key: "name", editable: true };
    const target = document.createElement("div");
    document.body.append(target);
    const app = createApp(
      defineComponent({
        setup() {
          const editing = useTableEditing({
            rows: data,
            columns: [column],
            rowKey: (value: Row) => value.id,
            onCellEdit: commit,
          });
          const model = useEditableCellModel(() => ({
            editing: editing.bundle.value,
            row,
            column,
            rowId: row.id,
            rowIndex: 0,
            rows: data,
            columns: [column],
            rowKey: (value: Row) => value.id,
            editLabel: "Edit name",
            display: row.name,
          }));
          return () =>
            EditableCellChrome({
              model: model.value,
              controls: {
                Activate: (props) =>
                  h(
                    "button",
                    {
                      ref: (node: unknown) =>
                        props.activateRef(
                          node instanceof HTMLButtonElement ? node : null
                        ),
                      onKeydown: props.onKeyDown,
                      onDblclick: props.onDoubleClick,
                      onClick: props.onClick,
                    },
                    [props.display]
                  ),
                Editor: (props) =>
                  h("input", {
                    ...props.attrs,
                    ref: (node: unknown) =>
                      props.editorRef(
                        node instanceof HTMLInputElement ? node : null
                      ),
                    value: props.controller.draft,
                    onKeydown: props.onKeyDown,
                    onInput: (event: Event) =>
                      props.onChange((event.target as HTMLInputElement).value),
                    onBlur: props.onBlur,
                  }),
                Button: (props) =>
                  h("button", { onClick: props.onClick }, props.label),
              },
            });
        },
      })
    );
    app.mount(target);
    await nextTick();
    const activate = target.querySelector("button")!;
    activate.focus();
    activate.dispatchEvent(
      new KeyboardEvent("keydown", { key: "F2", bubbles: true })
    );
    await nextTick();
    const input = target.querySelector("input")!;
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute("aria-label")).toBe("Edit name");
    input.value = "Draft";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    await nextTick();
    await nextTick();
    expect(target.querySelector("input")).toBeNull();
    expect(document.activeElement).toBe(target.querySelector("button"));
    expect(commit).not.toHaveBeenCalled();
    app.unmount();
    target.remove();
  });
});
