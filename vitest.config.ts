// Standalone from vite.config.ts on purpose: that file goes through
// @lovable.dev/vite-tanstack-config (TanStack Start + Nitro SSR build), which
// isn't something unit tests need or want to pay for. This config only wires
// up what Vitest itself needs — the React plugin (JSX transform) and the same
// "@/*" path alias the app uses, resolved natively from tsconfig.json (Vite
// 8+) instead of a second hardcoded alias list.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    coverage: {
      provider: "v8",
      // "text" prints the summary CI pipes into the job summary; json-summary
      // feeds that same table; html is the browsable report kept as an artifact.
      reporter: ["text", "json-summary", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/routeTree.gen.ts",
        "src/test/**",
        "src/**/*.d.ts",
        "src/integrations/supabase/types.ts",
      ],
    },
  },
});
