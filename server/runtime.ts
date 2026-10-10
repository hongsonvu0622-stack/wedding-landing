import { createHandlers } from './handlers.js'
import { createSheetsApi, readSheetsEnv } from './sheets.js'

let handlers: ReturnType<typeof createHandlers> | undefined

export function getHandlers() {
  handlers ??= createHandlers(createSheetsApi(readSheetsEnv(process.env)))
  return handlers
}

// Best effort: never fails startup if credentials are missing or Google is unreachable.
export function warmUp(): void {
  try {
    void getHandlers().warm()
  } catch {
    /* credentials missing: requests will report it */
  }
}
