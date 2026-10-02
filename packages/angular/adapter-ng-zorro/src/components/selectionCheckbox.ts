/** NG-ZORRO selection control with the binding's native-input contract. */
import { AdaptAttrs, type Attrs } from "@adapttable/angular";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  viewChild,
} from "@angular/core";
import { NzCheckboxComponent, NzCheckboxModule } from "ng-zorro-antd/checkbox";

/** @internal */
@Component({
  selector: "adapt-selection-checkbox",
  imports: [AdaptAttrs, NzCheckboxModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <label
      nz-checkbox
      [nzChecked]="attrs().checked === true"
      [nzIndeterminate]="attrs().indeterminate === true"
      [nzDisabled]="attrs().disabled === true"
      [adaptAttrs]="inputAttrs()"
      [adaptAttrsTarget]="inputElement"
      (nzCheckedChange)="change()"
      (click)="$event.stopPropagation()"
    ></label>
  `,
})
export class AdaptSelectionCheckbox {
  readonly attrs = input.required<Attrs>();
  readonly part = input<string>();
  readonly className = input<string>();

  private readonly checkbox = viewChild(NzCheckboxComponent);
  protected readonly inputElement = (): HTMLInputElement | null =>
    this.checkbox()?.inputElement?.nativeElement ?? null;

  /** NZ owns change dispatch; refs, keyboard handlers and native mixed state remain intact. */
  protected readonly inputAttrs = computed((): Attrs => ({
    ...this.attrs(),
    onChange: undefined,
    "data-adapttable-part": this.part() ?? this.attrs()["data-adapttable-part"],
    class: ["ant-checkbox-input", this.attrs().class, this.className()]
      .filter(Boolean)
      .join(" "),
  }));

  protected change(): void {
    const change = this.attrs().onChange;
    if (this.attrs().disabled !== true && typeof change === "function") {
      (change as () => void)();
    }
  }
}
