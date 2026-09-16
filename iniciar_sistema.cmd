@echo off
setlocal
title Sistema Carniceria

echo =======================================================
echo        SISTEMA DE INVENTARIO Y VENTAS - CARNICERIA
echo =======================================================
echo.

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

:: Detectar IP Local
set "LOCAL_IP="
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    if not defined LOCAL_IP (
        for /f "tokens=1" %%j in ("%%i") do set "LOCAL_IP=%%j"
    )
)

echo  [*] Direcciones de Acceso:
echo  -------------------------------------------------------
echo  Computador local : http://localhost:5173
if defined LOCAL_IP (
    echo  Celulares Wi-Fi  : http://%LOCAL_IP%:5173
) else (
    echo  Celulares Wi-Fi  : http://[TU_IP_LOCAL]:5173
)
echo  -------------------------------------------------------
echo  Usuarios del sistema:
echo    - Administrador: admin / admin
echo    - Vendedor:      vendedor / 12345
echo =======================================================
echo.
echo  Iniciando Backend y Frontend...
echo.

:: Iniciar Backend
start "Carniceria Backend (Puerto 3000)" cmd /k "cd /d "%ROOT_DIR%backend" && npm run dev"

:: Iniciar Frontend
start "Carniceria Frontend (Puerto 5173)" cmd /k "cd /d "%ROOT_DIR%frontend" && npm run dev"

:: Abrir navegador en 3 segundos
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo  [OK] Servidores iniciados en segundo plano.
echo  [OK] El navegador se abrira automaticamente.
echo.
echo  Deja esta ventana abierta mientras uses el sistema.
echo  Para DETENER ambos servidores al cerrar la carniceria:
echo  Presiona cualquier tecla en esta ventana...
echo =======================================================
pause >nul

echo.
echo  Deteniendo servidores...
powershell -NoProfile -Command "Get-Process -Id (Get-NetTCPConnection -LocalPort 3000,5173 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force" >nul 2>&1
echo  Servidores detenidos.
timeout /t 2 /nobreak >nul
exit
