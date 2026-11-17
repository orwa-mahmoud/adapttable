import { it } from "vitest";

import { kitPrimitivesTests } from "../../react/test/kit/suites/kitPrimitives";
import { kit } from "./data-table.test-utils";

for (const test of kitPrimitivesTests(kit)) it(test.name, test.run);
