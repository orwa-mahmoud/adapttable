/** Scoped lifecycle bridge for ngx-bootstrap's native modal directive. */
import { NgTemplateOutlet } from "@angular/common";
import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  Renderer2,
  type TemplateRef,
  viewChild,
  ViewContainerRef,
} from "@angular/core";
import { ModalDirective } from "ngx-bootstrap/modal";

/** Native modal kept beneath its adapter host, with a scoped backdrop. */
@Component({
  selector: "adapt-bootstrap-modal",
  imports: [ModalDirective, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="modal-backdrop show"
      data-ngx-bootstrap-part="filters-backdrop"
      (click)="hide()"
    ></div>
    <div
      bsModal
      class="modal"
      [class.adapttable-edge-drawer]="drawer()"
      [config]="config"
      [attr.aria-labelledby]="titleId()"
      [attr.aria-label]="label()"
      [attr.dir]="dir()"
      [attr.data-dir]="dir()"
      [attr.data-ngx-bootstrap-part]="drawer() ? 'filters-panel' : null"
      data-state="open"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      (onHide)="dismissing = true"
      (onHidden)="hidden()"
      (keydown)="onKeyDown($event)"
    >
      <div
        class="modal-dialog modal-dialog-scrollable"
        [class.modal-fullscreen-sm-down]="sheet()"
      >
        <div class="modal-content">
          <ng-container [ngTemplateOutlet]="content()" />
        </div>
      </div>
    </div>
  `,
})
class AdaptBootstrapModal {
  readonly content = input.required<TemplateRef<unknown>>();
  readonly titleId = input.required<string>();
  readonly drawer = input(false);
  readonly sheet = input(false);
  readonly label = input<string | undefined>(undefined);
  readonly dir = input<"ltr" | "rtl">("ltr");
  readonly closed = output<void>();
  private readonly modal = viewChild.required(ModalDirective);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly destroy = inject(DestroyRef);
  protected dismissing = false;
  protected hidden(): void {
    // Native destruction emits onHidden too, without a user dismissal.
    if (this.dismissing) this.closed.emit();
  }

  constructor() {
    // Open only while the rendered view is alive; config.show schedules an
    // uncancellable timer that can reopen a destroyed surface.
    afterNextRender(() => {
      this.modal().show();
      const document = this.element.nativeElement.ownerDocument;
      this.destroy.onDestroy(
        this.renderer.listen(document, "focusin", (event: FocusEvent) => {
          const surface =
            this.element.nativeElement.querySelector<HTMLElement>(
              ".modal.show"
            );
          if (
            !surface ||
            !(event.target instanceof Node) ||
            surface.contains(event.target)
          )
            return;
          // Only the topmost native modal owns containment; nested menus portal
          // inside their modal boundary and remain part of this focus region.
          const top = [
            ...document.querySelectorAll<HTMLElement>(
              '.modal.show[aria-modal="true"]'
            ),
          ].at(-1);
          if (top !== surface) return;
          const first = this.controls(surface)[0];
          (first ?? surface).focus();
        })
      );
    });
  }

  protected readonly config = {
    animated: false,
    backdrop: false,
    keyboard: true,
    focus: true,
    show: false,
  };

  protected onKeyDown(event: KeyboardEvent): void {
    // A nested control already handled this Escape. Do not let the native
    // document listener close the modal a second time.
    if (event.key === "Escape" && event.defaultPrevented)
      event.stopPropagation();
    if (event.key === "Tab") this.trapFocus(event);
  }

  /** The directive handles Escape and restore; cycle Tab inside its local surface. */
  protected trapFocus(event: Event): void {
    const keyboard = event as KeyboardEvent;
    const surface = event.currentTarget as HTMLElement;
    const controls = this.controls(surface);
    const first = controls[0];
    const last = controls.at(-1);
    if (!first || !last) {
      keyboard.preventDefault();
      surface.focus();
      return;
    }
    const active = surface.ownerDocument.activeElement;
    if (keyboard.shiftKey && (active === first || active === surface)) {
      keyboard.preventDefault();
      last.focus();
    }
    if (!keyboard.shiftKey && (active === last || active === surface)) {
      keyboard.preventDefault();
      first.focus();
    }
  }

  private controls(surface: HTMLElement): HTMLElement[] {
    return [
      ...surface.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]'
      ),
    ].filter((element) => !element.closest('[hidden], [aria-hidden="true"]'));
  }

  hide(): void {
    this.modal().hide();
  }
}

/** Keep controlled Chrome slots synchronized with their local native modal. */
export function bootstrapModal(options: {
  readonly open: () => boolean;
  readonly content: () => TemplateRef<unknown>;
  readonly container: () => HTMLElement;
  readonly titleId: string;
  readonly sheet?: boolean;
  readonly onClose: () => void;
  readonly drawer?: boolean;
  readonly label?: () => string;
  readonly dir?: () => "ltr" | "rtl";
}): void {
  const view = inject(ViewContainerRef);
  let ref: ComponentRef<AdaptBootstrapModal> | undefined;
  let focus: HTMLElement | undefined;
  const remove = (): void => {
    const current = ref;
    ref = undefined;
    current?.destroy();
    if (focus?.isConnected) focus.focus();
  };
  inject(DestroyRef).onDestroy(remove);
  afterRenderEffect(() => {
    if (!options.open()) {
      remove();
      return;
    }
    if (ref) {
      ref.setInput("dir", options.dir?.() ?? "ltr");
      ref.setInput("label", options.label?.());
      return;
    }
    const container = options.container();
    const active = container.ownerDocument.activeElement;
    focus = active instanceof HTMLElement ? active : undefined;
    const current = view.createComponent(AdaptBootstrapModal);
    ref = current;
    // ViewContainerRef inserts next to its host; move inside to preserve CSS isolation.
    container.append(current.location.nativeElement as HTMLElement);
    current.setInput("content", options.content());
    current.setInput("titleId", options.titleId);
    current.setInput("label", options.label?.());
    current.setInput("drawer", options.drawer ?? false);
    current.setInput("sheet", options.sheet ?? false);
    current.setInput("dir", options.dir?.() ?? "ltr");
    current.instance.closed.subscribe(() => {
      if (ref !== current) return;
      remove();
      options.onClose();
    });
  });
}
