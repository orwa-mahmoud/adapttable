import { expect, type Locator, type Page } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";
import { kitPart as clarityPart } from "../packages/angular/adapter-clarity/testUtils";
import { kitSelector as materialPart } from "../packages/angular/adapter-material/testUtils";
import { ngBootstrapPart } from "../packages/angular/adapter-ng-bootstrap/testUtils";
import { ngxBootstrapPart } from "../packages/angular/adapter-ngx-bootstrap/testUtils";
import { getLabels } from "../packages/shared/i18n/src/index";

/** Every registered Angular shell runs the same operation assertions. */
export const ANGULAR_KITS = builtAdapters("angular");

interface AngularKit {
  readonly key: string;
}

interface SelectOption {
  readonly value: string;
  readonly label: string;
}

const escapeRegExp = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const labelsFor = (page: Page) =>
  getLabels(new URL(page.url()).searchParams.get("locale") ?? "en");

/** Each themed kit keeps native-only hooks outside the public parts contract. */
function themedPart(kit: AngularKit, name: string): string {
  if (kit.key === "clarity") return clarityPart(name);
  if (kit.key === "ngx-bootstrap") return ngxBootstrapPart(name);
  if (kit.key === "material") return materialPart(name);
  const selector = ngBootstrapPart(name);
  if (kit.key === "ng-bootstrap") return selector;
  if (kit.key === "spartan")
    return selector.replace("data-ng-bootstrap-part", "data-spartan-part");
  if (kit.key === "taiga-ui")
    return selector.replace("data-ng-bootstrap-part", "data-taiga-part");
  return `[data-adapttable-part="${name}"]`;
}

/** Native-only widget parts map to the real NG-ZORRO surface for axe too. */
export function angularOverlaySelector(
  kit: AngularKit,
  page: Page,
  name: string
): string {
  if (kit.key === "ng-zorro") {
    const labels = labelsFor(page);
    switch (name) {
      case "filters-popover":
        return '.ant-popover section[dir]:has([data-adapttable-part="filters-form"])';
      case "filters-panel":
        return '.ant-drawer-content[role="dialog"]:has([data-adapttable-part="filters-form"])';
      case "views-panel":
        return `.ant-popover:has(input[aria-label=${JSON.stringify(labels.viewName)}])`;
      case "column-menu-panel":
        return `.ant-popover fieldset[aria-label=${JSON.stringify(labels.columns)}]`;
    }
  }
  return themedPart(kit, name);
}

/**
 * Shared shell parts keep their public selectors. Native-only widget hooks
 * instead use the themed kit's accessible controls and its actual surfaces.
 */
export function angularPart(
  kit: AngularKit,
  page: Page,
  name: string,
  within?: Locator
): Locator {
  const scope = within ?? page.locator("body");
  if (kit.key === "ng-zorro") {
    const labels = labelsFor(page);
    switch (name) {
      case "filters-popover":
      case "filters-panel":
      case "views-panel":
      case "column-menu-panel":
        return page.locator(angularOverlaySelector(kit, page, name));
      case "filters-button":
        return scope
          .locator('[data-adapttable-part="toolbar"]')
          .getByRole("button", {
            name: new RegExp(`^${escapeRegExp(labels.filters)}`),
          });
      case "filters-count":
        return angularPart(kit, page, "filters-button", within).locator(
          "nz-badge-sup"
        );
      case "filters-backdrop":
        return page.locator(".ant-drawer-mask");
      case "filters-clear":
        return scope.getByRole("button", {
          name: labels.clearAll,
          exact: true,
        });
      case "views-button":
        return scope.getByRole("button", {
          name: labels.savedViews,
          exact: true,
        });
      case "views-input":
        return angularPart(kit, page, "views-panel").getByRole("textbox", {
          name: labels.viewName,
          exact: true,
        });
      case "views-save":
        return angularPart(kit, page, "views-panel").getByRole("button", {
          name: labels.saveView,
          exact: true,
        });
      case "column-menu-button":
        return scope.getByRole("button", { name: labels.columns, exact: true });
      case "pager":
        return scope.locator("nz-pagination");
      case "page-number":
        return scope
          .locator("nz-pagination .ant-pagination-item")
          .getByRole("button");
      case "page-prev":
        return scope.getByRole("button", {
          name: labels.previousPage,
          exact: true,
        });
      case "page-next":
        return scope.getByRole("button", {
          name: labels.nextPage,
          exact: true,
        });
      case "sort-button":
        return scope.getByRole("button", {
          name: new RegExp(`^${escapeRegExp(labels.sortBy)}:`),
        });
      case "sort-select":
        return scope.getByRole("combobox", {
          name: labels.sortBy,
          exact: true,
        });
      case "expand-button":
        return scope.getByRole("button", {
          name: new RegExp(
            `^(?:${escapeRegExp(labels.expandRow)}|${escapeRegExp(labels.collapseRow)})$`
          ),
        });
    }
  }
  const overlay = [
    "filters-popover",
    "filters-panel",
    "filters-backdrop",
    "views-panel",
    "column-menu-panel",
  ].includes(name);
  return (overlay ? page.locator("body") : scope).locator(
    themedPart(kit, name)
  );
}

