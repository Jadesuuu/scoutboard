import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// The app reads this at module scope in query/mutation fns.
process.env.NEXT_PUBLIC_API_URL = 'http://api.test'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
