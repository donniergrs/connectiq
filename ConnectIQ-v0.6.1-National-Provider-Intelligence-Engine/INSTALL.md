# Install ConnectIQ v0.6.1

1. Extract this ZIP to a normal folder outside `C:\connectiqvscode`.
2. Double-click `install-connectiq.bat`.
3. The installer backs up the current project, preserves `.env` files, copies the complete release, installs dependencies, and runs lint, tests, and build.
4. Double-click `verify-install.bat` after installation.
5. Start the backend and frontend using your normal development workflow.

## Optional AI provider research
Set the following in `C:\connectiqvscode\functions\.env`:

```text
ENABLE_AI_PROVIDER_RESEARCH=true
OPENAI_API_KEY=your-key
OPENAI_PROVIDER_RESEARCH_MODEL=gpt-5-mini
```

AI results remain unverified and cannot generate automatic recommendations.
