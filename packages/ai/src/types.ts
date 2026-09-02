import type { TableSourceCapabilities } from "@adapttable/core";

import type { CapabilityKey, RowAddressScope, WritePolicy } from "./keys";

/** JSON Schema (draft 2020-12 subset) returned by `describe`. */
export interface JsonSchema {
  readonly $schema?: string;
  readonly type?: string | readonly string[];
  readonly properties?: Readonly<Record<string, JsonSchema>>;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean | JsonSchema;
  readonly items?: JsonSchema;
  readonly enum?: readonly unknown[];
  readonly const?: unknown;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly minLength?: number;
  readonly description?: string;
}

/** One column the agent may mention. Never includes cell values. */
export interface AgentColumn {
  readonly id: string;
  readonly label: string;
  readonly type: string;
  readonly readable: boolean;
  readonly writable: boolean;
  readonly sortable: boolean;
}

/** Snapshot published to a runtime. Never includes row payloads. */
export interface AgentManifest {
  readonly schemaVersion: string;
  readonly tableId: string;
  readonly viewRevision: number;
  readonly capabilities: readonly CapabilityKey[];
  readonly columns: readonly AgentColumn[];
  readonly rowAddressing: {
    readonly scope: RowAddressScope;
    readonly key: string;
  };
  readonly limits: {
    readonly pageMax: number;
  };
  readonly policy: {
    readonly write: WritePolicy;
  };
  /** Data-layer facts from item 5-A — never re-inferred here. */
  readonly source: TableSourceCapabilities;
}

/** Catalog row — key plus a short English summary. */
export interface CatalogEntry {
  readonly key: CapabilityKey;
  readonly summary: string;
}

/** Lazy capability contract. */
export interface CapabilityGuide {
  readonly key: CapabilityKey;
  readonly schemaVersion: string;
  readonly guide: string;
  readonly input: JsonSchema;
  readonly output: JsonSchema;
}

/** Result of one `execute` call. */
export interface ExecuteResult {
  readonly ok: boolean;
  readonly revision: number;
  readonly idempotencyKey: string;
  readonly result?: unknown;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}

/**
 * What is actually wired on this table right now.
 *
 * The session never guesses from package availability.
 */
export interface AgentObservation {
  readonly tableId: string;
  readonly viewRevision: number;
  readonly featureIds: readonly string[];
  readonly columns: readonly AgentColumn[];
  readonly source: TableSourceCapabilities;
  readonly writePolicy: WritePolicy;
  readonly hasPagination: boolean;
  readonly hasSearch: boolean;
  readonly hasSort: boolean;
  readonly hasFilters: boolean;
  readonly hasExport: boolean;
  readonly hasEdit: boolean;
  readonly hasReorder: boolean;
  readonly page: number;
  readonly limit: number;
  readonly search: string;
  readonly sortBy?: string;
  readonly sortDir?: "asc" | "desc";
  readonly groupBy?: string;
  readonly filters?: unknown;
  readonly rowAddressScope: RowAddressScope;
  readonly pageMax: number;
}

/** Host- or feature-applied mutation. */
export interface AgentApply {
  setPage?(page: number): void;
  setLimit?(limit: number): void;
  setSearch?(search: string): void;
  setSort?(key: string | undefined, dir?: "asc" | "desc"): void;
  setFilters?(filters: unknown): void;
  setGroupBy?(key: string | undefined): void;
  runExport?(format: string): Promise<unknown> | void;
  editCells?(
    edits: readonly { rowKey: string; column: string; value: unknown }[]
  ): Promise<unknown> | void;
  reorderRows?(fromKey: string, toKey: string): Promise<unknown> | void;
}

/** Session the three-stage contract speaks. */
export interface AgentSession {
  catalog(): readonly CatalogEntry[];
  describe(key: string): CapabilityGuide;
  execute(
    key: string,
    args: unknown,
    expectedRevision: number,
    idempotencyKey: string
  ): Promise<ExecuteResult>;
  manifest(): AgentManifest;
}

/** How a host receives live updates. */
export interface TableAgentBridge {
  publish?(manifest: AgentManifest): void;
  attach?(session: AgentSession): void;
}
