import { Injector, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { injectColumnDrag, injectColumnRenameEditor } from "./columnMenu";

type Handler = (event: Event) => void;

function transfer() {
  const data = new Map<string, string>();
  return {
    get types() {
      return [...data.keys()];
    },
    setData: (type: string, value: string) => data.set(type, value),
    getData: (type: string) => data.get(type) ?? "",
    effectAllowed: "",
    dropEffect: "",
  };
}

function dragEvent(type: string, dataTransfer: ReturnType<typeof transfer>) {
  const target = document.createElement("div");
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  Object.defineProperty(event, "target", { value: target });
  return event;
}

describe("injectColumnDrag", () => {
  it("moves the dragged column to the row it is dropped on", () => {
    const drag = TestBed.runInInjectionContext(() => injectColumnDrag());
    const moves: [string, number][] = [];
    const move = (key: string, to: number) => moves.push([key, to]);
    const data = transfer();
    const source = drag.rowAttrs("a", 0, move);
    expect(source.draggable).toBe("true");
    (source.onDragStart as Handler)(dragEvent("dragstart", data));
    expect(drag.rowAttrs("a", 0, move)["data-dragging"]).toBe("");
    const target = drag.rowAttrs("b", 2, move);
    (target.onDragOver as Handler)(dragEvent("dragover", data));
    expect(drag.rowAttrs("b", 2, move)["data-drop"]).toBe("after");
    (target.onDrop as Handler)(dragEvent("drop", data));
    expect(moves).toEqual([["a", 2]]);
    (target.onDragEnd as () => void)();
  });

  it("moves a column with the arrow keys from its grip", () => {
    const drag = injectColumnDrag(TestBed.inject(Injector));
    const moves: [string, number][] = [];
    const grip = drag.gripAttrs(
      "a",
      1,
      (key, to) => moves.push([key, to]),
      "Move"
    );
    expect(grip["aria-label"]).toBe("Move");
    const button = document.createElement("span");
    const press = (key: string) => {
      const event = new KeyboardEvent("keydown", { key, cancelable: true });
      Object.defineProperty(event, "currentTarget", { value: button });
      (grip.onKeyDown as Handler)(event);
    };
    press("ArrowDown");
    press("x");
    expect(moves).toEqual([["a", 2]]);
  });
});

describe("injectColumnRenameEditor", () => {
  function editor() {
    const renames: [string, string][] = [];
    const column = signal({
      key: "name",
      name: "Name",
      onRename: (key: string, name: string) => renames.push([key, name]),
      requiredMessage: "Required",
      renamedMessage: ({ name }: { previous: string; name: string }) =>
        `Now ${name}`,
    });
    const state = TestBed.runInInjectionContext(() =>
      injectColumnRenameEditor({ column })
    );
    TestBed.tick();
    return { state, renames };
  }

  function type(state: ReturnType<typeof editor>["state"], value: string) {
    const input = document.createElement("input");
    input.value = value;
    const event = new Event("input");
    Object.defineProperty(event, "target", { value: input });
    (state.inputAttrs().onChange as Handler)(event);
  }

  it("renames a column and announces it", () => {
    const { state, renames } = editor();
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    state.begin();
    expect(state.editing()).toBe(true);
    const attrs = state.inputAttrs();
    expect(attrs.id).toBe(state.inputId);
    expect(attrs.value).toBe("Name");
    const input = document.createElement("input");
    (attrs.ref as (element: HTMLElement | null) => void)(input);
    (attrs.ref as (element: HTMLElement | null) => void)(null);
    type(state, "Title");
    expect(state.submit()).toBe(true);
    expect(renames).toEqual([["name", "Title"]]);
    expect(state.announcement()).toBe("Now Title");
    trigger.remove();
  });

  it("refuses an empty name, and cancels on Escape", () => {
    const { state, renames } = editor();
    state.begin();
    type(state, " ");
    expect(state.submit()).toBe(false);
    expect(state.error()).toBe("Required");
    expect(state.inputAttrs()["aria-invalid"]).toBe("true");
    expect(state.inputAttrs()["aria-describedby"]).toBe(state.errorId);
    (state.inputAttrs().onKeyDown as Handler)(
      new KeyboardEvent("keydown", { key: "a" })
    );
    expect(state.editing()).toBe(true);
    (state.inputAttrs().onKeyDown as Handler)(
      new KeyboardEvent("keydown", { key: "Escape", cancelable: true })
    );
    expect(state.editing()).toBe(false);
    expect(renames).toEqual([]);
  });

  it("runs with an explicit injector", () => {
    const state = injectColumnRenameEditor({
      column: signal({
        key: "a",
        name: "A",
        onRename: () => undefined,
        requiredMessage: "",
        renamedMessage: () => "",
      }),
      injector: TestBed.inject(Injector),
    });
    expect(state.editing()).toBe(false);
    state.cancel();
  });
});
