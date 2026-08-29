import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { config } from "./config";

/**
 * The single Postgres connection pool and Drizzle instance for the process.
 * Repositories receive `db` by construction so they stay unit-testable.
 */
export const pool = new pg.Pool({ connectionString: config.DATABASE_URL });

export const db = drizzle(pool);

export type Database = typeof db;
