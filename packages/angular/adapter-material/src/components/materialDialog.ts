/** Material dialog lifecycle shared by this kit's modal surfaces. */
import { DOCUMENT } from "@angular/common";
import type { TemplateRef } from "@angular/core";
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  viewChild,
} from "@angular/core";
import {
  MatDialog,
  MatDialogModule,
  type MatDialogRef,
  MatDialogState,
} from "@angular/material/dialog";
import type { Subscription } from "rxjs";

let nextOverlayId = 0;

/** @internal */
@Component({
  selector: "adapt-material-dialog",
  imports: [MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-template #content><ng-content /></ng-template>`,
})
export class AdaptMaterialDialog {
  readonly open = input(true);
  readonly label = input.required<string>();
  readonly dir = input<"ltr" | "rtl">("ltr");
  readonly sheet = input(false);
  readonly backdropClassName = input<string>();
  readonly dismiss = output<void>();
  private readonly dialog = inject(MatDialog);
  private readonly document = inject(DOCUMENT);
  private readonly backdropClass = `adapt-material-backdrop-${String(++nextOverlayId)}`;
  private readonly content =
    viewChild.required<TemplateRef<unknown>>("content");
  private current: MatDialogRef<unknown> | undefined;
  private closed: Subscription | undefined;

  constructor() {
    afterRenderEffect(() => {
      const open = this.open();
      const label = this.label();
      const dir = this.dir();
      const sheet = this.sheet();
      const marker = this.backdropClassName();
      if (!open) {
        this.close();
        return;
      }
      const position = sheet
        ? dir === "rtl"
          ? { left: "0", top: "0" }
          : { right: "0", top: "0" }
        : {};
      const width = sheet ? "420px" : "520px";
      const height = sheet ? "100%" : "";
      if (this.current) {
        // A label or direction update must not destroy the open form or its focus.
        const container = this.document.getElementById(this.current.id);
        container?.setAttribute("aria-label", label);
        container?.closest(".cdk-overlay-pane")?.setAttribute("dir", dir);
        this.current.updatePosition(position).updateSize(width, height);
      } else {
        const ref = this.dialog.open(this.content(), {
          ariaLabel: label,
          direction: dir,
          hasBackdrop: true,
          backdropClass: ["cdk-overlay-dark-backdrop", this.backdropClass],
          restoreFocus: true,
          autoFocus: "first-tabbable",
          maxWidth: "calc(100vw - 16px)",
          width,
          height,
          position,
          panelClass: [
            "adapt-material-overlay",
            sheet ? "adapt-material-sheet" : "adapt-material-dialog",
          ],
        });
        this.current = ref;
        this.closed = ref.afterClosed().subscribe(() => {
          if (this.current !== ref) return;
          this.current = undefined;
          this.closed = undefined;
          this.dismiss.emit();
        });
      }
      const backdrop = this.document.querySelector(`.${this.backdropClass}`);
      if (marker && backdrop) {
        backdrop.classList.add(marker);
        backdrop.setAttribute("data-state", "open");
      }
    });
    inject(DestroyRef).onDestroy(() => this.close());
  }

  private close(): void {
    const ref = this.current;
    this.current = undefined;
    this.closed?.unsubscribe();
    this.closed = undefined;
    if (ref && ref.getState() !== MatDialogState.CLOSED) ref.close();
  }
}
