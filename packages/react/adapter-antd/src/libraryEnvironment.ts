import { getLabels, hasLocale } from "@adapttable/i18n";
import type { Density } from "@adapttable/react";
import { ConfigProvider, theme } from "antd";
import { useContext } from "react";

import type { DataTableProps } from "./types";

type AntdSize = NonNullable<DataTableProps<unknown>["size"]>;

/**
 * Chrome labels for a ConfigProvider locale `@adapttable/i18n` knows.
 * An unknown language leaves labels unset so the table keeps its current
 * copy instead of silently switching to English.
 */
function labelsForLocale(
  locale: string | undefined
): ReturnType<typeof getLabels> | undefined {
  if (locale === undefined || !hasLocale(locale)) return undefined;
  return getLabels(locale);
}

function sizeFromConfig(size: string | undefined): {
  size?: AntdSize;
  density?: Density;
} {
  if (size === "small") return { size: "small", density: "compact" };
  if (size === "middle" || size === "medium") {
    return { size: "middle", density: "comfortable" };
  }
  if (size === "large") return { size: "large", density: "comfortable" };
  return {};
}

/**
 * Ant Design's app-wide direction, locale, size and motion.
 *
 * `ConfigProvider` leaves `direction` and `componentSize` unset until the
 * app sets them, so a missing value still falls through to the page.
 * Motion follows the design token `motion: false`.
 */
export function useAntdLibrary(): {
  dir?: "ltr" | "rtl";
  locale?: string;
  labels?: ReturnType<typeof getLabels>;
  density?: Density;
  size?: AntdSize;
  motionOff: boolean;
} {
  const { direction, locale } = useContext(ConfigProvider.ConfigContext);
  const { componentSize } = ConfigProvider.useConfig();
  const { token } = theme.useToken();
  const tag = locale?.locale;
  const sized = sizeFromConfig(componentSize);
  const dir =
    direction === "rtl" || direction === "ltr" ? direction : undefined;
  return {
    dir,
    locale: tag,
    labels: labelsForLocale(tag),
    density: sized.density,
    size: sized.size,
    motionOff: token.motion === false,
  };
}
