import { defineConfig } from "vitest/config";
import path from "node:path";

// Load .env.local (if present) so the RLS test can reach Supabase. Unit tests don't need it.
try {
  process.loadEnvFile(".env.local");
} catch {}

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
