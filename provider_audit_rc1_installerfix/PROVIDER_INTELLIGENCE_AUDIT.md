# Provider Intelligence Audit — Release 5.0.5 RC1

## Executive finding

The current project does not contain a nationwide FCC Broadband Data Collection database. It contains a small static availability JSON file and a static lookup service. The browser FCC client also attaches `MOCK_PROVIDERS` when an address lookup returns no providers. This creates a path where AT&T, Spectrum, or Lumos can appear even though the authoritative lookup returned nothing.

## Critical findings

1. `src/services/fccService.js` defines `MOCK_PROVIDERS` and exposes them as `fallbackProviders` after an empty response.
2. `functions/data/fccStaticAvailability.json` is a small development dataset, not a nationwide address-level FCC download.
3. `functions/services/staticFccAvailability.js` can provide static availability and must not be treated as national serviceability.
4. `src/services/providerIntelligence.js` contains useful sales metadata but carrier profiles must not establish address availability.
5. `src/pages/FccLookup.jsx` saves `result.providers[0]` directly as the recommendation rather than passing verified providers through one decision boundary.
6. Lead Intake and website lookup currently have separate orchestration paths.

## RC1 decision boundary

RC1 adds a provider-intelligence scaffold and diagnostics page. It does not yet switch production lookup traffic. The new verified recommendation function refuses unverified providers and returns an empty recommendation when no verified providers exist.

## Target flow

Address → Provider Intelligence Engine → verified provider-source adapter → normalized providers → current-carrier exclusion → ranking → explanation → quote/advisor workflow.

## Migration sequence

1. RC1: audit, diagnostics, trace framework, unified model, regression guardrails.
2. RC2: implement the authoritative FCC source adapter and remove mock/static availability from runtime recommendations.
3. RC3: migrate website, CSV intake, FCC admin, lead cards, quote, and AI advisor to the engine.
4. RC4: high-volume validation, retry/checkpoint processing, production monitoring, and static-code deletion.

## Non-negotiable acceptance rule

If an approved provider source returns zero providers, `availableProviders`, `recommendedProvider`, `alternativeProvider`, and quote data remain empty. ConnectIQ may create and preserve the lead, but it may not invent serviceability.
