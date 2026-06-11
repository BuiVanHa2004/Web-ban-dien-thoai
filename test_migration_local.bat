@echo off
REM ============================================
REM TEST CHAT MIGRATION ON LOCAL
REM ============================================
echo.
echo === CHAT SYSTEM MIGRATION TEST ===
echo.

REM Change to backend directory
cd /d "%~dp0backend"

echo [STEP 1] Backup database...
echo.
echo Please run manually:
echo   mysqldump -u root -p myphone ^> backup_myphone_before_chat_fix.sql
echo.
pause

echo.
echo [STEP 2] Run migration...
echo.
mysql -u root -p myphone < database_migration_chat_refactor.sql
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Migration failed!
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Migration completed!
echo.

echo [STEP 3] Verify migration...
echo.
mysql -u root -p myphone -e "DESCRIBE chat_messages; SHOW INDEX FROM chat_messages;"

echo.
echo [STEP 4] Check data...
echo.
mysql -u root -p myphone -e "SELECT COUNT(*) as total_messages, SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END) as read_messages FROM chat_messages;"

echo.
echo === MIGRATION TEST COMPLETE ===
echo.
echo Next steps:
echo 1. Start backend: mvn spring-boot:run
echo 2. Start frontend: npm run dev
echo 3. Test chat functionality
echo.
pause
