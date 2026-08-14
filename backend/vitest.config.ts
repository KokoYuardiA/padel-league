import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'src/services/scheduling/**/*.test.ts',
      'src/lib/**/*.test.ts',
      'src/middlewares/**/*.test.ts',
    ],
  },
})
