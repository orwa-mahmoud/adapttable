import { it } from "vitest";

import { featureRuntimeTests } from "../../angular/test/kit/suites/featureRuntime";
import { kit } from "../testing/kit";

for (const test of featureRuntimeTests(kit)) it(test.name, test.run);
