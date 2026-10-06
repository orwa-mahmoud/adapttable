import { coreSavedViews } from "@adapttable/core/binding";
import { type MaybeRefOrGetter, onScopeDispose, toValue } from "vue";

import { useSavedViews, type UseSavedViewsOptions } from "../url/useSavedViews";
import {
  SAVED_VIEWS_CONTROL,
  SAVED_VIEWS_MODEL,
} from "../viewControls/contracts";
import type { FeatureMountContext, StaticTableFeature } from "@adapttable/vue";

function mountSavedViews<TRow>(context: FeatureMountContext<TRow>): void {
  let live = true;
  onScopeDispose(() => {
    live = false;
  });
  const state = useSavedViews(() => {
    const options = toValue(
      context.options.value.savedViews as MaybeRefOrGetter<UseSavedViewsOptions>
    );
    return {
      urlAdapter: context.urlAdapter.value,
      urlSync: true,
      urlKey: toValue(context.options.value.urlKey),
      ...options,
      flushViewState: () => {
        context.flushViewState();
        if (live && context.active.value) options.flushViewState?.();
      },
    };
  }, context.active);
  context.state.set(SAVED_VIEWS_MODEL, state);
}
/** Named URL captures; the model is owned once by the table, never by a kit. */
export function savedViews(
  options: MaybeRefOrGetter<UseSavedViewsOptions>
): StaticTableFeature {
  return {
    ...coreSavedViews(options),
    mount: mountSavedViews,
    requiredSlots: [SAVED_VIEWS_CONTROL],
  };
}
