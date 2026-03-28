import { SourceType, ThreatAnalysisResult, Severity, Label } from '../types';
import { scoreSMS } from '../ml/sentinel_scorer';

export const generateId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

// SMS & Call Patterns
const AUTHORITY_PATTERNS = [
  /police/i, /customs/i, /court/i, /rbi/i, /sbi/i, /bank manager/i, /income tax/i, /trai\b/i, /supreme court/i,
  /chase/i, /paypal/i, /paytm/i, /icici/i, /hdfc/i, /axis/i, /federal bank/i, /government/i, /officer/i, /headquarters/i
];

const URGENCY_PATTERNS = [
  /urgent/i, /immediately/i, /act now/i, /final warning/i, /action required/i, /expires? in/i, /do it quickly/i,
  /account locked/i, /account suspended/i, /unusual activity/i, /suspicious activity/i
];

const PHISHING_PATTERNS = [
  /click here/i, /verify now/i, /login now/i, /confirm account/i, /refund pending/i, /delivery failed/i, 
  /update payment/i, /prize/i, /reward/i, /won/i, /claim now/i
];

const COERCION_PATTERNS = [/transfer money/i, /send money/i, /pay now/i, /verify payment/i, /pay penalty/i, /deposit/i, /wire transfer/i];
const CREDENTIAL_PATTERNS = [/\botp\b/i, /kyc/i, /verify account/i, /pan update/i, /aadhaar/i, /login details/i, /password/i];
const FEAR_PATTERNS = [/arrest\b/i, /legal action/i, /suspended/i, /blocked/i, /penalty/i, /jail/i, /warrant/i, /fir\b/i, /seized/i];

// URL Patterns
const URL_TLD_SUSPICIOUS = [/\.xyz$/i, /\.top$/i, /\.cc$/i, /\.vip$/i, /\.ru$/i, /\.cn$/i, /\.info$/i, /\.biz$/i, /\.cam$/i];
const URL_SHORTENERS = [/bit\.ly/i, /tinyurl\.com/i, /cutt\.ly/i, /t\.co/i, /goo\.gl/i, /ow\.ly/i, /is\.gd/i];
const URL_KEYWORDS = [/login/i, /verify/i, /secure/i, /update/i, /bank/i, /account/i, /wallet/i, /kyc/i, /otp/i, /refund/i];
const URL_TYPO_SQUATTING = [/paypol/i, /g00gle/i, /faceb00k/i, /arnazon/i, /amzon/i, /y0utube/i, /netflix.*free/i];

