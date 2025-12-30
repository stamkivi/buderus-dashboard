import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Enable verbose mode for debugging
const sqlite = sqlite3.verbose();

// Create database connection
const db = new sqlite.Database(join(__dirname, 'data.db'), (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

/**
 * Initialize database schema
 */
export function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create readings table for historical data
      db.run(`
        CREATE TABLE IF NOT EXISTS readings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp INTEGER NOT NULL,
          path TEXT NOT NULL,
          value REAL,
          unit TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes for faster queries
      db.run(`CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON readings(timestamp)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_readings_path ON readings(path)`);

      // Create settings table
      db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating tables:', err);
          reject(err);
        } else {
          console.log('Database initialized');
          resolve();
        }
      });
    });
  });
}

/**
 * Insert a reading
 */
export function insertReading(path, value, unit) {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    db.run(
      `INSERT INTO readings (timestamp, path, value, unit) VALUES (?, ?, ?, ?)`,
      [timestamp, path, value, unit],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

/**
 * Get readings for a specific path within a time range
 */
export function getReadings(path, startTime, endTime) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT timestamp, value, unit
       FROM readings
       WHERE path = ? AND timestamp >= ? AND timestamp <= ?
       ORDER BY timestamp ASC`,
      [path, startTime, endTime],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

/**
 * Get latest reading for a path
 */
export function getLatestReading(path) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT timestamp, value, unit
       FROM readings
       WHERE path = ?
       ORDER BY timestamp DESC
       LIMIT 1`,
      [path],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      }
    );
  });
}

/**
 * Get all unique paths that have been recorded
 */
export function getAllPaths() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT DISTINCT path FROM readings ORDER BY path`,
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve((rows || []).map(row => row.path));
      }
    );
  });
}

/**
 * Clean old readings (keep last N days)
 */
export function cleanOldReadings(daysToKeep = 90) {
  return new Promise((resolve, reject) => {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    db.run(
      'DELETE FROM readings WHERE timestamp < ?',
      [cutoffTime],
      function(err) {
        if (err) {
          reject(err);
        } else {
          console.log(`Cleaned ${this.changes} old readings`);
          resolve(this.changes);
        }
      }
    );
  });
}

/**
 * Get or set a setting
 */
export function getSetting(key) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT value FROM settings WHERE key = ?',
      [key],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.value : null);
      }
    );
  });
}

export function setSetting(key, value) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO settings (key, value, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)`,
      [key, value],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export { db };
