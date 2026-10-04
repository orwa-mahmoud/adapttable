// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { TableAssistant } from "../src/assistant";
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
});
