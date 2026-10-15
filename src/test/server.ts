import { setupServer } from 'msw/node'

/** Shared MSW server for Node-based tests; handlers are added per-test with `server.use(...)`. */
export const server = setupServer()