export function analyzeThreat(content: string, sourceType: SourceType, sourceLabel?: string, providedId?: string): ThreatAnalysisResult {
  let score = 0;
  const reasons: string[] = [];
  const matchedSignals: Set<string> = new Set();
  
  const textToAnalyze = content.toLowerCase();

  const addScore = (points: number, reason: string, signalGroup: string) => {
    score += points;
    if (!reasons.includes(reason)) reasons.push(reason);
    matchedSignals.add(signalGroup);
  };

  let hasUrlKeyword = false;
  let hasTypoSquat = false;
  
  let hasAuthority = false;
  let hasUrgency = false;
  let hasLink = false;

  if (sourceType === 'URL') {
    hasLink = true;
    let hostname = textToAnalyze;
    try {
      const urlObj = new URL(textToAnalyze.startsWith('http') ? textToAnalyze : `https://${textToAnalyze}`);
      hostname = urlObj.hostname;
    } catch (e) {
      // If parsing fails, use the raw string
    }

    if (URL_SHORTENERS.some(p => p.test(hostname))) {
      addScore(40, "Uses a known URL shortener to hide final destination", "Shortened Link");
    }

    if (URL_TLD_SUSPICIOUS.some(p => p.test(hostname))) {
      addScore(40, "Uses a suspicious or unverified top-level domain", "Suspicious TLD");
    }

    const hyphens = (hostname.match(/-/g) || []).length;
    const digits = (hostname.match(/[0-9]/g) || []).length;
    if (hyphens >= 2) {
      addScore(15, "Excessive hyphens in domain name (common in phishing)", "Complex Domain");
    }
    if (digits >= 4) {
      addScore(15, "Excessive numbers in domain name", "Complex Domain");
    }

    if (URL_TYPO_SQUATTING.some(p => p.test(hostname))) {
      addScore(60, "Lookalike domain / brand spoofing detected", "Brand Spoofing / Typo-Squatting");
      hasTypoSquat = true;
    }

    if (URL_KEYWORDS.some(p => p.test(textToAnalyze))) {
      addScore(30, "Action-oriented / sensitive words in URL", "Phishing URL Pattern");
      hasUrlKeyword = true;
    }

    // Multiply/Combine weak signals
    if (hasTypoSquat && hasUrlKeyword) {
      addScore(30, "Lookalike domain requesting sensitive action", "High Risk Phishing Combination");
    }

  } else {
    // Text specific checks (SMS / Call)
    
    // Detect URLs inside text
    const urlRegex = /(https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/[^\s]*)?)/ig;
    const urls = textToAnalyze.match(urlRegex);
    if (urls && urls.length > 0) {
      hasLink = true;
      addScore(15, "Contains embedded link", "External Link");
      
      urls.forEach(u => {
        if (URL_SHORTENERS.some(p => p.test(u))) {
          addScore(35, "Contains obfuscated shortened link", "Shortened Link in Text");
        }
      });
    }

    AUTHORITY_PATTERNS.forEach(p => {
      if (p.test(textToAnalyze) || (sourceLabel && p.test(sourceLabel.toLowerCase()))) {
        addScore(30, `Impersonates authority: ${p.source.replace(/\\b|[\/\^i\$]/g, '')}`, "Authority Impersonation");
        hasAuthority = true;
      }
    });

    URGENCY_PATTERNS.forEach(p => {
      if (p.test(textToAnalyze)) {
        addScore(25, `Creates artificial urgency: ${p.source.replace(/\\b|[\/\^i\$]/g, '')}`, "Urgency / Pressure");
        hasUrgency = true;
      }
    });

    PHISHING_PATTERNS.forEach(p => {
      if (p.test(textToAnalyze)) addScore(25, `Phishing call-to-action: ${p.source.replace(/\\b|[\/\^i\$]/g, '')}`, "Phishing Language");
    });

    COERCION_PATTERNS.forEach(p => {
      if (p.test(textToAnalyze)) addScore(30, `Demands payment: ${p.source.replace(/\\b|[\/\^i\$]/g, '')}`, "Coercion / Payment");
    });

    CREDENTIAL_PATTERNS.forEach(p => {
      if (p.test(textToAnalyze)) addScore(25, `Asks for sensitive info: ${p.source.replace(/\\b|[\/\^i\$]/g, '')}`, "Credential / OTP Theft");
    });

    FEAR_PATTERNS.forEach(p => {
      if (p.test(textToAnalyze)) addScore(25, `Uses threats or fear: ${p.source.replace(/\\b|[\/\^i\$]/g, '')}`, "Fear & Threats");
    });
    
    // Combination multipliers for SMS/Call
    if (hasUrgency && hasAuthority && hasLink) {
      addScore(40, "Classic phishing triad: Authority + Urgency + Link", "Critical Phishing Pattern");
    } else if (hasUrgency && hasLink) {
      addScore(25, "Urgency driving to an external link", "High-Risk Link Delivery");
    }
  }

  // --- HYBRID SCORING FOR SMS ---
  if (sourceType === 'SMS') {
    const mlResult = scoreSMS(content);
    const rulesScore = score;
    
    // Blended Approach: 50% Heuristics + 50% ML
    score = Math.round((rulesScore * 0.5) + (mlResult.score * 0.5));
    
    // If either engine is extremely confident (>80), trust it fully to avoid dilution
    if (rulesScore > 80 || mlResult.score > 80) {
      score = Math.max(rulesScore, mlResult.score);
    }
    
    // Merge ML insights explicitly
    mlResult.reasons.forEach(reason => {
      const formattedReason = `[ML] ${reason}`;
      if (!reasons.includes(formattedReason)) reasons.push(formattedReason);
    });
    mlResult.matchedCategories.forEach(cat => matchedSignals.add(`[ML] ${cat}`));
  }

  score = Math.min(score, 100);

  let label: Label = "Safe";
  let severity: Severity = "low";
  let isFlagged = false;
  let recommendedAction = "No action necessary. Stay vigilant.";

  if (score >= 70) {
    label = "High Risk Scam";
    severity = "high";
    isFlagged = true;
    recommendedAction = sourceType === 'CALL' 
      ? "Hang up immediately and do not share any details." 
      : "Do not click any links or reply. Delete immediately.";
  } else if (score >= 30) {
    label = "Suspicious";
    severity = "medium";
    isFlagged = true;
    recommendedAction = "Proceed with caution. Verify the sender independently.";
  }

  return {
    id: providedId || generateId(),
    sourceType,
    sourceLabel,
    content,
    score,
    label,
    severity,
    reasons,
    matchedSignals: Array.from(matchedSignals),
    recommendedAction,
    timestamp: new Date().toISOString(),
    isFlagged
  };
}
