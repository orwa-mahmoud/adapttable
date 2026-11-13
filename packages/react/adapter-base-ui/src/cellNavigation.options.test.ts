import { it } from "vitest";

import { cellNavigationOptionsTests } from "../../react/test/kit/suites/cellNavigationOptions";
import { kit } from "./data-table.test-utils";

for (const test of cellNavigationOptionsTests(kit)) it(test.name, test.run);
