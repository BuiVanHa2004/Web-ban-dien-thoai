@echo off
echo ========================================
echo Running Bank Transactions Migration
echo ========================================
echo.

cd /d "%~dp0backend"

echo Executing SQL migration...
mysql -u root -p shop < migration_add_bank_transaction_columns.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Migration completed successfully!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo Migration failed! Please check errors above.
    echo ========================================
)

echo.
pause
