import { getLabels, hasLocale } from "@adapttable/i18n";
import { useLocaleContext } from "@chakra-ui/react";

/** The context value Chakra uses when no `LocaleProvider` is mounted. */
const DEFAULT_LOCALE = "en-US";

/**
 * Chrome labels for a locale `@adapttable/i18n` knows. An unknown language
 * leaves labels unset so the table keeps its current copy.
 */
function labelsForLocale(
  locale: string
): ReturnType<typeof getLabels> | undefined {
  if (!hasLocale(locale)) return undefined;
  return getLabels(locale);
}

/**
 * Chakra's app-wide locale and the direction Zag derives from it.
 *
 * `useLocaleContext` reports `en-US` / `ltr` even when no `LocaleProvider`
 * is mounted. That default stays unset so the page direction and the
 * current labels still apply. A provider locale is the library setting:
 * its `dir` wins over the page, and labels follow when AdaptTable has
 * that language. Chakra v3 has no app-wide size or motion switch.
 */
export function useChakraLibrary(): {
  dir?: "ltr" | "rtl";
  locale?: string;
  labels?: ReturnType<typeof getLabels>;
} {
  const { dir, locale } = useLocaleContext();
  if (locale === DEFAULT_LOCALE) return {};
  const direction = dir === "rtl" || dir === "ltr" ? dir : undefined;
  return {
    dir: direction,
    locale,
    labels: labelsForLocale(locale),
  };
}
