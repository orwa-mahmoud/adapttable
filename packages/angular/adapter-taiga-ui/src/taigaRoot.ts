import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  type EnvironmentProviders,
  inject,
  input,
  type Provider,
  type TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import { TUI_OPTIONS, type TuiOptions, TuiRoot } from "@taiga-ui/core";
import { provideEventPlugins } from "@taiga-ui/event-plugins";

const TAIGA_OPTIONS: TuiOptions = {
  apis: "stable",
  fontScaling: false,
  scrollbars: "native",
};

/** Taiga event handling without document-wide theme or scrollbar side effects. */
export function provideAdaptTaiga(): Array<Provider | EnvironmentProviders> {
  return [
    { provide: TUI_OPTIONS, useValue: TAIGA_OPTIONS },
    provideEventPlugins(),
  ];
}

/** Scoped Taiga portal host. Wrap the table and its optional feature panels once. */
@Component({
  selector: "adapt-taiga-root",
  imports: [TuiRoot, NgTemplateOutlet],
  providers: [{ provide: TUI_OPTIONS, useValue: TAIGA_OPTIONS }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: "./taigaRoot.less",
  template: `<tui-root
    data-adapttable-taiga-root
    [attr.tuiTheme]="theme() ?? parent?.resolvedTheme() ?? null"
    [attr.dir]="dir() ?? parent?.resolvedDir() ?? null"
  >
    @if (content(); as body) {
      <ng-container [ngTemplateOutlet]="body" />
    }
    <ng-content />
  </tui-root>`,
})
export class AdaptTaigaRoot {
  protected readonly parent: AdaptTaigaRoot | null = inject(AdaptTaigaRoot, {
    optional: true,
    skipSelf: true,
  });
  /** Nested table hosts inherit the explicit scope of their enclosing kit root. */
  readonly resolvedTheme = (): "light" | "dark" | null =>
    this.theme() ?? this.parent?.resolvedTheme() ?? null;
  readonly resolvedDir = (): "ltr" | "rtl" | null =>
    this.dir() ?? this.parent?.resolvedDir() ?? null;

  /** Optional template for dynamic framework hosts; projection works without it. */
  readonly content = input<TemplateRef<unknown>>();
  /** An explicit theme overrides the host page's inherited theme. */
  readonly theme = input<"light" | "dark" | null>(null);
  readonly dir = input<"ltr" | "rtl" | null>(null);
}
