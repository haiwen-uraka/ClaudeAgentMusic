import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { StateDB } from '../../src/brain/state.db.js'

describe('state.db', () => {
  let db: StateDB

  beforeEach(() => {
    // Use in-memory database for tests
    const sqlite = new Database(':memory:')
    db = new StateDB(sqlite)
  })

  describe('plays', () => {
    it('should log a play and retrieve recent plays', () => {
      db.logPlay('song_1', '晴天', '周杰伦')
      db.logPlay('song_2', '七里香', '周杰伦')

      const recent = db.recentPlays(2)
      expect(recent).toHaveLength(2)
      expect(recent[0].songId).toBe('song_2') // most recent first
      expect(recent[0].title).toBe('七里香')
      expect(recent[1].songId).toBe('song_1')
    })

    it('should return empty array when no plays exist', () => {
      const recent = db.recentPlays()
      expect(recent).toEqual([])
    })
  })

  describe('messages', () => {
    it('should save and retrieve messages', () => {
      db.saveMessage('user', '找点适合下雨天的歌')
      db.saveMessage('assistant', '雨天来点爵士吧')

      const recent = db.recentMessages(2)
      expect(recent).toHaveLength(2)
      expect(recent[0].role).toBe('assistant')
      expect(recent[0].content).toBe('雨天来点爵士吧')
    })
  })

  describe('plan', () => {
    it('should save and retrieve daily plan', () => {
      const plan = [
        { time: '07:00', scene: 'morning', tracks: [] },
        { time: '09:00', scene: 'commute', tracks: [] },
      ]
      db.savePlan('2026-06-23', plan)
      const result = db.getPlan('2026-06-23')
      expect(result).toHaveLength(2)
      expect(result[0].scene).toBe('morning')
    })

    it('should return empty array for dates without plans', () => {
      const result = db.getPlan('2099-01-01')
      expect(result).toEqual([])
    })
  })

  describe('prefs', () => {
    it('should set and get preferences', () => {
      db.setPref('volume', '80')
      db.setPref('ttsEnabled', 'true')

      expect(db.getPref('volume')).toBe('80')
      expect(db.getPref('ttsEnabled')).toBe('true')
    })

    it('should return null for missing preferences', () => {
      expect(db.getPref('nonexistent')).toBeNull()
    })
  })
})
