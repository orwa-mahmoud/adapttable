import { it } from "vitest";

import { gridEditingActivationTests } from "../../angular/test/kit/suites/gridEditingActivation";
import { kit } from "../testing/kit";

for (const test of gridEditingActivationTests(kit)) it(test.name, test.run);
