import { it } from "vitest";

import { featuresTests } from "../../angular/test/kit/suites/features";
import { kit } from "../testing/kit";

for (const test of featuresTests(kit)) it(test.name, test.run);
