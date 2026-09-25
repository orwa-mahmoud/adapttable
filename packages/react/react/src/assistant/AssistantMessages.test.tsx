/**
 * One message as the transcript draws it: a voice clip's placeholder while
 * its words are still on the way, and the words once they land.
 */
import { defaultLabels, type TableLabels } from "@adapttable/core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { tableAssistantTestSlots } from "../internal/chromeTestSlots";
import { AssistantMessage } from "./AssistantMessages";
import type { TableAssistantMessageView } from "./assistantView";

function text(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    '[data-adapttable-part="assistant-message-text"]'
  );
}

function show(
  message: TableAssistantMessageView,
  labels: TableLabels | undefined
): ReturnType<typeof render> {
  return render(
    <ul>
      <AssistantMessage
        message={message}
        labels={labels}
        slots={tableAssistantTestSlots}
      />
    </ul>
  );
}

describe("a voice message still being transcribed", () => {
  const clip: TableAssistantMessageView = {
    id: "u-1",
    role: "user",
    text: "",
    transcribing: true,
  };

  it("reads as the localized placeholder, marked provisional", () => {
    show(clip, { ...defaultLabels, assistantVoiceMessage: "Sprachnachricht" });

    expect(text()?.textContent).toBe("Sprachnachricht");
    expect(text()?.dataset.streaming).toBe("true");
  });

  it("reads as the default placeholder when no labels are given", () => {
    show(clip, undefined);

    expect(text()?.textContent).toBe("Voice message");
    expect(text()?.dataset.streaming).toBe("true");
  });

  it("reads as its words once they arrive", () => {
    const { rerender } = show(clip, defaultLabels);
    expect(text()?.textContent).toBe(defaultLabels.assistantVoiceMessage);

    rerender(
      <ul>
        <AssistantMessage
          message={{ ...clip, text: "show open orders", transcribing: false }}
          labels={defaultLabels}
          slots={tableAssistantTestSlots}
        />
      </ul>
    );

    expect(text()?.textContent).toBe("show open orders");
    expect(text()?.dataset.streaming).toBeUndefined();
  });

  it("shows words that arrive while it is still marked transcribing", () => {
    show({ ...clip, text: "show open" }, defaultLabels);

    expect(text()?.textContent).toBe("show open");
    expect(text()?.dataset.streaming).toBe("true");
  });
});
