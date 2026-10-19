@echo off
rem DevQA Library - start this when you want VOICE.
rem Double-clicking index.html opens it as a file, and Chrome never
rem gives a file the microphone. This serves the same folder instead.
title DevQA Library server
cd /d "%~dp0"
start "" http://localhost:5173
node serve.js
pause
