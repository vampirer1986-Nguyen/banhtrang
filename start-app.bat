@echo off
chcp 65001 >nul
title Quan Banh Trang Nuong - POS
cd /d "%~dp0"

echo ===================================================
echo     QUAN BANH TRANG NUONG DI NGUYET - HE THONG POS
echo ===================================================
echo.

:: Kiem tra xem port 3000 da hoat dong chua
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if %errorlevel% equ 0 goto ALREADY_RUNNING

echo [*] Dang khoi dong may chu POS (npm run dev)...
start "POS Server - Banh Trang Di Nguyet" /min cmd /k "npm run dev"

echo [*] Dang cho may chu san sang...
set ATTEMPT=0

:WAIT_LOOP
ping 127.0.0.1 -n 2 >nul
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if %errorlevel% equ 0 goto SERVER_READY
set /a ATTEMPT+=1
if %ATTEMPT% leq 15 goto WAIT_LOOP

echo [CANH BAO] May chu mat nhieu thoi gian de khoi dong. Dang thu mo trinh duyet...
goto OPEN_BROWSER

:ALREADY_RUNNING
echo [OK] May chu POS da hoat dong san tren cong 3000.
goto OPEN_BROWSER

:SERVER_READY
echo [OK] May chu da san sang!
goto OPEN_BROWSER

:OPEN_BROWSER
echo [*] Dang mo trinh duyet...

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "http://localhost:3000/"
    goto FINISH
)
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" "http://localhost:3000/"
    goto FINISH
)
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" "http://localhost:3000/"
    goto FINISH
)

start "" explorer.exe "http://localhost:3000/"

:FINISH
echo.
echo [HOAN TAT] He thong POS da mo tren trinh duyet!
ping 127.0.0.1 -n 3 >nul
exit
