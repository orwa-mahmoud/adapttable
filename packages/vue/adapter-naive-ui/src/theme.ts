import type { Direction } from "@adapttable/vue";
import {
  NConfigProvider,
  unstableButtonRtl,
  unstableCardRtl,
  unstableCheckboxRtl,
  unstableCollapseRtl,
  unstableDrawerRtl,
  unstableInputRtl,
  unstablePopoverRtl,
  unstableSelectRtl,
  unstableTableRtl,
  unstableTagRtl,
  useThemeVars,
} from "naive-ui";
import { computed, h, type VNodeChild } from "vue";

const controlRtl = [
  unstableButtonRtl,
  unstableCheckboxRtl,
  unstableCollapseRtl,
  unstableDrawerRtl,
  unstableInputRtl,
  unstablePopoverRtl,
  unstableSelectRtl,
  unstableTagRtl,
  unstableTableRtl,
  unstableCardRtl,
];

/** Naive UI's public RTL styles follow the table's resolved direction. */
export function naiveDirection(dir: Direction, content: () => VNodeChild) {
  return h(
    NConfigProvider,
    { abstract: true, rtl: dir === "rtl" ? controlRtl : [] },
    { default: content }
  );
}

/** Structural Chrome inherits the same live palette as the Naive controls. */
export function useNaiveTableStyle() {
  const theme = useThemeVars();
  return computed(() => ({
    "--adapttable-naive-font": theme.value.fontFamily,
    "--adapttable-naive-text": theme.value.textColor2,
    "--adapttable-naive-muted": theme.value.textColor3,
    "--adapttable-naive-border": theme.value.borderColor,
    "--adapttable-naive-background": theme.value.tableColor,
    "--adapttable-naive-header": theme.value.tableHeaderColor,
    "--adapttable-naive-hover": theme.value.hoverColor,
    "--adapttable-naive-selected": theme.value.primaryColorHover,
    "--adapttable-naive-radius": theme.value.borderRadius,
  }));
}
