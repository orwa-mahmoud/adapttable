import type { ColumnDef, ComposedFeature } from "@adapttable/vue";
import { afterEach, expect, it, vi } from "vitest";
import { createApp, h, nextTick, shallowRef } from "vue";

import { DataTable } from "../src";
import { editing, rowEditing } from "../src/editing";

interface Row {
  id: string;
  name: string;
  tags: string[];
}
const original: Row = { id: "a", name: "Ada", tags: ["a"] };
const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  document.body.replaceChildren();
});
async function flush() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 20));
  await nextTick();
}
const part = (name: string) => `[data-adapttable-part="${name}"]`;
function element<T extends HTMLElement>(
  selector: string,
  root: ParentNode = document
): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}
async function key(target: HTMLElement, value: string) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      bubbles: true,
      cancelable: true,
    })
  );
  await flush();
}
function mount(
  features: readonly ComposedFeature<Row>[],
  column: ColumnDef<Row> = { key: "name", editable: true }
) {
  const data = shallowRef([original]);
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () =>
      h("div", [
        h("button", { id: "recovery-outside" }, "Outside"),
        h(DataTable<Row>, {
          data: data.value,
          columns: [column],
          rowKey: (row) => row.id,
          features,
          forceMobile: false,
          urlSync: false,
          classNames: {
            editCellRollback: "consumer-rollback",
            editCellConflictButton: "consumer-conflict",
          },
        }),
      ]),
  });
  app.mount(host);
  const stop = () => app.unmount();
  stops.push(stop);
  return { host, data, stop };
}
async function begin(host: HTMLElement) {
  await flush();
  await key(element(part("edit-cell-activate"), host), "F2");
  return element<HTMLInputElement>(part("edit-cell-editor"), host);
}
async function write(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
}
it("suppresses configured row icons and resolves a real incoming edit conflict through the kit button", async () => {
  const row = mount([
    rowEditing<Row>(vi.fn(), {
      rowEditIcons: { begin: false, save: false, cancel: false },
    }),
  ]);
  await flush();
  const start = element<HTMLButtonElement>(part("row-edit-begin"), row.host);
  expect(start.textContent).toBe("Edit row");
  start.click();
  await flush();
  const cancel = element<HTMLButtonElement>(part("row-edit-cancel"), row.host);
  expect(cancel.textContent).toBe("Cancel");
  cancel.click();
  await flush();
  row.stop();
  stops.pop();
  row.host.remove();
  const commit = vi.fn();
  const view = mount([editing<Row>(commit, { editConflictPolicy: "ask" })]);
  const input = await begin(view.host);
  await write(input, "Mine");
  view.data.value = [{ ...original, name: "Theirs" }];
  await flush();
  const conflict = element(part("edit-cell-conflict"), view.host);
  expect(conflict.getAttribute("role")).toBe("alert");
  expect(input.getAttribute("aria-describedby")).toBe(conflict.id);
  const take = element<HTMLButtonElement>(
    part("edit-cell-take-theirs"),
    view.host
  );
  expect(take.classList.contains("consumer-conflict")).toBe(true);
  take.dispatchEvent(
    new MouseEvent("mousedown", { bubbles: true, cancelable: true })
  );
  take.click();
  await flush();
  expect(commit).not.toHaveBeenCalled();
  expect(
    element<HTMLInputElement>(part("edit-cell-editor"), view.host).value
  ).toBe("Theirs");
});
it("exposes a failed save and routes rollback once without mutating the host row", async () => {
  const rollback = vi.fn();
  const error = vi.fn();
  const commit = vi.fn(() => Promise.reject(new Error("Offline")));
  const view = mount([
    editing<Row>(commit, {
      onEditError: error,
      formatEditError: () => "Offline",
      onEditRollback: rollback,
    }),
  ]);
  const input = await begin(view.host);
  await write(input, "Draft");
  await key(input, "Enter");
  const failure = element(part("edit-cell-save-error"), view.host);
  expect(failure.textContent).toContain("Offline");
  const button = element<HTMLButtonElement>(
    part("edit-cell-rollback"),
    view.host
  );
  expect(button.classList.contains("consumer-rollback")).toBe(true);
  button.click();
  await flush();
  expect(error).toHaveBeenCalledTimes(1);
  expect(rollback).toHaveBeenCalledTimes(1);
  expect(view.data.value[0]).toBe(original);
  expect(view.host.querySelector(part("edit-cell-save-error"))).toBeNull();
});
it("commits a multiple choice draft only when focus leaves its native Listbox", async () => {
  const commit = vi.fn();
  const view = mount([editing<Row>(commit)], {
    key: "tags",
    editable: true,
    editor: { type: "multi-select", options: ["a", "b"] },
  });
  await begin(view.host);
  const list = element(part("edit-cell-editor"), view.host);
  const options = [...list.querySelectorAll<HTMLElement>('[role="option"]')];
  for (const option of options) option.scrollIntoView = vi.fn();
  const first = options[0];
  const second = options[1];
  if (!first || !second) throw new Error("Missing tag options");
  first.focus();
  await flush();
  second.focus();
  second.click();
  await flush();
  expect(commit).not.toHaveBeenCalled();
  element<HTMLButtonElement>("#recovery-outside", view.host).focus();
  await flush();
  expect(commit).toHaveBeenCalledExactlyOnceWith(original, "tags", ["a", "b"]);
});

it("commits a single-choice draft when its closed popup trigger loses focus", async () => {
  const commit = vi.fn();
  const view = mount([editing<Row>(commit)], {
    key: "name",
    editable: true,
    editor: { type: "select", options: ["Ada", "Grace"] },
  });
  await begin(view.host);
  const trigger = element<HTMLButtonElement>(
    part("edit-cell-editor"),
    view.host
  );
  await key(trigger, "ArrowDown");
  const grace = [
    ...document.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((option) => option.textContent === "Grace");
  if (!grace) throw new Error("Missing Grace");
  grace.focus();
  await key(grace, "Enter");
  expect(commit).not.toHaveBeenCalled();
  element<HTMLButtonElement>("#recovery-outside", view.host).focus();
  await flush();
  expect(commit).toHaveBeenCalledExactlyOnceWith(original, "name", "Grace");
});
