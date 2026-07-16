# One-Click Installation

1. Extract the entire ZIP to a temporary folder.
2. Close any running ConnectIQ development servers.
3. Double-click `install-connectiq-5.0.5-rc1.bat`.
4. The installer backs up `C:\connectiqvscode`, preserves local `.env` files, installs the complete release, runs npm install, lint, all tests, and the production build.
5. When it reports success, double-click `verify-install.bat` or run `npm run dev`.

The default installation folder is `C:\connectiqvscode`. Advanced users may set the `CONNECTIQ_TARGET` environment variable before running the installer.
