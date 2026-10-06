import { defineConfig } from 'vitest/config';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve the `@/*` path alias (mirrors tsconfig.json "paths") so tests can
// import source modules that use `@/...` imports without an extra plugin.
const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: { '@': root },
  },
  // tsconfig keeps `jsx: preserve` for Next; tests that render a component to a
  // string (react-dom/server) need the automatic runtime instead.
  esbuild: { jsx: 'automatic' },
  test: {
    // Pure-logic tests only (no DOM) — ranking, bar/data math, store, helpers.
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules', '.next', 'ios', 'dist'],
  },
});
