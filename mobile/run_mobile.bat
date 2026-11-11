@echo off
echo ==============================================
echo  Starting Outdoora Mobile Expo Dev Server
echo ==============================================
cd /d "%~dp0"
if not exist "node_modules" (
    echo [Installing npm dependencies...]
    call npm install
)
echo.
echo [Starting Expo...]
echo - Premi 'w' per aprire nel Browser Web.
echo - Su telefono Android/iOS apri l'app Expo Go e tocca "Scan QR code".
echo - Se appare la schermata blu di errore di rete, chiudi e avvia con: npx expo start --tunnel
echo.
call npx expo start
pause
