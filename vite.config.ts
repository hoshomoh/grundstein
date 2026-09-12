import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    // Must precede the React plugin so generated route files are transformed too.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react({ compiler: true }),
    tailwindcss(),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    /* Node by default: domain/ and lib/ are pure arithmetic and spinning up a DOM for
     * them cost more than the tests themselves. A component test opts in with
     * `// @vitest-environment jsdom` at the top of the file. */
    environment: 'node',
    globals: true,
    /* A jsdom render of the profile section mounts five Radix selects and takes a
     * second or two; the 5s default then times out under any load, which reports a
     * slow test as a broken one. Isolation is kept — sharing workers would let the
     * i18next singleton and the Decimal config leak between files, and correctness is
     * the point of this codebase. */
    testTimeout: 20_000,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/lib/**', 'src/state/**'],
    },
  },
})
