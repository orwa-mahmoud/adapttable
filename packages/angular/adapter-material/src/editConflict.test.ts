import { it } from "vitest";

import { editConflictTests } from "../../angular/test/kit/suites/editConflict";
import { kit } from "../testing/kit";

for (const test of editConflictTests(kit)) it(test.name, test.run);
