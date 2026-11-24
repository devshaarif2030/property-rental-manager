import { defineConfig } from "vitest/config";

import baseConfig from "./vitest.config.mts";

// Same resolver setup as unit tests, but only the integration suite.
export default defineConfig({
  ...baseConfig,
  test: { ...baseConfig.test, include: ["tests/integration/**/*.test.ts"] },
});
