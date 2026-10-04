@echo off
title GG BANK - REST Backend & Database Engine (Port 8080)
echo ===================================================
echo   GG BANK - UNIFIED REST BACKEND & DATABASE SERVER
echo   "Secure Banking. Smarter Future."
echo ===================================================
echo.
echo Checking database and starting server on port 8080...
echo API Base: http://localhost:8080/api
echo Multi-User Persistent Database: ACTIVE (SQLite)
echo.
python backend\server.py 8080
if %errorlevel% neq 0 (
    echo.
    echo Backend server exited or Python not found.
    pause
)

