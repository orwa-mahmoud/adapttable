/**
 * How much of a paged group model has been asked for.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useGroupPaging } from "./useGroupPaging";

describe("useGroupPaging", () => {
  it("starts with nothing revealed", () => {
    const { result } = renderHook(() => useGroupPaging());
    expect(result.current.paging).toEqual({});
  });

  it("reveals another page of top-level groups", () => {
    const { result } = renderHook(() => useGroupPaging());
    act(() => {
      result.current.showMore(25);
    });
    expect(result.current.paging.groups).toBe(25);
    act(() => {
      result.current.showMore(25);
    });
    expect(result.current.paging.groups).toBe(50);
  });

  it("reveals one group's rows without touching another's", () => {
    const { result } = renderHook(() => useGroupPaging());
    act(() => {
      result.current.showMore(10, "group:team:s:Core");
    });
    act(() => {
      result.current.showMore(10, "group:team:s:Web");
    });
    expect(result.current.paging.rows).toEqual({
      "group:team:s:Core": 10,
      "group:team:s:Web": 10,
    });
  });

  it("goes back to the first page of everything", () => {
    // What new data calls for: the old counts describe rows that are gone.
    const { result } = renderHook(() => useGroupPaging());
    act(() => {
      result.current.showMore(25);
      result.current.showMore(10, "group:team:s:Core");
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.paging).toEqual({});
  });
});
