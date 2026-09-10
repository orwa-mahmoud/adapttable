import { describe, expect, it } from "vitest";

import { agentSystemPrompt } from "./agentPrompt";

const request = {
  tableId: "staff",
  catalog: [
    { key: "view.setFilters", summary: "Replace the active filters." },
    { key: "view.setSort", summary: "Set the sort chain." },
  ],
  manifest: {
    viewRevision: 4,
    columns: [
      {
        id: "status",
        label: "Status",
        readable: true,
        writable: false,
      },
      { id: "ssn", label: "SSN", readable: false, writable: false },
    ],
  },
};

describe("agentSystemPrompt", () => {
  it("names this table, revision, catalog keys and column flags", () => {
    const prompt = agentSystemPrompt(request);
    expect(prompt).toContain("Table staff revision 4.");
    expect(prompt).toContain("- view.setFilters: Replace the active filters.");
    expect(prompt).toContain("- view.setSort: Set the sort chain.");
    expect(prompt).toContain("- status (Status, readable, read-only)");
    expect(prompt).toContain("- ssn (SSN, hidden, read-only)");
  });

  it("ships the default HTTP agent rules", () => {
    const prompt = agentSystemPrompt(request);
    expect(prompt).toContain("emit those actions in this same reply");
    expect(prompt).toContain(
      "Do not ask them to confirm, pick a sort direction"
    );
    expect(prompt).toContain("highest/huge/biggest first is desc");
    expect(prompt).toContain("never invent a count");
    expect(prompt).toContain("the field is key, never column");
    expect(prompt).toContain('"filters":{"status":["Active"]}');
    expect(prompt).toContain(
      "needs.describe and needs.read are silent machine requests"
    );
    expect(prompt).not.toMatch(/SKILL\.md/);
    expect(prompt).not.toMatch(/"side"\s*:/);
  });
});
