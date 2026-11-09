import type { KitEnvironment } from "@adapttable/angular/adapter";
import type { TuiLanguageName } from "@taiga-ui/i18n";

/**
 * Taiga language names that correspond to a BCP 47 tag. English is the
 * library default and stays unset. A tag AdaptTable has no labels for keeps
 * the current copy.
 */
const LOCALE_TAG: Partial<Record<string, string>> = {
  arabic: "ar",
  belarusian: "be",
  chinese: "zh",
  dutch: "nl",
  french: "fr",
  german: "de",
  hebrew: "he",
  italian: "it",
  japanese: "ja",
  kazakh: "kk",
  korean: "ko",
  lithuanian: "lt",
  malay: "ms",
  polish: "pl",
  portuguese: "pt",
  russian: "ru",
  spanish: "es",
  tajik: "tg",
  turkish: "tr",
  ukrainian: "uk",
  vietnamese: "vi",
};

/**
 * Labels for a Taiga language that was actually selected.
 *
 * Taiga has no direction provider. `TUI_LANGUAGE` defaults to English, so
 * that pack stays unset.
 */
export function taigaLibrary(name: TuiLanguageName): KitEnvironment {
  if (name === "english" || name === "") return {};
  const locale = LOCALE_TAG[name];
  if (locale === undefined) return {};
  return { locale };
}

/**
 * Taiga turns motion off with `TUI_REDUCED_MOTION` or by setting
 * `TUI_ANIMATIONS_SPEED` to `0`. A speed above zero leaves the operating
 * system in charge when reduced motion is not set.
 */
export function taigaMotionOff(reduced: boolean, speed: number): boolean {
  return reduced || speed === 0;
}
