# ConnectIQ v0.7.6 — OpenAI-Only Provider Architecture

- Customer and admin provider searches now use OpenAI only.
- Fast and web-enabled OpenAI requests start together.
- ConnectIQ returns the first valid provider list instead of waiting for both calls.
- Removed the browser-side 15-second abort.
- Added strict structured output so valid OpenAI results are not discarded by parsing.
- Removed DSI and curated area fallbacks from the active lookup path.
- Existing environment files and API keys remain preserved by the installer.
