/** Live direction for one native menu trigger, preserving its scroll strategy. */
import { Directionality } from "@angular/cdk/bidi";
import { MENU_SCROLL_STRATEGY } from "@angular/cdk/menu";
import { type OverlayRef, type ScrollStrategy } from "@angular/cdk/overlay";
import {
  afterRenderEffect,
  type AfterRenderRef,
  Directive,
  inject,
  Injector,
  untracked,
} from "@angular/core";

function directionAwareScrollStrategy(): () => ScrollStrategy {
  const inheritedFactory = inject(MENU_SCROLL_STRATEGY, { skipSelf: true });
  const direction = inject(Directionality);
  const injector = inject(Injector);
  return () => {
    const inherited = inheritedFactory();
    let overlay: OverlayRef | undefined;
    let directionEffect: AfterRenderRef | undefined;
    const stop = () => {
      directionEffect?.destroy();
      directionEffect = undefined;
    };
    return {
      attach: (ref) => {
        inherited.attach(ref);
        overlay = ref;
      },
      enable: () => {
        inherited.enable();
        directionEffect ??= untracked(() =>
          afterRenderEffect(
            () => {
              // Keep CDK's live Directionality object, and update its DOM host.
              direction.valueSignal();
              if (!overlay?.hasAttached()) return;
              overlay.setDirection(direction);
              overlay.updatePosition();
            },
            { injector }
          )
        );
      },
      disable: () => {
        stop();
        inherited.disable();
      },
      detach: () => {
        stop();
        overlay = undefined;
        inherited.detach?.();
      },
    };
  };
}

/** @internal */
@Directive({
  selector: "[adaptCdkMenuDirection]",
  providers: [
    {
      provide: MENU_SCROLL_STRATEGY,
      useFactory: directionAwareScrollStrategy,
    },
  ],
})
export class AdaptCdkMenuDirection {}
