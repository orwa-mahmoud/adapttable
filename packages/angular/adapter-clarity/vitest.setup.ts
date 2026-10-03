import "@angular/compiler";

import { setupTestBed } from "@analogjs/vitest-angular/setup-testbed";

// Zoneless, as Angular runs by default: change detection follows signals.
setupTestBed();

// Clarity 18 uses Angular's legacy animation triggers, even with transitions skipped.
beforeEach(async () => {
  const { TestBed } = await import("@angular/core/testing");
  const { provideNoopAnimations } =
    await import("@angular/platform-browser/animations");
  TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
});
