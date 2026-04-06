# SentinelApp

React Native app (Expo SDK 54, TypeScript). All threat intelligence lives here. The Android launcher is a thin bridge; this is where analysis, storage, and UI happen.

**Bundle ID:** `com.krishpinto.sentinelv2`
**Entry point:** `App.tsx` → `AppNavigator.tsx`

---

## Directory Structure

```
src/
├── lib/
│   ├── ingestion.ts        Deep link parser + analysis dispatcher
│   ├── rulesEngine.ts      Regex-based threat detection + hybrid scoring
│   ├── sentinel_scorer.ts  On-device ML model (TF-IDF + logistic regression)
│   ├── callAnalysis.ts     Live call audio → Gemini 2.5 Flash
│   └── storage.ts          Expo SQLite wrapper
├── ml/
│   ├── sentinel_scorer.ts  (same as lib/ — check for duplication)
│   └── indicator_tokens/   Token lists used by the ML scorer
├── screens/
│   ├── HomeScreen.tsx
│   ├── LiveCallScreen.tsx
│   ├── SMSInboxScreen.tsx
│   ├── URLScannerScreen.tsx
│   ├── ThreatVaultScreen.tsx
│   └── OnboardingScreen.tsx
├── components/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Header.tsx
│   ├── RiskBadge.tsx
│   └── ScoreRing.tsx
├── navigation/
│   └── AppNavigator.tsx
├── types/
│   └── index.ts            ThreatAnalysisResult, SourceType, Severity, etc.
└── theme/
    └── index.ts            Colors, spacing, typography tokens
```

---

## Core Libraries

### `src/lib/ingestion.ts`

Entry point for all launcher-originated data.

- Parses `sentinel://ingest?sourcetype=X&label=Y&content=Z` via `Linking.parse()`
- Generates a deterministic deduplication ID: `hash(sourceType + label + content)`
- Calls `analyzeThreat(sourceType, label, content)` from `rulesEngine.ts`
- Saves result to SQLite if `isFlagged || score > 0`
- Returns result; caller (App.tsx) shows alert dialog

**Called from:** `App.tsx` on every `Linking.useURL()` event. A `processedUrlRef` guards against double-processing the same URL.

---

### `src/lib/rulesEngine.ts`

The primary threat analysis function is `analyzeThreat(sourceType, label, content)`.

**Three modes based on `sourceType`:**

**1. SMS / CALL (text-based heuristics):**
25 regex patterns across 6 categories:
- `AUTHORITY_IMPERSONATION` — police, customs, court, RBI, SBI, IRS, PayPal, Paytm, ICICI (30 pts each)
- `URGENCY` — "immediate", "act now", "expires", "account locked" (25 pts each)
- `PHISHING` — "click", "verify", "login", "refund", "deliver" (25 pts each)
- `COERCION` — "transfer", "send money", "pay", "deposit" (30 pts each)
- `CREDENTIAL_THEFT` — "otp", "kyc", "pan", "aadhaar", "password" (30 pts each)
- `FEAR_TACTICS` — "arrest", "legal action", "suspended", "jail" (30 pts each)

Combination bonus: Authority + Urgency + Link present simultaneously → +40 pts.

**2. URL heuristics:**
- Suspicious TLDs: `.xyz`, `.top`, `.cc`, `.vip`, `.ru`, `.cn`, `.info`, `.biz`, `.cam`
- URL shorteners: `bit.ly`, `tinyurl`, `cutt.ly`, `t.co`, `goo.gl`, `ow.ly`, `is.gd`
- Typo-squatting: `paypol`, `g00gle`, `faceb00k`, `arnazon`, `amzon`, `y0utube`, `netflix-free`
- Excessive hyphens/numbers in domain
- Action keywords in path: `login`, `verify`, `secure`, `update`, `bank`, `account`, `wallet`, `kyc`, `otp`, `refund`

**3. Hybrid SMS (SMS with ML blend):**
- `score = 0.5 * rulesScore + 0.5 * mlScore`
- If either score > 80, takes `max(rulesScore, mlScore)` instead (avoids diluting a strong signal)
- Reasons and signals merged from both engines

