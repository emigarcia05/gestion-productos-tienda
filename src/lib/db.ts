/**
 * Conexión a Neon/PostgreSQL mediante Pool de pg.
 * Uso: import { pool, query } from '@/lib/db';
 */
import { Pool, type PoolClient } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL no está definida. Añádela en .env o en las variables de entorno."
  );
}

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

/**
 * Ejecuta una consulta usando el pool. Libera el cliente automáticamente.
 */
export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return { rows: (result.rows as T[]), rowCount: result.rowCount ?? 0 };
  } finally {
    client.release();
  }
}

/**
 * Obtiene un cliente del pool para transacciones (begin/commit/rollback).
 * Debes llamar a client.release() cuando termines.
 */
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

export { pool };
