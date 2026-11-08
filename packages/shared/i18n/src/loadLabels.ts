import { resolveLocaleTag, type TableLabels } from "@adapttable/core";

import type { LocaleKey } from "./getLabels";

type Loader = () => Promise<Required<TableLabels>>;

/** One loader per bundled locale, so a bundler emits one chunk per language. */
const LOADERS = {
  en: () => import("./locales/en").then((m) => m.en),
  ar: () => import("./locales/ar").then((m) => m.ar),
  cs: () => import("./locales/cs").then((m) => m.cs),
  de: () => import("./locales/de").then((m) => m.de),
  es: () => import("./locales/es").then((m) => m.es),
  fa: () => import("./locales/fa").then((m) => m.fa),
  fr: () => import("./locales/fr").then((m) => m.fr),
  he: () => import("./locales/he").then((m) => m.he),
  hi: () => import("./locales/hi").then((m) => m.hi),
  id: () => import("./locales/id").then((m) => m.id),
  it: () => import("./locales/it").then((m) => m.it),
  ja: () => import("./locales/ja").then((m) => m.ja),
  ko: () => import("./locales/ko").then((m) => m.ko),
  pl: () => import("./locales/pl").then((m) => m.pl),
  pt: () => import("./locales/pt").then((m) => m.pt),
  ru: () => import("./locales/ru").then((m) => m.ru),
  tr: () => import("./locales/tr").then((m) => m.tr),
  ur: () => import("./locales/ur").then((m) => m.ur),
  zh: () => import("./locales/zh").then((m) => m.zh),
  "zh-TW": () => import("./locales/zh-TW").then((m) => m.zhTW),
} as const satisfies Record<LocaleKey, Loader>;

/**
 * Loads the label preset for a BCP 47 tag, fetching only that language.
 *
 * Resolves the tag the way {@link getLabels} does (`ar-EG` → Arabic,
 * `zh-TW` → Traditional Chinese). Unlike `getLabels`, an unknown
 * language resolves to `undefined` instead of English, so a caller can
 * keep its current copy.
 *
 * @param locale - Any BCP 47 tag.
 * @returns The labels, or `undefined` when no preset matches.
 *
 * @public
 */
export async function loadLabels(
  locale: string
): Promise<Required<TableLabels> | undefined> {
  const key = resolveLocaleTag(Object.keys(LOADERS), locale) as
    LocaleKey | undefined;
  return key === undefined ? undefined : LOADERS[key]();
}
