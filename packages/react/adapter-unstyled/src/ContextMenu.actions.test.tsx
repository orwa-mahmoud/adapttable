import { it } from "vitest";

import { contextMenuActionsTests } from "../../react/test/kit/suites/contextMenuActions";
import { kit } from "./data-table.test-utils";

for (const test of contextMenuActionsTests(kit)) it(test.name, test.run);
