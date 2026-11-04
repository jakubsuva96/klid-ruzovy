@echo off
rem Klid - spusteni na Windows dvojklikem
cd /d "%~dp0"
where node >nul 2>nul || (echo Chybi Node.js - viz README. & pause & exit /b 1)
node server.mjs --open
pause
