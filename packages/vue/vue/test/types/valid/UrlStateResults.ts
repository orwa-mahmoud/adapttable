import type { UseGroupCollapseUrlStateResult } from "@adapttable/vue";
import type { UseGroupCollapseUrlStateResult as AdapterCollapseResult } from "@adapttable/vue/adapter";

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