**Output type (`ThreatAnalysisResult`):**
```typescript
{
  id: string               // deterministic hash
  sourceType: SourceType
  sourceLabel: string
  content: string
  score: number            // 0–100
  label: string            // "Safe" | "Suspicious" | "High Risk Scam"
  severity: Severity       // "low" | "medium" | "high"
  reasons: string[]        // top 5 human-readable explanations
  matchedSignals: string[] // category names that fired
  recommendedAction: string
  isFlagged: boolean
  timestamp: string
}
```

---

### `src/ml/sentinel_scorer.ts` (also at `src/lib/sentinel_scorer.ts`)

On-device ML inference. **No native bindings, no TFLite — pure TypeScript.** Model weights are hard-coded constants. Fast, offline, no dependencies.

**Architecture:**
1. Preprocess: normalize to lowercase, replace URLs/phones/amounts/OTPs with tokens (`__URL__`, `__PHONE__`, `__MONEY__`, `__OTP__`)
2. Score 8 indicator categories against token lists, apply per-category multipliers:
   - Urgency: 1.3×
   - Authority Impersonation: 1.5×
   - Credential/Payment Requests: 1.4×
   - Threat Language: 1.4×
   - Suspicious URLs: 1.6×
   - Prize/Lottery: 1.2×
   - Job/Investment Scams: 1.2×
   - Legitimacy Signals: −1.0× (negative weight — suppresses score for routine messages)
3. Normalize: `score = clamp(rawScore / 3.5, 0, 100)`

Risk bands: LOW <30, MEDIUM 30–55, HIGH 55–75, CRITICAL >75.

**Note:** This is not a trained neural network. It is a manually calibrated TF-IDF + weighted keyword scorer designed to mimic logistic regression output. It works well for Indian SMS scam patterns but has no generalization beyond its hard-coded vocabulary.

---

### `src/lib/callAnalysis.ts`

Handles live call audio analysis. Only used by `LiveCallScreen`.

**Flow:**
1. Caller: `LiveCallScreen` records 15-second audio chunks via `expo-av`
2. Chunk (WAV/M4A) sent to Google Gemini 2.5 Flash via REST API
3. Prompt instructs Gemini to return JSON: `{ transcript, chunkRiskScore, riskLabel, reasons, matchedSignals }`
4. Result merged into running session score

**Fallback:** On 429 (quota exceeded), sets a 60-second global cooldown flag and falls back to local rules engine on the transcript text (if any).

**CRITICAL — API key is hardcoded:**
```
AIzaSyBUPaugC675rwxDCzuILr2mGOI2KS2WM3A
```
This must be moved to an environment variable or a backend proxy before any deployment or further public sharing.

**Limitations:**
- Quota exhaustion has no recovery UI — user just sees "local detection mode"
- Audio chunks are ephemeral; not stored
- Requires microphone permission and app in foreground
- No background execution

---

### `src/lib/storage.ts`

Expo SQLite wrapper around a single table.

**Database:** `sentinel_v2.db` (WAL mode)

**Schema:**
```sql
CREATE TABLE threats (
  id TEXT PRIMARY KEY,
  sourceType TEXT, sourceLabel TEXT, content TEXT,
  score INTEGER, label TEXT, severity TEXT,
  reasons TEXT,          -- JSON array
  matchedSignals TEXT,   -- JSON array
  recommendedAction TEXT,
  timestamp TEXT,
  isFlagged INTEGER      -- 0 or 1
)
```

**Functions:**
- `initDB()` — creates table if not exists, called once in `App.tsx`
- `saveThreat(threat)` — INSERT OR REPLACE (deduplicates by id)
- `getStoredThreats()` — returns all rows, sorted by timestamp DESC
- `clearStoredThreats()` — deletes all rows. **Exists but is never called from UI.**

---

## Screens

### `HomeScreen.tsx`
Dashboard. Reads from SQLite on focus. Shows:
- Today's threat count, calls flagged, SMS flagged, URLs flagged (counts derived from stored threats)
- Recent activity (latest 3 threats), color-coded by severity
- Quick-access buttons to Call and SMS screens

