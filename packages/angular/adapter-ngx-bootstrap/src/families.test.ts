import { it } from "vitest";

import { familiesTests } from "../../angular/test/kit/suites/families";
import { kit } from "../testing/kit";

for (const test of familiesTests(kit)) it(test.name, test.run);
