import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let dbInstance: Database | null = null;

export async function initDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const dbPath = path.resolve(process.cwd(), 'database.sqlite');
  
  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Run migrations
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS web_performance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      score INTEGER,
      metrics JSON
    );

    CREATE TABLE IF NOT EXISTS seo_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      score INTEGER,
      findings JSON
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      severity TEXT,
      message TEXT,
      resolved BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service TEXT UNIQUE,
      token TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS briefs (
      id TEXT PRIMARY KEY,
      title TEXT,
      description TEXT,
      justification TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ SQLite Database initialized at', dbPath);
  return dbInstance;
}

export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    return await initDb();
  }
  return dbInstance;
}
