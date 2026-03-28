export type SourceType = 'CALL' | 'SMS' | 'URL';
export type Severity = 'low' | 'medium' | 'high';
export type Label = "Safe" | "Suspicious" | "High Risk Scam";

export interface Entity {
  type: 'PERSON' | 'ORGANIZATION' | 'PHONE' | 'URL' | 'PAYMENT_METHOD';
  value: string;
}

export interface SuspiciousPhrase {
  text: string;
  reason: string;
}

export interface ThreatAnalysisResult {
  id: string;
  sourceType: SourceType;
  sourceLabel?: string;
  content: string;
  score: number;
  label: Label;
  severity: Severity;
  reasons: string[];
  matchedSignals: string[];
  recommendedAction?: string;
  timestamp: string;
  isFlagged: boolean;
}

export interface ActiveCallTranscriptChunk {
  id: string;
  text: string;
  timestamp: number;
  isCaller: boolean;
  scoreDelta?: number; // How much this chunk changed the risk score
  signalTriggered?: string; // e.g. "Authority impersonation"
}
