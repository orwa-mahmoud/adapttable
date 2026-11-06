import { getLabels, hasLocale } from "@adapttable/i18n";
import type { KitEnvironment } from "@adapttable/vue/adapter";
import { computed, type ComputedRef, inject, type Ref } from "vue";

/**
 * Naive UI's config injection key. It is not a public export. The default
 * keeps a missing provider from warning.
 */
const NAIVE_CONFIG = "n-config-provider";

interface NaiveConfig {
  readonly mergedRtlRef: Ref<Readonly<Record<string, unknown>> | undefined>;
  readonly mergedLocaleRef: Ref<{ readonly name?: string } | undefined>;
  readonly mergedComponentPropsRef: Ref<
    { readonly DataTable?: { readonly size?: string } } | undefined
  >;
}

function labelsForLocale(
  locale: string
): ReturnType<typeof getLabels> | undefined {
  if (!hasLocale(locale)) return undefined;
  return getLabels(locale);
}

function densityFor(size: string | undefined): KitEnvironment["density"] {
  if (size === "small") return "compact";
  if (size === "medium" || size === "large") return "comfortable";
  return undefined;
}

/**
 * Naive UI direction, locale and data-table size.
 *
 * `n-config-provider` is absent from the public composable list, so this
 * reads the injection key the library's own components use. RTL applies
 * only when that provider's `rtl` list is non-empty. Omitting it leaves
 * the page direction alone. Locale names such as
 * `ar-DZ` and `zh-CN` use AdaptTable's labels when that language exists.
 * Naive UI has no app-wide motion switch.
 */
export function useNaiveLibrary(): ComputedRef<KitEnvironment> {
  const config = inject<NaiveConfig | null>(NAIVE_CONFIG, null);
  return computed(() => {
    const rtl = config?.mergedRtlRef.value;
    const name = config?.mergedLocaleRef.value?.name;
    const locale = typeof name === "string" && name !== "" ? name : undefined;
    const size = config?.mergedComponentPropsRef.value?.DataTable?.size;
    return {
      dir: rtl !== undefined && Object.keys(rtl).length > 0 ? "rtl" : undefined,
      locale,
      labels: locale === undefined ? undefined : labelsForLocale(locale),
      density: densityFor(size),
    };
  });
}
