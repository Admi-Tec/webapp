import { queryOptions } from "@tanstack/react-query";
import { listPublishedTemplates } from "@/lib/exams.functions";

export const publishedTemplatesQO = queryOptions({
  queryKey: ["published-templates"],
  queryFn: () => listPublishedTemplates(),
  staleTime: 1000 * 60 * 5,
});
