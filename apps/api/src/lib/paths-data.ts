import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { defaultDatabaseUrl } from '../db/client.ts';

/** Mappen för uppladdade bilder ligger bredvid databasen (i produktion: ~/selfit-data/uploads). */
export function uploadsDir() {
  const url = defaultDatabaseUrl();
  const base = url.startsWith('file:') && !url.includes(':memory:') ? dirname(resolve(url.slice('file:'.length))) : resolve('./data');
  const dir = join(base, 'uploads');
  mkdirSync(dir, { recursive: true });
  return dir;
}
