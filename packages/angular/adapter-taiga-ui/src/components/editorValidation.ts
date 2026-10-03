import {
  Directive,
  effect,
  forwardRef,
  inject,
  Injector,
  input,
} from "@angular/core";
import {
  NG_VALIDATORS,
  NgControl,
  type ValidationErrors,
  type Validator,
} from "@angular/forms";
import { TuiNativeValidator } from "@taiga-ui/cdk";

/** Give Taiga's native validator the host-owned editing error. */
@Directive({
  selector: "[adaptTaigaEditorValidation]",
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => AdaptTaigaEditorValidation),
      multi: true,
    },
  ],
})
export class AdaptTaigaEditorValidation implements Validator {
  readonly adaptTaigaEditorValidation = input<string>();
  readonly adaptTaigaEditorErrorId = input<string>();
  private readonly injector = inject(Injector);
  private changed = (): void => {};

  constructor() {
    effect(() => {
      const error = this.adaptTaigaEditorValidation();
      // Taiga owns aria-invalid and native validity. Reuse the binding's error
      // description rather than requesting a second, unrelated error outlet.
      // Resolve after directive creation: NgModel itself injects NG_VALIDATORS.
      const native = this.injector.get(TuiNativeValidator);
      native.id = this.adaptTaigaEditorErrorId() ?? "";
      this.changed();
      if (error) {
        this.injector.get(NgControl).control?.markAsTouched();
      }
    });
  }

  validate(): ValidationErrors | null {
    const error = this.adaptTaigaEditorValidation();
    return error ? { adapttable: error } : null;
  }

  registerOnValidatorChange(changed: () => void): void {
    this.changed = changed;
  }
}
