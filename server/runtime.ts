import { createHandlers } from './handlers.js'
import { createSheetsApi, readSheetsEnv } from './sheets.js'

let handlers: ReturnType<typeof createHandlers> | undefined

export function getHandlers() {
  handlers ??= createHandlers(createSheetsApi(readSheetsEnv(process.env)))
  return handlers
}
