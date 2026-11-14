import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import type {
  AgentApprovalProps,
  TableAssistantProps,
} from "@adapttable/vue/adapter";
import { expect, vi } from "vitest";
import {
  type Component,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
  type VNode,
} from "vue";

/** A Vue kit as the shared assistant suite drives it. */
export interface VueAssistantKit {
  /** The kit's `DataTable`. */
  readonly DataTable: Component;
  /** The kit's `TableAssistant`. */
  readonly TableAssistant: Component;
  /** The kit's `tableAssistant` feature factory. */
  readonly tableAssistant: () => unknown;
  /** The kit's `AgentApproval`. */
  readonly AgentApproval: Component;
  /** The kit's `agentApproval` feature factory. */
  readonly agentApproval: () => {
    readonly id: string;
    readonly renders?: readonly unknown[];
  };
  /** Mounts a render function in an app the kit has set up. */
  readonly mount: (render: () => VNode) => {
    readonly host: HTMLElement;
    readonly unmount: () => void;
  };
}

/**
 * The shared assistant suite: a kit's registered assistant, its sheet under
 * `KeepAlive`, and its approval review behave alike.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function assistantSurfacesTests(
  kit: VueAssistantKit
): readonly ConformanceTest[] {
  return collectConformanceTests(({ it, afterEach }) => {
    const stops: (() => void)[] = [];
    afterEach(() => {
      for (const stop of stops.splice(0)) stop();
      document.body.replaceChildren();
    });
    async function flush() {
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 25));
      await nextTick();
    }
    const part = (name: string) => `[data-adapttable-part="${name}"]`;
    function element<T extends HTMLElement>(selector: string): T {
      const found = document.querySelector<T>(selector);
      if (!found) throw new Error(`Missing ${selector}`);
      return found;
    }
    function mount(render: () => VNode) {
      const mounted = kit.mount(render);
      stops.push(mounted.unmount);
      return mounted.host;
    }
    function view(): TableAssistantProps["assistant"] {
      return {
        status: "ready",
        messages: [],
        draft: "",
        setDraft: vi.fn(),
        send: vi.fn(),
        stop: vi.fn(),
        suggestions: [
          {
            id: "one",
            title: "Find Ada",
            description: "Locate a matching row",
          },
        ],
        runSuggestion: vi.fn(),
      };
    }

    it("renders the registered assistant feature with the table's class context and host draft", async () => {
      const assistant = view();
      const changed = vi.fn();
      const host = mount(() =>
        h(kit.DataTable, {
          data: [{ id: "a", name: "Ada" }],
          columns: [{ key: "name" }],
          rowKey: (row: { id: string }) => row.id,
          forceMobile: false,
          urlSync: false,
          features: [kit.tableAssistant()],
          assistant: {
            assistant,
            open: true,
            onOpenChange: changed,
            presentation: "panel",
          },
        })
      );
      await flush();
      expect(host.textContent).toContain("Ada");
      expect(host.querySelector(part("assistant-panel"))).not.toBeNull();
      element<HTMLButtonElement>(part("assistant-close")).click();
      await flush();
      expect(changed).toHaveBeenCalledExactlyOnceWith(false);
      expect(host.querySelector(part("assistant-panel"))).not.toBeNull();
    });

    it("retires assistant sheet and menu portals in KeepAlive and preserves host focus", async () => {
      const visible = shallowRef(true);
      const open = shallowRef(true);
      const assistant: TableAssistantProps["assistant"] = {
        status: "ready",
        messages: [],
        draft: "",
        setDraft: vi.fn(),
        send: vi.fn(),
        stop: vi.fn(),
        suggestions: [{ id: "one", title: "One" }],
        runSuggestion: vi.fn(),
      };
      const Child = defineComponent({
        render: () =>
          h(kit.TableAssistant, {
            assistant,
            open: open.value,
            onOpenChange: (value: boolean) => {
              open.value = value;
            },
            presentation: "sheet",
          }),
      });
      const Other = defineComponent({ render: () => h("p", "Paused") });
      mount(() =>
        h("div", [
          h("input", { id: "assistant-outside" }),
          h(KeepAlive, null, {
            default: () => (visible.value ? h(Child) : h(Other)),
          }),
        ])
      );
      await flush();
      element<HTMLButtonElement>(part("assistant-examples-menu")).click();
      await flush();
      expect(document.querySelector('[role="menu"]')).not.toBeNull();
      visible.value = false;
      await nextTick();
      const outside = element<HTMLInputElement>("#assistant-outside");
      outside.focus();
      await flush();
      expect(document.querySelector(part("assistant-sheet"))).toBeNull();
      expect(document.querySelector('[role="menu"]')).toBeNull();
      expect(document.activeElement).toBe(outside);
      visible.value = true;
      await flush();
      expect(document.querySelectorAll(part("assistant-sheet"))).toHaveLength(
        1
      );
      expect(document.querySelector('[role="menu"]')).toBeNull();
      expect(document.activeElement).toBe(element(part("assistant-input")));
    });

    it("keeps approval decisions scoped to the current proposal", async () => {
      const first = vi.fn();
      const second = vi.fn();
      const make = (approve: () => void): AgentApprovalProps["pending"] => ({
        presentation: "table",
        identity: Object.freeze({}),
        proposals: [
          { rowKey: "a", column: "name", before: "Ada", after: "Grace" },
        ],
        decisions: ["pending"],
        approve,
        reject: vi.fn(),
      });
      const pending = shallowRef(make(first));
      mount(() => h(kit.AgentApproval, { pending: pending.value }));
      await flush();
      element<HTMLButtonElement>(part("agent-approval-approve")).click();
      pending.value = make(second);
      await flush();
      expect(first).not.toHaveBeenCalled();
      expect(second).not.toHaveBeenCalled();
      element<HTMLButtonElement>(part("agent-approval-approve")).click();
      await flush();
      expect(second).toHaveBeenCalledTimes(1);
    });

    it("registers the approval feature through the kit's own component", () => {
      const feature = kit.agentApproval();
      expect(feature.id).toBeTruthy();
      expect(feature.renders?.length ?? 0).toBeGreaterThan(0);
    });
  });
}
