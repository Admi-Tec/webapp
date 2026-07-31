import { vi } from "vitest";

// Minimal stand-in for supabase-js's chainable, awaitable query builder
// (PostgrestFilterBuilder). Every filter/modifier method (select, eq, ilike,
// order, ...) returns the same object so it matches whatever chain shape the
// code under test uses; `await`-ing it (directly, or via a terminal like
// .single()/.maybeSingle()) resolves to the `{ data, error }` you configure.
// Not a real query engine — it doesn't filter/sort anything, it just returns
// canned results, which is enough to unit-test code that reacts to
// `{ data, error }` without hitting a real database.
export type SupabaseResult<T = unknown> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

export function ok<T>(data: T): SupabaseResult<T> {
  return { data, error: null };
}

export function fail(message: string): SupabaseResult<never> {
  return { data: null, error: { message } };
}

const CHAIN_METHODS = [
  "select",
  "insert",
  "update",
  "upsert",
  "delete",
  "eq",
  "neq",
  "in",
  "is",
  "ilike",
  "like",
  "or",
  "order",
  "limit",
  "range",
  "gte",
  "lte",
  "gt",
  "lt",
  "match",
] as const;

function createQueryBuilder<T>(result: SupabaseResult<T>) {
  const builder: Record<string, unknown> = {};
  for (const method of CHAIN_METHODS) {
    builder[method] = vi.fn(() => builder);
  }
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  // Makes `await supabase.from(...).select(...)` resolve without a terminal
  // call, exactly like the real PostgrestFilterBuilder (it's PromiseLike).
  builder.then = (
    resolve: (value: SupabaseResult<T>) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

/**
 * Creates a fresh mock Supabase client for one test. Program each call's
 * result with `mockFrom`/`mockRpc` (queued in call order, like
 * `vi.fn().mockReturnValueOnce`) before invoking the code under test.
 *
 * @example
 * const sb = createSupabaseMock();
 * sb.mockFrom(ok([{ id: "1" }]));
 * await sb.client.from("topics").select("id");
 */
export function createSupabaseMock() {
  const from = vi.fn();
  const rpc = vi.fn();
  const auth = {
    getSession: vi.fn(),
    getUser: vi.fn(),
    getClaims: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
    signOut: vi.fn(),
  };

  return {
    client: { from, rpc, auth } as unknown as Record<string, unknown>,
    from,
    rpc,
    auth,
    /** Queues the result for the next `.from(table)` call. */
    mockFrom<T>(result: SupabaseResult<T>) {
      from.mockReturnValueOnce(createQueryBuilder(result));
    },
    /** Queues the result for the next `.rpc(name)` call. */
    mockRpc<T>(result: SupabaseResult<T>) {
      rpc.mockResolvedValueOnce(result);
    },
  };
}
