import { it } from "vitest";

import { groupPagingTests } from "../../react/test/kit/suites/groupPaging";
import { kit } from "./data-table.test-utils";

for (const test of groupPagingTests(kit)) it(test.name, test.run);
