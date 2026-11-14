import { it } from "vitest";

import { rowDetailTests } from "../../angular/test/kit/suites/rowDetail";
import { kit } from "../testing/kit";

for (const test of rowDetailTests(kit)) it(test.name, test.run);
