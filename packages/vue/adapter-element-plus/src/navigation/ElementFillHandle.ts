import {
  FillHandleChrome,
  type FillHandleChromeProps,
} from "@adapttable/vue/adapter";
import { defineComponent, h, mergeProps, type PropType } from "vue";

/** Pointer affordance only; the binding supplies the accessible keyboard fill action. */
export const ElementFillHandle = defineComponent(
  (props: Omit<FillHandleChromeProps, "slots">) => () =>
    FillHandleChrome({
      ...props,
      slots: {
        Handle: (control) =>
          h(
            "span",
            {
              "data-adapttable-part": "fill-handle-anchor",
              style: { position: "relative", display: "block", height: 0 },
            },
            [
              h(
                "span",
                mergeProps(control.handleProps, {
                  "data-adapttable-part": "fill-handle",
                  title: control.label,
                  "aria-hidden": "true",
                  class: control.className,
                  style: {
                    position: "absolute",
                    insetInlineEnd: "-3px",
                    bottom: "-3px",
                    width: "8px",
                    height: "8px",
                    borderRadius: "var(--el-border-radius-small)",
                    background: "var(--el-color-primary)",
                    cursor: "crosshair",
                  },
                })
              ),
            ]
          ),
      },
    }),
  {
    name: "ElementFillHandle",
    props: {
      focus: {
        type: Object as PropType<Omit<FillHandleChromeProps, "slots">["focus"]>,
      },
      windowIndex: {
        type: Number as PropType<
          Omit<FillHandleChromeProps, "slots">["windowIndex"]
        >,
      },
      col: {
        type: Number as PropType<Omit<FillHandleChromeProps, "slots">["col"]>,
      },
      firstRowIndex: {
        type: Number as PropType<
          Omit<FillHandleChromeProps, "slots">["firstRowIndex"]
        >,
      },
      className: {
        type: String as PropType<
          Omit<FillHandleChromeProps, "slots">["className"]
        >,
      },
    },
  }
);
