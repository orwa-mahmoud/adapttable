import type { ComposedFeature, CustomCellEditorCtrl } from "@adapttable/vue";
import { createApp, createSSRApp, h, nextTick, shallowRef } from "vue";
import { renderToString } from "vue/server-renderer";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";

import { DataTable, type DataTableProps } from "../src";
import VuetifyInput from "../src/controls/VuetifyInput.vue";
import {
  batchEditing,
  dirtyIndicators,
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "../src/editing";

interface Person {
  id: string;
  name: string;
  score: number;
  active: boolean;
  tags: string[];
}
const original: Person = {
  id: "ada",
  name: "Ada",
  score: 10,
  active: true,
  tags: ["a"],
};
const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});
function vuetify() {
  return createVuetify({
    ssr: true,
    icons: { defaultSet: "mdi", aliases, sets: { mdi } },
  });
}
function fixture(
  features: readonly ComposedFeature<Person>[],
  extra: Partial<DataTableProps<Person>> = {}
) {
  const rows = shallowRef<readonly Person[]>([original]);
  const props = shallowRef<DataTableProps<Person>>({
    data: rows.value,
    columns: [
      { key: "name", editable: true },
      { key: "score", editable: true, editor: "number" },
    ],
    rowKey: (row) => row.id,
    urlSync: false,
    forceMobile: false,
    searchable: false,
    features,
    ...extra,
  });
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    setup: () => () =>
      h(DataTable<Person>, { ...props.value, data: rows.value }),
  }).use(vuetify());
  app.mount(host);
  cleanups.push(() => {
    app.unmount();
    host.remove();
  });
  return { host, rows, props };
}
const part = (name: string) => `[data-adapttable-part="${name}"]`;
function node<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}
async function settle(): Promise<void> {
  await nextTick();
  await nextTick();
}
async function key(target: HTMLElement, key: string): Promise<void> {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
  );
  await settle();
}
async function activate(
  host: ParentNode,
  index = 0
): Promise<HTMLInputElement> {
  await settle();
  const button = host.querySelectorAll<HTMLButtonElement>(
    part("edit-cell-activate")
  )[index];
  if (!button) throw new Error("Missing editable activation button");
  expect(button.classList.contains("v-btn")).toBe(true);
  button.focus();
  await key(button, "F2");
  const editor = node(host, part("edit-cell-editor"));
  return editor instanceof HTMLInputElement
    ? editor
    : node<HTMLInputElement>(editor, "input:not([type=hidden])");
}
async function write(input: HTMLInputElement, value: string): Promise<void> {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await settle();
}

it.each([false, true])(
  "activates real text fields, preserves draft focus and cancels without a host write, mobile=%s",
  async (forceMobile) => {
    const commit = vi.fn();
    const { host, rows } = fixture([editing<Person>(commit)], { forceMobile });
    const input = await activate(host);
    expect(input.closest(".v-text-field")).not.toBeNull();
    expect(document.activeElement).toBe(input);
    await write(input, "Draft");
    expect(document.activeElement).toBe(input);
    await key(input, "Escape");
    expect(host.querySelector(part("edit-cell-editor"))).toBeNull();
    expect(document.activeElement).toBe(node(host, part("edit-cell-activate")));
    expect(commit).not.toHaveBeenCalled();
    expect(rows.value[0]).toBe(original);
  }
);

it("commits exactly once for Enter followed by blur and keeps the host row authoritative", async () => {
  let accept: (() => void) | undefined;
  const commit = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        accept = resolve;
      })
  );
  const { host, rows } = fixture([editing<Person>(commit), dirtyIndicators()]);
  const input = await activate(host);
  await write(input, "Draft");
  await key(input, "Enter");
  input.dispatchEvent(new FocusEvent("blur"));
  await settle();
  expect(commit).toHaveBeenCalledExactlyOnceWith(original, "name", "Draft");
  expect(rows.value[0]).toBe(original);
  expect(node(host, "[data-edit-unit]").hasAttribute("data-dirty")).toBe(true);
  accept?.();
  await settle();
  expect(host.textContent).toContain("Ada");
});

