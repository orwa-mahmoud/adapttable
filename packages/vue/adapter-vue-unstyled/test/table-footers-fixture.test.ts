import { describe, expect, it } from "vitest";
import { h } from "vue";

import TableFootersDemo from "../../../../apps/showcase/src/vue/table-footers/TableFootersDemo.vue";
import { find, mountNative, part, tick } from "./filter-editing-helpers";

describe("real footer showcase fixture", () => {
  it("renders the page total and switches its native controls to mobile and RTL", async () => {
    const { host } = mountNative(() => h(TableFootersDemo));
    expect(find(host, part("summary")).textContent).toContain("$2,060.00");
    expect(find(host, part("table-footer")).textContent).toContain(
      "Review note"
    );
    find<HTMLInputElement>(host, "fieldset input").click();
    await tick();
    expect(find(host, part("summary-card")).textContent).toContain("$2,060.00");
    const rtl = host.querySelectorAll<HTMLInputElement>("fieldset input")[1];
    if (!rtl) throw new Error("Missing RTL control");
    rtl.click();
    await tick();
    expect(find(host, part("root")).getAttribute("dir")).toBe("rtl");
  });
});
