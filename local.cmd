@echo off
REM Arrenca l'aplicació en local sense passar per npm (evita problemes
REM amb la política d'execució de PowerShell).
cd /d "%~dp0"
node scripts\dev.mjs
if errorlevel 1 pause
