import type { Locale } from "./people";

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
