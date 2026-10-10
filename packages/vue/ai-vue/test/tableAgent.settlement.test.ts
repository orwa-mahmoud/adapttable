import type { AgentCapabilityDefinition } from "@adapttable/ai";
import type { ColumnLayoutState } from "@adapttable/vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";

import ControlledTable from "./tableAgent.settlement.fixture.vue";
const stops: (() => void)[] = [];
afterEach(() => stops.splice(0).forEach((stop) => stop()));
async function mount(
  mode: "accept" | "reject" | "normalize" | "delay" = "accept",
  capabilities?: readonly AgentCapabilityDefinition[]
) {
  const ids = shallowRef<readonly string[]>([]);
  const layout = shallowRef<ColumnLayoutState>({
    hidden: [],
    order: [],
    pinned: {},
    widths: {},
    names: {},
  });
  const child = shallowRef<InstanceType<typeof ControlledTable>>();
  let deliver: (() => void) | undefined;
  const selection = vi.fn((next: string[]) => {
    if (mode === "accept") ids.value = next;
    if (mode === "normalize") ids.value = ["2"];
    if (mode === "delay")
      deliver = () => {
        ids.value = next;
      };
  });
  const columns = vi.fn((next: ColumnLayoutState) => {
    if (mode === "accept") layout.value = next;
    if (mode === "normalize") layout.value = { ...next, hidden: [] };
    if (mode === "delay")
      deliver = () => {
        layout.value = next;
      };
  });
  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(ControlledTable, {
          ref: child,
          options: { tableId: "people", approval: "never", capabilities },
          selectedIds: ids.value,
          onSelectionChange: selection,
          columnLayout: layout.value,
          onColumnLayoutChange: columns,
        }),
    })
  );
  app.mount(document.createElement("div"));
  stops.push(() => app.unmount());
  await nextTick();
  await nextTick();
  const live = child.value;
  const session = live?.session();
  if (!live || !session) throw new Error("Expected mounted agent");
  return {
    live,
    session,
    ids,
    layout,
    selection,
    columns,
    deliver: () => deliver?.(),
  };
}
describe("actual Vue controlled settlement", () => {
  it.each(["selection", "hide"] as const)(
    "captures accepted %s before returning",
    async (op) => {
      const test = await mount();
      const before = test.session.manifest().viewRevision;
      const result = await test.session.execute(
        op === "hide" ? "view.hideColumn" : "view.setSelection",
        op === "hide" ? { key: "name", hidden: true } : { ids: ["1"] },
        before,
        "one"
      );
      expect(result).toMatchObject({
        ok: true,
        revision: before + 1,
        result: { revision: before + 1 },
      });
      expect(result.revision).toBe(test.session.manifest().viewRevision);
      if (op === "hide") expect(test.layout.value.hidden).toEqual(["name"]);
      else expect(test.ids.value).toEqual(["1"]);
      const noOp = await test.session.execute(
        op === "hide" ? "view.hideColumn" : "view.setSelection",
        op === "hide" ? { key: "name", hidden: true } : { ids: ["1"] },
        result.revision,
        "two"
      );
      expect(noOp).toMatchObject({
        ok: true,
        revision: result.revision,
        result: { revision: result.revision },
      });
    }
  );
  it.each(["reject", "normalize", "delay"] as const)(
    "refuses %s and never returns an executed receipt",
    async (mode) => {
      const test = await mount(mode);
      const before = test.session.manifest().viewRevision;
      const result = await test.session.execute(
        "view.setSelection",
        { ids: ["1"] },
        before,
        "one"
      );
      expect(result).toMatchObject({
        ok: false,
        revision: before,
        error: { code: "apply-not-confirmed" },
      });
      const retry = await test.session.execute(
        "view.setSelection",
        { ids: ["1"] },
        test.session.manifest().viewRevision,
        "one"
      );
      expect(retry).toEqual(result);
      expect(test.selection).toHaveBeenCalledTimes(1);
      test.deliver();
      await nextTick();
      await nextTick();
      expect(result.ok).toBe(false);
    }
  );
});

