import { Popover } from "ant-design-vue";
import {
  type CSSProperties,
  defineComponent,
  h,
  type PropType,
  type VNodeChild,
} from "vue";

const containerKeys = new WeakMap<Element, number>();
let nextContainerKey = 0;
/** A stable key per container, so a moved container remounts the popup there. */
function containerKey(container: Element | undefined): number {
  if (!container) return 0;
  let key = containerKeys.get(container);
  if (key === undefined) {
    key = ++nextContainerKey;
    containerKeys.set(container, key);
  }
  return key;
}

/**
 * An Ant Design Vue popover that opens against an element the table already
 * owns, such as a toolbar button, instead of wrapping its own trigger. The
 * popover keeps its placement, overflow handling and motion; the empty
 * element it receives as a trigger only stands in for the anchor.
 */
export const AntdAnchoredPopover = defineComponent(
  (
    props: {
      readonly open: boolean;
      readonly anchor: HTMLElement | null | undefined;
      readonly container?: HTMLElement;
      readonly placement: "bottomLeft" | "bottomRight";
      readonly overlayClass?: string;
      readonly overlayStyle?: CSSProperties;
      readonly afterOpen?: () => void;
    },
    { slots }
  ) =>
    () =>
      h(
        Popover,
        {
          // Ant Design Vue mounts the popup once, so a container that moves
          // (fullscreen) needs a fresh popup inside the new container.
          key: containerKey(props.container),
          open: props.open && props.anchor != null,
          trigger: [],
          arrow: false,
          placement: props.placement,
          autoAdjustOverflow: true,
          destroyTooltipOnHide: true,
          getPopupContainer: () =>
            props.container ??
            props.anchor?.ownerDocument.body ??
            document.body,
          overlayClassName: props.overlayClass,
          overlayStyle: props.overlayStyle,
          overlayInnerStyle: { padding: 0 },
          getTriggerDOMNode: () => props.anchor ?? undefined,
          afterVisibleChange: (visible: boolean) => {
            if (visible) props.afterOpen?.();
          },
        },
        {
          default: () =>
            h("span", {
              hidden: true,
              "aria-hidden": "true",
              "data-adapttable-part": "popover-anchor",
            }),
          content: () => slots.default?.() as VNodeChild,
        }
      ),
  {
    name: "AntdAnchoredPopover",
    props: {
      open: { type: Boolean, default: false },
      anchor: { type: Object as PropType<HTMLElement | null | undefined> },
      container: { type: Object as PropType<HTMLElement | undefined> },
      placement: {
        type: String as PropType<"bottomLeft" | "bottomRight">,
        required: true,
      },
      overlayClass: { type: String },
      overlayStyle: { type: Object as PropType<CSSProperties> },
      afterOpen: { type: Function as PropType<() => void> },
    },
  }
);

/**
 * Ant Design Vue marks every popover body `role="tooltip"`. A panel that
 * carries its own dialog role must not sit inside a tooltip, so the wrapper
 * becomes presentational once the panel is open.
 */
export function presentPopoverContent(panel: Element): void {
  panel.closest('[role="tooltip"]')?.setAttribute("role", "presentation");
}
