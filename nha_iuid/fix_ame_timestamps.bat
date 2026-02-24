@echo off
set utilname="NHA_IUID_Synch-AME_FIX"
call J:\Alis_Utilities\ReleaseAwareness\modules\Util_Usage_tracker.bat %utilname%

call env
call .\Env_Files\version

REM ============================================================================
REM AME Collector Timestamp Fix Batch File
REM ============================================================================
REM Usage: fix_ame_timestamps.bat [COMMIT|ROLLBACK] [version]
REM Example: fix_ame_timestamps.bat ROLLBACK 1.0  (test mode)
REM Example: fix_ame_timestamps.bat COMMIT 1.0    (production mode)
REM ============================================================================

setlocal

REM Set default parameters if not provided
set MODE=%1
set VERSION=%2

if "%MODE%"=="" set MODE=ROLLBACK
if "%VERSION%"=="" set VERSION=1.0

echo ============================================================================
echo AME Collector Timestamp Fix Utility
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

REM Recommendation to run validation first
echo.
echo RECOMMENDATION: Run validate_ame_status.bat first to assess the scope of issues.
echo.

REM Different warnings based on mode
if /i "%MODE%"=="ROLLBACK" (
    echo Running in TEST mode - no changes will be committed.
    echo This will show you what would be fixed without making permanent changes.
) else (
    echo.
    echo *** WARNING: Running in COMMIT mode - changes will be PERMANENT! ***
    echo This will fix AME collector timestamps and install flags.
    echo.
    echo Press Ctrl+C to cancel or any other key to continue...
    pause >nul
)

REM Execute the fix SQL script
echo.
echo Executing sql\fix_ame_collector_timestamps.sql...
sqlplus -S %DB_LOGIN%/%DB_PWD%@%DB_SRV% as sysdba @sql\fix_ame_collector_timestamps.sql %MODE% %VERSION%

set ERRORLEVEL_SQL=%ERRORLEVEL%

echo.
echo ============================================================================
echo AME Collector Fix Complete
echo Completed: %DATE% %TIME%
echo Exit Code: %ERRORLEVEL_SQL%
echo ============================================================================

REM Check for log files and display location
for %%f in (fix_ame_collector_timestamps_*.log) do (
    echo Log file created: %%f
    echo.
    echo To view the log:
    echo   type "%%f"
    echo   or notepad "%%f"
    echo.
    
    if /i "%MODE%"=="ROLLBACK" (
        echo NOTE: This was a TEST run. To apply fixes, run:
        echo   %0 COMMIT %VERSION%
    ) else (
        echo Changes have been committed to the database.
        echo Run validate_ame_status.bat to verify the fixes.
    )
)

if %ERRORLEVEL_SQL% NEQ 0 (
    echo.
    echo ERROR: Fix script execution failed. Check the log file for details.
    pause
    exit /b %ERRORLEVEL_SQL%
)

echo.
echo Script completed successfully.
pause