function capability(
  execute: AgentCapabilityDefinition["execute"]
): AgentCapabilityDefinition {
  return {
    key: "test.controlled",
    summary: "Test controlled requests",
    guide: {
      guide: "Test",
      input: { type: "object" },
      output: { type: "object" },
    },
    isEnabled: () => true,
    execute,
  };
}
describe("controlled custom handlers and command chains", () => {
  it("drains ignored void-compatible returns in call order and keeps custom payloads untouched", async () => {
    const custom = capability(({ apply }) => {
      apply.hideColumn?.("name", true);
      apply.hideColumn?.("team", true);
      return { revision: 999, custom: true };
    });
    const test = await mount("accept", [custom]);
    const before = test.session.manifest().viewRevision;
    const result = await test.session.execute(custom.key, {}, before, "custom");
    expect(result).toMatchObject({
      ok: true,
      revision: before + 2,
      result: { revision: 999, custom: true },
    });
    expect(test.layout.value.hidden).toEqual(["name", "team"]);
    expect(test.columns).toHaveBeenCalledTimes(2);
    const next = await test.session.execute(
      "view.setSelection",
      { ids: ["1"] },
      result.revision,
      "next"
    );
    expect(next).toMatchObject({ ok: true, revision: before + 3 });
  });
  it("poisons later ignored requests after an unconfirmed request", async () => {
    const custom = capability(({ apply }) => {
      apply.hideColumn?.("name", true);
      apply.hideColumn?.("team", true);
      return {};
    });
    const test = await mount("reject", [custom]);
    const result = await test.session.execute(
      custom.key,
      {},
      test.session.manifest().viewRevision,
      "custom"
    );
    expect(result).toMatchObject({
      ok: false,
      error: { code: "apply-not-confirmed" },
    });
    expect(test.columns).toHaveBeenCalledTimes(1);
  });
  it("offers a read-after-apply fence without changing setter types", async () => {
    const custom = capability(async ({ apply, whenApplied, observe }) => {
      apply.hideColumn?.("name", true);
      await whenApplied?.();
      return { hidden: observe().hiddenColumns };
    });
    const test = await mount("accept", [custom]);
    const result = await test.session.execute(
      custom.key,
      {},
      test.session.manifest().viewRevision,
      "custom"
    );
    expect(result).toMatchObject({ ok: true, result: { hidden: ["name"] } });
  });
  it("narrows all-matching even when the explicit IDs are identical", async () => {
    const test = await mount();
    test.live.shell.selection.value?.selectAllMatching();
    await nextTick();
    await nextTick();
    const before = test.session.manifest().viewRevision;
    const ids = [
      ...(test.live.shell.runtime.view()?.selection?.selectedIds ?? []),
    ];
    const result = await test.session.execute(
      "view.setSelection",
      { ids },
      before,
      "narrow"
    );
    expect(result).toMatchObject({ ok: true, revision: before + 1 });
    expect(test.live.shell.runtime.view()?.selection?.allMatching).toBe(false);
  });
  it("validates full order changes and genuine order no-ops", async () => {
    const test = await mount();
    const before = test.session.manifest().viewRevision;
    const result = await test.session.execute(
      "view.setColumnOrder",
      { order: ["team", "id", "name"] },
      before,
      "order"
    );
    expect(result).toMatchObject({
      ok: true,
      revision: before + 1,
      result: { order: ["team", "id", "name"], revision: before + 1 },
    });
    const noop = await test.session.execute(
      "view.setColumnOrder",
      { key: "team", index: 0 },
      result.revision,
      "noop"
    );
    expect(noop).toMatchObject({
      ok: true,
      revision: result.revision,
      result: { revision: result.revision },
    });
  });
});

describe("live controlled cancellation", () => {
  it("does not claim host acceptance when cancelled inside the request callback", async () => {
    const test = await mount();
    const abort = new AbortController();
    test.selection.mockImplementationOnce((next) => {
      test.ids.value = next;
      abort.abort();
    });
    const revision = test.session.manifest().viewRevision;
    const result = await test.session.execute(
      "view.setSelection",
      { ids: ["1"] },
      revision,
      "cancelled",
      abort.signal
    );
    expect(result).toMatchObject({
      ok: false,
      revision,
      error: { code: "cancelled" },
    });
    await nextTick();
    expect(test.ids.value).toEqual(["1"]);
    const replay = await test.session.execute(
      "view.setSelection",
      { ids: ["1"] },
      test.session.manifest().viewRevision,
      "cancelled"
    );
    expect(replay).toEqual(result);
    expect(test.selection).toHaveBeenCalledTimes(1);
  });
  it("rejects another admitted caller before it can overwrite the first accepted model", async () => {
    const test = await mount();
    const revision = test.session.manifest().viewRevision;
    const first = test.session.execute(
      "view.setSelection",
      { ids: ["1"] },
      revision,
      "first"
    );
    const second = test.session.execute(
      "view.setSelection",
      { ids: ["2"] },
      revision,
      "second"
    );
    expect(await first).toMatchObject({ ok: true, revision: revision + 1 });
    expect(await second).toMatchObject({
      ok: false,
      error: { code: "revision-mismatch" },
    });
    expect(test.ids.value).toEqual(["1"]);
    expect(test.selection).toHaveBeenCalledTimes(1);
  });
});

describe("actual controlled column pin settlement", () => {
  it("captures accepted pin, unpin and both genuine no-ops in envelope and payload", async () => {
    const test = await mount();
    let revision = test.session.manifest().viewRevision;
    for (const [id, side, changed] of [
      ["pin", "start", true],
      ["pin-noop", "start", false],
      ["unpin", null, true],
      ["unpin-noop", null, false],
    ] as const) {
      const result = await test.session.execute(
        "view.pinColumn",
        { key: "name", side },
        revision,
        id
      );
      revision += Number(changed);
      expect(result).toMatchObject({
        ok: true,
        revision,
        result: { revision },
      });
      expect(test.session.manifest().viewRevision).toBe(revision);
      expect(test.layout.value.pinned).toEqual(side ? { name: side } : {});
    }
    expect(test.columns).toHaveBeenCalledTimes(4);
  });
  it.each(["reject", "normalize", "delay"] as const)(
    "refuses %s without an executed receipt",
    async (mode) => {
      const test = await mount(mode);
      if (mode === "normalize")
        test.columns.mockImplementation((next) => {
          test.layout.value = { ...next, pinned: { name: "end" } };
        });
      const revision = test.session.manifest().viewRevision;
      const result = await test.session.execute(
        "view.pinColumn",
        { key: "name", side: "start" },
        revision,
        "pin"
      );
      expect(result).toMatchObject({
        ok: false,
        revision,
        error: { code: "apply-not-confirmed" },
      });
      expect(result.result).toBeUndefined();
      test.deliver();
      await nextTick();
      await nextTick();
      const replay = await test.session.execute(
        "view.pinColumn",
        { key: "name", side: "start" },
        test.session.manifest().viewRevision,
        "pin"
      );
      expect(replay).toEqual(result);
      expect(test.columns).toHaveBeenCalledTimes(1);
    }
  );
});
