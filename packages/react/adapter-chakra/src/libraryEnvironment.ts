import { useLocaleContext } from "@chakra-ui/react";

/** The context value Chakra uses when no `LocaleProvider` is mounted. */
const DEFAULT_LOCALE = "en-US";

/**
 * Chakra's app-wide locale and the direction Zag derives from it.
 *
 * `useLocaleContext` reports `en-US` / `ltr` even when no `LocaleProvider`
 * is mounted. That default stays unset so the page direction and the
 * current labels still apply. A provider locale is the library setting:
 * its `dir` wins over the page, and the table loads that language's
 * labels when AdaptTable has them. Chakra v3 has no app-wide size or motion switch.
 */
export function useChakraLibrary(): {
  dir?: "ltr" | "rtl";
  locale?: string;
} {
  const { dir, locale } = useLocaleContext();
  if (locale === DEFAULT_LOCALE) return {};
  const direction = dir === "rtl" || dir === "ltr" ? dir : undefined;
  return {
    dir: direction,
    locale,
  };
}
