import type { ColumnDef, CustomCellEditorCtrl } from "@adapttable/vue";
import { defineComponent, h, KeepAlive, shallowRef } from "vue";

import { DataTable } from "../src";
import { editing } from "../src/editing";
import { NaiveChoiceEditor } from "../src/editing/NaiveChoiceEditor";
import { NaiveNumberEditor } from "../src/editing/NaiveNumberEditor";
import { deferred } from "./editing-helpers";
import { choose, find, mount, part, tick, write } from "./filter-helpers";

interface Row {
  id: string;
  value: unknown;
}
const row: Row = { id: "1", value: "a" };
function fixture(column: ColumnDef<Row>, value: unknown = "a") {
  const current = { ...row, value };
  const commit = vi.fn();
  const view = mount(() =>
    h(DataTable<Row>, {
      data: [current],
      columns: [column],
      rowKey: (item) => item.id,
      urlSync: false,
      forceMobile: false,
      features: [editing<Row>(commit)],
    })
  );
  return { ...view, commit, current };
}
async function key(target: HTMLElement, key: string) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      code: key,
      bubbles: true,
      cancelable: true,
    })
  );
  await tick();
}
async function activate(host: HTMLElement) {
  const button = find<HTMLButtonElement>(host, part("edit-cell-activate"));
  expect(button.classList.contains("n-button")).toBe(true);
  button.focus();
  await key(button, "F2");
  return find<HTMLElement>(host, part("edit-cell-editor"));
}

it.each(["date", "datetime", "time"] as const)(
  "preserves the native %s semantics in NInput",
  async (editor) => {
    const value = {
      date: "2026-10-07",
      datetime: "2026-10-07T12:30",
      time: "12:30",
    }[editor];
    const view = fixture({ key: "value", editable: true, editor }, "");
    const input = (await activate(view.host)) as HTMLInputElement;
    expect(input.closest(".n-input")).not.toBeNull();
    expect(input.type).toBe(editor === "datetime" ? "datetime-local" : editor);
    expect(document.activeElement).toBe(input);
    await write(input, value);
    await key(input, "Enter");
    expect(view.commit).toHaveBeenCalledExactlyOnceWith(
      view.current,
      "value",
      value
    );
  }
);

it("uses the real numeric input, preserving invalid raw drafts and their accessible error", async () => {
  const view = fixture(
    {
      key: "value",
      editable: true,
      editor: "number",
      validate: (value) => (value === null ? "Enter a number" : undefined),
    },
    2
  );
  const input = (await activate(view.host)) as HTMLInputElement;
  expect(input.closest(".n-input-number")).not.toBeNull();
  expect(input.getAttribute("role")).toBe("spinbutton");
  expect(document.activeElement).toBe(input);
  await write(input, "invalid");
  await key(input, "Enter");
  expect(view.commit).not.toHaveBeenCalled();
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(input.value).toBe("invalid");
  await write(input, "12.5");
  await key(input, "Enter");
  expect(view.commit).toHaveBeenCalledExactlyOnceWith(
    view.current,
    "value",
    12.5
  );
});

it("uses NCheckbox's semantic focus target and commits exactly once", async () => {
  const view = fixture(
    { key: "value", editable: true, editor: "boolean" },
    true
  );
  const checkbox = await activate(view.host);
  expect(checkbox.getAttribute("role")).toBe("checkbox");
  expect(checkbox.classList.contains("n-checkbox")).toBe(true);
  expect(document.activeElement).toBe(checkbox);
  checkbox.click();
  await tick();
  expect(checkbox.getAttribute("aria-checked")).toBe("false");
  await key(checkbox, "Enter");
  expect(view.commit).toHaveBeenCalledExactlyOnceWith(
    view.current,
    "value",
    false
  );
});

it.each([false, true])(
  "lets NSelect own selection and first Escape with multiple=%s",
  async (multiple) => {
    const view = fixture(
      {
        key: "value",
        editable: true,
        editor: {
          type: multiple ? "multi-select" : "select",
          options: ["a", "b"],
        },
      },
      multiple ? ["a"] : "a"
    );
    const input = (await activate(view.host)) as HTMLInputElement;
    expect(input.getAttribute("role")).toBe("combobox");
    expect(document.activeElement).toBe(input);
    await choose(view.host, "b");
    expect(view.commit).not.toHaveBeenCalled();
    if (input.getAttribute("aria-expanded") === "true")
      await key(input, "Escape");
    expect(view.host.querySelector(part("edit-cell-editor"))).toBe(input);
    await key(input, "Enter");
    expect(view.commit).toHaveBeenCalledExactlyOnceWith(
      view.current,
      "value",
      multiple ? ["a", "b"] : "b"
    );
  }
);

