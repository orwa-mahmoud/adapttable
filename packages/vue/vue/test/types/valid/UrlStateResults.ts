import type {
  UseGroupCollapseUrlStateResult as AdapterCollapseResult,
  UseGroupCollapseUrlStateResult,
} from "@adapttable/vue";

export function exchangeCollapseState(
  root: UseGroupCollapseUrlStateResult,
  adapter: AdapterCollapseResult
) {
  const rootFromAdapter: UseGroupCollapseUrlStateResult = adapter;
  const adapterFromRoot: AdapterCollapseResult = root;
  const ids: readonly string[] = adapter.collapsedGroupIds.value;
  root.onCollapsedGroupIdsChange([...ids]);
  return { rootFromAdapter, adapterFromRoot, ids };
}
