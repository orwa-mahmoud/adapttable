import "@angular/compiler";

import { setupTestBed } from "@analogjs/vitest-angular/setup-testbed";

// Zoneless, as Angular runs by default: change detection follows signals.
setupTestBed();

// Keep real Material components and focus/overlay logic; only remove visual animation delays.
import { TestBed } from "@angular/core/testing";
import { MATERIAL_ANIMATIONS } from "@angular/material/core";
import { beforeEach } from "vitest";

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
    ],
  });
});
