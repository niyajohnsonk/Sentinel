import * as SQLite from 'expo-sqlite';
import { ThreatAnalysisResult } from '../types';

let db: SQLite.SQLiteDatabase | null = null;

export const initDB = async () => {
  try {
    db = await SQLite.openDatabaseAsync('sentinel.db');
    
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS threats (
        id TEXT PRIMARY KEY NOT NULL,
        sourceType TEXT,
        sourceLabel TEXT,
        content TEXT,
        score INTEGER,
        label TEXT,
        severity TEXT,
        reasons TEXT,
        matchedSignals TEXT,
        recommendedAction TEXT,
        timestamp TEXT,
        isFlagged INTEGER
      );
    `);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing SQLite db', error);
  }
};

export const saveThreat = async (threat: ThreatAnalysisResult) => {
  if (!db) return;
  // Make sure to avoid duplicate saves if ID already exists, or basically just insert ignore.
  try {
    const isFlaggedInt = threat.isFlagged ? 1 : 0;
    const reasonsStr = JSON.stringify(threat.reasons);
    const matchedSignalsStr = JSON.stringify(threat.matchedSignals);
    
    await db.runAsync(
      `INSERT OR REPLACE INTO threats (
        id, sourceType, sourceLabel, content, score, label, severity, reasons, matchedSignals, recommendedAction, timestamp, isFlagged
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        threat.id,
        threat.sourceType,
        threat.sourceLabel || '',
        threat.content,
        threat.score,
        threat.label,
        threat.severity,
        reasonsStr,
        matchedSignalsStr,
        threat.recommendedAction || '',
        threat.timestamp,
        isFlaggedInt
      ]
    );
  } catch (error) {
    console.error('Error saving threat to SQLite', error);
  }
};

export const getStoredThreats = async (): Promise<ThreatAnalysisResult[]> => {
  if (!db) return [];
  try {
    const result = await db.getAllAsync('SELECT * FROM threats ORDER BY timestamp DESC');
    return result.map((row: any) => ({
      id: row.id,
      sourceType: row.sourceType,
      sourceLabel: row.sourceLabel,
      content: row.content,
      score: row.score,
      label: row.label,
      severity: row.severity,
      reasons: JSON.parse(row.reasons),
      matchedSignals: JSON.parse(row.matchedSignals),
      recommendedAction: row.recommendedAction,
      timestamp: row.timestamp,
      isFlagged: row.isFlagged === 1
    }));
  } catch (error) {
    console.error('Error fetching threats from SQLite', error);
    return [];
  }
};

export const clearStoredThreats = async () => {
  if (!db) return;
  try {
    await db.execAsync('DELETE FROM threats');
  } catch (error) {
    console.error('Error clearing threats from SQLite', error);
  }
};
