import { TestBed } from "@angular/core/testing";
import { MatButton } from "@angular/material/button";
import { MatChipRemove } from "@angular/material/chips";
import { By } from "@angular/platform-browser";
import { afterEach, describe, expect, it, vi } from "vitest";

import { locales } from "../../../../shared/i18n/src/getLabels";
import { AdaptFilterChips } from "./activeFilterChips";

afterEach(() => TestBed.resetTestingModule());

describe("Material active-filter actions", () => {
  for (const locale of ["en", "ar"] as const) {
    it(`uses a native text button for the ${locale} clear-all action`, async () => {
      const fixture = TestBed.createComponent(AdaptFilterChips);
      const onRemove = vi.fn();
      const onClearAll = vi.fn();
      const labels = locales[locale];
      const props = {
        chips: [{ key: "team:core", label: "Core", onRemove }],
        onClearAll,
        labels,
      };
      fixture.componentRef.setInput("props", props);
      fixture.autoDetectChanges();
      await fixture.whenStable();

      const root = fixture.nativeElement as HTMLElement;
      const chips = root.querySelector('[data-adapttable-part="chips"]')!;
      expect(chips.getAttribute("aria-label")).toBe(labels.filters);
      expect(
        chips.querySelectorAll('[data-adapttable-part="chip"]')
      ).toHaveLength(2);
      const clear = fixture.debugElement.query(By.directive(MatButton));
      expect(clear).not.toBeNull();
      const button = clear.nativeElement as HTMLButtonElement;
      expect(button.textContent?.trim()).toBe(labels.clearAll);
      expect(button.getAttribute("data-adapttable-part")).toBe("chip-remove");
      expect(button.parentElement?.getAttribute("data-adapttable-part")).toBe(
        "chip"
      );
      expect(button.closest("mat-chip")).toBeNull();
      expect(button.type).toBe("button");
      expect(button.tabIndex).toBe(0);
      button.click();
      expect(onClearAll).toHaveBeenCalledTimes(1);
      expect(onRemove).not.toHaveBeenCalled();

      const remove = fixture.debugElement.query(By.directive(MatChipRemove));
      expect(remove.nativeElement.getAttribute("aria-label")).toBe(
        labels.removeFilter("Core")
      );
      (remove.nativeElement as HTMLButtonElement).click();
      expect(onRemove).toHaveBeenCalledTimes(1);
      expect(onClearAll).toHaveBeenCalledTimes(1);

      fixture.componentRef.setInput("props", { ...props, chips: [] });
      await fixture.whenStable();
      expect(root.querySelector('[data-adapttable-part="chips"]')).toBeNull();
    });
  }
});
