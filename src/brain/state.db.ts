// SQLite state persistence — messages, plays, plan, prefs

import Database from 'better-sqlite3'

export interface PlayRecord {
  id: number
  songId: string
  title: string
  artist: string
  playedAt: string
}

export interface MessageRecord {
  id: number
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

/** Max length for message content (10 KB) to prevent abuse */
export const MAX_MESSAGE_LENGTH = 10240

export interface PlanEntry {
  time: string
  scene: string
  tracks: unknown[]
}

export class StateDB {
  private db: Database.Database

  constructor(sqlite: Database.Database) {
    this.db = sqlite
    this.init()
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS plays (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        song_id   TEXT NOT NULL,
        title     TEXT,
        artist    TEXT,
        played_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        role      TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content   TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS plan (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        date      TEXT NOT NULL,
        time      TEXT NOT NULL,
        scene     TEXT NOT NULL,
        tracks    TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS prefs (
        key       TEXT PRIMARY KEY,
        value     TEXT NOT NULL
      )
    `)
  }

  // --- plays ---

  logPlay(songId: string, title: string, artist: string): void {
    const stmt = this.db.prepare(
      'INSERT INTO plays (song_id, title, artist) VALUES (?, ?, ?)'
    )
    stmt.run(songId, title, artist)
  }

  recentPlays(limit = 20): PlayRecord[] {
    const stmt = this.db.prepare(
      `SELECT id, song_id AS songId, title, artist, played_at AS playedAt
       FROM plays ORDER BY id DESC LIMIT ?`
    )
    return stmt.all(limit) as PlayRecord[]
  }

  // --- messages ---

  saveMessage(role: 'user' | 'assistant', content: string): void {
    const stmt = this.db.prepare(
      'INSERT INTO messages (role, content) VALUES (?, ?)'
    )
    const truncated = content.length > MAX_MESSAGE_LENGTH
      ? content.slice(0, MAX_MESSAGE_LENGTH)
      : content
    stmt.run(role, truncated)
  }

  recentMessages(limit = 50): MessageRecord[] {
    const stmt = this.db.prepare(
      `SELECT id, role, content, created_at AS createdAt
       FROM messages ORDER BY id DESC LIMIT ?`
    )
    return stmt.all(limit) as MessageRecord[]
  }

  // --- plan ---

  savePlan(date: string, entries: PlanEntry[]): void {
    const deleteStmt = this.db.prepare('DELETE FROM plan WHERE date = ?')
    deleteStmt.run(date)

    const insertStmt = this.db.prepare(
      'INSERT INTO plan (date, time, scene, tracks) VALUES (?, ?, ?, ?)'
    )
    const insert = this.db.transaction(() => {
      for (const entry of entries) {
        insertStmt.run(date, entry.time, entry.scene, JSON.stringify(entry.tracks))
      }
    })
    insert()
  }

  getPlan(date: string): PlanEntry[] {
    const stmt = this.db.prepare(
      'SELECT time, scene, tracks FROM plan WHERE date = ? ORDER BY time ASC'
    )
    const rows = stmt.all(date) as { time: string; scene: string; tracks: string }[]
    return rows.map((row) => {
      try {
        return {
          time: row.time,
          scene: row.scene,
          tracks: JSON.parse(row.tracks || '[]'),
        }
      } catch {
        return { time: row.time, scene: row.scene, tracks: [] as unknown[] }
      }
    })
  }

  // --- prefs ---

  getPref(key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM prefs WHERE key = ?')
    const row = stmt.get(key) as { value: string } | undefined
    return row?.value ?? null
  }

  setPref(key: string, value: string): void {
    const stmt = this.db.prepare(
      'INSERT INTO prefs (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    )
    stmt.run(key, value)
  }
}
