import type { ColumnMenuSlots } from "@adapttable/vue/adapter";
import {
  defineComponent,
  h,
  mergeProps,
  onMounted,
  onScopeDispose,
  onUpdated,
  type VNode,
} from "vue";

type PanelControl = Parameters<ColumnMenuSlots["Panel"]>[0];
/** Inline native surface: retain fullscreen ancestry and clamp to the viewport. */
export const NativeColumnMenuPanel = defineComponent(
  (props: { readonly control: PanelControl }) => {
    let panel: HTMLElement | null = null;
    let detach: (() => void) | undefined;
    const place = (): void => {
      if (!panel) return;
      const doc = panel.ownerDocument;
      const view = doc.defaultView;
      if (!view) return;
      panel.style.transform = "";
      const rect = panel.getBoundingClientRect();
      const viewport = doc.documentElement.clientWidth || view.innerWidth;
      let shift = 0;
      if (rect.left < 8) shift = 8 - rect.left;
      else if (rect.right > viewport - 8) shift = viewport - 8 - rect.right;
      panel.style.transform = shift ? `translateX(${String(shift)}px)` : "";
      panel.style.maxHeight = `${String(Math.max(0, view.innerHeight - rect.top - 8))}px`;
    };
    onMounted(() => {
      const view = panel?.ownerDocument.defaultView;
      if (!view) return;
      place();
      view.addEventListener("resize", place);
      view.addEventListener("scroll", place, true);
      detach = () => {
        view.removeEventListener("resize", place);
        view.removeEventListener("scroll", place, true);
      };
    });
    onUpdated(place);
    onScopeDispose(() => {
      detach?.();
      panel = null;
    });
    return () =>
      h(
        "div",
        mergeProps(props.control.attrs, {
          onVnodeMounted: (node: VNode): void => {
            panel = node.el instanceof HTMLElement ? node.el : null;
          },
        }),
        [props.control.content]
      );
  },
  { name: "NativeColumnMenuPanel", props: ["control"] }
);
