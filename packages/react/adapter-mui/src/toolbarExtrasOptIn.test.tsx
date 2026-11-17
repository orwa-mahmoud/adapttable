import { it } from "vitest";

import { toolbarExtrasOptInTests } from "../../react/test/kit/suites/toolbarExtrasOptIn";
import { kit } from "./data-table.test-utils";

for (const test of toolbarExtrasOptInTests(kit)) it(test.name, test.run);
