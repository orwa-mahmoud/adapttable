import { it } from "vitest";

import { treeTests } from "../../angular/test/kit/suites/tree";
import { kit } from "../testing/kit";

for (const test of treeTests(kit)) it(test.name, test.run);
