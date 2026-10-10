import { slotRender } from "@adapttable/core/binding";
import { afterEach, expect, it, vi } from "vitest";
import { effectScope, nextTick, shallowRef } from "vue";

import { grouping } from "../src/features/grouping";
import { extendFeature, type TableFeature } from "../src/features/tableFeature";
import { useFrontendData } from "../src/source/useFrontendData";
import {
  groupingPanel,
  groupingPanelControlKey,
} from "../src/specialized/groupingPanel";
import { useDataTableShell } from "../src/useDataTableShell";

interface Row {
  id: string;
  team: string;
  status: string;
}
const rows: readonly Row[] = [
  { id: "a", team: "Core", status: "Open" },
  { id: "b", team: "Ops", status: "Closed" },
];
const columns = [{ key: "team" }, { key: "status" }];
const scopes: ReturnType<typeof effectScope>[] = [];
afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop();
});
function panel(notify: (keys: readonly string[]) => void): TableFeature<Row> {
  return extendFeature(
    groupingPanel<Row>(undefined, { onGroupByChange: notify }),
    [slotRender(groupingPanelControlKey<Row>(), () => null)]
  );
}
function fixture(ordinary = false) {
  const scope = effectScope();
  scopes.push(scope);
  const accept = shallowRef(true);
  const notify = vi.fn<(keys: readonly string[]) => void>();
  const features = shallowRef<readonly TableFeature<Row>[]>([
    ordinary
      ? grouping<Row>(["team"], { onGroupByChange: notify })
      : panel(notify),
  ]);
  const source = scope.run(() =>
    useFrontendData<Row>({ data: rows, columns, urlSync: false })
  );
  if (!source) throw new Error("Missing source");
  let afterWrite: (() => void) | undefined;
  const write = vi.fn((key: string | undefined) => {
    if (accept.value) source.value.setGroupBy(key);
    afterWrite?.();
  });
  const shell = scope.run(() =>
    useDataTableShell<Row>(() => ({
      source: { ...source.value, setGroupBy: write },
      columns,
      rowKey: (row) => row.id,
      urlSync: false,
      features: features.value,
    }))
  );
  if (!shell) throw new Error("Missing shell");
  const state = () => {
    const value = shell.groupingPanel.value?.state;
    if (!value) throw new Error("Missing panel model");
    return value;
  };
  return {
    scope,
    accept,
    notify,
    features,
    source,
    write,
    shell,
    state,
    setAfterWrite: (run: () => void) => {
      afterWrite = run;
    },
  };
}

it("notifies once for accepted add, reorder and remove writes", () => {
  const f = fixture();
  f.state().add("team");
  expect(f.write).toHaveBeenCalledExactlyOnceWith("team");
  expect(f.notify).toHaveBeenCalledExactlyOnceWith(["team"]);
  expect(f.source.value.groupBy).toBe("team");
  f.state().add("status");
  f.write.mockClear();
  f.notify.mockClear();
  f.state().moveBy("team", 1);
  expect(f.write).toHaveBeenCalledExactlyOnceWith("status,team");
  expect(f.notify).toHaveBeenCalledExactlyOnceWith(["status", "team"]);
  f.write.mockClear();
  f.notify.mockClear();
  f.state().remove("status");
  expect(f.write).toHaveBeenCalledExactlyOnceWith("team");
  expect(f.notify).toHaveBeenCalledExactlyOnceWith(["team"]);
  expect(f.source.value.groupBy).toBe("team");
});

it("matches ordinary Vue grouping notification semantics when the source rejects a request", () => {
  const ordinary = fixture(true);
  ordinary.accept.value = false;
  ordinary.shell.grouping.value!.setGroupBy("status");
  expect(ordinary.write).toHaveBeenCalledExactlyOnceWith("status");
  expect(ordinary.notify).toHaveBeenCalledExactlyOnceWith(["status"]);
  expect(ordinary.shell.grouping.value!.groupBy).toEqual(["team"]);
  const f = fixture();
  f.accept.value = false;
  for (const attempt of [1, 2]) {
    f.state().add("team");
    expect(f.write).toHaveBeenCalledTimes(attempt);
    expect(f.state().groupBy).toEqual([]);
  }
  expect(f.write).toHaveBeenCalledTimes(2);
  expect(f.notify.mock.calls).toEqual([[["team"]], [["team"]]]);
  expect(f.state().groupBy).toEqual([]);
  expect(f.source.value.groupBy).toBeUndefined();
  f.accept.value = true;
  f.state().add("team");
  expect(f.write).toHaveBeenCalledTimes(3);
  expect(f.notify).toHaveBeenCalledTimes(3);
  expect(f.state().groupBy).toEqual(["team"]);
});

it("retires old feature callbacks and reads the current notification owner", async () => {
  const f = fixture();
  const old = f.state();
  const next = vi.fn<(keys: readonly string[]) => void>();
  f.features.value = [panel(next)];
  await nextTick();
  old.add("team");
  expect(f.write).not.toHaveBeenCalled();
  expect(f.notify).not.toHaveBeenCalled();
  expect(next).not.toHaveBeenCalled();
  f.state().add("team");
  expect(next).toHaveBeenCalledExactlyOnceWith(["team"]);
  expect(f.notify).not.toHaveBeenCalled();
  const retained = f.state();
  f.features.value = [];
  await nextTick();
  f.write.mockClear();
  next.mockClear();
  retained.add("status");
  expect(f.write).not.toHaveBeenCalled();
  expect(next).not.toHaveBeenCalled();
});

it("does not notify a disposed feature when a source setter synchronously tears down its scope", () => {
  const f = fixture();
  f.setAfterWrite(() => f.scope.stop());
  f.state().add("team");
  expect(f.write).toHaveBeenCalledExactlyOnceWith("team");
  expect(f.notify).not.toHaveBeenCalled();
});

it("does not write or notify retained panel actions after scope disposal", () => {
  const f = fixture();
  const retained = f.state();
  f.scope.stop();
  retained.add("team");
  retained.moveBy("team", 1);
  retained.remove("team");
  expect(f.write).not.toHaveBeenCalled();
  expect(f.notify).not.toHaveBeenCalled();
});
