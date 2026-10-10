import { createHandlers } from './handlers'
import { createSheetsApi, readSheetsEnv } from './sheets'

let handlers: ReturnType<typeof createHandlers> | undefined

export function getHandlers() {
  handlers ??= createHandlers(createSheetsApi(readSheetsEnv(process.env)))
  return handlers
}
