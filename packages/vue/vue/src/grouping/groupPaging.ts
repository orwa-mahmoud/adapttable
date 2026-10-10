import { createGroupPagingController } from "@adapttable/core";
import type { GroupPagingState } from "@adapttable/core/binding";
import {
  computed,
  type ComputedRef,
  type MaybeRefOrGetter,
  onScopeDispose,
  toValue,
} from "vue";

import { useExternalStore, useScopeActivity } from "../store";
export function useGroupPaging(
  enabled: MaybeRefOrGetter<boolean> = true
): ComputedRef<GroupPagingState> {
  const controller = createGroupPagingController();
  const snapshot = useExternalStore(controller);
  const active = useScopeActivity();
  let disposed = false;
  onScopeDispose(() => {
    disposed = true;
  });
  const live = () => !disposed && active.value && toValue(enabled);
  return computed(() => ({
    paging: snapshot.value,
    showMore: (size, key) => {
      if (live()) controller.showMore(size, key);
    },
    reset: () => {
      if (live()) controller.reset();
    },
  }));
}
