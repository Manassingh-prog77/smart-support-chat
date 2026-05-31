import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import type { ConversationRecord, MessageRecord, Sender } from '../types.js';

fs.mkdirSync(path.dirname(env.databasePath), { recursive: true });

const db = new Database(env.databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    metadata TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversationId TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK(sender IN ('user', 'ai')),
    text TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
    ON messages(conversationId, createdAt);
`);

const now = () => new Date().toISOString();

export const conversationStore = {
  create(metadata?: Record<string, unknown>) {
    const timestamp = now();
    const conversation: ConversationRecord = {
      id: randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
      metadata: metadata ? JSON.stringify(metadata) : null
    };

    db.prepare(
      `INSERT INTO conversations (id, createdAt, updatedAt, metadata)
       VALUES (@id, @createdAt, @updatedAt, @metadata)`
    ).run(conversation);

    return conversation;
  },

  find(id: string) {
    return db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as
      | ConversationRecord
      | undefined;
  },

  touch(id: string) {
    db.prepare('UPDATE conversations SET updatedAt = ? WHERE id = ?').run(now(), id);
  },

  getOrCreate(id?: string) {
    if (id) {
      const existing = this.find(id);
      if (existing) return existing;
    }

    return this.create();
  }
};

export const messageStore = {
  insert(conversationId: string, sender: Sender, text: string) {
    const message: MessageRecord = {
      id: randomUUID(),
      conversationId,
      sender,
      text,
      createdAt: now()
    };

    db.prepare(
      `INSERT INTO messages (id, conversationId, sender, text, createdAt)
       VALUES (@id, @conversationId, @sender, @text, @createdAt)`
    ).run(message);

    conversationStore.touch(conversationId);
    return message;
  },

  list(conversationId: string) {
    return db
      .prepare(
        `SELECT id, conversationId, sender, text, createdAt
         FROM messages
         WHERE conversationId = ?
         ORDER BY createdAt ASC`
      )
      .all(conversationId) as MessageRecord[];
  },

  recent(conversationId: string, limit = 16) {
    return db
      .prepare(
        `SELECT id, conversationId, sender, text, createdAt
         FROM messages
         WHERE conversationId = ?
         ORDER BY createdAt DESC
         LIMIT ?`
      )
      .all(conversationId, limit)
      .reverse() as MessageRecord[];
  }
};
