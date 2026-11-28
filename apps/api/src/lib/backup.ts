/**
 * Backup för Admin: en .tar.gz med databasen (en färsk kopia) och alla uppladdade bilder.
 * Kopian görs med SQLite:s VACUUM INTO, som ger en hel och konsekvent fil även medan butiken är igång.
 */
import { randomBytes } from 'node:crypto';
import { readdir, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import type { Db } from '../db/client.ts';
import { uploadsDir } from './paths-data.ts';

/** En fil i tar-formatet (ustar): 512 byte rubrik, innehållet, utfyllt till jämna 512 byte. */
function tarEntry(name: string, data: Buffer, mtime: Date) {
  const header = Buffer.alloc(512, 0);
  const put = (text: string, offset: number, length: number) => header.write(text, offset, length, 'utf8');
  const octal = (n: number, length: number) => n.toString(8).padStart(length - 1, '0') + '\0';
  put(name, 0, 100);
  put(octal(0o644, 8), 100, 8);
  put(octal(0, 8), 108, 8);
  put(octal(0, 8), 116, 8);
  put(octal(data.length, 12), 124, 12);
  put(octal(Math.floor(mtime.getTime() / 1000), 12), 136, 12);
  put('        ', 148, 8); // kontrollsumman räknas med blanksteg här
  put('0', 156, 1); // vanlig fil
  put('ustar\0', 257, 6);
  put('00', 263, 2);
  let sum = 0;
  for (const b of header) sum += b;
  put(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8);
  const pad = Buffer.alloc((512 - (data.length % 512)) % 512, 0);
  return [header, data, pad];
}

const README = `SELFIT – backup
================

selfit.db   Hela databasen: produkter, priser, kategorier, inställningar, rabatter, kampanjer m.m.
uploads/    Bilder som laddats upp i Admin.

Så läggs backupen tillbaka (be gärna om hjälp med detta):
1. Stoppa servern.
2. Ersätt ~/selfit-data/selfit.db med selfit.db härifrån
   (ta bort selfit.db-wal och selfit.db-shm om de finns).
3. Kopiera in mappen uploads till ~/selfit-data/uploads.
4. Starta servern igen.
`;

export interface BackupResult {
  fileName: string;
  data: Buffer;
  images: number;
  databaseBytes: number;
}

/** Gör en backup. images = false ger bara databasen (mindre fil). */
export async function createBackup(db: Db, opts: { images?: boolean; now?: Date } = {}): Promise<BackupResult> {
  const now = opts.now ?? new Date();
  const copy = join(tmpdir(), `selfit-backup-${randomBytes(6).toString('hex')}.db`);
  try {
    await db.$client.execute({ sql: 'VACUUM INTO ?', args: [copy] });
    const dbData = await readFile(copy);
    const parts: Buffer[] = [...tarEntry('LASMIG.txt', Buffer.from(README, 'utf8'), now), ...tarEntry('selfit.db', dbData, now)];
    let images = 0;
    if (opts.images !== false) {
      const dir = uploadsDir();
      for (const name of (await readdir(dir)).sort()) {
        const path = join(dir, name);
        const st = await stat(path);
        if (!st.isFile()) continue;
        parts.push(...tarEntry(`uploads/${name}`, await readFile(path), st.mtime));
        images++;
      }
    }
    parts.push(Buffer.alloc(1024, 0)); // två tomma block avslutar arkivet
    const stamp = now.toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' }).slice(0, 16).replace(' ', '-').replace(':', '');
    return {
      fileName: `selfit-backup-${stamp}${opts.images === false ? '-databas' : ''}.tar.gz`,
      data: gzipSync(Buffer.concat(parts)),
      images,
      databaseBytes: dbData.length,
    };
  } finally {
    await rm(copy, { force: true });
  }
}
