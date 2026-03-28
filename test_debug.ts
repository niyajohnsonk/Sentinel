import { analyzeThreat } from './src/lib/rulesEngine';
import { scoreSMS } from './src/ml/sentinel_scorer';
import * as fs from 'fs';

const text = 'HDFC Bank: Your order payment of Rs 500 is confirmed. Do not share this OTP with anyone. Your order will be delivered soon.';

const ruleResult = analyzeThreat(text, 'SMS');
const mlResult = scoreSMS(text);

const out = {
  originalRulesEngineScoreWas: ruleResult.score, 
  mlResult: mlResult
};
fs.writeFileSync('debug.json', JSON.stringify(out, null, 2), 'utf8');