it("associates validation with the actual input and Vuetify's error presentation", async () => {
  const commit = vi.fn();
  const { host } = fixture([editing<Person>(commit)], {
    columns: [
      {
        key: "name",
        editable: true,
        validate: (value) =>
          value === "bad" ? "Choose another name" : undefined,
      },
    ],
  });
  const input = await activate(host);
  await write(input, "bad");
  await key(input, "Enter");
  const error = node(host, part("edit-cell-error"));
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(input.getAttribute("aria-describedby")).toBe(error.id);
  expect(input.closest(".v-input--error")).not.toBeNull();
  expect(commit).not.toHaveBeenCalled();
  await write(input, "Valid");
  await key(input, "Enter");
  expect(commit).toHaveBeenCalledExactlyOnceWith(original, "name", "Valid");
});

it("keeps host data unchanged while number and boolean drafts use binding parsing", async () => {
  const commit = vi.fn();
  const numeric = fixture([editing<Person>(commit)], {
    columns: [{ key: "score", editable: true, editor: "number" }],
  });
  const number = await activate(numeric.host);
  expect(number.type).toBe("number");
  await write(number, "42");
  await key(number, "Enter");
  expect(commit).toHaveBeenLastCalledWith(original, "score", 42);
  const boolean = fixture([editing<Person>(commit)], {
    columns: [{ key: "active", editable: true, editor: "boolean" }],
  });
  const checkbox = await activate(boolean.host);
  expect(checkbox.closest(".v-checkbox-btn")).not.toBeNull();
  checkbox.click();
  await settle();
  await key(checkbox, "Enter");
  expect(commit).toHaveBeenLastCalledWith(original, "active", false);
  expect(original.score).toBe(10);
  expect(original.active).toBe(true);
});

it.each([
  { editor: "date" as const, type: "date", value: "2026-10-07" },
  {
    editor: "datetime" as const,
    type: "datetime-local",
    value: "2026-10-07T10:30",
  },
  { editor: "time" as const, type: "time", value: "10:30" },
])(
  "preserves the platform $editor value through a Vuetify text field",
  async ({ editor, type, value }) => {
    const commit = vi.fn();
    const { host, rows } = fixture([editing<Person>(commit)], {
      columns: [{ key: "name", editable: true, editor }],
    });
    rows.value = [{ ...original, name: "2026-10-06T09:00" }];
    const input = await activate(host);
    expect(input.type).toBe(type);
    expect(input.closest(".v-text-field")).not.toBeNull();
    await write(input, value);
    await key(input, "Enter");
    expect(commit).toHaveBeenCalledExactlyOnceWith(
      rows.value[0],
      "name",
      value
    );
  }
);

it("uses a genuine VSelect and commits its keyboard-selected draft only after widget blur", async () => {
  const commit = vi.fn();
  const { host } = fixture([editing<Person>(commit)], {
    columns: [
      {
        key: "name",
        editable: true,
        editor: { type: "select", options: ["Ada", "Bea"] },
      },
    ],
  });
  const input = await activate(host);
  expect(input.closest(".v-select")).not.toBeNull();
  await key(input, "b");
  expect(commit).not.toHaveBeenCalled();
  input.blur();
  await settle();
  expect(commit).toHaveBeenCalledExactlyOnceWith(original, "name", "Bea");
});

it("leaves Enter and the first Escape to the real select menu before canceling the edit", async () => {
  const commit = vi.fn();
  const { host } = fixture([editing<Person>(commit)], {
    columns: [
      {
        key: "name",
        editable: true,
        editor: { type: "select", options: ["Ada", "Bea"] },
      },
    ],
  });
  const input = await activate(host);
  await key(input, "Enter");
  expect(host.querySelector(".v-select--active-menu")).not.toBeNull();
  expect(commit).not.toHaveBeenCalled();
  await key(input, "Escape");
  expect(host.querySelector(part("edit-cell-editor"))).not.toBeNull();
  expect(host.querySelector(".v-select--active-menu")).toBeNull();
  await key(input, "Escape");
  expect(host.querySelector(part("edit-cell-editor"))).toBeNull();
  expect(commit).not.toHaveBeenCalled();
});

