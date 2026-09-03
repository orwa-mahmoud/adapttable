export function vitestMaxWorkers(env?: {
  ci?: boolean;
  turbo?: boolean;
  cores?: number;
}): number;

export function vitestFileParallelism(env?: { ci?: boolean }): boolean;
