import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.ts';

export type Db = ReturnType<typeof createDb>;

export function createDb(url = process.env.DATABASE_URL ?? 'file:./data/selfit.db') {
  if (url.startsWith('file:') && !url.includes(':memory:')) {
    mkdirSync(dirname(url.slice('file:'.length)), { recursive: true });
  }
  const client = createClient({ url });
  return drizzle(client, { schema });
}
