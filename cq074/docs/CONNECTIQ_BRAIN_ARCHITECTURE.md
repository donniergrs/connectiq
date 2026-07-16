# ConnectIQ Brain Architecture

Customer and admin interfaces call the same Provider Intelligence workflow:

1. DSI qualification, when configured.
2. OpenAI provider research when DSI is unavailable or returns no result.
3. Manual verification queue when both sources return no options.

Recommendations use configurable business weighting. The v0.7.0 default is 60% ConnectIQ revenue and 40% customer value. Customer-facing results never represent OpenAI suggestions as confirmed serviceability.
