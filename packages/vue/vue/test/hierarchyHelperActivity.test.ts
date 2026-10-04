import { describe, expect, it, vi } from "vitest";
import { effectScope, shallowRef } from "vue";

import {
  grouping,
  rowDetail,
  tree,
  useGroupCollapse,
  useRowExpansion,
  useTreeExpansion,
} from "../src/features";
import { useDataTableShell } from "../src/useDataTableShell";

describe("hierarchy helper activity", () => {
  it("keeps helper enabled inputs reactive and independent", () => {
    const scope = effectScope();
    const groupEnabled = shallowRef(false);
    const treeEnabled = shallowRef(true);
    const detailEnabled = shallowRef(false);
    const groupChange = vi.fn();
    const treeChange = vi.fn();
    const detailChange = vi.fn();
    const states = scope.run(() => ({
      group: useGroupCollapse({
        enabled: groupEnabled,
        onCollapsedGroupIdsChange: groupChange,
      }),
      tree: useTreeExpansion({
        enabled: () => treeEnabled.value,
        onExpandedIdsChange: treeChange,
      }),
      detail: useRowExpansion(() => ({
        enabled: detailEnabled.value,
        onExpandedRowIdsChange: detailChange,
      })),
    }))!;
    const toggle = () => {
      states.group.value.toggle("group");
      states.tree.value.toggle("tree");
      states.detail.value.toggle("detail");
    };
    toggle();
    expect(groupChange).not.toHaveBeenCalled();
    expect(detailChange).not.toHaveBeenCalled();
    expect(treeChange).toHaveBeenCalledExactlyOnceWith(["tree"]);
    expect(states.group.value.collapsedGroupIds.size).toBe(0);
    expect(states.detail.value.expandedIds.size).toBe(0);
    groupEnabled.value = true;
    treeEnabled.value = false;
    detailEnabled.value = true;
    toggle();
    expect(groupChange).toHaveBeenCalledExactlyOnceWith(["group"]);
    expect(detailChange).toHaveBeenCalledExactlyOnceWith(["detail"]);
    expect(treeChange).toHaveBeenCalledOnce();
    expect(states.tree.value.isExpanded("tree")).toBe(true);
    scope.stop();
    toggle();
    expect(groupChange).toHaveBeenCalledOnce();
    expect(detailChange).toHaveBeenCalledOnce();
    expect(treeChange).toHaveBeenCalledOnce();
  });

  it("preserves independent controlled callbacks in composed hierarchy features", () => {
    interface Row {
      id: string;
      team: string;
      parent?: string;
    }
    const scope = effectScope();
    const groupChange = vi.fn();
    const treeChange = vi.fn();
    const detailChange = vi.fn();
    const groupIds = shallowRef<readonly string[]>([]);
    const treeIds = shallowRef<readonly string[]>([]);
    const detailIds = shallowRef<readonly string[]>([]);
    const shell = scope.run(() =>
      useDataTableShell<Row>({
        data: [
          { id: "parent", team: "A" },
          { id: "child", team: "A", parent: "parent" },
        ],
        columns: [{ key: "team" }],
        rowKey: (row) => row.id,
        urlSync: false,
        features: [
          grouping("team", {
            collapsedGroupIds: groupIds,
            onCollapsedGroupIdsChange: groupChange,
          }),
          tree<Row>({
            getParentId: (row) => row.parent,
            expandedIds: treeIds,
            onExpandedIdsChange: treeChange,
          }),
          rowDetail<Row>((row) => row.id, [], {
            expandedRowIds: detailIds,
            onExpandedRowIdsChange: detailChange,
          }),
        ],
      })
    )!;
    const group = shell.grouping.value!;
    const groupId = group.entries[0]!.key;
    group.collapsed.toggle(groupId);
    shell.tree.value!.expansion.toggle("parent");
    shell.detail.value!.expansion.toggle("parent");
    expect(groupChange).toHaveBeenCalledExactlyOnceWith([groupId]);
    expect(treeChange).toHaveBeenCalledExactlyOnceWith(["parent"]);
    expect(detailChange).toHaveBeenCalledExactlyOnceWith(["parent"]);
    expect(group.collapsed.collapsedGroupIds.size).toBe(0);
    expect(shell.tree.value!.expansion.expandedIds.size).toBe(0);
    expect(shell.detail.value!.expansion.expandedIds.size).toBe(0);
    groupIds.value = [groupId];
    treeIds.value = ["parent"];
    detailIds.value = ["parent"];
    expect(shell.grouping.value!.collapsed.isCollapsed(groupId)).toBe(true);
    expect(shell.tree.value!.expansion.isExpanded("parent")).toBe(true);
    expect(shell.detail.value!.expansion.isExpanded("parent")).toBe(true);
    scope.stop();
  });
});
