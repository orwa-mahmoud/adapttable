import type { KitEnvironment } from "@adapttable/angular/adapter";
import { getLabels, hasLocale } from "@adapttable/i18n";
import type { Direction } from "@angular/cdk/bidi";

function labelsForLocale(
  locale: string
): ReturnType<typeof getLabels> | undefined {
  if (!hasLocale(locale)) return undefined;
  return getLabels(locale);
}

function densityFor(size: string | undefined): KitEnvironment["density"] {
  if (size === "small") return "compact";
  if (size === "middle" || size === "default") return "comfortable";
  return undefined;
}

/**
 * NG-ZORRO settings that were actually provided.
 *
 * `NzI18nService` falls back to `zh_CN` when `NZ_I18N` is absent, so an
 * omitted locale stays unset. Direction is CDK's `Directionality`. Table
 * `nzSize` maps onto density. NG-ZORRO has no app-wide motion switch. A
 * language AdaptTable has no labels for keeps the current copy.
 */
export function ngZorroLibrary(input: {
  readonly dir: Direction | undefined;
  readonly locale: string | undefined;
  readonly size: string | undefined;
}): KitEnvironment {
  const tag =
    typeof input.locale === "string" && input.locale !== ""
      ? input.locale
      : undefined;
  return {
    dir: input.dir,
    locale: tag,
    labels: tag === undefined ? undefined : labelsForLocale(tag),
    density: densityFor(input.size),
  };
}
