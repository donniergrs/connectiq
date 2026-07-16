# Browser Test Plan — Provider Intelligence Audit RC1

1. Install the package and run lint, tests, and build.
2. Start the development server and open `/admin/provider-diagnostics`.
3. Search a known address and verify a Trace ID, lookup source, provider count, normalized provider list, recommendation decision, and timeline appear.
4. Confirm any `fallbackProviders` are flagged as an audit warning and are not used by the verified recommendation decision.
5. Search an address returning zero providers. Confirm the verified recommendation is empty.
6. Stop the backend or use an invalid endpoint to simulate lookup failure. Confirm the page displays a failed trace and no invented provider.
7. Confirm existing routes, Lead Intake, Pipeline, My Day, and Executive Dashboard still load.
