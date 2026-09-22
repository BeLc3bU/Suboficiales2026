@echo off
chcp 65001 >nul
title Patronato Tests 2026

set PY_CMD=
REM 1. Probar el lanzador estándar 'py'
py -c "import sys" >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set PY_CMD=py
) else (
    REM 2. Probar 'python' comprobando que sea funcional (evita el alias de Windows Store)
    python -c "import sys" >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        set PY_CMD=python
    )
)

if "%PY_CMD%"=="" (
    start "" "%~dp0index.html"
    exit /b
)

start "" %PY_CMD% "%~dp0servidor.py"
