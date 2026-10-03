@echo off
echo ===================================================
echo   GG BANK - FRONTEND APPLICATION LAUNCHER
echo   "Secure Banking. Smarter Future."
echo ===================================================
echo.
cd frontend
echo Starting local web server on port 3000...
echo Open your browser at: http://localhost:3000
echo.
python -m http.server 3000
pause
