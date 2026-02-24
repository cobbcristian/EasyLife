@echo off
set utilname="NHA_IUID_Synch-COMPLETE"
call J:\Alis_Utilities\ReleaseAwareness\modules\Util_Usage_tracker.bat %utilname%

call env
call .\Env_Files\version

REM ============================================================================
REM Complete NHA Process - Validation, Fix, and Enhanced Sync
REM ============================================================================
REM Usage: run_complete_nha_process.bat [COMMIT|ROLLBACK] [version]
REM This script runs the complete process: validate -> fix -> enhanced sync
REM ============================================================================

setlocal

REM Set default parameters if not provided
set MODE=%1
set VERSION=%2

if "%MODE%"=="" set MODE=ROLLBACK
if "%VERSION%"=="" set VERSION=1.0

echo ============================================================================
echo Complete NHA Process Execution
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

echo.
echo This script will execute the following steps:
echo 1. Validate current AME collector status
echo 2. Fix any identified timestamp/flag issues
echo 3. Run enhanced NHA IUID sync
echo.

if /i "%MODE%"=="COMMIT" (
    echo *** WARNING: Running in COMMIT mode - all changes will be PERMANENT! ***
    echo.
    echo Press Ctrl+C to cancel or any other key to continue...
    pause >nul
) else (
    echo Running in TEST mode - no permanent changes will be made.
    echo.
    pause
)

echo.
echo ============================================================================
echo STEP 1: Validating AME Collector Status
echo ============================================================================
call validate_ame_status.bat
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Validation failed. Stopping process.
    pause
    exit /b 1
)

echo.
echo ============================================================================
echo STEP 2: Fixing AME Collector Issues
echo ============================================================================
call fix_ame_timestamps.bat %MODE% %VERSION%
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Fix process failed. Stopping process.
    pause
    exit /b 1
)

echo.
echo ============================================================================
echo STEP 3: Running Enhanced NHA IUID Sync
echo ============================================================================
call run_nha_enhanced.bat %MODE% %VERSION%
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Enhanced NHA sync failed. Process incomplete.
    pause
    exit /b 1
)

echo.
echo ============================================================================
echo COMPLETE NHA PROCESS FINISHED SUCCESSFULLY
echo Completed: %DATE% %TIME%
echo ============================================================================

echo.
echo All steps completed successfully!
echo.
echo Generated log files:
for %%f in (*.log) do echo   - %%f

if /i "%MODE%"=="COMMIT" (
    echo.
    echo Changes have been committed to the database.
    echo Consider running validate_ame_status.bat again to verify results.
) else (
    echo.
    echo This was a TEST run. To apply all changes, run:
    echo   %0 COMMIT %VERSION%
)

echo.
pause
