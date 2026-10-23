# Care Kotoba

Mobile-first Japanese conversation practice for foreign eldercare staff. This prototype shares the same scenario content across individual and company-facing views.

## Current scope

- 48 fictional action-level scenarios in 8 categories; 144 reference expressions and 4 conversation variants.
- WebRTC voice roleplay, text conversation, structured feedback, and speech playback via server-side OpenAI routes.
- Explicitly labeled scripted demo that works without AI credits. Demo completion is recorded separately from AI learning achievements; no synthetic AI scores.
- Notes, preferences and learning history persist in the current browser. Editable input transcripts support speech recognition corrections.
- Company dashboard uses labeled fictional sample data. Search, group filtering, sample report export, learner detail, and local demo assignments work. It does not yet implement multi-tenant membership, invitation delivery, subscription billing or cross-device cloud records.
- Installable web app manifest, touch icon and network-aware offline page. This is a PWA prototype, not an App Store release.

## AI configuration

`OPENAI_API_KEY` is a secret runtime variable in Sites and an ignored `.env.local` value for local work. Never commit credentials. Live API access was authenticated; the initial generation test returned `credit_balance_exhausted`. Paid balance must be available before real generation can be verified end to end. No balance was purchased.

API documentation: https://developers.openai.com/api/docs/guides/voice-webrtc and https://developers.openai.com/api/docs/guides/structured-outputs .

The curated conversation content is a draft for review by an eldercare practitioner and Japanese-language educator. Feedback evaluates language use from transcript evidence; it does not certify pronunciation, care competence or independent duty readiness. Practice uses fictional cases.

## Development

Use the Sites preview supervisor in the managed environment. `node node_modules/typescript/bin/tsc --noEmit` checks types. Build and package through the Sites helper and the retained `.openai/hosting.json` project identity. The repository is the durable source of this app.
