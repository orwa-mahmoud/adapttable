/**
 * What a table's pages actually are — one answer, for every binding.
 *
 * A page count is not a row count. A table holding eight loaded rows at ten a
 * page has one page, and a bound derived from the eight let an agent report
 * that it moved to page 2 of a table that has no page 2. Both bindings project
 * their runtime facts into {@link PaginationInput} and read the answer back
 * from here, so neither derives a page number of its own.
 *
 * Nothing in this module knows about React, an engine, or a transport.
 *
 * @packageDocumentation
 */

/**
 * The runtime facts a binding can state about its own source.
 *
 * Every optional field means "this source cannot say", which is different from
 * zero and is carried through as unknown rather than guessed.
 *
 * @public
 */
export interface PaginationInput {
  /** 1-based page the view is on. */
  readonly page: number;
  /** Rows per page the view is asking for. */
  readonly pageSize: number;
  /** Page sizes the host offers, when it configures a set. */
  readonly pageSizeOptions?: readonly number[];
  /**
   * Rows matching the current query — the filtered total, never the whole
   * dataset and never the rows on screen. Absent when the source has not
   * counted them.
   */
  readonly totalRows?: number;
  /**
   * Rows loaded for the current page. Used only to notice a short page, which
   * is the one thing a source of unknown length still proves about its end.
   */
  readonly loadedRows?: number;
  /** The source states that this is the last page. */
  readonly atEnd?: boolean;
  /** Whether the host accepts a page number rather than only next/previous. */
  readonly canJump: boolean;
}

/**
 * The pagination an agent is permitted to reason about.
 *
 * `totalPages`, `hasNext` and `hasPrevious` are absent when nobody can answer
 * them. An absent field is a fact about the source; a present one was derived
 * mechanically from a number the source supplied.
 *
 * @public
 */
export interface AgentPagination {
  /** 1-based page the view is on. */
  readonly page: number;
  /** Rows per page. */
  readonly pageSize: number;
  /** Page sizes the host offers, when it configures a set. */
  readonly pageSizeOptions?: readonly number[];
  /** Rows matching the current query, when the source counted them. */
  readonly totalRows?: number;
  /** `ceil(totalRows / pageSize)`, only when `totalRows` is known. */
  readonly totalPages?: number;
  /** Whether a further page exists, when that is knowable. */
  readonly hasNext?: boolean;
  /** Whether an earlier page exists. Always knowable from the page number. */
  readonly hasPrevious: boolean;
  /** Whether a page number may be named, rather than only next and previous. */
  readonly canJump: boolean;
}

/** A whole number at or above one. */
function isPageNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

/**
 * Whether a further page exists.
 *
 * Three things can answer it and they are tried in order of authority: a
 * counted total, the source saying outright that it is finished, and a page
 * that came back shorter than it asked for — which only a source that fills
 * its pages can be read that way, so it is the last resort. When none of them
 * applies the answer is unknown, and unknown is reported rather than guessed.
 */
function nextPageExists(
  input: PaginationInput,
  totalPages?: number
): boolean | undefined {
  if (totalPages !== undefined) return input.page < totalPages;
  if (input.atEnd === true) return false;
  if (input.loadedRows !== undefined && input.loadedRows < input.pageSize) {
    return false;
  }
  return undefined;
}

/**
 * The pages this view actually has.
 *
 * @param input - What the binding's own source can state.
 * @returns The permitted pagination, with everything unknowable left absent.
 *
 * @public
 */
export function agentPagination(input: PaginationInput): AgentPagination {
  const pageSize = Math.max(1, Math.floor(input.pageSize));
  const page = isPageNumber(input.page) ? input.page : 1;
  // An empty result still has one page — the one the reader is looking at.
  const totalPages =
    input.totalRows === undefined
      ? undefined
      : Math.max(1, Math.ceil(input.totalRows / pageSize));
  return {
    page,
    pageSize,
    ...(input.pageSizeOptions
      ? { pageSizeOptions: input.pageSizeOptions }
      : {}),
    ...(input.totalRows === undefined ? {} : { totalRows: input.totalRows }),
    ...(totalPages === undefined ? {} : { totalPages }),
    ...(() => {
      const next = nextPageExists(input, totalPages);
      return next === undefined ? {} : { hasNext: next };
    })(),
    hasPrevious: page > 1,
    canJump: input.canJump,
  };
}

/**
 * Why a requested page cannot be served, or `undefined` when it can.
 *
 * Arithmetic a model should never be trusted with: the bound is checked here,
 * against the numbers the source supplied, and the sentence names both sides
 * so a backend can correct itself rather than retry blindly.
 *
 * @param pagination - The permitted pagination for the current query.
 * @param page - The 1-based page being asked for.
 * @returns A descriptive refusal, or `undefined`.
 *
 * @public
 */
export function pageRefusal(
  pagination: AgentPagination,
  page: unknown
): string | undefined {
  if (!isPageNumber(page)) {
    return `page must be a whole number of 1 or more, got ${JSON.stringify(page)}`;
  }
  if (pagination.totalPages !== undefined && page > pagination.totalPages) {
    return `page ${String(page)} is past the last page (${String(pagination.totalPages)} of ${String(pagination.totalRows ?? 0)} matching rows at ${String(pagination.pageSize)} a page)`;
  }
  if (
    pagination.totalPages === undefined &&
    pagination.hasNext === false &&
    page > pagination.page
  ) {
    return `this source reports no page after ${String(pagination.page)}`;
  }
  if (!pagination.canJump && Math.abs(page - pagination.page) > 1) {
    return `this source moves one page at a time from ${String(pagination.page)}; it cannot jump to ${String(page)}`;
  }
  return undefined;
}

/**
 * Why a requested page size cannot be served, or `undefined` when it can.
 *
 * @param pagination - The permitted pagination for the current query.
 * @param pageSize - The size being asked for.
 * @returns A descriptive refusal, or `undefined`.
 *
 * @public
 */
export function pageSizeRefusal(
  pagination: AgentPagination,
  pageSize: unknown
): string | undefined {
  if (!isPageNumber(pageSize)) {
    return `page size must be a whole number of 1 or more, got ${JSON.stringify(pageSize)}`;
  }
  const offered = pagination.pageSizeOptions;
  if (offered && !offered.includes(pageSize)) {
    return `page size ${String(pageSize)} is not offered; this table offers ${offered.join(", ")}`;
  }
  return undefined;
}
