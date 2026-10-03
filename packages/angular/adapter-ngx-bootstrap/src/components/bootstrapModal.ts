/** Scoped lifecycle bridge for ngx-bootstrap's native modal directive. */
import { NgTemplateOutlet } from "@angular/common";
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  DestroyRef,
  inject,
  input,
  output,
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
      (onHidden)="closed.emit()"
      (keydown.tab)="trapFocus($event)"
    >
      <div class="modal-dialog modal-dialog-scrollable">
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
  readonly label = input<string | undefined>(undefined);
  readonly dir = input<"ltr" | "rtl">("ltr");
  readonly closed = output<void>();
  private readonly modal = viewChild.required(ModalDirective);
  protected readonly config = {
    animated: false,
    backdrop: false,
    keyboard: true,
    focus: true,
    show: true,
  };

  /** The directive handles Escape and restore; cycle Tab inside its local surface. */
  protected trapFocus(event: Event): void {
    const keyboard = event as KeyboardEvent;
    const surface = event.currentTarget as HTMLElement;
    const controls = [
      ...surface.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]'
      ),
    ].filter((element) => !element.closest('[hidden], [aria-hidden="true"]'));
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
    current.setInput("dir", options.dir?.() ?? "ltr");
    current.instance.closed.subscribe(() => {
      if (ref !== current) return;
      remove();
      options.onClose();
    });
  });
}
