// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { useTableAssistant } from "../src/assistant";
import { useSpeechInput } from "../src/speechInput";
import { newSession } from "./composables.test-utils";
describe("SSR", () => {
  it("keeps transport and microphone inert and requests isolated", async () => {
    const send = vi.fn(() => Promise.resolve({ text: "unused" }));
    const getUserMedia = vi.fn();
    const storage = vi.fn();
    vi.stubGlobal("localStorage", { getItem: storage });
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    const render = async (draft: string) => {
      const Root = defineComponent({
        setup() {
          const assistant = useTableAssistant({
            session: newSession(),
            transport: { send },
            messages: [{ id: "saved", role: "assistant", text: draft, at: 1 }],
          });
          const speech = useSpeechInput({
            voice: { mode: "backend" },
            setDraft: assistant.setDraft,
          });
          speech.start();
          return () =>
            h(
              "div",
              `${assistant.messages.value[0]?.text}:${speech.state.value.status}:${speech.available.value}`
            );
        },
      });
      return renderToString(createSSRApp(Root));
    };
    const first = await render("first");
    const second = await render("second");
    expect(first).toContain("first:unsupported:false");
    expect(second).toContain("second:unsupported:false");
    expect(second).not.toContain("first");
    expect(send).not.toHaveBeenCalled();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
