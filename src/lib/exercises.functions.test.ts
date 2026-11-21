import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createExercisePracticeBatch, listExercisesPage } from "./exercises.functions";

// Execute the real server handlers and input validation without Start's transport.
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (data: unknown) => data;
    const builder = {
      inputValidator: (validator: typeof validate) => {
        validate = validator;
        return builder;
      },
      handler:
        (handler: (input: { data: unknown }) => unknown) =>
        ({ data }: { data: unknown }) =>
          handler({ data: validate(data) }),
    };
    return builder;
  },
}));

vi.mock("@supabase/supabase-js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@supabase/supabase-js")>();
  return { ...actual, createClient: vi.fn(actual.createClient) };
});

afterEach(() => {
  vi.mocked(createClient).mockReset();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

const filters = {
  topicSlug: "algebra",
  subtopicSlug: "matrices-y-determinantes",
  difficulty: "medio" as const,
  universitySlug: "uni",
};

function mockCatalog(total: number) {
  vi.stubEnv("SUPABASE_URL", "https://catalog.example.com");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "public-test-key");
  const requests: URL[] = [];
  const client = createClient<Database>("https://catalog.example.com", "public-test-key", {
    global: {
      fetch: async (input, init) => {
        const url = new URL(String(input));
        requests.push(url);
        // These filters must reach PostgREST before it counts or paginates.
        expect(url.searchParams.get("topic.slug")).toBe("eq.algebra");
        expect(url.searchParams.get("subtopic.slug")).toBe("eq.matrices-y-determinantes");
        expect(url.searchParams.get("difficulty")).toBe("eq.medio");
        expect(url.searchParams.get("university.slug")).toBe("eq.uni");
        expect(url.searchParams.get("select")).toContain("subtopics!inner");
        expect(url.searchParams.get("select")).toContain("universities!inner");
        const offset = Number(url.searchParams.get("offset") ?? 0);
        const limit = Number(url.searchParams.get("limit") ?? total);
        const items = Array.from({ length: Math.min(limit, total - offset) }, (_, i) => ({
          id: `exercise-${offset + i}`,
        }));
        return new Response(init?.method === "HEAD" ? null : JSON.stringify(items), {
          status: 200,
          headers: { "Content-Type": "application/json", "Content-Range": `0-0/${total}` },
        });
      },
    },
  });
  vi.mocked(createClient<Database>).mockReturnValue(client);
  return requests;
}

describe("filtered exercise listing and practice", () => {
  it("returns the total matching count and paginates only matching rows", async () => {
    const requests = mockCatalog(42);
    const page = await listExercisesPage({ data: { ...filters, page: 1, pageSize: 20 } });
    expect(page.total).toBe(42);
    expect(page.hasMore).toBe(true);
    expect(page.items).toHaveLength(20);
    expect(page.items[0].id).toBe("exercise-20");
    expect(requests).toHaveLength(1);
    expect(requests[0].searchParams.get("order")).toBe("created_at.desc,id.asc");
  });

  it("samples the full filtered catalog beyond loaded pages and the 1000-row cap", async () => {
    const requests = mockCatalog(2500);
    vi.spyOn(Math, "random").mockReturnValue(0.99999);
    const batch = await createExercisePracticeBatch({ data: filters });
    expect(new Set(batch).size).toBe(5);
    expect(batch).toContain("exercise-2499");
    expect(requests).toHaveLength(6);
    for (const request of requests.slice(1)) {
      expect(request.searchParams.get("limit")).toBe("1");
      expect(request.searchParams.get("order")).toBe("created_at.desc,id.asc");
    }
  });

  it.each([0, 1, 2, 3, 4])(
    "returns exactly %i distinct exercises when fewer than five match",
    async (total) => {
      mockCatalog(total);
      const batch = await createExercisePracticeBatch({ data: filters });
      expect(batch).toHaveLength(total);
      expect(new Set(batch).size).toBe(total);
    },
  );
});
