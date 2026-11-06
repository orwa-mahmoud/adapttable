import { getLabels, hasLocale } from "@adapttable/i18n";
import type { KitEnvironment } from "@adapttable/vue/adapter";
import { injectConfigProviderContext } from "reka-ui";
import { computed, type ComputedRef } from "vue";

/**
 * Sentinel for a missing provider. Reka's `useDirection` falls back to left
 * to right, so it cannot tell an unset app from an explicit one. The
 * injection itself can: no provider returns this object.
 */
const ABSENT = {};

function labelsForLocale(
  locale: string
): ReturnType<typeof getLabels> | undefined {
  if (!hasLocale(locale)) return undefined;
  return getLabels(locale);
}

/**
 * Reka UI config provider.
 *
 * A provider always carries a direction and a locale (`ltr` and `en` when
 * the caller omits them), and that pair wins over the page. No provider
 * stays unset, so a right-to-left page still reaches the table. Reka has no
 * app-wide size or motion switch. A language AdaptTable has no labels for
 * keeps the current copy.
 */
export function useRekaLibrary(): ComputedRef<KitEnvironment> {
  const context = injectConfigProviderContext(ABSENT);
  return computed(() => {
    if (context === ABSENT) return {};
    const locale = context.locale?.value;
    const tag =
      typeof locale === "string" && locale !== "" ? locale : undefined;
    return {
      dir: context.dir?.value,
      locale: tag,
      labels: tag === undefined ? undefined : labelsForLocale(tag),
    };
  });
}
