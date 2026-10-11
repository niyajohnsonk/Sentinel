# Sentinel

A mobile threat-detection app built as a hackathon project to help users identify scam SMS, suspicious URLs, and risky live-call patterns in real time.

> Built for: [Hackathon Name]  
> Team: [Team Name]  
> Team Members: [Member 1], [Member 2], [Member 3], [Member 4]  
> Project Type: [Hackathon track / category]

## Overview

Sentinel is a React Native + Expo app focused on on-device scam awareness for Indian users. It scans:

- scam-style SMS messages
- suspicious links and domains
- live call audio chunks for malicious intent patterns

The app combines rule-based threat detection with a lightweight local scoring engine, so users can get rapid feedback without needing a backend service during the demo.

## Problem

Scam messages and phishing links are becoming harder to spot, especially when they imitate banks, government agencies, delivery companies, or payment platforms. Users often miss early signs until it is too late.

## Solution

Sentinel helps users quickly assess whether a message, link, or live call is risky by:

- flagging risky content using heuristic threat patterns
- scoring suspicious URLs and scam language
- alerting the user during suspicious live call monitoring
- keeping a local threat vault with history and reasoning

## Features

- SMS scam detection with rule-based reasoning and hybrid scoring
- URL scanner for suspicious domains and phishing patterns
- Live call monitoring with chunk-by-chunk audio analysis
- Local SQLite storage for threat history
- Severity and risk labels for each detection
- Recommended actions for risky messages and spam patterns
- Quick dashboard for recent activity and threat counts

## Tech Stack

- React Native + Expo
- TypeScript
- Expo SQLite
- AsyncStorage
- React Navigation
- Expo AV for live audio capture
- Local rule engine + custom scoring heuristics

## App Flow

1. User opens the app and completes onboarding.
2. SMS, URL, and live-call monitoring scan incoming threats.
3. Threats are analyzed locally using a scoring engine.
4. Results are displayed with risk score, reasons, and recommended action.
5. Threats are saved in the local vault for review.

## Project Structure

```text
Sentinel/
├── App.tsx
├── app.json
├── package.json
├── README.md
├── src/
│   ├── components/
│   ├── lib/
│   ├── ml/
│   ├── navigation/
│   ├── screens/
│   ├── theme/
│   ├── types/
│   └── data/
├── assets/
└── ...
```

## Getting Started

### Prerequisites

- Node.js
- npm or yarn
- Expo CLI
- Android emulator or physical Android device

### Install dependencies

```bash
npm install
```

### Start the app

```bash
npm start
```

### Run on Android

```bash
npx expo run:android
```

## Notes for Hackathon Use

This project was created as part of a hackathon and is intended as a functional prototype / demo app.

- the app is optimized for validation and presentation
- some features are intentionally lightweight and local-only
- production security and deployment hardening are not yet complete
- certain APIs or services may need environment variables before broader deployment

## Important Security / Production Notes

This project includes demo-grade logic and a few placeholders that should be tightened before public release or deployment:

- API keys should be moved to secure environment variables
- onboarding toggles are currently stubbed and not fully enforced
- background monitoring is limited by mobile OS constraints
- the app is designed as a prototype and not a full production-grade security product


## Future Improvements

- stronger real-world threat detection coverage
- server-backed verification and case reporting
- better privacy controls and consent flows
- background monitoring support
- blocklist / allowlist management
- improved analytics and export support

