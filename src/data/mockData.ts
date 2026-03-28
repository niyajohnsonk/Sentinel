import { ThreatAnalysisResult, Severity, ActiveCallTranscriptChunk } from '../types';

// Mock SMS Data
export const mockSmsData: (ThreatAnalysisResult & { sender: string })[] = [
  {
    id: 'sms-1',
    sourceType: 'SMS',
    label: 'High Risk Scam',
    score: 95,
    severity: 'high',
    reasons: [
      'Urgency tactic detected',
      'Suspicious link masking',
      'Sender not in contacts',
    ],
    matchedSignals: [
      'High urgency language',
      'Artificial time pressure',
      'Suspicious shortened URL',
    ],
    isFlagged: true,
    recommendedAction: 'Do not click the link and delete this message immediately.',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    content: 'CHASE BANK URGENT: Your account will be locked in 24hrs due to suspicious activity. Verify identity by clicking here -> chsobe.ly/r2x',
    sender: '839-44',
  },
  {
    id: 'sms-2',
    sourceType: 'SMS',
    label: 'Suspicious',
    score: 65,
    severity: 'medium',
    reasons: [
      'Missing package context',
      'Generic greeting',
      'Link requested for address update',
    ],
    matchedSignals: [
      'Common delivery scam hook',
      'Unexpected request for payment',
    ],
    isFlagged: true,
    recommendedAction: 'Do not pay the fee. Verify delivery status directly on the carrier website.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    content: 'USPS: Your package could not be delivered due to an incorrect address. Please click the link to update and pay the $1.99 update fee.',
    sender: '+1 (415) 555-0198',
  },
  {
    id: 'sms-3',
    sourceType: 'SMS',
    label: 'Safe',
    score: 5,
    severity: 'low',
    reasons: [],
    matchedSignals: [],
    isFlagged: false,
    recommendedAction: 'No action needed.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    content: 'Hey mom, can you pick up some milk on your way home?',
    sender: 'Sarah (Daughter)',
  },
];

// Mock URL Scan Data
export const mockUrlScanData: ThreatAnalysisResult = {
  id: 'url-1',
  sourceType: 'URL',
  label: 'High Risk Scam',
  score: 88,
  severity: 'high',
  reasons: [
    'Domain registered 2 days ago',
    'Typo-squatting detected (paypol.com)',
    'No SSL Certificate',
  ],
  matchedSignals: [],
  isFlagged: true,
  recommendedAction: 'Do not enter any personal or financial information on this site.',
  timestamp: new Date().toISOString(),
  content: 'http://secure-login-paypol.com/auth/',
};

// Mock Call Scenarios
export const NORMAL_CALL_TRANSCRIPT: ActiveCallTranscriptChunk[] = [
  { id: 'nc-1', text: 'Hey, this is John from the leasing office.', timestamp: 1000, isCaller: true },
  { id: 'nc-2', text: 'Hi John, what\'s up?', timestamp: 4000, isCaller: false },
  { id: 'nc-3', text: 'Just calling to remind you that the water will be shut off tomorrow from 2 PM to 4 PM for maintenance.', timestamp: 6000, isCaller: true },
  { id: 'nc-4', text: 'Oh, thanks for the heads up. I\'ll make sure I have some water filled.', timestamp: 12000, isCaller: false },
  { id: 'nc-5', text: 'No problem. Have a good day!', timestamp: 15000, isCaller: true },
];

export const SCAM_CALL_TRANSCRIPT: ActiveCallTranscriptChunk[] = [
  { id: 'sc-1', text: 'Hello, am I speaking with Krishna?', timestamp: 1000, isCaller: true, scoreDelta: 5 },
  { id: 'sc-2', text: 'Yes, who is this?', timestamp: 3000, isCaller: false },
  { id: 'sc-3', text: 'This is Officer David Riley with the US Customs and Border Protection.', timestamp: 6000, isCaller: true, scoreDelta: 20, signalTriggered: 'Authority impersonation' },
  { id: 'sc-4', text: 'We have intercepted a package at the border addressed to you containing illicit materials and multiple bank cards.', timestamp: 12000, isCaller: true, scoreDelta: 30, signalTriggered: 'Fear trigger / Threat' },
  { id: 'sc-5', text: 'Wait, what? I didn\'t order anything like that.', timestamp: 20000, isCaller: false },
  { id: 'sc-6', text: 'Your Social Security Number has been compromised. An arrest warrant will be issued under your name within 2 hours.', timestamp: 24000, isCaller: true, scoreDelta: 30, signalTriggered: 'High urgency / Threat of arrest' },
  { id: 'sc-7', text: 'However, you can post a security bond of $2,000 via digital Gift Cards or Bitcoin to resolve this right now.', timestamp: 32000, isCaller: true, scoreDelta: 15, signalTriggered: 'Payment demand (Gift Cards/Crypto)' },
];

// Threat Vault
export const mockThreatVault: ThreatAnalysisResult[] = [
  ...mockSmsData.filter(m => m.severity !== 'low'),
  {
    id: 'vault-1',
    sourceType: 'CALL',
    label: 'High Risk Scam',
    score: 98,
    severity: 'high',
    reasons: ['Demanded payment in iTunes gift cards', 'Threat of immediate arrest'],
    matchedSignals: [],
    isFlagged: true,
    recommendedAction: 'Blocked automatically.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    content: 'Call lasted 4:12 mins. Caller impersonated IRS agent.',
    sourceLabel: '+1 (800) 555-0199',
  },
  mockUrlScanData,
];
