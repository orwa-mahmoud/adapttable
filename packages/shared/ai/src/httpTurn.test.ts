import { describe, expect, it } from "vitest";

import { AgentTurnError, createPhasePlan, isQuestionTool } from "./httpTurn";

const CONTEXT = { tableId: "orders", turnId: "t-1", phaseId: 0 };

const PAGE_TWO = { id: "c0", name: "view.setPage", args: { page: 2 } };
const SORT_NAME = { id: "c1", name: "view.setSort", args: { key: "name" } };
const DESCRIBE_EDIT = {
  id: "q0",
  name: "describe",
  args: { keys: ["edit.cells"] },
};
const READ_ONE = { id: "q1", name: "read", args: { offset: 0, limit: 1 } };

describe("which tools are questions", () => {
  it("counts only describe and read", () => {
    expect(isQuestionTool("describe")).toBe(true);
    expect(isQuestionTool("read")).toBe(true);
    expect(isQuestionTool("view.setPage")).toBe(false);
    expect(isQuestionTool("rows.read")).toBe(false);
  });
});

describe("the pending plan of one phase", () => {
  it("finalizes a reply that asks nothing", () => {
    const phase = createPhasePlan(CONTEXT);
    const outcome = phase.absorb({ toolCalls: [PAGE_TWO] });

    expect(outcome.kind).toBe("ready");
    expect(phase.state()).toBe("ready");
    expect(phase.finalized()).toHaveLength(1);
    expect(phase.finalized()[0]?.key).toBe("view.setPage");
  });

  it("holds a proposal while the same reply is still asking", () => {
    const phase = createPhasePlan(CONTEXT);
    const outcome = phase.absorb({ toolCalls: [PAGE_TWO, READ_ONE] });

    expect(outcome.kind).toBe("questions");
    expect(phase.state()).toBe("discovering");
    // Held, not run: the backend has not said it is done deciding.
    expect(phase.pending()).toHaveLength(1);
    expect(phase.finalized()).toEqual([]);
  });

  it("replaces a proposal rather than adding to it", () => {
    const phase = createPhasePlan(CONTEXT);
    phase.absorb({ toolCalls: [PAGE_TWO, READ_ONE] });
    // The same intention again, on the next round. Appending is what used to
    // turn one repeated call into two writes.
    phase.absorb({ toolCalls: [PAGE_TWO, READ_ONE] });
    const outcome = phase.absorb({ toolCalls: [PAGE_TWO] });

    expect(outcome.kind).toBe("ready");
    expect(phase.finalized()).toHaveLength(1);
  });

  it("lets a later round revise what an earlier one proposed", () => {
    const phase = createPhasePlan(CONTEXT);
    phase.absorb({ toolCalls: [PAGE_TWO, DESCRIBE_EDIT] });
    const outcome = phase.absorb({ toolCalls: [SORT_NAME] });

    expect(outcome.kind).toBe("ready");
    expect(phase.finalized().map((call) => call.key)).toEqual(["view.setSort"]);
  });

  it("keeps a standing proposal when a round only asks", () => {
    const phase = createPhasePlan(CONTEXT);
    phase.absorb({ toolCalls: [PAGE_TWO, DESCRIBE_EDIT] });
    // A pure question says nothing about the plan, so the plan survives to
    // travel back as context the backend can revise.
    phase.absorb({ toolCalls: [READ_ONE] });

    expect(phase.pending().map((call) => call.name)).toEqual(["view.setPage"]);
  });

  it("runs nothing when the settling reply supplies nothing", () => {
    const phase = createPhasePlan(CONTEXT);
    phase.absorb({ toolCalls: [PAGE_TWO, DESCRIBE_EDIT] });
    // A ready reply is the complete plan. Carrying the earlier proposal over
    // implicitly would run work the backend did not restate.
    const outcome = phase.absorb({ toolCalls: [] });

    expect(outcome.kind).toBe("ready");
    expect(phase.finalized()).toEqual([]);
  });

  it("gives two deliberately identical calls two identities", () => {
    const phase = createPhasePlan(CONTEXT);
    const add = { name: "rows.add", args: { values: { name: "Ada" } } };
    phase.absorb({
      toolCalls: [
        { ...add, id: "a" },
        { ...add, id: "b" },
      ],
    });

    const [first, second] = phase.finalized();
    expect(first?.idempotencyKey).not.toBe(second?.idempotencyKey);
    // Position, never the payload: equal arguments are two intentions here.
    expect(first?.idempotencyKey).toContain('"index":0');
    expect(second?.idempotencyKey).toContain('"index":1');
  });

  it("mints the same identity for the same phase delivered twice", () => {
    const first = createPhasePlan(CONTEXT).absorb({ toolCalls: [PAGE_TWO] });
    const again = createPhasePlan(CONTEXT).absorb({ toolCalls: [PAGE_TWO] });

    expect(first.kind).toBe("ready");
    expect(again.kind).toBe("ready");
    if (first.kind !== "ready" || again.kind !== "ready") return;
    expect(first.plan[0]?.idempotencyKey).toBe(again.plan[0]?.idempotencyKey);
  });

  it("gives a later phase of the same turn different identities", () => {
    const first = createPhasePlan(CONTEXT).absorb({ toolCalls: [PAGE_TWO] });
    const second = createPhasePlan({ ...CONTEXT, phaseId: 1 }).absorb({
      toolCalls: [PAGE_TWO],
    });

    if (first.kind !== "ready" || second.kind !== "ready") {
      throw new Error("both phases should have settled");
    }
    expect(first.plan[0]?.idempotencyKey).not.toBe(
      second.plan[0]?.idempotencyKey
    );
  });

  it("keeps the arguments out of the identity", () => {
    const phase = createPhasePlan(CONTEXT);
    phase.absorb({
      toolCalls: [
        { id: "c0", name: "view.setSearch", args: { search: "secret-term" } },
      ],
    });

    expect(phase.finalized()[0]?.idempotencyKey).not.toContain("secret-term");
  });

  it("answers a redelivery of a finalized phase with the same plan", () => {
    const phase = createPhasePlan(CONTEXT);
    phase.absorb({ toolCalls: [PAGE_TWO] });
    const again = phase.absorb({ toolCalls: [PAGE_TWO] });

    expect(again.kind).toBe("ready");
    if (again.kind !== "ready") return;
    expect(again.plan).toHaveLength(1);
    expect(again.plan[0]?.idempotencyKey).toBe(
      phase.finalized()[0]?.idempotencyKey
    );
  });

  it("refuses a finalized phase that comes back as different work", () => {
    const phase = createPhasePlan(CONTEXT);
    phase.absorb({ toolCalls: [PAGE_TWO] });

    expect(() => phase.absorb({ toolCalls: [SORT_NAME] })).toThrow(
      AgentTurnError
    );
    expect(() => phase.absorb({ toolCalls: [SORT_NAME] })).toThrow(
      /already finalized with different calls/
    );
  });

  it("does not rewind a phase that is already running", () => {
    const phase = createPhasePlan(CONTEXT);
    phase.absorb({ toolCalls: [PAGE_TWO] });
    phase.begin();
    phase.absorb({ toolCalls: [PAGE_TWO] });

    expect(phase.state()).toBe("executing");
  });

  it("refuses two calls that share one id", () => {
    const phase = createPhasePlan(CONTEXT);

    expect(() =>
      phase.absorb({ toolCalls: [PAGE_TWO, { ...SORT_NAME, id: PAGE_TWO.id }] })
    ).toThrow(/share the id/);
  });

  it("waits on the reader when the backend asks a question", () => {
    const phase = createPhasePlan(CONTEXT);
    const outcome = phase.absorb({
      toolCalls: [PAGE_TWO],
      askUser: { id: "q", question: "Which region?", allowFreeText: true },
    });

    expect(outcome.kind).toBe("ask-user");
    expect(phase.state()).toBe("awaiting-user");
    // The proposal survives the question rather than being run behind it.
    expect(phase.pending()).toHaveLength(1);
    expect(phase.finalized()).toEqual([]);
  });

  it("records how a phase ended", () => {
    const phase = createPhasePlan(CONTEXT);
    phase.absorb({ toolCalls: [PAGE_TWO] });
    phase.begin();
    phase.settle("cancelled");

    expect(phase.state()).toBe("cancelled");
  });
});
