import { describe, expect, it } from "vitest";
import { h } from "vue";

import ActionControlsDemo from "../../../../apps/showcase/src/vue/actions/ActionControlsDemo.vue";
import { click, find, mountNative, part, tick } from "./filter-editing-helpers";
describe("actual action showcase fixture", () => {
  it("reports cooperative cancellation and host completion from real native controls", async () => {
    const { host } = mountNative(() => h(ActionControlsDemo));
    await tick();
    await click(host, "export-csv-button");
    find(host, "#progress").click();
    await tick();
    expect(find<HTMLProgressElement>(host, "progress").value).toBe(42);
    await click(host, "export-progress-cancel");
    expect(find(host, "#aborted").textContent).toBe("true");
    await click(host, "export-progress-dismiss");
    await click(host, "export-csv-button");
    find(host, "#complete-export").click();
    await tick();
    expect(
      find<HTMLAnchorElement>(
        host,
        part("export-progress-download")
      ).getAttribute("href")
    ).toBe("/fixture.csv");
    expect(find(host, "#events").textContent).toContain("export");
  });
});
