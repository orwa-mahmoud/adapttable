import "@angular/localize/init";
import "@angular/compiler";

import { setupTestBed } from "@analogjs/vitest-angular/setup-testbed";

// Zoneless, as Angular runs by default: change detection follows signals.
setupTestBed();
