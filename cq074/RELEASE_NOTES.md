# ConnectIQ v0.7.4 — OpenAI Web Search Provider Fix

## Purpose
Fix provider discovery for previously unknown addresses by using OpenAI web search instead of relying only on model memory or a small curated address list.

## Changes
- OpenAI remains the first provider-discovery source on both customer and admin workflows.
- Added OpenAI Responses API web-search tool for current public-web provider research.
- Runs web-enabled research and a fast carrier-footprint request in parallel.
- Uses web-search results when available and falls back to the fast OpenAI result.
- Hard caps each OpenAI request at 9.5 seconds.
- Preserves DSI as the future authoritative verification source.
- Keeps all OpenAI results labeled as possible providers requiring verification.
- Added defensive parsing for valid JSON and concise provider lists.

## Configuration
The installer preserves `functions/.env`.
Recommended values:

ENABLE_AI_PROVIDER_RESEARCH=true
OPENAI_PROVIDER_WEB_MODEL=gpt-5-mini
OPENAI_PROVIDER_FAST_MODEL=gpt-4.1-mini
AI_PROVIDER_RESEARCH_TIMEOUT_MS=9000

## Validation
- ESLint passed.
- 113 automated tests passed.
- Production build passed.
- Live web-search results require validation with the user's configured OpenAI API project and billing.