it("uses Vuetify's multi-select list and the binding's draft codec", async () => {
  const commit = vi.fn();
  const { host } = fixture([editing<Person>(commit)], {
    columns: [
      {
        key: "tags",
        editable: true,
        editor: {
          type: "multi-select",
          options: [
            { value: "a", label: "Alpha" },
            { value: "b", label: "Beta" },
          ],
        },
      },
    ],
  });
  const input = await activate(host);
  await key(input, "ArrowDown");
  const option = [
    ...document.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((item) => item.textContent?.includes("Beta"));
  if (!option) throw new Error("Missing real Vuetify Beta option");
  option.click();
  await settle();
  expect(host.querySelector(".v-select--multiple")).not.toBeNull();
  expect(host.querySelectorAll(".v-select .v-chip")).toHaveLength(2);
  expect(commit).not.toHaveBeenCalled();
  await key(input, "Tab");
  expect(commit).toHaveBeenCalledExactlyOnceWith(original, "tags", ["a", "b"]);
  expect(original.tags).toEqual(["a"]);
});

it("passes the real custom editor controller and retires retained custom requests", async () => {
  let retained: CustomCellEditorCtrl | undefined;
  const commit = vi.fn();
  const { host, props } = fixture([editing<Person>(commit)], {
    columns: [
      {
        key: "name",
        editable: true,
        editor: {
          type: "custom",
          render: (control: CustomCellEditorCtrl) => {
            retained = control;
            return h(VuetifyInput, {
              attrs: {
                "aria-label": control.label,
                "data-adapttable-part": "edit-cell-editor",
                ref: control.focusRef,
                onBlur: control.onBlur,
                onKeydown: control.onKeyDown,
              },
              value: control.draft,
              onChange: control.setDraft,
            });
          },
        },
      },
    ],
  });
  const input = await activate(host);
  await write(input, "Custom draft");
  expect(retained?.draft).toBe("Custom draft");
  const stale = retained;
  props.value = { ...props.value, features: [] };
  await settle();
  stale?.setDraft("Stale");
  stale?.commit();
  expect(commit).not.toHaveBeenCalled();
});

it("renders binding-owned conflict resolution with genuine Vuetify actions", async () => {
  const commit = vi.fn();
  const { host, rows } = fixture([
    editing<Person>(commit, { editConflictPolicy: "ask" }),
  ]);
  const input = await activate(host);
  await write(input, "Mine");
  rows.value = [{ ...original, name: "Theirs" }];
  await settle();
  const conflict = node(host, part("edit-cell-conflict"));
  expect(input.getAttribute("aria-describedby")).toBe(conflict.id);
  expect(node(host, part("edit-cell-incoming")).textContent).toContain(
    "Theirs"
  );
  const keep = node<HTMLButtonElement>(host, part("edit-cell-keep-mine"));
  expect(keep.classList.contains("v-btn")).toBe(true);
  const press = new MouseEvent("mousedown", {
    bubbles: true,
    cancelable: true,
  });
  keep.dispatchEvent(press);
  expect(press.defaultPrevented).toBe(true);
  keep.click();
  await settle();
  expect(host.querySelector(part("edit-cell-conflict"))).toBeNull();
  expect(input.value).toBe("Mine");
  expect(commit).not.toHaveBeenCalled();
  await key(input, "Enter");
  expect(commit).toHaveBeenCalledOnce();
  expect(commit).toHaveBeenLastCalledWith(rows.value[0], "name", "Mine");
});

it("takes the host's incoming value without making a write request", async () => {
  const commit = vi.fn();
  const { host, rows } = fixture([
    editing<Person>(commit, { editConflictPolicy: "ask" }),
  ]);
  const input = await activate(host);
  await write(input, "Mine");
  rows.value = [{ ...original, name: "Theirs" }];
  await settle();
  const take = node<HTMLButtonElement>(host, part("edit-cell-take-theirs"));
  expect(take.classList.contains("v-btn")).toBe(true);
  take.click();
  await settle();
  expect(input.value).toBe("Theirs");
  expect(host.querySelector(part("edit-cell-conflict"))).toBeNull();
  expect(commit).not.toHaveBeenCalled();
});

it("shows failed cell saves and requests rollback through a Vuetify button", async () => {
  let reject: ((reason: Error) => void) | undefined;
  const rollback = vi.fn();
  const commit = vi.fn(
    () =>
      new Promise<void>((_resolve, fail) => {
        reject = fail;
      })
  );
  const { host, rows } = fixture([
    editing<Person>(commit, {
      formatEditError: () => "Save failed",
      onEditRollback: rollback,
    }),
  ]);
  const input = await activate(host);
  await write(input, "Draft");
  await key(input, "Enter");
  reject?.(new Error("offline"));
  await settle();
  expect(node(host, part("edit-cell-save-error")).textContent).toContain(
    "Save failed"
  );
  const undo = node<HTMLButtonElement>(host, part("edit-cell-rollback"));
  expect(undo.classList.contains("v-btn")).toBe(true);
  undo.click();
  await settle();
  expect(rollback).toHaveBeenCalledOnce();
  expect(rows.value[0]).toBe(original);
});

it("guards repeated row saves, preserves a rejected draft, and cancels explicitly", async () => {
  let reject: ((reason: Error) => void) | undefined;
  const commit = vi.fn(
    () =>
      new Promise<void>((_resolve, fail) => {
        reject = fail;
      })
  );
  const { host, rows } = fixture([
    rowEditing<Person>(commit, { formatEditError: () => "Save failed" }),
  ]);
  await settle();
  node<HTMLButtonElement>(host, part("row-edit-begin")).click();
  await settle();
  const input = node<HTMLInputElement>(
    host,
    `${part("edit-cell-editor")} input`
  );
  expect(document.activeElement).toBe(input);
  await write(input, "Row draft");
  const save = node<HTMLButtonElement>(host, part("row-edit-save"));
  expect(save.classList.contains("v-btn")).toBe(true);
  save.click();
  save.click();
  await settle();
  expect(commit).toHaveBeenCalledExactlyOnceWith(original, {
    name: "Row draft",
  });
  expect(save.disabled).toBe(true);
  reject?.(new Error("offline"));
  await settle();
  expect(node(host, part("row-edit-error")).textContent).toContain(
    "Save failed"
  );
  expect(input.value).toBe("Row draft");
  expect(rows.value[0]).toBe(original);
  node<HTMLButtonElement>(host, part("row-edit-cancel")).click();
  await settle();
  expect(host.querySelector(part("edit-cell-editor"))).toBeNull();
});

it("stages a batch and submits only through its explicit Vuetify save action", async () => {
  const commit = vi.fn();
  const { host, rows } = fixture([batchEditing<Person>(commit)]);
  await settle();
  const input = node<HTMLInputElement>(
    host,
    `${part("edit-cell-editor")} input`
  );
  await write(input, "Batch draft");
  await key(input, "Enter");
  expect(commit).not.toHaveBeenCalled();
  const save = node<HTMLButtonElement>(host, part("batch-edit-save"));
  expect(save.classList.contains("v-btn")).toBe(true);
  save.click();
  await settle();
  expect(commit).toHaveBeenCalledExactlyOnceWith([
    { row: original, rowId: "ada", patch: { name: "Batch draft" } },
  ]);
  expect(rows.value[0]).toBe(original);
});

it("routes Vuetify undo and redo actions through the shared history model", async () => {
  const commit = vi.fn();
  const { host } = fixture([
    editing<Person>(commit),
    editHistory(),
    undoRedoButtons(),
  ]);
  await settle();
  const undo = node<HTMLButtonElement>(host, part("undo-button"));
  expect(undo.disabled).toBe(true);
  expect(undo.classList.contains("v-btn")).toBe(true);
  const input = await activate(host);
  await write(input, "Changed");
  await key(input, "Enter");
  undo.click();
  await settle();
  expect(commit).toHaveBeenLastCalledWith(original, "name", "Ada");
  node<HTMLButtonElement>(host, part("redo-button")).click();
  await settle();
  expect(commit).toHaveBeenLastCalledWith(original, "name", "Changed");
});

it("hydrates batch editors without host writes or mismatches", async () => {
  const commit = vi.fn();
  const root = {
    render: () =>
      h(DataTable<Person>, {
        data: [original],
        columns: [{ key: "name", editable: true }],
        rowKey: (row) => row.id,
        forceMobile: false,
        urlSync: false,
        searchable: false,
        features: [batchEditing<Person>(commit)],
      }),
  };
  const host = document.createElement("div");
  host.innerHTML = await renderToString(createSSRApp(root).use(vuetify()));
  document.body.append(host);
  const warning = vi.spyOn(console, "warn");
  const error = vi.spyOn(console, "error");
  const client = createSSRApp(root).use(vuetify());
  client.mount(host);
  cleanups.push(() => {
    client.unmount();
    host.remove();
  });
  await settle();
  expect(
    host.querySelector(`${part("edit-cell-editor")} input`)
  ).not.toBeNull();
  expect(commit).not.toHaveBeenCalled();
  expect(
    [...warning.mock.calls, ...error.mock.calls]
      .flat()
      .some((message) => String(message).includes("mismatch"))
  ).toBe(false);
});
