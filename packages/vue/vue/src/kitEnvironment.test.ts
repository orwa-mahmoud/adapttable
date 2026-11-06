import { describe, expect, it } from "vitest";

import { withKitEnvironment } from "./kitEnvironment";

describe("withKitEnvironment", () => {
  it("keeps an explicit prop ahead of the kit", () => {
    expect(
      withKitEnvironment(
        {
          dir: "ltr" as const,
          locale: "en",
          labels: { rowsPerPage: "Per page" },
          density: "comfortable" as const,
        },
        {
          dir: "rtl",
          locale: "ar",
          labels: { rowsPerPage: "صفوف لكل صفحة" },
          density: "compact",
        }
      )
    ).toMatchObject({
      dir: "ltr",
      locale: "en",
      labels: { rowsPerPage: "Per page" },
      density: "comfortable",
    });
  });

  it("fills only the fields the kit actually read", () => {
    const props: { searchable: boolean; dir?: "ltr" | "rtl" } = {
      searchable: true,
    };
    expect(
      withKitEnvironment(props, {
        dir: "rtl",
        locale: "ar",
        density: "compact",
      })
    ).toEqual({
      searchable: true,
      dir: "rtl",
      locale: "ar",
      labels: undefined,
      density: "compact",
    });
  });
});