it("first Escape dismisses the select menu and second cancels the editor and restores activation focus", async () => {
  const view = fixture({
    key: "value",
    editable: true,
    editor: { type: "select", options: ["a", "b"] },
  });
  const input = await activate(view.host);
  input.click();
  await tick();
  expect(input.getAttribute("aria-expanded")).toBe("true");
  await key(input, "Escape");
  expect(input.getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(input);
  expect(view.host.querySelector(part("edit-cell-editor"))).toBe(input);
  await key(input, "Escape");
  expect(view.host.querySelector(part("edit-cell-editor"))).toBeNull();
  expect(document.activeElement).toBe(
    find(view.host, part("edit-cell-activate"))
  );
  expect(view.commit).not.toHaveBeenCalled();
});

it("publishes and releases only semantic native editor refs", async () => {
  const numberRef = vi.fn();
  const selectRef = vi.fn();
  const view = mount(() =>
    h("div", [
      h(NaiveNumberEditor, {
        attrs: { ref: numberRef },
        draft: "2",
        onChange: vi.fn(),
        onBlur: vi.fn(),
      }),
      h(NaiveChoiceEditor, {
        attrs: { ref: selectRef },
        draft: "a",
        multiple: false,
        options: [{ value: "a", label: "A" }],
        onChange: vi.fn(),
        onBlur: vi.fn(),
        onKeyDown: vi.fn(),
      }),
    ])
  );
  await tick();
  expect(numberRef).toHaveBeenLastCalledWith(
    find(view.host, 'input[role="spinbutton"]')
  );
  expect(selectRef).toHaveBeenLastCalledWith(
    find(view.host, 'input[role="combobox"]')
  );
  view.stop();
  expect(numberRef).toHaveBeenLastCalledWith(null);
  expect(selectRef).toHaveBeenLastCalledWith(null);
});

it("rejects stale custom callbacks through KeepAlive deactivation, row replacement and disposal", async () => {
  const show = shallowRef(true);
  const rows = shallowRef<Row[]>([row]);
  const commit = vi.fn();
  let control: CustomCellEditorCtrl | undefined;
  const columns: ColumnDef<Row>[] = [
    {
      key: "value",
      editable: true,
      editor: {
        type: "custom",
        render: (next: CustomCellEditorCtrl) => {
          control = next;
          return h("span", { "data-custom": true }, next.draft);
        },
      },
    },
  ];
  const KeptTable = defineComponent(
    () => () =>
      h(DataTable<Row>, {
        data: rows.value,
        columns,
        rowKey: (item) => item.id,
        urlSync: false,
        features: [editing<Row>(commit)],
      })
  );
  const view = mount(() =>
    h(KeepAlive, null, { default: () => (show.value ? h(KeptTable) : null) })
  );
  await key(find(view.host, part("edit-cell-activate")), "F2");
  const stale = control!;
  show.value = false;
  await tick();
  stale.setDraft("hidden");
  stale.commit();
  expect(commit).not.toHaveBeenCalled();
  show.value = true;
  await tick();
  rows.value = [{ id: "2", value: "other" }];
  await tick();
  stale.setDraft("wrong-row");
  stale.commit();
  expect(commit).not.toHaveBeenCalled();
  view.stop();
  stale.setDraft("disposed");
  stale.commit();
  expect(commit).not.toHaveBeenCalled();
});

it("does not commit a pending validation after the table unmounts", async () => {
  const pending = deferred<undefined>();
  const commit = vi.fn();
  const columns: ColumnDef<Row>[] = [{ key: "value", editable: true }];
  const view = mount(() =>
    h(DataTable<Row>, {
      data: [row],
      columns,
      rowKey: (item) => item.id,
      urlSync: false,
      features: [editing<Row>(commit, { validateRow: () => pending.promise })],
    })
  );
  const input = (await activate(view.host)) as HTMLInputElement;
  await write(input, "pending");
  await key(input, "Enter");
  view.stop();
  pending.resolve(undefined);
  await tick();
  expect(commit).not.toHaveBeenCalled();
});

it.each([false, true])(
  "commits select drafts once when focus leaves an open menu with multiple=%s",
  async (multiple) => {
    const view = fixture(
      {
        key: "value",
        editable: true,
        editor: {
          type: multiple ? "multi-select" : "select",
          options: ["a", "b"],
        },
      },
      multiple ? ["a"] : "a"
    );
    const input = await activate(view.host);
    await choose(view.host, "b");
    input.focus();
    input.click();
    await tick();
    expect(input.getAttribute("aria-expanded")).toBe("true");
    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();
    await tick();
    expect(view.commit).toHaveBeenCalledExactlyOnceWith(
      view.current,
      "value",
      multiple ? ["a", "b"] : "b"
    );
    expect(view.host.querySelector(part("edit-cell-editor"))).toBeNull();
    outside.remove();
  }
);

it("uses the public numeric keyboard update and clear-on-blur paths without mutating a controlled draft", async () => {
  const change = vi.fn();
  const options = shallowRef({ draft: "2", attrs: {} });
  const view = mount(() =>
    h(NaiveNumberEditor, {
      ...options.value,
      onChange: change,
      onBlur: vi.fn(),
    })
  );
  const input = find<HTMLInputElement>(view.host, 'input[role="spinbutton"]');
  await key(input, "ArrowUp");
  expect(change).toHaveBeenCalledWith("3");
  await write(input, "");
  input.dispatchEvent(new FocusEvent("blur"));
  await tick();
  expect(change).toHaveBeenCalledWith("");
  expect(options.value.draft).toBe("2");
  options.value = { draft: "2", attrs: { disabled: true, readonly: true } };
  await tick();
  expect(input.disabled).toBe(true);
  expect(input.readOnly).toBe(true);
});

it("releases select refs and closes its menu across KeepAlive while detached events remain inert", async () => {
  const show = shallowRef(true);
  const ref = vi.fn();
  const change = vi.fn();
  const blur = vi.fn();
  const KeptChoice = defineComponent(
    () => () =>
      h(NaiveChoiceEditor, {
        attrs: { ref },
        draft: "a",
        multiple: false,
        options: [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ],
        onChange: change,
        onBlur: blur,
        onKeyDown: vi.fn(),
      })
  );
  const view = mount(() =>
    h(KeepAlive, null, { default: () => (show.value ? h(KeptChoice) : null) })
  );
  const input = find<HTMLInputElement>(view.host, 'input[role="combobox"]');
  input.focus();
  input.click();
  await tick();
  expect(input.getAttribute("aria-expanded")).toBe("true");
  show.value = false;
  await tick();
  expect(ref).toHaveBeenLastCalledWith(null);
  input.click();
  await key(input, "Escape");
  input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  await tick();
  expect(change).not.toHaveBeenCalled();
  expect(blur).not.toHaveBeenCalled();
  show.value = true;
  await tick();
  const live = find<HTMLInputElement>(view.host, 'input[role="combobox"]');
  expect(live.getAttribute("aria-expanded")).toBe("false");
  expect(ref).toHaveBeenLastCalledWith(live);
});

it("releases numeric refs and ignores detached input and blur callbacks during KeepAlive", async () => {
  const show = shallowRef(true);
  const target = vi.fn();
  const change = vi.fn();
  const blur = vi.fn();
  const KeptNumber = defineComponent(
    () => () =>
      h(NaiveNumberEditor, {
        attrs: { ref: target },
        draft: "2",
        onChange: change,
        onBlur: blur,
      })
  );
  const view = mount(() =>
    h(KeepAlive, null, { default: () => (show.value ? h(KeptNumber) : null) })
  );
  const input = find<HTMLInputElement>(view.host, 'input[role="spinbutton"]');
  await tick();
  expect(target).toHaveBeenLastCalledWith(input);
  show.value = false;
  await tick();
  expect(target).toHaveBeenLastCalledWith(null);
  await write(input, "detached");
  input.dispatchEvent(new FocusEvent("blur"));
  await key(input, "ArrowUp");
  expect(change).not.toHaveBeenCalled();
  expect(blur).not.toHaveBeenCalled();
  show.value = true;
  await tick();
  expect(target).toHaveBeenLastCalledWith(
    find(view.host, 'input[role="spinbutton"]')
  );
});
