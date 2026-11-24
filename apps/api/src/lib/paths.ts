import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const here = (metaUrl: string) => dirname(fileURLToPath(metaUrl));

/** Första sökvägen som finns, eller null. */
export const findDir = (...candidates: string[]) => candidates.map((p) => resolve(p)).find((p) => existsSync(p)) ?? null;
