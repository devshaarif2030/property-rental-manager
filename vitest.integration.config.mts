import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Runs only the integration suite, which needs a local Supabase stack.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
  },
});
