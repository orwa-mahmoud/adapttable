import { it } from "vitest";

import { columnSelectionTests } from "../../react/test/kit/suites/columnSelection";
import { kit } from "./data-table.test-utils";

for (const test of columnSelectionTests(kit)) it(test.name, test.run);
