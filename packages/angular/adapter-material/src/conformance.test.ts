import type {
  AdaptTableFeature,
  ColumnDef,
  TableAssistantProps,
  TableLabels,
} from "@adapttable/angular";
import type {
  AgentApprovalPending,
  AgentApprovalProps,
  TableAssistantView,
} from "@adapttable/angular/adapter";
import {
  AdaptAgentApproval,
  AdaptTableAssistant,
} from "@adapttable/angular-material/assistant";
import { columnMenu } from "@adapttable/angular-material/column-menu";
import { editing, rowEditing } from "@adapttable/angular-material/editing";
import { filters } from "@adapttable/angular-material/filters";
import { grouping } from "@adapttable/angular-material/grouping";
import { rowReorder } from "@adapttable/angular-material/row-reorder";
import { statusBar } from "@adapttable/angular-material/status-bar";
import { virtualize } from "@adapttable/angular-material/virtualize";
import {
  type ConformanceDriver,
  type ConformanceRow,
  type ConformanceScenario,
  tableConformanceTests,
} from "@adapttable/core/conformance";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { fireEvent, waitFor, within } from "@testing-library/dom";

import { getDirection } from "../../../shared/i18n/src/direction";
import { locales } from "../../../shared/i18n/src/getLabels";
import { kitSelector } from "../testUtils";
import { AdaptErrorState } from "./components/errorState";
import { AdaptDataTable } from "./dataTable";

function columnsFor(
  scenario: ConformanceScenario
): ColumnDef<ConformanceRow>[] {
  return scenario.columns.map((column) => ({
    key: column.key,
    header: column.header,
    sortable: column.sortable,
    editable: scenario.onCellEdit !== undefined,
    accessor: (row: ConformanceRow) => row[column.key],
  }));
}

/** The features a scenario asks for, drawn with this kit. */
function featuresFor(scenario: ConformanceScenario): AdaptTableFeature[] {
  const { onCellEdit, onRowReorder, groupBy } = scenario;
  return [
    ...(onCellEdit
      ? [
          editing<ConformanceRow>((row, key, value) => {
            onCellEdit(row.id, key, value);
          }),
        ]
      : []),
    ...(onRowReorder
      ? [
          rowReorder<ConformanceRow>((from, to, row) => {
            onRowReorder(from, to, row.id);
          }),
        ]
      : []),
    ...(groupBy ? [grouping(groupBy)] : []),
    ...(scenario.virtualize ? [virtualize()] : []),
  ];
}

const driver: ConformanceDriver = {
  name: "angular-material",
  mount: (scenario) => {
    const fixture = TestBed.createComponent(AdaptDataTable<ConformanceRow>);
    const set = (name: string, value: unknown): void => {
      fixture.componentRef.setInput(name, value);
    };
    set("data", scenario.rows);
    set("columns", columnsFor(scenario));
    set("rowKey", (row: ConformanceRow) => row.id);
    set("tableLabel", scenario.tableLabel);
    set("dir", scenario.dir ?? "ltr");
    set("forceMobile", scenario.mobile ?? false);
    set("labels", scenario.labels);
    set("urlSync", false);
    set("selectable", scenario.selectable ?? false);
    set("cellNavigation", scenario.navigable ?? false);
    set("features", featuresFor(scenario));
    if (scenario.virtualize) {
      set("paginationMode", "infinite");
      set("maxHeight", 200);
    }
    if (scenario.pageSize !== undefined) {
      set("defaults", { limit: scenario.pageSize });
    }
    fixture.autoDetectChanges();
    fixture.detectChanges();
    const container = fixture.nativeElement as HTMLElement;
    document.body.append(container);
    return {
      container,
      unmount: () => {
        fixture.destroy();
        container.remove();
      },
    };
  },
};

describe(`table conformance — ${driver.name}`, () => {
  for (const test of tableConformanceTests(driver, {
    expect,
    fireEvent,
    waitFor,
  })) {
    it(test.name, test.run);
  }
});

interface LocaleRow {
  readonly id: string;
  readonly name: string;
  readonly team: string;
}

const LOCALE_ROWS: readonly LocaleRow[] = Array.from(
  { length: 12 },
  (_, index) => ({
    id: String(index + 1),
    name: `Person ${String(index + 1)}`,
    team: index % 2 === 0 ? "Core" : "Web",
  })
);

const LOCALE_COLUMNS: readonly ColumnDef<LocaleRow>[] = [
  {
    key: "name",
    header: "Name",
    editable: true,
    sortable: true,
    accessor: (row) => row.name,
  },
  { key: "team", header: "Team", accessor: (row) => row.team },
];

