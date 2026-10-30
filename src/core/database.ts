import { DatabaseSync } from 'node:sqlite'

export function createDatabase(file: string): DatabaseSync {
  const db = new DatabaseSync(file)
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')
  const version = db.prepare('PRAGMA user_version').get() as { user_version: number }
  if (version.user_version === 0) {
    db.exec(`BEGIN;
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      PRAGMA user_version = 1;
      COMMIT;`)
  }
  return db
}
