import {
  type TableAssistantSheetProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { defineComponent, h, shallowRef } from "vue";
import { VCard } from "vuetify/components/VCard";
import { VDialog } from "vuetify/components/VDialog";
import { VLocaleProvider } from "vuetify/components/VLocaleProvider";
import { VSheet } from "vuetify/components/VSheet";

/**
 * Chrome chooses initial and return focus; VDialog retains focus and owns the
 * portal. Escape and backdrop dismissal become one close request to the host,
 * and the dialog stays open until the host closes it.
 */
export const VuetifyAssistantSheet = defineComponent(
  (props: TableAssistantSheetProps) => {
    const active = useScopeActivity();
    const dialog = shallowRef<InstanceType<typeof VDialog> | null>(null);
    let backdropPress = false;
    const requestClose = () => {
      if (active.value && props.open) props.onClose();
    };
    const ownsBackdrop = () =>
      dialog.value?.globalTop === true && dialog.value.localTop === true;
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing)
        return;
      event.preventDefault();
      event.stopPropagation();
      requestClose();
    };
    const press = (event: PointerEvent) => {
      backdropPress =
        event.button === 0 &&
        event.target === event.currentTarget &&
        ownsBackdrop();
    };
    const dismiss = (event: MouseEvent) => {
      const allowed = backdropPress;
      backdropPress = false;
      if (allowed && ownsBackdrop() && event.target === event.currentTarget)
        requestClose();
    };
    const contentProps = {
      onPointerdownCapture: () => {
        backdropPress = false;
      },
    };
    return () => {
      if (!active.value) return null;
      const surface = () => [
        h(VSheet, {
          "aria-hidden": true,
          class: "adapttable-vuetify-assistant-backdrop",
          onPointerdown: press,
          onClick: dismiss,
        }),
        h(
          VCard,
          {
            class: ["adapttable-vuetify-assistant-sheet", props.className],
            dir: props.dir,
            rounded: "0",
          },
          () => props.children
        ),
      ];
      return h(VLocaleProvider, { rtl: props.dir === "rtl" }, () =>
        h(
          VDialog,
          {
            ref: dialog,
            modelValue: props.open,
            scrim: false,
            retainFocus: true,
            persistent: true,
            noClickAnimation: true,
            transition: false,
            contentClass: "adapttable-vuetify-assistant-sheet-overlay",
            contentProps: { ...contentProps, dir: props.dir },
            "aria-label": props.label,
            dir: props.dir,
            "data-adapttable-part": props.part,
            onKeydown: keydown,
            "onUpdate:modelValue": (open: boolean) => {
              if (!open) requestClose();
            },
          },
          surface
        )
      );
    };
  },
  {
    name: "VuetifyAssistantSheet",
    props: ["label", "part", "className", "dir", "open", "onClose", "children"],
  }
);
