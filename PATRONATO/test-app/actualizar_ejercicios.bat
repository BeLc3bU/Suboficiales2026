@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Actualizar Banco de Preguntas - Patronato Suboficiales

echo ========================================================
echo    ACTUALIZADOR DE EJERCICIOS - PATRONATO 2026
echo ========================================================
echo.
echo Escaneando la carpeta de PATRONATO en busca de ejercicios...
echo.

set PY_CMD=
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set PY_CMD=python
) else (
    where py >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        set PY_CMD=py
    )
)

if "%PY_CMD%"=="" (
    echo [ERROR] No se ha encontrado Python en el sistema.
    echo Por favor, instala Python para poder actualizar los tests.
    echo.
    pause
    exit /b 1
)

%PY_CMD% "%~dp0actualizar_ejercicios.py"

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo    ACTUALIZACION COMPLETADA CON EXITO
    echo    Se ha regenerado el banco de preguntas en js/questions-data.js
    echo ========================================================
    echo.
    set /p OPEN_APP="Deseas abrir la web de tests ahora? (S/N): "
    if /i "!OPEN_APP!"=="S" (
        start "" "%~dp0index.html"
    )
) else (
    echo.
    echo [ERROR] Hubo un problema al procesar los archivos PDF.
    echo.
)

pause
