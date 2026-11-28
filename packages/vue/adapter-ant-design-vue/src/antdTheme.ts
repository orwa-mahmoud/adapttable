import { theme } from "ant-design-vue";
import { computed, type ComputedRef, type CSSProperties } from "vue";

/**
 * Ant Design Vue draws with its own design tokens inside style rules, not CSS
 * variables, so the table reads the tokens and exposes the few it needs to its
 * own stylesheet as `--adapttable-ant-design-vue-*` properties. A page that
 * switches algorithm (dark mode) or overrides a token through `ConfigProvider`
 * therefore restyles the table's own surfaces too.
 */
export function useAntdTokenStyle(): ComputedRef<CSSProperties> {
  const { token } = theme.useToken();
  return computed((): CSSProperties => ({
    "--adapttable-ant-design-vue-primary": token.value.colorPrimary,
    "--adapttable-ant-design-vue-primary-bg": token.value.colorPrimaryBg,
    "--adapttable-ant-design-vue-primary-border":
      token.value.colorPrimaryBorder,
    "--adapttable-ant-design-vue-danger": token.value.colorError,
    "--adapttable-ant-design-vue-white": token.value.colorWhite,
    "--adapttable-ant-design-vue-text": token.value.colorText,
    "--adapttable-ant-design-vue-text-secondary":
      token.value.colorTextSecondary,
    "--adapttable-ant-design-vue-text-placeholder":
      token.value.colorTextPlaceholder,
    "--adapttable-ant-design-vue-bg": token.value.colorBgContainer,
    "--adapttable-ant-design-vue-fill": token.value.colorFillAlter,
    "--adapttable-ant-design-vue-border": token.value.colorBorder,
    "--adapttable-ant-design-vue-border-secondary":
      token.value.colorBorderSecondary,
    "--adapttable-ant-design-vue-radius": `${token.value.borderRadius}px`,
    "--adapttable-ant-design-vue-radius-sm": `${token.value.borderRadiusSM}px`,
    "--adapttable-ant-design-vue-font-family": token.value.fontFamily,
    "--adapttable-ant-design-vue-font-size": `${token.value.fontSize}px`,
    "--adapttable-ant-design-vue-font-size-sm": `${token.value.fontSizeSM}px`,
    "--adapttable-ant-design-vue-control-height": `${token.value.controlHeight}px`,
    "--adapttable-ant-design-vue-shadow": token.value.boxShadowTertiary,
  }));
}
