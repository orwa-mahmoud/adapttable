import {
  type ColumnLayoutState,
  useColumnLayoutStorageState,
  type UseColumnLayoutStorageStateOptions,
  type UseColumnLayoutStorageStateResult,
  useColumnLayoutUrlState,
  type UseColumnLayoutUrlStateOptions,
  type UseColumnLayoutUrlStateResult,
  useSavedViews,
} from "@adapttable/vue";
import type {
  UseColumnLayoutStorageStateResult as AdapterStorageResult,
  UseColumnLayoutUrlStateResult as AdapterUrlResult,
} from "@adapttable/vue/adapter";
import { computed, effectScope, shallowRef } from "vue";

const scope = effectScope();
scope.run(() => {
  const urlKey = shallowRef<string | undefined>("people");
  const urlOptions: UseColumnLayoutUrlStateOptions = {
    urlKey,
    urlSync: computed(() => false),
    defaultColumnLayout: () => ({ hidden: ["email"] }),
  };
  const url: UseColumnLayoutUrlStateResult = useColumnLayoutUrlState(
    () => urlOptions
  );
  const adapterUrl: AdapterUrlResult = url;
  const storageOptions: UseColumnLayoutStorageStateOptions = {
    storageKey: computed(() => "people-columns"),
    defaultColumnLayout: shallowRef<Partial<ColumnLayoutState> | undefined>(),
  };
  const local: UseColumnLayoutStorageStateResult =
    useColumnLayoutStorageState(storageOptions);
  const adapterStorage: AdapterStorageResult = local;
  useSavedViews({
    storageKey: "people-views",
    storage: null,
    flushViewState: adapterUrl.flush,
  });
  const accepted: ColumnLayoutState = adapterStorage.layout.value;
  url.onLayoutChange(accepted);
});
scope.stop();
