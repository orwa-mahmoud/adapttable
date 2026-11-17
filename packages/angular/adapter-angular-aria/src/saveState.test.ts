import { it } from "vitest";

import { saveStateTests } from "../../angular/test/kit/suites/saveState";
import { kit } from "../testing/kit";

for (const test of saveStateTests(kit)) it(test.name, test.run);
