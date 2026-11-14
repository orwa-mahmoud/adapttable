import { it } from "vitest";

import { publicSurfaceTests } from "../../react/test/kit/suites/publicSurface";
import { kit } from "./data-table.test-utils";

for (const test of publicSurfaceTests(kit)) it(test.name, test.run);
