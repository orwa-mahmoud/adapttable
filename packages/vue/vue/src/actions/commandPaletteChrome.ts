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
  computed,
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
export type CommandPaletteSurfaceSlotProps = Parameters<
  NeutralSlots<VNodeChild, KeyboardEvent>["Surface"]
>[0] & {
  readonly open?: boolean;
  readonly isCurrent?: () => boolean;
  readonly getOpener?: () => HTMLElement | null;
};
export interface ManagedCommandPaletteSurfaceProps extends CommandPaletteSurfaceSlotProps {
  readonly open: boolean;
  readonly isCurrent: () => boolean;
  readonly getOpener: () => HTMLElement | null;
}
export interface CommandPaletteSurfaceSlot {
  (props: CommandPaletteSurfaceSlotProps): VNodeChild;
  readonly interactionOwner?: "kit";
}
export interface CommandPaletteSlots extends Omit<
  NeutralSlots<VNodeChild, KeyboardEvent>,
  "Surface"
> {
  readonly Surface: CommandPaletteSurfaceSlot;
}
export interface CommandPaletteChromeProps extends Omit<
  NeutralProps<VNodeChild, KeyboardEvent>,
  "slots"
> {
  readonly slots: CommandPaletteSlots;
}
/** A complete surface owns focus, Tab trapping, Escape and outside dismissal. */
export function managedCommandPaletteSurface(
  render: (props: ManagedCommandPaletteSurfaceProps) => VNodeChild
): CommandPaletteSurfaceSlot {
  return Object.assign(
    (props: CommandPaletteSurfaceSlotProps) => {
      if (props.open === undefined || !props.isCurrent || !props.getOpener)
        throw new Error(
          "AdaptTable: a managed command surface requires its Chrome lifetime contract."
        );
      return render({
        ...props,
        open: props.open,
        isCurrent: props.isCurrent,
        getOpener: props.getOpener,
      });
    },
    { interactionOwner: "kit" as const }
  );
}
export const CommandPaletteChrome = /*#__PURE__*/ defineComponent(
  (props: CommandPaletteChromeProps) => {
    const active = useScopeActivity();
    const managed = computed(
      () =>
        typeof props.slots.Surface === "function" &&
        props.slots.Surface.interactionOwner === "kit"
    );
    let generation = 0;
    watch(
      [() => props.slots.Surface, () => props.commands],
      () => {
        generation++;
      },
      { flush: "sync" }
    );
    watch(
      active,
      (live) => {
        if (!live) generation++;
      },
      { flush: "sync" }
    );
    onScopeDispose(() => {
      generation++;
    });
    const lifetime = () => {
      const at = generation;
      const driver = props.slots.Surface;
      return () =>
        active.value && at === generation && driver === props.slots.Surface;
    };
    const list = createCommandList();
    const snapshot = useExternalStore(list);
    const surface = shallowRef<HTMLElement | null>(null);
    const input = shallowRef<HTMLInputElement | null>(null);
    let opener: HTMLElement | null = null;
    const id = `adapttable-commands-${useId()}`;
    const restore = () => {
      if (managed.value) return;
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
        if (open) {
          opener = null;
          generation++;
          list.reset();
        } else restore();
      },
      { flush: "sync" }
    );
    watch(
      [active, surface, () => props.open, managed],
      ([live, root, open, owned], _previous, onCleanup) => {
        if (!live || !root || !open || owned) return;
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
      if (managed.value) return;
      const currentLifetime = lifetime();
      void nextTick(() => {
        if (
          currentLifetime() &&
          props.open &&
          !managed.value &&
          input.value === element
        )
          element.focus();
      });
    };
    watch(active, (live) => {
      if (live && props.open && input.value && !managed.value)
        focusInputAfterMount();
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
      if (!active.value || (managed.value && !props.open)) return;
      const current = lifetime();
      const owned = managed.value;
      runCommand(
        command
          ? {
              ...command,
              onSelect: () => {
                void nextTick(() => {
                  if (active.value && (!owned || current())) command.onSelect();
                });
              },
            }
          : undefined,
        props.onClose
      );
    };
    const key = (event: KeyboardEvent) => {
      if (
        !active.value ||
        event.defaultPrevented ||
        event.isComposing ||
        (managed.value && !props.open)
      )
        return;
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
      if (action?.kind === "close" && managed.value) return;
      if (action) {
        event.preventDefault();
        event.stopPropagation();
        if (action.kind === "close") props.onClose();
        else if (action.kind === "run") run(action.command);
        else list.setActive(action.to);
        return;
      }
      if (event.key !== "Tab" || !root || managed.value) return;
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
      const isCurrent = lifetime();
      const close = () => {
        if (isCurrent() && props.open) props.onClose();
      };
      return slots.Surface({
        label: props.labels?.commandPalette ?? "Command palette",
        onClose: managed.value ? close : props.onClose,
        ...(managed.value
          ? { open: props.open, isCurrent, getOpener: () => opener }
          : {}),
        className: props.className,
        children: h("div", { ref: surfaceRef, onKeydown: key }, [
          slots.Input({
            inputProps: {
              value: snapshot.value.query,
              onChange: (next) => {
                if (isCurrent() && props.open) list.setQuery(next);
              },
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
                    onClick: () => {
                      if (isCurrent() && props.open) run(command);
                    },
                    onMouseEnter: () => {
                      if (isCurrent() && props.open) list.setActive(index);
                    },
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
