import type { Direction, TableLabels } from "@adapttable/core";
import { loadLabels } from "@adapttable/i18n/load";
import { useEffect, useState } from "react";

import type { Density } from "../url/useDensityUrlState";

/**
 * What a UI library told the table, after the kit read its own provider.
 * Absent fields mean the library did not set that concern, so the page or
 * the operating system still decides.
 *
 * @public
 */
export interface KitEnvironment {
  /** Library direction, when a direction provider set one. */
  dir?: Direction;
  /** Library locale tag, when a locale provider set one. */
  locale?: string;
  /** Chrome labels for a locale `@adapttable/i18n` knows. */
  labels?: Partial<TableLabels>;
  /** Density mapped from a library-wide size, when that size is set. */
  density?: Density;
}

/**
 * Explicit table props win, then the kit's library setting. A field the
 * library left unset stays unset so the page direction or the default
 * density still applies.
 *
 * @public
 */
export function withKitEnvironment<
  P extends {
    dir?: Direction;
    locale?: string;
    labels?: Partial<TableLabels>;
    density?: Density;
  },
>(props: Readonly<P>, kit: KitEnvironment): P {
  return {
    ...props,
    dir: props.dir ?? kit.dir,
    locale: props.locale ?? kit.locale,
    labels: props.labels ?? kit.labels,
    density: props.density ?? kit.density,
  };
}

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
