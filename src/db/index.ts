import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { databaseUrl } from '@lib/config';
import { ensureSchema } from './migrate';
import * as schema from './schema';

export class CertificatesUnavailable extends Error {
  constructor() {
    super('La base de certificados no está configurada.');
    this.name = 'CertificatesUnavailable';
  }
}

type Database = PostgresJsDatabase<typeof schema>;

let database: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  const url = databaseUrl();
  if (!url) return Promise.reject(new CertificatesUnavailable());
  if (!database) {
    database = (async () => {
      try {
        const remote = !/@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
        const sql = postgres(url, {
          max: 1,
          prepare: false,
          idle_timeout: 20,
          ...(remote ? { ssl: 'require' as const } : {}),
        });
        await ensureSchema(sql);
        return drizzle(sql, { schema });
      } catch (error) {
        database = null;
        throw error;
      }
    })();
  }
  return database;
}

export async function certificatesReady(): Promise<boolean> {
  if (!databaseUrl()) return false;
  try {
    await getDb();
    return true;
  } catch {
    return false;
  }
}