/** Parts can identify the select host or its actual, focusable input. */
export function angularCombobox(control: Locator): Locator {
  return control
    .and(control.page().getByRole("combobox"))
    .or(control.getByRole("combobox"));
}

/** Read the selected label, not the NG-ZORRO input's search text. */
export async function expectAngularSelection(
  kit: AngularKit,
  control: Locator,
  option: SelectOption
): Promise<void> {
  if (await control.evaluate((element) => element.tagName === "SELECT")) {
    await expect(control).toHaveValue(option.value);
    await expect(control.locator("option:checked")).toHaveText(option.label);
    return;
  }
  if (kit.key === "aria") {
    await expect(angularCombobox(control)).toContainText(option.label);
    return;
  }
  if (kit.key === "taiga-ui") {
    await expect(angularCombobox(control)).toHaveValue(option.label);
    return;
  }
  await expect(angularCombobox(control)).toBeVisible();
  await expect(
    control
      .locator("xpath=ancestor-or-self::nz-select[1]")
      .locator("nz-select-item")
  ).toHaveText(option.label);
}

/** Follow the combobox's own popup, including a portal outside .mx-demo. */
export async function openAngularOptions(control: Locator): Promise<Locator> {
  const combobox = angularCombobox(control);
  // NG-ZORRO overlays its readonly input with the selected label. The visible
  // selector is the pointer target a reader uses; the input retains keyboard ARIA.
  const zorro = combobox.locator("xpath=ancestor::nz-select[1]");
  if (await zorro.count()) await zorro.locator("nz-select-top-control").click();
  else await combobox.click();
  await expect(combobox).toHaveAttribute("aria-expanded", "true");
  await expect(combobox).toHaveAttribute("aria-controls", /\S+/);
  const listId = (await combobox.getAttribute("aria-controls"))!;
  const list = control
    .page()
    .getByRole("listbox")
    .and(control.page().locator(`[id="${listId}"]`));
  await expect(list).toBeVisible();
  return list.getByRole("option");
}

/** Exercise each kit's real control without assigning its model directly. */
export async function selectAngularOption(
  kit: AngularKit,
  control: Locator,
  option: SelectOption,
  optionCount?: number
): Promise<void> {
  if (await control.evaluate((element) => element.tagName === "SELECT")) {
    if (optionCount !== undefined) {
      await expect(control.locator("option")).toHaveCount(optionCount);
    }
    await control.selectOption(option.value);
    return;
  }
  const options = await openAngularOptions(control);
  if (optionCount !== undefined) {
    await expect(options).toHaveCount(optionCount);
  }
  await options
    .and(
      control.page().getByRole("option", { name: option.label, exact: true })
    )
    .click();
  await expect(angularCombobox(control)).toHaveAttribute(
    "aria-expanded",
    "false"
  );
}
