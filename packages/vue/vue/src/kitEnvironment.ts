import type { TableLabels } from "@adapttable/core";
import type { KitEnvironment } from "@adapttable/core/binding";
import { loadLabels } from "@adapttable/i18n/load";
import { computed, type ComputedRef, type Ref, shallowRef, watch } from "vue";

/**
 * Fills a kit environment's labels from its locale, loaded on demand.
 *
 * Only the matching language's labels are fetched, the first time that
 * locale is seen, so a library left on its default locale carries no label
 * data. Labels the kit set itself win. Until the labels arrive, and for a
 * language `@adapttable/i18n` has no labels for, `labels` stays unset and
 * the table keeps its current copy.
 */
export function useLocaleLabels(
  environment: Readonly<Ref<KitEnvironment>>
): ComputedRef<KitEnvironment> {
  const loaded = shallowRef<{
    readonly locale: string;
    readonly labels: Required<TableLabels> | undefined;
  }>();
  watch(
    () =>
      environment.value.labels === undefined
        ? environment.value.locale
        : undefined,
    (locale, _previous, onCleanup) => {
      if (locale === undefined) return;
      let current = true;
      onCleanup(() => {
        current = false;
      });
      void loadLabels(locale).then((labels) => {
        if (current) loaded.value = { locale, labels };
      });
    },
    { immediate: true }
  );
  return computed(() => {
    const kit = environment.value;
    const found = loaded.value;
    return kit.labels === undefined &&
      found !== undefined &&
      found.locale === kit.locale
      ? { ...kit, labels: found.labels }
      : kit;
  });
}

export {
  type KitEnvironment,
  withKitEnvironment,
} from "@adapttable/core/binding";
