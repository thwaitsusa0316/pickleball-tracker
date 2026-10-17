#!/usr/bin/env node
/**
 * Writes dist/config.json from process.env at container start.
 * Railway can set vars without rebuilding the Vite bundle.
 *
 * Accepts either naming style:
 *   VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
 *   SUPABASE_URL / SUPABASE_ANON_KEY
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = join(root, 'dist')
const outFile = join(distDir, 'config.json')

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

if (!existsSync(distDir)) {
  console.error('write-runtime-config: dist/ missing — run npm run build first')
  process.exit(1)
}

mkdirSync(distDir, { recursive: true })
writeFileSync(
  outFile,
  JSON.stringify(
    {
      supabaseUrl: url,
      supabaseAnonKey: anonKey,
    },
    null,
    2,
  ) + '\n',
  'utf8',
)

if (!url || !anonKey) {
  console.warn(
    'write-runtime-config: warning — Supabase URL or anon key empty. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_URL / SUPABASE_ANON_KEY) on the Railway service.',
  )
} else {
  console.log('write-runtime-config: wrote dist/config.json')
}
