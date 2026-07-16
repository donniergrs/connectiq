# ConnectIQ v0.7.5 — Fast OpenAI Results Fix

## Customer and Admin Provider Intelligence

- OpenAI remains the first provider-discovery source.
- The fast model is called first and its usable provider list is returned immediately.
- ConnectIQ no longer waits for a slower web-search request when the fast response is already usable.
- The prior 9.5-second hard abort has been removed.
- Web search remains a fallback for cases where the fast model returns no providers.
- Both the customer-facing site and admin Provider Intelligence use the same corrected service.

## Configuration

Optional settings in `functions/.env`:

```env
OPENAI_PROVIDER_FAST_TIMEOUT_MS=30000
OPENAI_PROVIDER_WEB_TIMEOUT_MS=60000
OPENAI_PROVIDER_FAST_MODEL=gpt-4.1-mini
OPENAI_PROVIDER_WEB_MODEL=gpt-5-mini
```

Existing environment files and API keys are preserved by the installer.
