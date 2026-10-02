/**
 * Draws one kit control — a component the kit supplies for a structural
 * component's slot — with the props that component computed for it.
 */
import {
  type ComponentRef,
  Directive,
  effect,
  inject,
  input,
  type Type,
  untracked,
  ViewContainerRef,
} from "@angular/core";

/**
 * Renders `adaptControl` in place, handing it `adaptControlProps` through
 * its `props` input. Put it on an `<ng-container>`. The props should be the
 * same object until something in them changes, as a `computed` returns.
 *
 * @public
 */
@Directive({ selector: "[adaptControl]" })
export class AdaptControl<TProps> {
  /** The kit's component. */
  readonly component = input.required<Type<unknown>>({
    alias: "adaptControl",
  });
  /** Its props. */
  readonly props = input.required<TProps>({ alias: "adaptControlProps" });

  private readonly container = inject(ViewContainerRef);
  private drawn: Type<unknown> | undefined;
  private ref: ComponentRef<unknown> | undefined;

  constructor() {
    effect(() => {
      const component = this.component();
      const props = this.props();
      untracked(() => {
        if (component !== this.drawn) {
          this.container.clear();
          this.ref = this.container.createComponent(component);
          this.drawn = component;
        }
        this.ref?.setInput("props", props);
      });
    });
  }
}
