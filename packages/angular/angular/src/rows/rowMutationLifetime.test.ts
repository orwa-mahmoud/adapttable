/** Delayed row confirmation cannot outlive the mutation controller's owner. */
import {
  type ConfirmRequest,
  resolveLabels,
  runRowAction,
} from "@adapttable/core";
import { Component, Injector } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import { injectRowMutations } from "./rowMutations";

@Component({ template: "" })
class Host {
  readonly add = vi.fn();
  readonly copy = vi.fn();
  readonly remove = vi.fn();
  readonly mutations = injectRowMutations({
    labels: resolveLabels(undefined),
    onAddRow: this.add,
    onDuplicateRow: this.copy,
    onDeleteRow: this.remove,
  });
}

describe("row mutation lifetime", () => {
  it("rejects delayed confirmation and retained add/copy/delete callbacks after destruction", () => {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    const state = host.mutations();
    const row = { id: "one" };
    const confirm = vi.fn<(request: ConfirmRequest) => void>();
    runRowAction(state.actions[1]!, row, confirm, "Cancel");
    expect(confirm).toHaveBeenCalledOnce();
    fixture.destroy();
    confirm.mock.calls[0]![0].onConfirm();
    state.addRow();
    state.actions[0]!.onClick!(row);
    state.actions[1]!.onClick!(row);
    expect(host.add).not.toHaveBeenCalled();
    expect(host.copy).not.toHaveBeenCalled();
    expect(host.remove).not.toHaveBeenCalled();
  });

  it("follows an explicit child injector's lifetime while its parent remains alive", () => {
    const injector = Injector.create({
      providers: [],
      parent: TestBed.inject(Injector),
    });
    const add = vi.fn();
    const remove = vi.fn();
    const state = injectRowMutations(
      { labels: resolveLabels(undefined), onAddRow: add, onDeleteRow: remove },
      injector
    )();
    state.addRow();
    const confirm = vi.fn<(request: ConfirmRequest) => void>();
    runRowAction(state.actions[0]!, { id: "one" }, confirm, "Cancel");
    injector.destroy();
    confirm.mock.calls[0]![0].onConfirm();
    state.addRow();
    expect(add).toHaveBeenCalledOnce();
    expect(remove).not.toHaveBeenCalled();
  });

  it("does not cancel a host promise started before destruction", async () => {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const complete = vi.fn();
    host.remove.mockImplementation(() => pending.then(complete));
    const confirm = vi.fn<(request: ConfirmRequest) => void>();
    runRowAction(
      host.mutations().actions[1]!,
      { id: "one" },
      confirm,
      "Cancel"
    );
    confirm.mock.calls[0]![0].onConfirm();
    expect(host.remove).toHaveBeenCalledOnce();
    fixture.destroy();
    finish();
    await Promise.resolve();
    expect(complete).toHaveBeenCalledOnce();
  });
});