### `LiveCallScreen.tsx`
The most complex screen (~635 lines). Opt-in live call monitoring.

**Recording loop:**
1. `startMonitoring()` → requests mic permission → starts `Audio.Recording`
2. Every 15 seconds: stops recording, sends to `analyzeCallChunk()`, restarts recording
3. Score accumulation formula:
   - Safe chunks (<25): establish baseline, don't stack
   - Suspicious chunks: `newScore = min(100, max(prev, prev + chunk * 0.4))`
4. Haptic alert when score ≥ 70
5. `stopMonitoring()` → saves session if final score ≥ 70

**UI:** Animated `ScoreRing` component showing live 0–100 score; transcript log below; "Using local detection mode" badge when Gemini is in cooldown.

**Known issues:**
- Only works while app is open and screen is visible
- No way to transfer to background (no foreground service)
- Gemini quota errors are silent to the user beyond the badge

### `SMSInboxScreen.tsx`
Filters `getStoredThreats()` for SMS source type. Detail modal shows re-phrased reason strings, signal tags, recommended action.

### `URLScannerScreen.tsx`
Manual URL entry. Also auto-scans clipboard on mount via `expo-clipboard`. All analysis is local (no network calls). Shows hostname, risk badge, score, signals.

### `ThreatVaultScreen.tsx`
All threats with filter chips: All / Calls / SMS / URLs. Simple list view.

### `OnboardingScreen.tsx`
Four toggle switches (Call Protection, SMS Shield, Link Scanner, Vibration Alerts). **The toggle state is saved to AsyncStorage but never read by any other screen.** All features are always active regardless of these settings. This is a stub.

On completion: sets `hasCompletedOnboarding=true`, navigates to `MainTabs`.

---

## Navigation

`AppNavigator.tsx` — two-level stack:
- **Stack:** `Onboarding` (if first launch) → `MainTabs`
- **Tabs:** Home | Call | SMS | URLScanner | Vault

Onboarding check: reads `hasCompletedOnboarding` from `AsyncStorage` on app start.

---

## App Initialization (`App.tsx`)

On mount:
1. `initDB()` — creates SQLite table
2. Reads `hasCompletedOnboarding` → sets initial route
3. Subscribes to `Linking.useURL()` for deep links
4. `processedUrlRef` prevents processing the same URL twice (e.g., on re-render)

---

## Components

| Component | Description |
|---|---|
| `Button` | Primary / Secondary / Danger / Ghost variants, loading state |
| `Card` | Default / Flat / Outlined variants with shadow |
| `Header` | Back button, title, optional right slot |
| `RiskBadge` | Visual severity chip: Safe (green) / Suspicious (amber) / High Risk (red) |
| `ScoreRing` | Animated SVG circle showing 0–100 score with color interpolation |

---

## Theme (`src/theme/index.ts`)

```
Colors: primary #3B82F6, safe #10B981, warning #F59E0B, danger #EF4444
Spacing: 4, 8, 16, 24, 32, 48
Typography: H1–H3, Body, Caption, Small
Shadows: card, button
```

---

## Known Gaps

1. **API key in source** — `callAnalysis.ts` has a live Gemini key hardcoded.
2. **Onboarding toggles are no-ops** — settings are saved but never enforced.
3. **`clearStoredThreats()` unreachable** — function exists, not exposed in UI.
4. **No background service** — monitoring dies when app is backgrounded.
5. **No whitelist/blocklist** — no way to mark a number as trusted or permanently blocked.
6. **No export** — uninstall = all data lost.
7. **Hybrid scoring only for SMS** — CALL source type uses rules only, not the ML scorer.
8. **Test scripts** — `src/lib/test_score.ts` and `test_score2.ts` are leftover hackathon test files, not part of the build.

---

## Running the App

```bash
cd SentinelApp
npm install
npx expo start
```

For device testing with the launcher deep links, you need a physical Android device or emulator with SentiLauncher installed. Deep links will not work in Expo Go unless you use a custom dev client build.

```bash
npx expo run:android
```
