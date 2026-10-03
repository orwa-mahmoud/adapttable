import "@angular/compiler";

import { setupTestBed } from "@analogjs/vitest-angular/setup-testbed";

import { provideAdaptTaiga } from "./src/taigaRoot";

// Zoneless, as Angular runs by default: change detection follows signals.
setupTestBed({ providers: provideAdaptTaiga() });
