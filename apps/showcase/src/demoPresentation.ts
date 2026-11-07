import { getDirection, getLabels } from "@adapttable/i18n";
import { useState } from "react";

import type { Locale } from "./people";

/** The page asked the kit provider, not the table props, to own direction and labels. */
export function librarySettingOnly(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("library") === "1";
}

/**
 * Props the page writes onto the table. `?library=1` leaves them unset so
 * the only direction and labels on screen come from that kit's provider.
 */
export function pageTablePresentation(
  locale: string,
  searchPlaceholder: string
): {
  labels?: ReturnType<typeof getLabels>;
  locale?: string;
  dir?: "ltr" | "rtl";
  searchPlaceholder?: string;
} {
  if (librarySettingOnly()) return {};
  return {
    labels: getLabels(locale),
    locale,
    dir: getDirection(locale),
    searchPlaceholder,
  };
}

/** Keep a shared feature URL's requested language on the actual native table. */
export function initialDemoLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const query = new URLSearchParams(window.location.search);
  return query.get("locale") === "ar" || query.get("dir") === "rtl"
    ? "ar"
    : "en";
}

/** Native kit providers and their portalled controls use the same direction. */
export function initialDemoDirection(): "ltr" | "rtl" {
  return initialDemoLocale() === "ar" ? "rtl" : "ltr";
}

/** Live and lab preferences are shareable and survive page/framework changes. */
export function useDemoPreference<T extends string>(
  key: "locale" | "density",
  initial: () => T
): [T, (value: T) => void] {
  const [value, setValue] = useState(initial);
  return [
    value,
    (next) => {
      const url = new URL(window.location.href);
      url.searchParams.set(key, next);
      if (key === "locale") url.searchParams.delete("dir");
      window.history.replaceState(window.history.state, "", url);
      window.dispatchEvent(new Event("showcase-preferences-change"));
      setValue(next);
    },
  ];
}

export function initialDemoDensity(): "comfortable" | "compact" {
  return typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("density") === "compact"
    ? "compact"
    : "comfortable";
}
