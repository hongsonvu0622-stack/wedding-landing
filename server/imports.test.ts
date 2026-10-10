import fs from 'node:fs'
import path from 'node:path'

// Vercel runs api/*.ts as native ESM ("type": "module"), which rejects extensionless relative imports.
const dirs = ['api', 'server']
const files = dirs.flatMap((d) =>
  fs.readdirSync(d).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts')).map((f) => path.join(d, f)),
)

test('server-side files use explicit .js extensions on relative imports', () => {
  const bad: string[] = []
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8')
    for (const m of src.matchAll(/from\s+'(\.{1,2}\/[^']+)'/g)) {
      if (!/\.(js|json)$/.test(m[1])) bad.push(`${f}: ${m[1]}`)
    }
  }
  expect(bad).toEqual([])
})
