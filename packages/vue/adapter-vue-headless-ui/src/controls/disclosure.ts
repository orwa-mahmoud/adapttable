import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/vue";
import {
  defineComponent,
  h,
  nextTick,
  type PropType,
  shallowRef,
  type VNodeChild,
} from "vue";

export interface HeadlessDisclosureControl {
  readonly expanded: boolean;
  readonly onExpandedChange: (expanded: boolean) => void;
  readonly className?: string;
  readonly summaryClassName?: string;
  readonly label: string;
  readonly children: VNodeChild;
}

/**
 * A Headless UI Disclosure whose open state the host controls. Headless UI
 * toggles itself on a press; the host is asked for the change, and a press the
 * host does not accept is undone so the two never disagree.
 */
const HeadlessDisclosure = defineComponent(
  (props: { readonly control: HeadlessDisclosureControl }) => {
    const button = shallowRef<HTMLElement | null>(null);
    let internal = props.control.expanded;
    let undoing = false;
    const reconcile = () => {
      if (internal === props.control.expanded) return;
      undoing = true;
      button.value?.click();
      undoing = false;
    };
    const afterPress = () => {
      void nextTick(reconcile);
    };
    const onPress = () => {
      if (undoing) return;
      props.control.onExpandedChange(!internal);
      queueMicrotask(afterPress);
    };
    const capture = (component: unknown) => {
      button.value =
        component && typeof component === "object" && "$el" in component
          ? (component.$el as HTMLElement)
          : null;
    };
    return () => {
      const control = props.control;
      return h(
        Disclosure,
        {
          as: "div",
          defaultOpen: control.expanded,
          "data-adapttable-part": "filter-tree",
          class: control.className,
        },
        {
          default: ({ open }: { open: boolean }) => {
            internal = open;
            return [
              h(
                DisclosureButton,
                {
                  "data-adapttable-part": "filter-tree-summary",
                  class: ["at-headless-button", control.summaryClassName],
                  ref: capture,
                  onClick: onPress,
                },
                { default: () => control.label }
              ),
              h(DisclosurePanel, null, { default: () => control.children }),
            ];
          },
        }
      );
    };
  },
  {
    name: "HeadlessDisclosure",
    props: {
      control: { type: Object as PropType<HeadlessDisclosureControl> },
    },
  }
);

export function headlessDisclosure(control: HeadlessDisclosureControl) {
  return h(HeadlessDisclosure, { control });
}
