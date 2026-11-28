import { Portal, PortalGroup } from "@headlessui/vue";
import {
  defineComponent,
  h,
  inject,
  type InjectionKey,
  provide,
  type VNodeChild,
} from "vue";

const portalContainer: InjectionKey<() => HTMLElement | undefined> = Symbol(
  "adapttable-headless-portal-container"
);

/** The kit forwards the binding's fullscreen container without owning fullscreen state. */
export function provideHeadlessPortalContainer(
  read: () => HTMLElement | undefined
): void {
  const inherited = inject(portalContainer, () => undefined);
  provide(portalContainer, () => read() ?? inherited());
}

/** Read the container an overlay should mount into, if the table asked for one. */
export function useHeadlessPortalContainer(): () => HTMLElement | undefined {
  return inject(portalContainer, () => undefined);
}

const ROOT_ID = "headlessui-portal-root";

/** Headless UI's own portal root, created the same way it creates it. */
function portalRoot(doc: Document): HTMLElement {
  const existing = doc.getElementById(ROOT_ID);
  if (existing) return existing;
  const root = doc.createElement("div");
  root.id = ROOT_ID;
  doc.body.append(root);
  return root;
}

/**
 * A Dialog always lands in Headless UI's portal root, which sits in the page
 * body. In fullscreen only the fullscreen element is visible, so the root is
 * moved in there while a table needs it, and back to the body otherwise. The
 * portalled content moves with it and keeps its elements.
 */
export function hostPortalRoot(container: HTMLElement | undefined): void {
  if (typeof document === "undefined") return;
  const doc = container?.ownerDocument ?? document;
  const root = portalRoot(doc);
  const parent = container ?? doc.body;
  if (root.parentElement !== parent) parent.append(root);
}

const HeadlessPortal = defineComponent({
  name: "HeadlessPortal",
  props: {
    to: { type: Object as () => HTMLElement | undefined, default: undefined },
  },
  setup(props, { slots }) {
    const container = useHeadlessPortalContainer();
    // Headless UI's Portal owns nesting, so a select inside a popover still
    // counts as inside it. The group only says where it lands, and follows
    // the container when fullscreen starts or ends, so elements are kept.
    return () => {
      const target =
        props.to ??
        container() ??
        (typeof document === "undefined" ? undefined : portalRoot(document));
      return h(
        PortalGroup,
        { target: target ?? null },
        {
          default: () => h(Portal, null, { default: () => slots.default?.() }),
        }
      );
    };
  },
});

/** Render children in a Headless UI portal, in the fullscreen container when there is one. */
export function headlessPortal(children: () => VNodeChild, to?: HTMLElement) {
  return h(HeadlessPortal, { to }, { default: children });
}
