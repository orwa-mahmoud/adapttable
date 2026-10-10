// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { AgentApproval, TableAssistant } from "../src/assistant";
describe("assistant SSR", () => {
  it("renders isolated text and inert sheet markup without browser globals", async () => {
    const render = (text: string) =>
      renderToString(
        createSSRApp({
          render: () =>
            h(TableAssistant, {
              open: true,
              presentation: "sheet",
              onOpenChange: () => undefined,
              greeting: "",
              assistant: {
                status: "disconnected",
                messages: [{ id: "one", role: "assistant", text }],
                draft: "",
                setDraft: () => undefined,
                send: () => undefined,
                stop: () => undefined,
                suggestions: [],
                runSuggestion: () => undefined,
              },
            }),
        })
      );
    const [one, two] = await Promise.all([render("<first>"), render("second")]);
    expect(one).toContain("&lt;first&gt;");
    expect(two).not.toContain("first");
    expect(one).toContain("<dialog");
    expect(one).not.toContain(" open");
    expect(one).not.toContain('data-adapttable-part="assistant-voice"');
  });
  it("renders a native examples disclosure and dedicated approval announcement on the server", async () => {
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h("main", [
            h(TableAssistant, {
              open: true,
              onOpenChange: () => undefined,
              greeting: "",
              avatars: { assistant: "Ada Lovelace" },
              assistant: {
                status: "ready",
                messages: [{ id: "one", role: "assistant", text: "Ready" }],
                draft: "",
                setDraft: () => undefined,
                send: () => undefined,
                stop: () => undefined,
                suggestions: [
                  { id: "one", title: "One", description: "A real command" },
                ],
                runSuggestion: () => undefined,
              },
            }),
            h(AgentApproval, {
              pending: {
                presentation: "table",
                proposals: [{ rowKey: "one", after: "new" }],
                decisions: ["pending"],
                approve: () => undefined,
                reject: () => undefined,
              },
            }),
          ]),
      })
    );
    expect(html).toContain(
      '<details data-adapttable-part="assistant-examples"'
    );
    expect(html).toContain('data-adapttable-part="assistant-examples-list"');
    expect(html).toContain("A real command");
    expect(html).toContain(
      'data-adapttable-part="assistant-initials">AL</span>'
    );
    expect(html).toContain(
      'data-adapttable-part="agent-approval-status" aria-live="polite" aria-atomic="true"'
    );
    expect(html).not.toContain("<details open");
  });
});
