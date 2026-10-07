import type { DataTableProps } from "@adapttable/vue/adapter";
import { describe, expect, it, vi } from "vitest";
import { h, KeepAlive, nextTick, ref, shallowRef } from "vue";

import { type BulkAction, bulkActions } from "../src/bulk-actions";
import DataTable from "../src/DataTable.vue";
import { print } from "../src/print";
import { mount, node } from "./mount";
interface Row {
  id: string;
  name: string;
}
const data: Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Grace" },
];
const part = (name: string) => `[data-adapttable-part="${name}"]`;
async function tick() {
  await nextTick();
  await Promise.resolve();
  await nextTick();
}
function options(
  extra: Partial<DataTableProps<Row>> = {}
): DataTableProps<Row> {
  return {
    data,
    columns: [{ key: "name" }],
    rowKey: (row) => row.id,
    searchable: false,
    urlSync: false,
    forceMobile: false,
    selectable: true,
    defaultSelectedIds: ["a"],
    ...extra,
  };
}
for (const mobile of [false, true])
  describe(`Element bulk action and print controls mobile=${mobile}`, () => {
    it("uses one native kit action, disables it while pending, and clears accepted selection", async () => {
      let finish: (() => void) | undefined;
      const run = vi.fn<BulkAction["onClick"]>(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          })
      );
      const changed = vi.fn();
      const view = mount(() =>
        h(DataTable<Row>, {
          ...options({
            forceMobile: mobile,
            features: [
              bulkActions([
                { key: "archive", label: "Archive", icon: "★", onClick: run },
              ]),
            ],
          }),
          "onUpdate:selectedIds": changed,
        })
      );
      await tick();
      const button = node<HTMLButtonElement>(view.root, part("bulk-button"));
      expect(button.classList.contains("el-button")).toBe(true);
      expect(button.type).toBe("button");
      expect(node(button, '[aria-hidden="true"]').textContent).toBe("★");
      button.click();
      await tick();
      expect(run).toHaveBeenCalledTimes(1);
      expect(run.mock.calls[0]?.[0]).toEqual(["a"]);
      expect(run.mock.calls[0]?.[1]).toMatchObject({ allMatching: false });
      expect(button.disabled).toBe(true);
      button.click();
      await tick();
      expect(run).toHaveBeenCalledTimes(1);
      if (!finish) throw new Error("Missing action completion");
      finish();
      await tick();
      expect(changed).toHaveBeenCalledExactlyOnceWith([]);
      expect(view.root.querySelector(part("bulk-bar"))).toBeNull();
    });
    it("keeps controlled selection until the host accepts the clear request", async () => {
      const selected = ref(["a"]);
      const changed = vi.fn();
      const run = vi.fn();
      const view = mount(() =>
        h(DataTable<Row>, {
          ...options({
            forceMobile: mobile,
            selectedIds: selected.value,
            features: [
              bulkActions([{ key: "archive", label: "Archive", onClick: run }]),
            ],
          }),
          "onUpdate:selectedIds": changed,
        })
      );
      await tick();
      const button = node<HTMLButtonElement>(view.root, part("bulk-button"));
      button.click();
      await tick();
      expect(run).toHaveBeenCalledTimes(1);
      expect(changed).toHaveBeenCalledExactlyOnceWith([]);
      expect(node(view.root, part("bulk-button"))).toBe(button);
      selected.value = [];
      await tick();
      expect(view.root.querySelector(part("bulk-bar"))).toBeNull();
    });
    it("surfaces disabled reasons and retryable errors with real kit controls", async () => {
      const locked = vi.fn();
      const failed = vi
        .fn<BulkAction["onClick"]>()
        .mockRejectedValueOnce(new Error("Archive failed"))
        .mockResolvedValueOnce(undefined);
      const view = mount(() =>
        h(
          DataTable<Row>,
          options({
            forceMobile: mobile,
            features: [
              bulkActions([
                {
                  key: "locked",
                  label: "Locked",
                  disabledReason: () => "No access",
                  onClick: locked,
                },
                { key: "archive", label: "Archive", onClick: failed },
              ]),
            ],
            classNames: { bulkButton: "host-action" },
          })
        )
      );
      await tick();
      const buttons = [
        ...view.root.querySelectorAll<HTMLButtonElement>(part("bulk-button")),
      ];
      const [lock, action] = buttons;
      if (!lock || !action) throw new Error("Missing action buttons");
      expect(lock.disabled).toBe(true);
      expect(lock.title).toBe("No access");
      expect(lock.classList.contains("host-action")).toBe(true);
      lock.click();
      expect(locked).not.toHaveBeenCalled();
      action.click();
      await tick();
      expect(node(view.root, part("bulk-error")).textContent).toContain(
        "Archive failed"
      );
      expect(action.disabled).toBe(false);
      action.click();
      await tick();
      expect(failed).toHaveBeenCalledTimes(2);
      expect(view.root.querySelector(part("bulk-bar"))).toBeNull();
    });
    it("uses the table confirmation contract before invoking the selected action", async () => {
      type Confirm = Parameters<NonNullable<DataTableProps<Row>["confirm"]>>[0];
      const request = shallowRef<Confirm>();
      const run = vi.fn();
      const view = mount(() =>
        h(
          DataTable<Row>,
          options({
            forceMobile: mobile,
            confirm: (value) => {
              request.value = value;
            },
            features: [
              bulkActions([
                {
                  key: "archive",
                  label: "Archive",
                  onClick: run,
                  confirm: {
                    title: "Archive rows",
                    message: (count) => `Archive ${count}`,
                    confirmLabel: "Archive",
                  },
                },
              ]),
            ],
          })
        )
      );
      await tick();
      node<HTMLButtonElement>(view.root, part("bulk-button")).click();
      await tick();
      expect(run).not.toHaveBeenCalled();
      expect(request.value?.title).toBe("Archive rows");
      expect(request.value?.message).toBe("Archive 1");
      request.value?.onConfirm();
      await tick();
      expect(run).toHaveBeenCalledTimes(1);
    });
    it("retains the same print button through updates and retires it with a cached table", async () => {
      const active = ref(true);
      const printed = vi.fn();
      const title = ref("Team");
      const features = [print(printed, true)];
      const view = mount(() =>
        h(KeepAlive, null, {
          default: () =>
            active.value
              ? h(
                  DataTable<Row>,
                  options({
                    forceMobile: mobile,
                    tableLabel: title.value,
                    features,
                  })
                )
              : h("span"),
        })
      );
      await tick();
      const button = node<HTMLButtonElement>(view.root, part("print-button"));
      expect(button.classList.contains("el-button")).toBe(true);
      button.click();
      expect(printed).toHaveBeenCalledTimes(1);
      title.value = "People";
      await tick();
      expect(node(view.root, part("print-button"))).toBe(button);
      active.value = false;
      await tick();
      button.click();
      expect(printed).toHaveBeenCalledTimes(1);
      active.value = true;
      await tick();
      expect(node(view.root, part("print-button"))).toBe(button);
      button.click();
      expect(printed).toHaveBeenCalledTimes(2);
      view.unmount();
      button.click();
      expect(printed).toHaveBeenCalledTimes(2);
    });
    it("passes the matching-row scope from the real native selection banner", async () => {
      const rows: Row[] = Array.from({ length: 20 }, (_, index) => ({
        id: `row-${index}`,
        name: `Person ${index}`,
      }));
      const run = vi.fn<BulkAction["onClick"]>();
      const view = mount(() =>
        h(
          DataTable<Row>,
          options({
            data: rows,
            forceMobile: mobile,
            defaults: { limit: 2 },
            defaultSelectedIds: ["row-0", "row-1"],
            features: [
              bulkActions([{ key: "archive", label: "Archive", onClick: run }]),
            ],
          })
        )
      );
      await tick();
      const expand = node<HTMLButtonElement>(
        view.root,
        part("select-all-button")
      );
      expect(expand.classList.contains("el-button")).toBe(true);
      expand.click();
      await tick();
      node<HTMLButtonElement>(view.root, part("bulk-button")).click();
      await tick();
      expect(run).toHaveBeenCalledTimes(1);
      expect(run.mock.calls[0]?.[0]).toEqual(["row-0", "row-1"]);
      expect(run.mock.calls[0]?.[1]).toMatchObject({
        allMatching: true,
        total: 20,
      });
      expect(view.root.querySelector(part("bulk-bar"))).toBeNull();
    });
    it("does not add a print button unless explicitly requested", async () => {
      const printed = vi.fn();
      const view = mount(() =>
        h(
          DataTable<Row>,
          options({ forceMobile: mobile, features: [print(printed)] })
        )
      );
      await tick();
      expect(view.root.querySelector(part("print-button"))).toBeNull();
      expect(printed).not.toHaveBeenCalled();
    });
  });
