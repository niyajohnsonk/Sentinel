import { analyzeThreat } from './src/lib/rulesEngine';

const scams = [
  'SBI Alert: Your account is permanently blocked due to KYC pending. Click bit.ly/sbi-update to verify immediately.',
  'Cyber Crime: Legal action and arrest warrant issued against you. Pay Rs 50000 to dismiss. Call us immediately.',
  'Congratulations! You have won a lucky draw prize of Rs 1,00,000. Share OTP to claim your reward.'
];

const safes = [
  'Hey Rahul, are we still meeting for lunch today? Let me know.',
  'HDFC Bank: Your order payment of Rs 500 is confirmed. Do not share this OTP with anyone. Your order will be delivered soon.',
  'SBI never asks for OTP. OTP for transaction of Rs 1000 is 4829.'
];

console.log('--- SCAMS ---');
scams.forEach(s => console.log(s, '\n=> Score:', analyzeThreat(s, 'SMS').score));
console.log('\n--- SAFES ---');
safes.forEach(s => console.log(s, '\n=> Score:', analyzeThreat(s, 'SMS').score));
