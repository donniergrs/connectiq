# Install ConnectIQ v0.6.2

1. Close VS Code, all ConnectIQ terminals, and any running Node/Vite processes.
2. Extract the release ZIP outside `C:\connectiqvscode`.
3. Double-click `install-connectiq.bat`.
4. After installation, import FCC BDC data using `docs/FCC_BDC_SETUP.md`.
5. Start the backend from `C:\connectiqvscode\functions` with `npm run dev`.
6. Start the frontend from `C:\connectiqvscode` with `npm run dev`.

The installer preserves `.env` files and any existing `functions\data\*.sqlite` BDC database.
