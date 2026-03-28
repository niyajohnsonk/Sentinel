import * as SQLite from 'expo-sqlite';
import { ThreatAnalysisResult } from '../types';

let db: SQLite.SQLiteDatabase | null = null;

export const initDB = async () => {
  if (db) {
    console.log('[Storage] Database already initialized, skipping initDB.');
    return;
  }
  try {
    db = await SQLite.openDatabaseAsync('sentinel_v2.db');
    
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
    console.log('[Storage] Database initialized successfully');
  } catch (error) {
    console.error('[Storage] Error initializing SQLite db', error);
  }
};

export const saveThreat = async (threat: ThreatAnalysisResult): Promise<boolean> => {
  if (!db) {
    console.error('[Storage] ERROR: Database not initialized before saveThreat!');
    return false;
  }
  try {
    const isFlaggedInt = threat.isFlagged ? 1 : 0;
    const reasonsStr = JSON.stringify(threat.reasons);
    const matchedSignalsStr = JSON.stringify(threat.matchedSignals);
    
    console.log('[Storage] Attempting to insert/replace id:', threat.id, 'sourceType:', threat.sourceType);
    
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
    console.log('[Storage] Threat saved successfully in SQLite:', threat.id);
    return true;
  } catch (error) {
    console.error('[Storage] Error saving threat to SQLite:', error);
    return false;
  }
};

export const getStoredThreats = async (): Promise<ThreatAnalysisResult[]> => {
  if (!db) {
    console.error('[Storage] db is null in getStoredThreats');
    return [];
  }
  try {
    // Explicitly pass an empty array to avoid NativeDatabase.prepareAsync NullPointerException
    const result = await db.getAllAsync('SELECT * FROM threats ORDER BY timestamp DESC', []);
    
    if (!result) return [];

    return result.map((row: any) => ({
      id: row.id,
      sourceType: row.sourceType as any,
      sourceLabel: row.sourceLabel,
      content: row.content,
      score: row.score,
      label: row.label as any,
      severity: row.severity as any,
      reasons: row.reasons ? JSON.parse(row.reasons) : [],
      matchedSignals: row.matchedSignals ? JSON.parse(row.matchedSignals) : [],
      recommendedAction: row.recommendedAction,
      timestamp: row.timestamp,
      isFlagged: row.isFlagged === 1 || row.isFlagged === true
    }));
  } catch (error) {
    console.error('[Storage] Error fetching threats from SQLite:', error);
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
