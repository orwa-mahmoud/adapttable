import { coreSavedViews } from "@adapttable/core/binding";
import { type MaybeRefOrGetter, onScopeDispose, toValue } from "vue";

import { useSavedViews, type UseSavedViewsOptions } from "../url/useSavedViews";
import {
  SAVED_VIEWS_CONTROL,
  SAVED_VIEWS_MODEL,
} from "../viewControls/contracts";
import type { FeatureMountContext, StaticTableFeature } from "./tableFeature";

function mountSavedViews<TRow>(context: FeatureMountContext<TRow>): void {
  const state = useSavedViews(
    () => ({
      urlAdapter: context.urlAdapter.value,
      urlSync: true,
      urlKey: toValue(context.options.value.urlKey),
      ...toValue(
        context.options.value
          .savedViews as MaybeRefOrGetter<UseSavedViewsOptions>
      ),
    }),
    context.active
  );
  let live = true;
  onScopeDispose(() => {
    live = false;
  });
  context.state.set(SAVED_VIEWS_MODEL, {
    ...state,
    save: (name) => {
      if (!live || !context.active.value) return;
      context.flushViewState();
      state.save(name);
    },
    apply: (name) => {
      if (!live || !context.active.value) return;
      context.flushViewState();
      state.apply(name);
    },
  });
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