/** Query actual rendered controls by their accessible name, not dictionary snapshots. */
function localePart<T extends HTMLElement = HTMLElement>(
  root: ParentNode,
  name: string
): T {
  const element = root.querySelector<T>(kitSelector(name));
  if (!element) throw new Error(`Missing rendered ${name}`);
  return element;
}

async function settleLocale<T>(fixture: ComponentFixture<T>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe("every bundled locale through native Angular controls", () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.replaceChildren();
  });

  for (const [locale, labels] of Object.entries(locales)) {
    describe(locale, () => {
      it.each([false, true])(
        "relabels table, filters, paging, edits and status in place (mobile=%s)",
        async (mobile) => {
          const fixture = TestBed.createComponent(AdaptDataTable<LocaleRow>);
          const edit = vi.fn();
          const set = (name: string, value: unknown): void => {
            fixture.componentRef.setInput(name, value);
          };
          set("data", LOCALE_ROWS);
          set("columns", LOCALE_COLUMNS);
          set("rowKey", (row: LocaleRow) => row.id);
          set("urlSync", false);
          set("forceMobile", mobile);
          // Auto uses infinite scrolling on mobile; exercise the real pager in both layouts.
          set("paginationMode", "paged");
          set("selectable", true);
          set("defaults", { limit: 5 });
          set("features", [
            filters<LocaleRow>([{ key: "name", label: "Name", type: "text" }]),
            columnMenu(),
            rowEditing<LocaleRow>(edit),
            statusBar(),
          ]);
          set("labels", locale === "en" ? locales.fr : locales.en);
          set("dir", getDirection(locale) === "rtl" ? "ltr" : "rtl");
          const root = fixture.nativeElement as HTMLElement;
          document.body.append(root);
          await settleLocale(fixture);
          set("labels", labels);
          set("dir", getDirection(locale));
          await settleLocale(fixture);
          const screen = within(root);
          expect(
            screen.getByRole(mobile ? "list" : "table", {
              name: labels.table,
            })
          ).toBe(localePart(root, mobile ? "cards" : "table"));
          expect(localePart(root, "root").getAttribute("dir")).toBe(
            getDirection(locale)
          );
          expect(screen.getByRole("searchbox", { name: labels.search })).toBe(
            localePart(root, "search")
          );
          expect(
            screen.getByRole("combobox", { name: labels.rowsPerPage })
          ).toBe(localePart(root, "rows-per-page"));
          expect(
            screen
              .getByRole("button", { name: labels.goToPage(1) })
              .getAttribute("aria-current")
          ).toBe("page");
          const previous = screen.getByRole<HTMLButtonElement>("button", {
            name: labels.previousPage,
          });
          const next = screen.getByRole<HTMLButtonElement>("button", {
            name: labels.nextPage,
          });
          expect(previous.disabled).toBe(true);
          expect(
            previous.querySelector<SVGElement>("svg")?.style.transform
          ).toBe(getDirection(locale) === "rtl" ? "" : "rotate(180deg)");
          expect(next.querySelector<SVGElement>("svg")?.style.transform).toBe(
            getDirection(locale) === "rtl" ? "rotate(180deg)" : ""
          );
          expect(localePart(root, "pager").textContent).toContain(
            labels.pageOf({ page: 1, total: 3 })
          );
          expect(localePart(root, "status-bar").textContent).toContain(
            labels.showing({ from: 1, to: 5, total: 12 })
          );
          next.click();
          await settleLocale(fixture);
          expect(
            screen
              .getByRole("button", { name: labels.goToPage(2) })
              .getAttribute("aria-current")
          ).toBe("page");
          expect(localePart(root, "pager").textContent).toContain(
            labels.pageOf({ page: 2, total: 3 })
          );
          expect(localePart(root, "status-bar").textContent).toContain(
            labels.showing({ from: 6, to: 10, total: 12 })
          );
          previous.click();
          await settleLocale(fixture);
          screen
            .getAllByRole("checkbox", { name: labels.selectRow })[0]!
            .click();
          await settleLocale(fixture);
          expect(localePart(root, "status-bar").textContent).toContain(
            labels.selectedCount(1)
          );

          screen.getAllByRole("button", { name: labels.editRow })[0]!.click();
          await settleLocale(fixture);
          const save = screen.getByRole("button", { name: labels.saveRow });
          expect(save).toBe(localePart(root, "row-edit-save"));
          expect(screen.getByRole("button", { name: labels.cancel })).toBe(
            localePart(root, "row-edit-cancel")
          );
          const editor = screen.getByRole<HTMLInputElement>("textbox", {
            name: labels.editCell,
          });
          expect(editor).toBe(localePart(root, "edit-cell-editor"));
          fireEvent.input(editor, { target: { value: "Updated person" } });
          await settleLocale(fixture);
          save.click();
          await settleLocale(fixture);
          expect(edit).toHaveBeenCalledExactlyOnceWith(LOCALE_ROWS[0], {
            name: "Updated person",
          });

          screen.getByRole("button", { name: labels.filters }).click();
          await settleLocale(fixture);
          const panel = localePart(document.body, "filters-popover");
          const form = within(panel);
          expect(panel.getAttribute("dir")).toBe(getDirection(locale));
          const operator = form.getByRole<HTMLSelectElement>("combobox", {
            name: labels.operator,
          });
          expect(
            within(operator).getByRole<HTMLOptionElement>("option", {
              name: labels.opContains,
            }).selected
          ).toBe(true);
          const field = form.getByRole("textbox", { name: "Name" });
          fireEvent.input(field, { target: { value: "Person 12" } });
          await settleLocale(fixture);
          expect(localePart(root, "status-bar").textContent).toContain(
            labels.showing({ from: 1, to: 1, total: 1 })
          );
          const chip = localePart(root, "chip");
          const chipLabel =
            chip
              .querySelector(".mdc-evolution-chip__text-label")
              ?.textContent?.trim() ?? "";
          expect(chipLabel).toContain("Person 12");
          expect(
            within(chip).getByRole("button", {
              name: labels.removeFilter(chipLabel),
            })
          ).toBe(localePart(chip, "chip-remove"));
          const clear = form.getByRole<HTMLButtonElement>("button", {
            name: labels.clearAll,
          });
          expect(clear.disabled).toBe(false);
          clear.click();
          await settleLocale(fixture);
          expect(clear.disabled).toBe(true);
          expect(
            root.querySelector('[data-adapttable-part="chips"]')
          ).toBeNull();
          fireEvent.keyDown(document.body, { key: "Escape", keyCode: 27 });
          await settleLocale(fixture);

          if (!mobile) {
            screen.getByRole("button", { name: labels.columns }).click();
            await settleLocale(fixture);
            const menu = within(
              within(document.body).getByRole("group", {
                name: labels.columns,
              })
            );
            expect(
              menu.getByRole("searchbox", { name: labels.searchColumns })
            ).toBe(localePart(document.body, "column-menu-search"));
            expect(
              menu.getByRole("button", { name: labels.resetColumns })
            ).toBe(localePart(document.body, "column-menu-reset"));
            menu
              .getByRole("button", { name: `${labels.hideColumn}: Team` })
              .click();
            await settleLocale(fixture);
            expect(
              menu
                .getByRole("button", { name: `${labels.showColumn}: Team` })
                .getAttribute("aria-pressed")
            ).toBe("false");
            menu
              .getByRole("button", { name: `${labels.showColumn}: Team` })
              .click();
            await settleLocale(fixture);
            expect(
              menu
                .getByRole("button", { name: `${labels.hideColumn}: Team` })
                .getAttribute("aria-pressed")
            ).toBe("true");
          } else {
            expect(screen.getByRole("combobox", { name: labels.sortBy })).toBe(
              localePart(root, "sort-select")
            );
          }
        }
      );

      it("localizes assistant names and live ready/working actions", async () => {
        const fixture = TestBed.createComponent(AdaptTableAssistant);
        const send = vi.fn();
        const stop = vi.fn();
        const settings = vi.fn();
        const close = vi.fn();
        const assistant: TableAssistantView = {
          status: "ready",
          messages: [],
          draft: "Help with this table",
          setDraft: vi.fn(),
          send,
          stop,
          suggestions: [],
          runSuggestion: vi.fn(),
        };
        const props: TableAssistantProps = {
          assistant,
          open: true,
          onOpenChange: close,
          onSettings: settings,
          labels,
          dir: getDirection(locale),
        };
        fixture.componentRef.setInput("props", props);
        const root = fixture.nativeElement as HTMLElement;
        document.body.append(root);
        await settleLocale(fixture);
        const screen = within(root);
        expect(
          screen.getByRole("region", { name: labels.assistantTitle })
        ).toBe(localePart(root, "assistant-panel"));
        expect(
          screen.getByRole("textbox", { name: labels.assistantPlaceholder })
        ).toBe(localePart(root, "assistant-input"));
        expect(
          localePart(root, "assistant-connection").textContent?.trim()
        ).toBe(labels.assistantConnection("ready"));
        screen.getByRole("button", { name: labels.assistantSettings }).click();
        expect(settings).toHaveBeenCalledOnce();
        screen.getByRole("button", { name: labels.assistantSend }).click();
        expect(send).toHaveBeenCalledOnce();
        fixture.componentRef.setInput("props", {
          ...props,
          assistant: { ...assistant, status: "sending" },
        });
        await settleLocale(fixture);
        expect(
          localePart(root, "assistant-connection").textContent?.trim()
        ).toBe(labels.assistantConnection("sending"));
        screen.getByRole("button", { name: labels.assistantStop }).click();
        expect(stop).toHaveBeenCalledOnce();
        screen.getByRole("button", { name: labels.assistantClose }).click();
        expect(close).toHaveBeenCalledExactlyOnceWith(false);
      });

      it("localizes approval summaries and every changing decision label", async () => {
        const fixture = TestBed.createComponent(AdaptAgentApproval);
        const pending: AgentApprovalPending = {
          presentation: "table",
          proposals: Array.from({ length: 4 }, (_, index) => ({
            rowKey: String(index + 1),
            rowLabel: `Person ${String(index + 1)}`,
            column: "name",
            columnLabel: "Name",
            before: "Before",
            after: "After",
          })),
          decisions: ["pending", "pending", "pending", "pending"],
          approve: vi.fn(),
          reject: vi.fn(),
          decideAt: vi.fn(),
          alwaysAllow: vi.fn(),
        };
        const props: AgentApprovalProps = { pending, labels };
        fixture.componentRef.setInput("props", props);
        const root = fixture.nativeElement as HTMLElement;
        document.body.append(root);
        await settleLocale(fixture);
        const screen = within(root);
        const summary = labels.proposalSummary({ changes: 4, rows: 4 });
        expect(screen.getByRole("region", { name: summary })).toBe(
          localePart(root, "agent-approval")
        );
        expect(screen.getByRole("list", { name: summary })).toBe(
          localePart(root, "agent-approval-list")
        );
        expect(
          screen.getByRole("button", { name: labels.approveAllProposals })
        ).toBe(localePart(root, "agent-approval-approve"));
        expect(
          screen.getByRole("button", { name: labels.rejectAllProposals })
        ).toBe(localePart(root, "agent-approval-reject"));
        screen
          .getByRole("button", { name: labels.reviewAllProposals(4) })
          .click();
        await settleLocale(fixture);
        expect(screen.getAllByRole("listitem")).toHaveLength(4);
        expect(
          screen.getByRole("button", { name: labels.backToConversation })
        ).toBe(localePart(root, "approval-review-back"));
        const row = screen.getByRole("listitem", {
          name: labels.proposalChange({
            row: "Person 1",
            column: "Name",
            before: "Before",
            after: "After",
          }),
        });
        within(row)
          .getByRole("button", { name: labels.approveProposal })
          .click();
        expect(pending.decideAt).toHaveBeenCalledExactlyOnceWith(0, true);
        fixture.componentRef.setInput("props", {
          ...props,
          pending: {
            ...pending,
            decisions: ["approved", "pending", "pending", "pending"],
          },
        });
        await settleLocale(fixture);
        expect(
          localePart(root, "approval-review-tally").textContent?.trim()
        ).toBe(labels.proposalTally({ approved: 1, rejected: 0, pending: 3 }));
        screen
          .getByRole("button", { name: labels.approveRemainingProposals })
          .click();
        screen
          .getByRole("button", { name: labels.rejectRemainingProposals })
          .click();
        screen
          .getByRole("button", { name: labels.alwaysAllowProposal })
          .click();
        expect(pending.approve).toHaveBeenCalledOnce();
        expect(pending.reject).toHaveBeenCalledOnce();
        expect(pending.alwaysAllow).toHaveBeenCalledOnce();
      });

      it("localizes the announced load error and actionable retry", async () => {
        const fixture = TestBed.createComponent(AdaptErrorState);
        const retry = vi.fn();
        fixture.componentRef.setInput(
          "labels",
          labels satisfies Required<TableLabels>
        );
        fixture.componentRef.setInput("error", new Error("Offline"));
        fixture.componentRef.setInput("retry", retry);
        const root = fixture.nativeElement as HTMLElement;
        document.body.append(root);
        await settleLocale(fixture);
        const screen = within(root);
        const alert = screen.getByRole("alert");
        expect(alert.textContent).toContain(labels.errorTitle);
        expect(alert.textContent).toContain(labels.errorMessage);
        screen.getByRole("button", { name: labels.retry }).click();
        expect(retry).toHaveBeenCalledOnce();
      });
    });
  }
});
