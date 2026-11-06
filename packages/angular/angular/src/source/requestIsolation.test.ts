/**
 * Two tables in one process, each with its own locale and row order.
 *
 * A shared locale or a shared row cache would make the second table repeat
 * the first. The ids are fixed so a later client read has one answer.
 */
import { createMemoryAdapter } from "@adapttable/core";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { beforeEach, describe, expect, it } from "vitest";

import { ADAPTTABLE_URL_ADAPTER } from "../url/tableUrlState";
import { injectFrontendData } from "./frontendData";

interface Row {
  id: string;
  nameEn: string;
  nameAr: string;
}

const ROWS: Row[] = [
  { id: "en-first", nameEn: "Ada", nameAr: "زيد" },
  { id: "ar-first", nameEn: "Zed", nameAr: "آدا" },
];

const COLUMNS = [
  {
    key: "nameEn",
    accessor: (row: Row) => row.nameEn,
    i18n: { ar: "nameAr" },
  },
];

@Component({ selector: "english-host", template: "" })
class EnglishHost {
  readonly source = injectFrontendData<Row>({
    data: ROWS,
    columns: COLUMNS,
    locale: "en",
    urlSync: false,
    forceMobile: true,
    defaults: { sortBy: "nameEn", sortDir: "asc" },
  });
}

@Component({ selector: "arabic-host", template: "" })
class ArabicHost {
  readonly source = injectFrontendData<Row>({
    data: ROWS,
    columns: COLUMNS,
    locale: "ar",
    urlSync: false,
    forceMobile: true,
    defaults: { sortBy: "nameEn", sortDir: "asc" },
  });
}

function ids(host: { source: () => { rows: readonly Row[] } }): string {
  return host.source()
    .rows.map((row) => row.id)
    .join(",");
}

describe("frontend sources on two requests", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ADAPTTABLE_URL_ADAPTER, useValue: createMemoryAdapter("") },
      ],
    });
  });

  it("sorts each locale on its own and repeats that order", async () => {
    const english = TestBed.createComponent(EnglishHost);
    const arabic = TestBed.createComponent(ArabicHost);
    english.detectChanges();
    arabic.detectChanges();
    await english.whenStable();
    await arabic.whenStable();
    expect(ids(english.componentInstance)).toBe("en-first,ar-first");
    expect(ids(arabic.componentInstance)).toBe("ar-first,en-first");
    english.detectChanges();
    arabic.detectChanges();
    await english.whenStable();
    await arabic.whenStable();
    expect(ids(english.componentInstance)).toBe("en-first,ar-first");
    expect(ids(arabic.componentInstance)).toBe("ar-first,en-first");
  });
});
