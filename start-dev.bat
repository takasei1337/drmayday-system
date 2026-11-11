@echo off
title DrMayDay - Development Launcher
chcp 65001 >nul
cls

echo ====================================================================
echo            HỆ THỐNG QUẢN LÝ KHÁM BỆNH & THEO DÕI MỀ ĐAY (DRMAYDAY)
echo ====================================================================
echo.

if not exist .env (
    echo [CANH BAO] Chua tim thay file .env o thu muc goc!
    echo Vui long giai nen file team_shared_bundle.zip hoac copy tu .env.example
    echo.
    pause
    exit /b
)

echo [1/2] Dang khoi chay Backend Express Server (Port 5000)...
start "DrMayDay Backend" cmd /k "cd backend && npm run dev"

echo [2/2] Dang khoi chay Frontend Vite Dev Server (Port 3000)...
start "DrMayDay Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ====================================================================
echo  CA HAI SERVER DA DUOC KHOI CHAY TRONG CAC CUA SO RIENG!
echo   - Backend API:  http://localhost:5000/api/v1
echo   - Frontend Web: http://localhost:3000
echo ====================================================================
echo.
pause
