# ConnectIQ v0.8.0 — Conversation Intelligence

Large integrated release for the active `/advisor` backend.

## Included
- Multi-intent and multi-topic detection
- Conversation thread state and journal
- Interruption, urgency, deferral, correction, and human-handoff detection
- Expanded Customer Digital Twin extraction with confidence and source metadata
- Standalone provider and natural monthly-price recognition
- Priority capture from short replies such as `price`
- Duplicate-loop prevention through state-aware response generation
- Five automated conversation acceptance tests
- Installer, verifier, backup, and rollback

## Install
1. Extract this ZIP.
2. Copy the extracted release folder anywhere convenient.
3. Open PowerShell in `C:\connectiqvscode`.
4. Run the installer from the extracted folder, or copy the release folder into the project and double-click `install-connectiq-v0.8.0.bat` while the project is the current directory.

Recommended command:

```powershell
cd C:\connectiqvscode
& "C:\Path\To\ConnectIQ-v0.8.0-Conversation-Intelligence\install-connectiq-v0.8.0.ps1"
```

The installer creates a timestamped backup and runs all Functions tests.
