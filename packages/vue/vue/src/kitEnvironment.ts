import type { Direction, TableDensity, TableLabels } from "@adapttable/core";
import { loadLabels } from "@adapttable/i18n/load";
import { computed, type ComputedRef, type Ref, shallowRef, watch } from "vue";

/** What a kit read from its own library. Unset fields stay with the table. */
export interface KitEnvironment {
  readonly dir?: Direction;
  readonly locale?: string;
  readonly labels?: Partial<TableLabels>;
  readonly density?: TableDensity;
}

/**
 * Explicit table props win. A field the kit did not read stays untouched,
 * so a library default cannot override the page.
 */
export function withKitEnvironment<P extends KitEnvironment>(
  props: Readonly<P>,
  kit: KitEnvironment
): P {
  return {
    ...props,
    dir: props.dir ?? kit.dir,
    locale: props.locale ?? kit.locale,
    labels: props.labels ?? kit.labels,
    density: props.density ?? kit.density,
  };
}

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
