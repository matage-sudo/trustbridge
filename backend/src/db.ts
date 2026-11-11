import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});
