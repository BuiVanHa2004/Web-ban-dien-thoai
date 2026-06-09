@echo off
REM =============================================
REM Push code lên GitHub
REM Chạy từ thư mục gốc: C:\Doantotnghiep
REM =============================================

cd /d C:\Doantotnghiep

echo ========================================
echo  PUSH CODE LEN GITHUB
echo ========================================

echo.
echo [1] Kiem tra trang thai git...
git status

echo.
echo [2] Them tat ca file thay doi...
git add .

echo.
echo [3] Tao commit...
set /p commit_msg="Nhap noi dung commit (Enter de dung default): "
if "%commit_msg%"=="" set commit_msg=Deploy: add Dockerfile and production config

git commit -m "%commit_msg%"

echo.
echo [4] Push len GitHub...
git push origin main

if %errorlevel% neq 0 (
    echo.
    echo [LOI] Push that bai. Co the:
    echo   - Chua set remote: git remote add origin https://github.com/USERNAME/REPO.git
    echo   - Chua dang nhap GitHub: git config credential.helper store
    echo   - Branch sai ten: doi 'main' thanh 'master' neu can
) else (
    echo.
    echo [OK] Push thanh cong!
    echo    Vercel va Render se tu dong deploy (neu da ket noi GitHub)
)

pause
