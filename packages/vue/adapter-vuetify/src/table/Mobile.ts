import type { Attrs, MobileCardsModel } from "@adapttable/vue";
import {
  type DataTableClassNames,
  mergeVueAttrs,
  type MobileCardRegions,
  MobileCardsChrome,
  type MobileCardsHosts,
  type TableChromeSlots,
  withProps,
} from "@adapttable/vue/adapter";
import { h, type VNode, type VNodeChild } from "vue";
import { VCard, VCardActions, VCardText } from "vuetify/components/VCard";
import { VSheet } from "vuetify/components/VSheet";

import { VuetifySurface } from "./VuetifySurface";

/** The list key the binding put on an element's attributes. */
function keyOf(attrs: Attrs): string | number | undefined {
  const { key } = attrs;
  return typeof key === "string" || typeof key === "number" ? key : undefined;
}

/**
 * A card as Vuetify's outlined card: the select and move controls first,
 * the fields and the detail in card text, the actions in card actions.
 */
function card(attrs: Attrs, regions: MobileCardRegions): VNode {
  return h(
    VuetifySurface,
    {
      component: VCard,
      attrs: mergeVueAttrs(attrs, {
        class: "adapttable-vuetify-card",
        tag: "article",
        variant: "outlined",
      }),
      key: keyOf(attrs),
    },
    {
      default: () => [
        regions.select,
        regions.reorder,
        h(VCardText, {}, { default: () => regions.body }),
        regions.detail
          ? h(VCardText, regions.detail.attrs, {
              default: () => regions.detail?.content,
            })
          : null,
        regions.actions
          ? h(VCardActions, regions.actions.attrs, {
              default: () => regions.actions?.content,
            })
          : null,
      ],
    }
  );
}

const HOSTS: MobileCardsHosts = {
  list: (attrs, children) =>
    h(
      "div",
      mergeVueAttrs(attrs, { class: "adapttable-vuetify-cards" }),
      children
    ),
  card,
  extra: (attrs, cell) =>
    h(
      VuetifySurface,
      { component: VSheet, attrs, key: keyOf(attrs) },
      { default: () => cell }
    ),
  pad: (attrs) => h(VSheet, attrs),
  fields: (attrs, rows) =>
    h(
      "dl",
      mergeVueAttrs(attrs, { "data-adapttable-part": "card-fields" }),
      rows
    ),
};

/** Responsive cards: the binding's card list in Vuetify's surfaces. */
export const VuetifyMobile = /* @__PURE__ */ withProps(
  function VuetifyMobile<TRow>(props: {
    readonly model: MobileCardsModel<TRow>;
    readonly controls: TableChromeSlots<TRow>;
    readonly classNames: DataTableClassNames;
  }): VNodeChild {
    return MobileCardsChrome({
      model: props.model,
      slots: props.controls,
      classNames: props.classNames,
      hosts: HOSTS,
    });
  },
  ["model", "controls", "classNames"]
);
