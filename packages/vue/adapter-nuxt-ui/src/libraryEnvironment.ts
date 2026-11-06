import { getLabels, hasLocale } from "@adapttable/i18n";
import type { KitEnvironment } from "@adapttable/vue/adapter";
import { localeContextInjectionKey } from "@nuxt/ui/composables";
import { computed, type ComputedRef, inject, type Ref, shallowRef } from "vue";

interface NuxtLocale {
  readonly code?: string;
  readonly dir?: "ltr" | "rtl";
}

/** Keeps a missing `UApp` from warning. An empty app also leaves this unset. */
const ABSENT = shallowRef<NuxtLocale | undefined>(undefined);

function labelsForLocale(
  locale: string
): ReturnType<typeof getLabels> | undefined {
  if (!hasLocale(locale)) return undefined;
  return getLabels(locale);
}

/**
 * Nuxt UI `UApp` locale.
 *
 * A locale or an explicit `dir` wins over the page. An app that sets neither
 * stays unset, so a right-to-left page still reaches the table. Nuxt UI has
 * no app-wide size or motion switch. A language AdaptTable has no labels for
 * keeps the current copy.
 */
export function useNuxtLibrary(): ComputedRef<KitEnvironment> {
  const provided = inject(
    localeContextInjectionKey,
    ABSENT as Ref<NuxtLocale | undefined>
  );
  return computed(() => {
    const locale = provided.value;
    if (!locale) return {};
    const tag =
      typeof locale.code === "string" && locale.code !== ""
        ? locale.code
        : undefined;
    return {
      dir:
        locale.dir === "rtl" || locale.dir === "ltr" ? locale.dir : undefined,
      locale: tag,
      labels: tag === undefined ? undefined : labelsForLocale(tag),
    };
  });
}
