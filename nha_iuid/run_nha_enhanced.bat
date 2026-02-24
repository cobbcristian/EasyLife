@echo off
set utilname="NHA_IUID_Synch-ENHANCED"
call J:\Alis_Utilities\ReleaseAwareness\modules\Util_Usage_tracker.bat %utilname%

call env
call .\Env_Files\version

REM ============================================================================
REM Enhanced NHA IUID Sync Utility Batch File
REM ============================================================================
REM Usage: run_nha_enhanced.bat [COMMIT|ROLLBACK] [version]
REM Example: run_nha_enhanced.bat COMMIT 1.0
REM ============================================================================

setlocal

REM Set default parameters if not provided
set MODE=%1
set VERSION=%2

if "%MODE%"=="" set MODE=ROLLBACK
if "%VERSION%"=="" set VERSION=1.0

echo ============================================================================
echo Enhanced NHA IUID Sync Utility
echo Mode: %MODE%
echo Version: %VERSION%
echo Started: %DATE% %TIME%
echo ============================================================================

REM Validate mode parameter
if /i NOT "%MODE%"=="COMMIT" (
    if /i NOT "%MODE%"=="ROLLBACK" (
        echo ERROR: Invalid mode '%MODE%'. Must be COMMIT or ROLLBACK.
        echo Usage: %0 [COMMIT^|ROLLBACK] [version]
        pause
        exit /b 1
    )
)

REM Warning for COMMIT mode
if /i "%MODE%"=="COMMIT" (
    echo.
    echo WARNING: Running in COMMIT mode - changes will be permanent!
    echo Press Ctrl+C to cancel or any other key to continue...
    pause >nul
)

REM Execute the SQL script
echo.
echo Executing sql\update_nha_enhanced.sql...
sqlplus -S %DB_LOGIN%/%DB_PWD%@%DB_SRV% as sysdba @sql\update_nha_enhanced.sql %MODE% %VERSION%

set ERRORLEVEL_SQL=%ERRORLEVEL%

echo.
echo ============================================================================
echo Enhanced NHA IUID Sync Complete
echo Completed: %DATE% %TIME%
echo Exit Code: %ERRORLEVEL_SQL%
echo ============================================================================

REM Check for log files and display location
for %%f in (update_nha_iuid_enhanced_*.log) do (
    echo Log file created: %%f
    echo.
    echo To view the log:
    echo   type "%%f"
    echo   or notepad "%%f"
)

if %ERRORLEVEL_SQL% NEQ 0 (
    echo.
    echo ERROR: Script execution failed. Check the log file for details.
    pause
    exit /b %ERRORLEVEL_SQL%
)

echo.
echo Script completed successfully.
pause
