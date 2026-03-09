@echo off
echo ==========================================
echo    REINICIANDO SERVIDOR MERCATENERIFE
echo ==========================================
echo.
echo 1. Cerrando procesos antiguos...
taskkill /F /IM node.exe > nul 2>&1
timeout /t 2 /nobreak > nul

echo 2. Iniciando servidor de desarrollo...
echo.
echo POR FAVOR, MANTENGA ESTA VENTANA ABIERTA.
echo Si se abre el navegador, use esa ventana.
echo.
call npm run dev
pause
