import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/tests/**/*.spec.ts'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['supabase/functions/_shared/**/*.ts'],
      exclude: ['supabase/functions/_shared/supabase.ts'],
    },
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
});
