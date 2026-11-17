import { it } from "vitest";

import { serverPropsTests } from "../../react/test/kit/suites/serverProps";
import { kit } from "./data-table.test-utils";

for (const test of serverPropsTests(kit)) it(test.name, test.run);
