@echo off
rem DevQA Library - double-click to open.
rem
rem This used to open index.html straight off the disk. That works for
rem reading, but Chrome never gives a file:// page the microphone, so
rem voice mode could not work however many times the mic was tapped.
rem It now serves the same folder on localhost, which Chrome trusts.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto nonode

title DevQA Library
start "" http://localhost:5173
node serve.js
pause
exit /b

:nonode
echo.
echo   Node was not found, so the library can only be opened as a file.
echo   It will open for reading, but VOICE WILL NOT WORK that way.
echo.
pause
start "" "%~dp0index.html"
