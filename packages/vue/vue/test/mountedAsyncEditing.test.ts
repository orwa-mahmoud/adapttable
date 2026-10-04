import type {
  BatchEditStoreOptions,
  EditCommitSnapshot,
  RowEditStoreOptions,
  RowValidator,
} from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";
import {
  computed,
  type ComputedRef,
  createApp,
  createSSRApp,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
} from "vue";
import { renderToString } from "vue/server-renderer";

import { useBatchEditing, useRowEditing } from "../src/editing/editingModels";
interface Row {
  id: string;
  name: string;
  amount: number;
}
const original: Row = { id: "1", name: "Ada", amount: 1 };
const columns = [
  { key: "name", editable: true },
  { key: "amount", editable: true, editor: "number" },
] as const;
const tick = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await nextTick();
  await nextTick();
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
interface Config {
  readonly onCommit?: (
    row: Row,
    patch: Readonly<Record<string, unknown>>
  ) => unknown;
  readonly onBatchCommit?: NonNullable<
    BatchEditStoreOptions<Row>["onBatchEdit"]
  >;
  readonly validateRow?: RowValidator<Row>;
  readonly onEditError?: NonNullable<RowEditStoreOptions<Row>["onEditError"]>;
  readonly onValidationFail?: NonNullable<
    RowEditStoreOptions<Row>["onValidationFail"]
  >;
  readonly formatEditError?: (error: unknown) => string;
}
interface Surface {
  readonly open: boolean;
  readonly draft: string;
  readonly commit?: EditCommitSnapshot;
  readonly begin: () => void;
  readonly setDraft: (value: string) => void;
  readonly save: () => void;
  readonly cancel: () => void;
}
function component(
  kind: "row" | "batch",
  config: ComputedRef<Config>,
  data: ComputedRef<Row>,
  publish: (surface: ComputedRef<Surface>) => void
) {
  return defineComponent({
    name: "EditFixture",
    setup() {
      let surface: ComputedRef<Surface>;
      if (kind === "row") {
        const state = useRowEditing<Row>(() => ({
          enabled: true,
          columns,
          ...config.value,
          onRowEdit: config.value.onCommit,
        }));
        surface = computed(() => ({
          open: state.value.activeRowId !== null,
          draft: state.value.draftFor("name"),
          commit: state.value.commit,
          begin: () => state.value.begin(data.value, data.value.id),
          setDraft: (text) => state.value.setDraft("name", text),
          save: state.value.save,
          cancel: state.value.cancel,
        }));
      } else {
        const onBatchEdit: NonNullable<
          BatchEditStoreOptions<Row>["onBatchEdit"]
        > = (edits) => {
          const edit = edits[0];
          return edit && config.value.onCommit?.(edit.row, edit.patch);
        };
        const state = useBatchEditing<Row>(() => ({
          enabled: true,
          columns,
          ...config.value,
          onBatchEdit: config.value.onBatchCommit ?? onBatchEdit,
        }));
        surface = computed(() => ({
          open: state.value.pending,
          draft: state.value.draftFor(data.value, data.value.id, "name"),
          commit: state.value.commit,
          begin: () =>
            state.value.setDraft(
              data.value,
              data.value.id,
              "name",
              data.value.name
            ),
          setDraft: (text) =>
            state.value.setDraft(data.value, data.value.id, "name", text),
          save: state.value.saveAll,
          cancel: state.value.cancelAll,
        }));
      }
      publish(surface);
      return () =>
        h("section", [
          h("output", { "data-part": "host" }, data.value.name),
          h(
            "output",
            { "data-part": "status" },
            surface.value.commit?.phase ?? "idle"
          ),
          h(
            "output",
            { "data-part": "error" },
            surface.value.commit?.error ?? ""
          ),
          h(
            "button",
            { "data-part": "begin", onClick: surface.value.begin },
            "Edit"
          ),
          h("input", {
            value: surface.value.draft,
            onInput: (event: Event) =>
              surface.value.setDraft((event.target as HTMLInputElement).value),
          }),
          h(
            "button",
            { "data-part": "save", onClick: surface.value.save },
            "Save"
          ),
          h(
            "button",
            { "data-part": "cancel", onClick: surface.value.cancel },
            "Cancel"
          ),
        ]);
    },
  });
}
function mount(kind: "row" | "batch", options: Config = {}, keepAlive = false) {
  const config = shallowRef(options);
  const rows = shallowRef([original]);
  const visible = shallowRef(true);
  let surface: ComputedRef<Surface> | undefined;
  const Editor = component(
    kind,
    computed(() => config.value),
    computed(() => rows.value[0]!),
    (state) => {
      surface = state;
    }
  );
  const target = document.createElement("div");
  document.body.append(target);
  const Root = defineComponent({
    setup: () => () => {
      const renderEditor = () => (visible.value ? h(Editor) : null);
      if (keepAlive) return h(KeepAlive, null, { default: renderEditor });
      return renderEditor();
    },
  });
  const app = createApp(Root);
  app.mount(target);
  if (!surface) throw new Error("No editing surface");
  return {
    target,
    config,
    rows,
    visible,
    surface,
    click: (part: string) =>
      target.querySelector<HTMLButtonElement>(`[data-part="${part}"]`)!.click(),
    type: (text: string) => {
      const input = target.querySelector("input")!;
      input.value = text;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    },
    text: (part: string) =>
      target.querySelector(`[data-part="${part}"]`)?.textContent,
    stop: () => {
      app.unmount();
      target.remove();
    },
  };
}
for (const kind of ["row", "batch"] as const)
  describe(`mounted Vue ${kind} editing`, () => {
    it("keeps pending drafts until host acceptance and shows host-normalized rows", async () => {
      const request = deferred<void>();
      const host = vi.fn(() => request.promise);
      const view = mount(kind, { onCommit: host });
      await tick();
      view.click("begin");
      view.type("new");
      view.click("save");
      await tick();
      expect(view.text("status")).toBe("saving");
      expect(view.surface.value.draft).toBe("new");
      expect(view.rows.value[0]).toBe(original);
      view.rows.value = [{ ...original, name: "Normalized" }];
      request.resolve();
      await tick();
      expect(view.text("host")).toBe("Normalized");
      expect(view.text("status")).toBe("idle");
      expect(view.surface.value.open).toBe(false);
      expect(host).toHaveBeenCalledWith(original, { name: "new" });
      view.stop();
    });
    it("preserves rejected drafts and reports the configured error without mutating controlled data", async () => {
      const request = deferred<void>();
      const error = vi.fn();
      const view = mount(kind, {
        onCommit: () => request.promise,
        onEditError: error,
        formatEditError: () => "Save failed",
      });
      await tick();
      view.click("begin");
      view.type("new");
      view.click("save");
      request.reject(new Error("offline"));
      await tick();
      expect(view.text("status")).toBe("failed");
      expect(view.text("error")).toBe("Save failed");
      expect(view.surface.value.draft).toBe("new");
      expect(view.rows.value[0]).toBe(original);
      expect(error).toHaveBeenCalledOnce();
      view.click("cancel");
      await tick();
      expect(view.surface.value.open).toBe(false);
      view.stop();
    });
    it("awaits validation and preserves invalid fields for correction", async () => {
      const verdict = deferred<string | undefined>();
      const host = vi.fn();
      const invalid = vi.fn();
      const view = mount(kind, {
        onCommit: host,
        validateRow: () => verdict.promise,
        onValidationFail: invalid,
      });
      await tick();
      view.click("begin");
      view.type("bad");
      view.click("save");
      await tick();
      expect(view.text("status")).toBe("validating");
      verdict.resolve("Choose another name");
      await tick();
      expect(view.text("status")).toBe("invalid");
      expect(view.text("error")).toBe("Choose another name");
      expect(view.surface.value.draft).toBe("bad");
      expect(host).not.toHaveBeenCalled();
      expect(invalid).toHaveBeenCalled();
      view.stop();
    });
    it("revokes pre-admission validation and preserves drafts across KeepAlive deactivation", async () => {
      const verdict = deferred<string | undefined>();
      const host = vi.fn();
      const view = mount(
        kind,
        { onCommit: host, validateRow: () => verdict.promise },
        true
      );
      await tick();
      view.click("begin");
      view.type("pending");
      view.click("save");
      await tick();
      view.visible.value = false;
      await tick();
      verdict.resolve(undefined);
      await tick();
      expect(host).not.toHaveBeenCalled();
      view.visible.value = true;
      await tick();
      expect(view.target.querySelector("input")?.value).toBe("pending");
      expect(view.text("status")).toBe("idle");
      view.stop();
    });
    it("does not treat deactivation as cancellation of host work already sent", async () => {
      const request = deferred<void>();
      const host = vi.fn(() => request.promise);
      const view = mount(kind, { onCommit: host }, true);
      await tick();
      view.click("begin");
      view.type("pending");
      view.click("save");
      view.visible.value = false;
      await tick();
      expect(host).toHaveBeenCalledOnce();
      request.resolve();
      await tick();
      view.visible.value = true;
      await tick();
      expect(view.surface.value.draft).toBe("pending");
      expect(view.surface.value.open).toBe(true);
      expect(view.rows.value[0]).toBe(original);
      view.stop();
    });
    it("blocks stale validation after unmount and retained actions after disposal", async () => {
      const verdict = deferred<string | undefined>();
      const host = vi.fn();
      const view = mount(kind, {
        onCommit: host,
        validateRow: () => verdict.promise,
      });
      await tick();
      view.click("begin");
      view.type("pending");
      view.click("save");
      const retained = view.surface.value;
      view.stop();
      verdict.resolve(undefined);
      await tick();
      retained.begin();
      retained.setDraft("stale");
      retained.save();
      expect(host).not.toHaveBeenCalled();
    });
    it("accepts a synchronous host rejection of a proposed data update without self-writing", async () => {
      const host = vi.fn(() => undefined);
      const view = mount(kind, { onCommit: host });
      await tick();
      view.click("begin");
      view.type("proposed");
      view.click("save");
      await tick();
      expect(host).toHaveBeenCalledWith(original, { name: "proposed" });
      expect(view.text("host")).toBe("Ada");
      expect(view.rows.value[0]).toBe(original);
      expect(view.surface.value.open).toBe(false);
      view.stop();
    });
    it("revokes an old callback continuation without dropping the draft after reconfiguration", async () => {
      const request = deferred<void>();
      const first = vi.fn(() => request.promise);
      const second = vi.fn();
      const view = mount(
        kind,
        kind === "row" ? { onCommit: first } : { onBatchCommit: first }
      );
      await tick();
      view.click("begin");
      view.type("pending");
      view.click("save");
      await tick();
      view.config.value =
        kind === "row" ? { onCommit: second } : { onBatchCommit: second };
      await tick();
      request.resolve();
      await tick();
      expect(view.surface.value.draft).toBe("pending");
      expect(view.text("status")).toBe("idle");
      view.click("save");
      await tick();
      expect(first).toHaveBeenCalledOnce();
      expect(second).toHaveBeenCalledOnce();
      expect(view.surface.value.open).toBe(false);
      view.stop();
    });
    it("renders deterministic SSR state without host callbacks", async () => {
      const host = vi.fn();
      const Component = component(
        kind,
        computed(() => ({ onCommit: host })),
        computed(() => original),
        (state) => {
          state.value.begin();
          state.value.setDraft("server");
          state.value.save();
        }
      );
      const first = await renderToString(createSSRApp(Component));
      const second = await renderToString(createSSRApp(Component));
      expect(first).toBe(second);
      expect(host).not.toHaveBeenCalled();
    });
  });
