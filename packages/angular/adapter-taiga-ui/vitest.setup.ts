import "@angular/compiler";

import { setupTestBed } from "@analogjs/vitest-angular/setup-testbed";
import { signal } from "@angular/core";
import { TUI_DARK_MODE } from "@taiga-ui/core";

import { provideAdaptTaiga } from "./src/taigaRoot";

// Zoneless, as Angular runs by default: change detection follows signals.
setupTestBed({
  providers: [
    ...provideAdaptTaiga(),
    {
      // jsdom has no system media queries. Use Taiga's supported theme token
      // instead of replacing its native overlays or browser event handling.
      provide: TUI_DARK_MODE,
      useFactory: () => {
        const darkMode = signal(false);
        return Object.assign(darkMode, {
          reset: () => darkMode.set(false),
        });
      },
    },
  ],
});
