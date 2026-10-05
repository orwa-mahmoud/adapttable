/** Structural combobox and focus wiring; all visible controls are required slots. */
import {
  commandListKeyAction,
  commandListView,
  createCommandList,
  runCommand,
  tabTrapTarget,
} from "@adapttable/core";
import type {
  CommandPaletteChromeProps as NeutralProps,
  CommandPaletteSlots as NeutralSlots,
} from "@adapttable/core/binding";
import {
  defineComponent,
  h,
  nextTick,
  onScopeDispose,
  shallowRef,
  useId,
  type VNodeChild,
  watch,
} from "vue";

import { elementRef } from "../attrs";
import { useExternalStore, useScopeActivity } from "../store";
export type CommandPaletteSlots = NeutralSlots<VNodeChild, KeyboardEvent>;
export type CommandPaletteChromeProps = NeutralProps<VNodeChild, KeyboardEvent>;
export const CommandPaletteChrome = defineComponent(
  (props: CommandPaletteChromeProps) => {
    const active = useScopeActivity();
    const list = createCommandList();
    const snapshot = useExternalStore(list);
    const surface = shallowRef<HTMLElement | null>(null);
    const input = shallowRef<HTMLInputElement | null>(null);
    let opener: HTMLElement | null = null;
    const id = `adapttable-commands-${useId()}`;
    const restore = () => {
      const back = opener;
      opener = null;
      const doc = back?.ownerDocument;
      if (
        back?.isConnected &&
        (!doc?.activeElement ||
          doc.activeElement === doc.body ||
          surface.value?.contains(doc.activeElement))
      )
        back.focus();
    };
    watch(
      () => props.open,
      (open) => {
        if (open) list.reset();
        else restore();
      },
      { flush: "sync" }
    );
    watch(
      [active, surface, () => props.open],
      ([live, root, open], _previous, onCleanup) => {
        if (!live || !root || !open) return;
        const down = (event: PointerEvent) => {
          if (!event.composedPath().includes(root)) props.onClose();
        };
        root.ownerDocument.addEventListener("pointerdown", down);
        onCleanup(() => {
          root.ownerDocument.removeEventListener("pointerdown", down);
        });
      },
      { flush: "sync" }
    );
    onScopeDispose(restore);
    watch(active, (live) => {
      if (!live) restore();
    });
    const surfaceRef = elementRef<HTMLElement>((element) => {
      surface.value = element;
    });
    const focusInput = (element: HTMLInputElement | null) => {
      const arrived = element !== null && input.value !== element;
      input.value = element;
      if (!arrived || !props.open || !active.value) return;
      const current = element.ownerDocument.activeElement;
      if (opener === null && current instanceof HTMLElement) opener = current;
      void nextTick(() => {
        if (active.value && props.open && input.value === element)
          element.focus();
      });
    };
    watch(active, (live) => {
      if (live && props.open && input.value) focusInputAfterMount();
    });
    function focusInputAfterMount() {
      const element = input.value;
      if (!element) return;
      const current = element.ownerDocument.activeElement;
      if (
        opener === null &&
        current instanceof HTMLElement &&
        current !== element
      )
        opener = current;
      element.focus();
    }
    const run = (
      command: ReturnType<typeof commandListView>["matches"][number] | undefined
    ) => {
      if (!active.value) return;
      runCommand(
        command
          ? {
              ...command,
              onSelect: () => {
                void nextTick(() => {
                  if (active.value) command.onSelect();
                });
              },
            }
          : undefined,
        props.onClose
      );
    };
    const key = (event: KeyboardEvent) => {
      if (!active.value || event.defaultPrevented || event.isComposing) return;
      const root = surface.value;
      if (
        event.target instanceof Element &&
        event.target.closest('[role="dialog"],[role="menu"]') !==
          root?.closest('[role="dialog"],[role="menu"]')
      )
        return;
      const action = commandListKeyAction(
        event.key,
        commandListView(props.commands, snapshot.value)
      );
      if (action) {
        event.preventDefault();
        event.stopPropagation();
        if (action.kind === "close") props.onClose();
        else if (action.kind === "run") run(action.command);
        else list.setActive(action.to);
        return;
      }
      if (event.key !== "Tab" || !root) return;
      const targets = [
        ...root.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
        ),
      ];
      const target = tabTrapTarget(
        targets,
        root.ownerDocument.activeElement,
        event.shiftKey
      );
      if (target instanceof HTMLElement) {
        event.preventDefault();
        target.focus();
      }
    };
    return () => {
      for (const name of ["Surface", "Input", "Item", "Empty"] as const)
        if (typeof props.slots[name] !== "function")
          throw new Error(
            `AdaptTable: CommandPaletteChrome requires the ${name} control slot.`
          );
      if (!props.open || !active.value) return null;
      const { matches, active: at } = commandListView(
        props.commands,
        snapshot.value
      );
      const slots = props.slots;
      return slots.Surface({
        label: props.labels?.commandPalette ?? "Command palette",
        onClose: props.onClose,
        className: props.className,
        children: h("div", { ref: surfaceRef, onKeydown: key }, [
          slots.Input({
            inputProps: {
              value: snapshot.value.query,
              onChange: (next) => list.setQuery(next),
              onKeyDown: key,
              ref: focusInput,
              role: "combobox",
              "aria-expanded": true,
              "aria-controls": id,
              "aria-activedescendant": matches[at]
                ? `${id}-${matches[at].key}`
                : undefined,
              "aria-label": props.labels?.commandSearch ?? "Search commands",
              placeholder: props.labels?.commandSearch ?? "Search commands",
              "data-adapttable-part": "command-input",
            },
          }),
          h(
            "div",
            {
              id,
              role: "listbox",
              "aria-label": props.labels?.commandPalette ?? "Command palette",
              "data-adapttable-part": "command-list",
            },
            matches.map((command, index) =>
              h("div", { key: command.key, style: { display: "contents" } }, [
                slots.Item({
                  command,
                  active: index === at,
                  itemProps: {
                    id: `${id}-${command.key}`,
                    role: "option",
                    "aria-selected": index === at,
                    "aria-disabled": command.disabled,
                    "data-adapttable-part": "command-item",
                    onClick: () => run(command),
                    onMouseEnter: () => list.setActive(index),
                  },
                }),
              ])
            )
          ),
          matches.length === 0
            ? slots.Empty({
                message: props.labels?.commandEmpty ?? "No matching command",
              })
            : null,
        ]),
      });
    };
  },
  {
    name: "CommandPaletteChrome",
    props: ["commands", "open", "onClose", "labels", "className", "slots"],
  }
);
