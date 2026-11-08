import type { TableLabels } from "@adapttable/core";
import { loadLabels } from "@adapttable/i18n/load";
import { useEffect, useState } from "react";

export {
  type KitEnvironment,
  withKitEnvironment,
} from "@adapttable/core/binding";

/**
 * Chrome labels for a UI library's locale, loaded on demand.
 *
 * Only the matching language's labels are fetched, the first time that
 * locale is seen, so a table whose library stays on its default locale
 * carries no label data. Until they arrive, and for a language
 * `@adapttable/i18n` has no labels for, the result is `undefined` and the
 * table keeps its current copy. Pass `undefined` when the host already
 * supplies labels, so nothing is fetched.
 *
 * @param locale - The library's BCP 47 locale tag, or `undefined`.
 * @returns The loaded labels for `locale`, or `undefined`.
 *
 * @public
 */
export function useLocaleLabels(
  locale: string | undefined
): Required<TableLabels> | undefined {
  const [loaded, setLoaded] = useState<{
    readonly locale: string;
    readonly labels: Required<TableLabels> | undefined;
  }>();
  useEffect(() => {
    if (locale === undefined) return;
    let current = true;
    void loadLabels(locale).then((labels) => {
      if (current) setLoaded({ locale, labels });
    });
    return () => {
      current = false;
    };
  }, [locale]);
  return locale !== undefined && loaded?.locale === locale
    ? loaded.labels
    : undefined;
}
