import { analyzeThreat } from './rulesEngine';
import { saveThreat } from './storage';
import { ThreatAnalysisResult, SourceType } from '../types';

/**
 * Generate a deterministic ID based on the payload.
 * This ensures that identical notifications scanned multiple times
 * evaluate to the same ID, preventing storage bloat (deduplication).
 */
export const generateDeterministicId = (sourceType: string, label: string, content: string): string => {
  const str = `${sourceType}-${label}-${content}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  // Make it positive and prefixed
  return `ingest-${Math.abs(hash)}`;
};

import * as Linking from 'expo-linking';

/**
 * Parses a deep link URL, extracts query parameters, analyzes the content, 
 * and saves it securely to the local SQLite database.
 */
export const handleIngestionUrl = async (url: string): Promise<ThreatAnalysisResult | null> => {
  console.log('[Ingestion] handleIngestionUrl called with:', url);
  try {
    const parsed = Linking.parse(url);
    console.log('[Ingestion] Parsed result:', parsed);

    // Some OS implementations put 'ingest' in hostname, some in path. We check both.
    if (parsed.hostname !== 'ingest' && parsed.path !== 'ingest') {
      console.warn('[Ingestion] Invalid route. Hostname/path is not ingest', parsed);
      return null;
    }

    const { queryParams } = parsed;
    if (!queryParams) {
      console.warn('[Ingestion] Missing query parameters');
      return null;
    }

    // queryParams can have string | string[]
    const getParam = (key: string) => {
      const val = queryParams[key];
      return Array.isArray(val) ? val[0] : val;
    };

    const sourceTypeRaw = getParam('sourcetype');
    const sourceLabel = getParam('label') || 'Unknown Source';
    const content = getParam('content');

    console.log('[Ingestion] Extracted Params -> sourceType:', sourceTypeRaw, 'label:', sourceLabel, 'content length:', content?.length);

    if (!sourceTypeRaw || !content || typeof sourceTypeRaw !== 'string' || typeof content !== 'string') {
      console.warn('[Ingestion] Ingestion failed: missing or invalid required fields sourcetype or content');
      return null;
    }

    const sourceType = sourceTypeRaw.toUpperCase() as SourceType;

    // Generate deduplication ID
    const deterministicId = generateDeterministicId(sourceType, sourceLabel, content);

    // Analyze using existing logic
    const result = analyzeThreat(content, sourceType, sourceLabel, deterministicId);
    console.log('[Ingestion] Analysis complete. Score:', result.score, 'isFlagged:', result.isFlagged);

    // Save to local SQLite (INSERT OR REPLACE prevents duplicate entries for the same deterministic ID)
    if (result.isFlagged || result.score > 0) {
      console.log('[Ingestion] Going to save threat:', result);
      const saved = await saveThreat(result);
      if (saved) {
        console.log('[Ingestion] Threat saved to SQLite successfully.');
      } else {
        console.error('[Ingestion] FAILED to save threat to SQLite.');
      }
    }
    
    return result;
  } catch (error) {
    console.error('[Ingestion] Error handling ingestion URL:', error);
    return null;
  }
};

