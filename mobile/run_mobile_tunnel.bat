@echo off
echo ==============================================
echo  Starting Outdoora Mobile (Tunnel Mode)
echo ==============================================
echo Questo modo crea un link remoto sicuro che funziona
echo al 100%% su qualsiasi connessione (Wi-Fi, 4G, 5G),
echo bypassando firewall e router di casa.
echo.
cd /d "%~dp0"
call npx expo start --tunnel ngrok
pause
