import { getDebugNode } from "@angular/core";
import { type ComponentFixture } from "@angular/core/testing";
import { TuiOptionWithValue } from "@taiga-ui/core";

/** Resolve the native popup through the trigger's actual accessibility link. */
export function taigaPopup(trigger: HTMLElement): HTMLElement | null {
  const id = trigger.getAttribute("aria-controls");
  return id ? document.getElementById(id) : null;
}

export async function taigaOptions<T>(
  fixture: ComponentFixture<T>,
  trigger: HTMLElement
): Promise<HTMLButtonElement[]> {
  if (trigger.getAttribute("aria-expanded") !== "true") {
    trigger.click();
    await fixture.whenStable();
  }
  const popup = taigaPopup(trigger);
  if (!popup)
    throw new Error("The Taiga trigger did not open its native popup");
  return [...popup.querySelectorAll<HTMLButtonElement>("button[tuiOption]")];
}

export function taigaOptionValue(option: HTMLButtonElement): unknown {
  const directive = getDebugNode(option)?.injector.get(TuiOptionWithValue);
  if (!directive) throw new Error("Missing native Taiga option value");
  return directive.value();
}

export async function chooseTaigaOption<T>(
  fixture: ComponentFixture<T>,
  trigger: HTMLElement,
  value: string
): Promise<void> {
  const options = await taigaOptions(fixture, trigger);
  const option = options.find(
    (item) => String(taigaOptionValue(item)) === value
  );
  if (!option) throw new Error(`No native Taiga option for ${value}`);
  option.click();
  await fixture.whenStable();
}

/** Model the focus and pointer sequence that Taiga observes for outside clicks. */
export async function clickOutsideTaiga<T>(
  fixture: ComponentFixture<T>
): Promise<void> {
  const outside = document.createElement("button");
  document.body.append(outside);
  outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  outside.focus();
  outside.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  outside.click();
  await fixture.whenStable();
  outside.remove();
}

/** The actual Taiga cleaner; never a synthetic model update. */
export function taigaCleaner(control: HTMLElement): HTMLButtonElement | null {
  return (
    control
      .closest("tui-textfield")
      ?.querySelector<HTMLButtonElement>("button[tuiButtonX]") ?? null
  );
}

export async function clearTaigaSelection<T>(
  fixture: ComponentFixture<T>,
  control: HTMLElement
): Promise<void> {
  const cleaner = taigaCleaner(control);
  if (!cleaner) throw new Error("The Taiga control has no native cleaner");
  cleaner.click();
  await fixture.whenStable();
}
