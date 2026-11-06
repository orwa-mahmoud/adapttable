import { getLabels, hasLocale } from "@adapttable/i18n";
import type { KitEnvironment } from "@adapttable/vue/adapter";
import { computed, type ComputedRef, inject, type Ref } from "vue";
import { useLocale } from "vuetify";

/** Vuetify's script-style locale keys, written as BCP-47 for AdaptTable. */
const LOCALE_TAGS: Record<string, string> = {
  zhHans: "zh",
  zhHant: "zh-TW",
};

const DEFAULTS = Symbol.for("vuetify:defaults");

interface VuetifyDefaults {
  readonly global?: { readonly density?: string };
}

function labelsForLocale(
  locale: string
): ReturnType<typeof getLabels> | undefined {
  if (!hasLocale(locale)) return undefined;
  return getLabels(locale);
}

function densityFor(value: string | undefined): KitEnvironment["density"] {
  if (value === "compact") return "compact";
  if (value === "comfortable" || value === "default") return "comfortable";
  return undefined;
}

/**
 * Vuetify locale, the RTL map, and `defaults.global.density`.
 *
 * A fresh Vuetify install reports English and left to right. That default
 * stays unset so a right-to-left page still reaches the table. Vuetify has
 * no app-wide motion switch. `zhHans` and `zhHant` map to the labels
 * AdaptTable ships. A language it does not ship keeps the current copy.
 */
export function useVuetifyLibrary(): ComputedRef<KitEnvironment> {
  const locale = useLocale();
  const defaults = inject<Ref<VuetifyDefaults | undefined> | undefined>(
    DEFAULTS,
    undefined
  );
  return computed(() => {
    const current = locale.current.value;
    const rtl = locale.isRtl.value === true;
    const tag =
      typeof current === "string" && current !== ""
        ? (LOCALE_TAGS[current] ?? current)
        : undefined;
    const density = densityFor(defaults?.value?.global?.density);
    if (tag === undefined || (tag === "en" && !rtl)) return { density };
    return {
      dir: rtl ? "rtl" : "ltr",
      locale: tag,
      labels: labelsForLocale(tag),
      density,
    };
  });
}
