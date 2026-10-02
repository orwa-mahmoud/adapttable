/** NG-ZORRO portal ownership and scoped dismissal. Positioning belongs to the kit. */
import { DOCUMENT } from "@angular/common";
import {
  afterEveryRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
} from "@angular/core";
import { NzSelectComponent } from "ng-zorro-antd/select";

/** Above the table's sticky headers and pinned cells. @internal */
export const OVERLAY_Z = 10050;

interface OverlayOrigin {
  readonly origin: HTMLElement;
  readonly popup: () => HTMLElement | null | undefined;
}

const origins = new Set<OverlayOrigin>();
const consumedEscapes = new WeakSet<KeyboardEvent>();
let nextSelect = 0;

/** Associate a kit portal with its trigger, including nested portals. @internal */
export function registerOverlayOrigin(
  origin: HTMLElement,
  popup: () => HTMLElement | null | undefined
): () => void {
  const entry = { origin, popup };
  origins.add(entry);
  return () => {
    origins.delete(entry);
  };
}

/** Whether a target belongs to a panel or one of its own child portals. @internal */
export function overlayContains(
  panel: HTMLElement | null | undefined,
  target: EventTarget | null
): boolean {
  if (!panel || !(target instanceof Node)) return false;
  if (panel.contains(target)) return true;
  const visited = new Set<HTMLElement>();
  const contains = (root: HTMLElement): boolean => {
    if (visited.has(root)) return false;
    visited.add(root);
    for (const entry of origins) {
      if (!root.contains(entry.origin)) continue;
      const popup = entry.popup();
      if (popup && (popup.contains(target) || contains(popup))) return true;
    }
    return false;
  };
  return contains(panel);
}

/** The deepest kit control gets the first Escape. @internal */
export function overlayEscapeHandled(event: KeyboardEvent): boolean {
  return event.defaultPrevented || consumedEscapes.has(event);
}

/**
 * Associate an nz-select's real CDK portal with its owning panel. The select
 * still owns option navigation, value selection and its open state. This
 * bridge keeps pointer interaction on the combobox and prevents its first
 * Escape from also dismissing the parent.
 *
 * @internal
 */
@Directive({ selector: "nz-select[adaptOverlayOrigin]" })
export class AdaptOverlayOrigin {
  private readonly select = inject(NzSelectComponent);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);

  constructor() {
    const origin = this.element.nativeElement;
    const listId = `adapttable-zorro-select-${String(++nextSelect)}`;
    const popup = (): HTMLElement | undefined =>
      this.select.cdkConnectedOverlay?.overlayRef?.overlayElement;
    const unregister = registerOverlayOrigin(origin, popup);
    let observer: MutationObserver | undefined;
    const retainFocus = (event: MouseEvent): void => {
      if (
        event.button !== 0 ||
        this.select.nzDisabled ||
        !(event.target instanceof Element)
      )
        return;
      const input: unknown =
        this.select.nzSelectTopControlComponent?.nzSelectSearchComponent
          ?.inputElement.nativeElement;
      if (!(input instanceof Element) || event.target === input) return;
      const option = event.target.closest("nz-option-item");
      if (
        !origin.contains(event.target) &&
        (!option || !popup()?.contains(option))
      )
        return;
      // NG-ZORRO focuses on click, after mousedown has already blurred the
      // input. Keep the whole pointer gesture within this composite control,
      // including its portalled options, so cell editors do not commit early.
      event.preventDefault();
      this.select.focus();
    };
    const escape = (event: KeyboardEvent): void => {
      if (event.key !== "Escape" || !this.select.nzOpen) return;
      const target =
        event.target === this.document
          ? this.document.activeElement
          : event.target;
      if (
        !origin.contains(target as Node | null) &&
        !overlayContains(popup(), target)
      )
        return;
      consumedEscapes.add(event);
      event.preventDefault();
      event.stopPropagation();
      this.select.setOpenState(false);
      this.select.focus();
    };
    this.document.addEventListener("mousedown", retainFocus, true);
    this.document.addEventListener("keydown", escape, true);
    inject(DestroyRef).onDestroy(() => {
      unregister();
      observer?.disconnect();
      this.document.removeEventListener("mousedown", retainFocus, true);
      this.document.removeEventListener("keydown", escape, true);
    });
    // Both user interaction and controlled nzOpen bindings update this model.
    // NG-ZORRO does not emit nzOpenChange for controlled input changes.
    afterEveryRender(() => {
      observer?.disconnect();
      const open = this.select.nzOpen;
      const panel = popup();
      const input = this.select.nzSelectTopControlComponent
        ?.nzSelectSearchComponent?.inputElement?.nativeElement as
        HTMLInputElement | undefined;
      if (!input) return;
      const set = (
        element: Element,
        name: string,
        value: string | null
      ): void => {
        if (element.getAttribute(name) === value) return;
        if (value === null) element.removeAttribute(name);
        else element.setAttribute(name, value);
      };
      const update = (): void => {
        set(input, "role", "combobox");
        set(input, "aria-haspopup", "listbox");
        set(input, "aria-expanded", String(open));
        set(
          input,
          "aria-autocomplete",
          this.select.nzShowSearch ? "list" : "none"
        );
        for (const name of [
          "aria-label",
          "aria-labelledby",
          "aria-describedby",
          "aria-invalid",
          "aria-required",
        ]) {
          const value = origin.getAttribute(name);
          if (value !== null) set(input, name, value);
        }
        set(input, "aria-controls", open && panel ? listId : null);
        if (!open || !panel) {
          set(input, "aria-activedescendant", null);
          return;
        }
        const dir =
          origin.closest<HTMLElement>("[dir]")?.dir === "rtl" ? "rtl" : "ltr";
        panel.dir = dir;
        panel.style.zIndex = String(OVERLAY_Z + 1);
        this.select.cdkConnectedOverlay.overlayRef.setDirection(dir);
        const list = panel.querySelector<HTMLElement>("nz-option-container");
        if (!list) return;
        set(list, "id", listId);
        set(list, "role", "listbox");
        set(
          list,
          "aria-multiselectable",
          this.select.isMultiple ? "true" : null
        );
        let active: string | null = null;
        for (const [index, option] of list
          .querySelectorAll<HTMLElement>(".ant-select-item-option")
          .entries()) {
          const id = `${listId}-${String(index)}`;
          set(option, "id", id);
          set(option, "role", "option");
          set(
            option,
            "aria-selected",
            String(option.classList.contains("ant-select-item-option-selected"))
          );
          set(
            option,
            "aria-disabled",
            option.classList.contains("ant-select-item-option-disabled")
              ? "true"
              : null
          );
          if (option.classList.contains("ant-select-item-option-active"))
            active = id;
        }
        set(input, "aria-activedescendant", active);
      };
      update();
      observer = new MutationObserver(update);
      observer.observe(origin, {
        attributes: true,
        attributeFilter: [
          "aria-label",
          "aria-labelledby",
          "aria-describedby",
          "aria-invalid",
          "aria-required",
        ],
      });
      if (open && panel)
        observer.observe(panel, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ["class"],
        });
    });
  }
}
