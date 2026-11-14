import { it } from "vitest";

import { editHistoryTests } from "../../angular/test/kit/suites/editHistory";
import { kit } from "../testing/kit";

for (const test of editHistoryTests(kit)) it(test.name, test.run);
