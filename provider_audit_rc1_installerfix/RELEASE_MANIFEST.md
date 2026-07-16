# Release Manifest

## Identity

- Release: ConnectIQ 5.0.5 RC1 — Provider Intelligence Audit
- Previous release: 5.0.4.1 Revision 1 — Universal Lead Intake Engine
- Epic: National Provider Intelligence
- Sprint objective: Trace, inspect, and document every provider recommendation path.

## Included

- Complete ConnectIQ source tree from the committed baseline
- Firebase Functions source
- Public assets and project configuration
- Provider Diagnostics route and sidebar navigation
- Provider trace framework
- Unified provider-model scaffold
- Static fallback audit and dependency inventory
- Verified-provider-only recommendation guardrails
- Zero-provider and lookup-failure regression tests
- One-click install, verification, and rollback scripts

## Quality gate

- Lint: PASS
- Tests: PASS — 99/99
- Build: PASS — 453 modules
- Known non-blocking warning: Vite bundle exceeds 500 kB

## Important boundary

This is an audit/scaffold release. It exposes legacy static fallback behavior but does not yet migrate all website and CSV runtime traffic to the new Provider Intelligence Engine. That migration belongs to RC2.

## Installer Fix 1
- Replaced destructive `/MIR` release copy with safe complete overlay (`/E`).
- Added Robocopy diagnostics and visible exit code/log on failure.
- Added backend dependency installation.
- Removed obsolete legacy installers from the release root.
