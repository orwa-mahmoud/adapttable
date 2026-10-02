/**
 * The palette opens on its shortcut, lists a host command, and runs it.
 */
import { Component, inject, Injector, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import {
  type CommandPaletteInjectOptions,
  injectCommandPalette,
} from "./commandPalette";
import { ADAPTTABLE_PALETTE_OPEN, type PaletteOpenState } from "./paletteState";
import { injectShortcuts, type UseShortcutsOptions } from "./shortcuts";

@Component({ template: "" })
class Host {
  readonly greeted = vi.fn();
  readonly options = signal({
    commandPalette: {
      commands: [
        { key: "greet", label: "Greet", onSelect: () => this.greeted() },
      ],
    },
    labels: {},
  });
  readonly palette = injectCommandPalette(this.options);
}

describe("injectCommandPalette", () => {
  it("opens on Ctrl+K and runs the highlighted command", () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    expect(host.palette().open).toBe(false);
    expect(host.palette().commands.map((command) => command.label)).toEqual([
      "Greet",
    ]);
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true })
    );
    expect(host.palette().open).toBe(true);
    host.palette().commands[0]?.onSelect();
    expect(host.greeted).toHaveBeenCalledOnce();
    host.palette().show();
    expect(host.palette().open).toBe(true);
    host.palette().close();
    expect(host.palette().open).toBe(false);
  });

  it("stays shut when the host turned it off", () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.componentInstance.options.set({
      commandPalette: false as never,
      labels: {},
    });
    fixture.detectChanges();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true })
    );
    expect(fixture.componentInstance.palette().open).toBe(false);
    expect(fixture.componentInstance.palette().commands).toEqual([]);
  });

  it("tracks a nested open signal and leaves each requested change to the host", () => {
    @Component({ template: "" })
    class ControlledHost {
      readonly open = signal(false);
      readonly onOpenChange = vi.fn();
      readonly options = signal<CommandPaletteInjectOptions>({
        commandPalette: {
          open: this.open.asReadonly(),
          onOpenChange: this.onOpenChange,
        },
        labels: {},
      });
      readonly palette = injectCommandPalette(this.options);
    }

    const fixture = TestBed.createComponent(ControlledHost);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    expect(host.palette().open).toBe(false);

    host.open.set(true);
    fixture.detectChanges();
    expect(host.palette().open).toBe(true);
    expect(host.onOpenChange).not.toHaveBeenCalled();
    host.palette().close();
    expect(host.onOpenChange).toHaveBeenLastCalledWith(false);
    expect(host.palette().open).toBe(true);

    host.open.set(false);
    fixture.detectChanges();
    expect(host.palette().open).toBe(false);
    host.palette().show();
    expect(host.onOpenChange.mock.calls).toEqual([[false], [true]]);
    expect(host.palette().open).toBe(false);
  });

  it("publishes open state and follows a controlled flag", () => {
    const published = signal<PaletteOpenState | null>(null);
    const onOpenChange = vi.fn();

    @Component({
      template: "",
      providers: [{ provide: ADAPTTABLE_PALETTE_OPEN, useValue: published }],
    })
    class PublishedHost {
      readonly options = signal<CommandPaletteInjectOptions>({
        commandPalette: {
          commands: [
            { key: "greet", label: "Greet", onSelect: () => undefined },
          ],
          shortcuts: [{ chord: "mod+j", command: "other" }],
          featureHost: undefined,
        } as CommandPaletteInjectOptions["commandPalette"],
        labels: {},
        onPrint: () => undefined,
        featureHost: {
          commands: [
            { key: "extra", label: "Extra", onSelect: () => undefined },
          ],
        } as unknown as CommandPaletteInjectOptions["featureHost"],
      });
      readonly palette: ReturnType<typeof injectCommandPalette>;

      constructor() {
        this.palette = injectCommandPalette(this.options, inject(Injector));
      }
    }

    const fixture = TestBed.createComponent(PublishedHost);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    expect(host.palette().commands.map((command) => command.label)).toContain(
      "Extra"
    );
    expect(published()?.open).toBe(false);
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "j", ctrlKey: true })
    );
    expect(host.palette().open).toBe(false);
    published()?.setOpen(true);
    expect(host.palette().open).toBe(true);

    host.options.set({
      commandPalette: { open: true, onOpenChange },
      labels: {},
    });
    fixture.detectChanges();
    expect(host.palette().open).toBe(true);
    host.palette().close();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(host.palette().open).toBe(true);

    host.options.set({ commandPalette: false, labels: {} });
    fixture.detectChanges();
    expect(published()).toBeNull();
  });
});

@Component({ template: `<button #own type="button">own</button>` })
class ShortcutHost {
  readonly ran = vi.fn();
  readonly box = signal<EventTarget | null>(null);
  readonly options = signal<UseShortcutsOptions>({
    enabled: true,
    onCommand: (command) => this.ran(command),
    target: () => this.box(),
  });

  constructor() {
    injectShortcuts(this.options);
  }
}

describe("injectShortcuts", () => {
  it("binds the default chord, a custom target, and nothing when empty", () => {
    const fixture = TestBed.createComponent(ShortcutHost);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const button = fixture.nativeElement.querySelector(
      "button"
    ) as HTMLButtonElement;
    host.box.set(button);
    fixture.detectChanges();

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true })
    );
    expect(host.ran).not.toHaveBeenCalled();
    button.dispatchEvent(new Event("keydown"));
    button.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true })
    );
    expect(host.ran).toHaveBeenCalledTimes(1);
    expect(host.ran).toHaveBeenCalledWith("command-palette");

    host.box.set(null);
    fixture.detectChanges();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true })
    );
    expect(host.ran).toHaveBeenCalledTimes(2);

    host.options.set({
      enabled: true,
      shortcuts: [],
      onCommand: () => undefined,
    });
    fixture.detectChanges();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true })
    );
    expect(host.ran).toHaveBeenCalledTimes(2);
    fixture.destroy();
  });
});
