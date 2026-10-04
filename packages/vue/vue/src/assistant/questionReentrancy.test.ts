import { describe, expect, it, vi } from "vitest";

import type { TableAssistantView } from "./contracts";
import { admitQuestionAnswer, captureQuestionOwner } from "./questionAdmission";

describe("reentrant draft callbacks", () => {
  it.each(["dispose", "generation", "answer", "question"] as const)(
    "does not answer when clearing the draft changes %s ownership",
    async (change) => {
      let active = true;
      let generation = 0;
      const answer = vi.fn();
      const replacement = vi.fn();
      const question = {
        id: "question",
        question: "Choose?",
        allowFreeText: true,
      };
      let current: TableAssistantView = {
        status: "awaiting-user",
        messages: [
          { id: "message", role: "assistant", text: "Choose?", question },
        ],
        draft: "yes",
        setDraft: () => {
          if (change === "dispose") active = false;
          if (change === "generation") generation += 1;
          if (change === "answer")
            current = { ...current, answer: replacement };
          if (change === "question")
            current = {
              ...current,
              messages: [
                {
                  id: "message",
                  role: "assistant",
                  text: "Replacement",
                  question: { ...question },
                },
              ],
            };
        },
        send: vi.fn(),
        stop: vi.fn(),
        suggestions: [],
        runSuggestion: vi.fn(),
        answer,
      };
      const owner = captureQuestionOwner(current, question, 0);
      if (!owner) throw new Error("Question owner missing");
      await admitQuestionAnswer(
        {
          current: () => current,
          active: () => active,
          generation: () => generation,
        },
        owner,
        { text: "yes" },
        "yes"
      );
      expect(answer).not.toHaveBeenCalled();
      expect(replacement).not.toHaveBeenCalled();
    }
  );
  it("answers once when a draft callback updates presentation without replacing the owner", async () => {
    const answer = vi.fn();
    const question = {
      id: "question",
      question: "Choose?",
      allowFreeText: true,
    };
    let current: TableAssistantView = {
      status: "awaiting-user",
      messages: [
        { id: "message", role: "assistant", text: "Choose?", question },
      ],
      draft: "yes",
      setDraft: (draft) => {
        current = { ...current, draft };
      },
      send: vi.fn(),
      stop: vi.fn(),
      suggestions: [],
      runSuggestion: vi.fn(),
      answer,
    };
    const owner = captureQuestionOwner(current, question, 0);
    if (!owner) throw new Error("Question owner missing");
    await admitQuestionAnswer(
      { current: () => current, active: () => true, generation: () => 0 },
      owner,
      { text: "yes" },
      "yes"
    );
    expect(current.draft).toBe("");
    expect(answer).toHaveBeenCalledExactlyOnceWith({ text: "yes" });
  });
});
