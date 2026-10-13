@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Actualizar Banco de Preguntas y Desplegar en Vercel - Patronato 2026

echo ========================================================
echo    ACTUALIZADOR DE EJERCICIOS Y DESPLIEGUE - PATRONATO
echo ========================================================
echo.
echo 1. Escaneando la carpeta de PATRONATO en busca de ejercicios...
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
    echo Por favor, instala Python para poder procesar los PDFs.
    echo.
    pause
    exit /b 1
)

cd /d "%~dp0"
%PY_CMD% "%~dp0actualizar_ejercicios.py"

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Hubo un problema al procesar los archivos PDF de ejercicios.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo 2. SINCRONIZANDO CON GITHUB Y DESPLEGANDO EN VERCEL...
echo ========================================================
echo.

set GIT_CMD=
where git >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set GIT_CMD=git
) else (
    if exist "C:\Program Files\Git\cmd\git.exe" (
        set GIT_CMD="C:\Program Files\Git\cmd\git.exe"
    ) else if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" (
        set GIT_CMD="%LOCALAPPDATA%\Programs\Git\cmd\git.exe"
    )
)

if "%GIT_CMD%"=="" (
    echo [AVISO] No se ha encontrado Git en el sistema.
    echo Los ejercicios locales se han actualizado en js/questions-data.js,
    echo pero deberás hacer el push manualmente para actualizar Vercel.
    echo.
    pause
    exit /b 0
)

:: Añadir cambios de test-app al stage de git
%GIT_CMD% add -A "%~dp0."

:: Comprobar si hay cambios para commitear
%GIT_CMD% diff --cached --quiet
if %ERRORLEVEL% neq 0 (
    echo Guardando cambios en Git...
    %GIT_CMD% commit -m "feat(data): actualizacion automatica de ejercicios de Patronato"
    echo.
    echo Enviando cambios a GitHub (git push origin main)...
    %GIT_CMD% push origin main
    if !ERRORLEVEL! equ 0 (
        echo.
        echo ========================================================
        echo    DESPLIEGUE EN VERCEL INICIADO CON EXITO
        echo ========================================================
        echo  * Banco de preguntas actualizado en GitHub
        echo  * Despliegue en curso en Vercel:
        echo    https://suboficiales2026.vercel.app/PATRONATO/test-app/
        echo ========================================================
    ) else (
        echo.
        echo [ERROR] No se pudo hacer push a GitHub. Comprueba tu conexión a Internet o credenciales.
    )
) else (
    echo.
    echo No hay cambios nuevos pendientes de subir (el banco ya está actualizado en GitHub).
)

echo.
set /p OPEN_APP="Deseas abrir la web en produccion (Vercel) ahora? (S/N): "
if /i "!OPEN_APP!"=="S" (
    start "" "https://suboficiales2026.vercel.app/PATRONATO/test-app/"
)

echo.
echo Proceso finalizado.
pause
