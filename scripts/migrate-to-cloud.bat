@echo off
REM =============================================
REM Script migrate MySQL từ local lên Aiven Cloud
REM Chạy file này trên Windows CMD
REM =============================================

echo ========================================
echo  MIGRATE DATABASE TO AIVEN CLOUD
echo ========================================

REM --- CẤU HÌNH LOCAL (nguồn) ---
set LOCAL_HOST=localhost
set LOCAL_PORT=3306
set LOCAL_USER=root
set LOCAL_PASSWORD=root
set LOCAL_DB=myphone

REM --- CẤU HÌNH AIVEN CLOUD (đích) ---
REM !!! THAY CÁC GIÁ TRỊ NÀY BẰNG THÔNG TIN AIVEN CỦA BẠN !!!
set CLOUD_HOST=mysql-datn-xxx.aivencloud.com
set CLOUD_PORT=14839
set CLOUD_USER=avnadmin
set CLOUD_PASSWORD=YOUR_AIVEN_PASSWORD
set CLOUD_DB=defaultdb

echo.
echo [1/3] Dang export du lieu tu MySQL local...
mysqldump -h %LOCAL_HOST% -P %LOCAL_PORT% -u %LOCAL_USER% -p%LOCAL_PASSWORD% ^
  --single-transaction ^
  --no-tablespaces ^
  --set-gtid-purged=OFF ^
  %LOCAL_DB% > backup_local.sql

if %errorlevel% neq 0 (
    echo [LOI] Export that bai. Kiem tra MySQL local co dang chay khong.
    pause
    exit /b 1
)
echo [OK] Export thanh cong: backup_local.sql

echo.
echo [2/3] Dang import len Aiven Cloud...
echo (Se hoi mat khau, nhap: %CLOUD_PASSWORD%)
mysql -h %CLOUD_HOST% -P %CLOUD_PORT% -u %CLOUD_USER% -p%CLOUD_PASSWORD% ^
  --ssl-mode=REQUIRED ^
  %CLOUD_DB% < backup_local.sql

if %errorlevel% neq 0 (
    echo [LOI] Import that bai. Kiem tra thong tin ket noi Aiven.
    pause
    exit /b 1
)
echo [OK] Import thanh cong len Aiven Cloud!

echo.
echo [3/3] Ket qua:
echo   File backup: backup_local.sql (giu lai de backup)
echo   Database tren cloud: %CLOUD_DB% tai %CLOUD_HOST%
echo.
echo HOAN THANH! Gio co the deploy Backend.
pause
