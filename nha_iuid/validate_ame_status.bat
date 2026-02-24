@echo off
set utilname="NHA_IUID_Synch-VALIDATE"
call J:\Alis_Utilities\ReleaseAwareness\modules\Util_Usage_tracker.bat %utilname%

call env
call .\Env_Files\version

REM ============================================================================
REM AME Collector Status Validation Batch File
REM ============================================================================
REM Usage: validate_ame_status.bat
REM This script generates a report of AME collector status issues
REM ============================================================================

setlocal

echo ============================================================================
echo AME Collector Status Validation
echo Started: %DATE% %TIME%
echo ============================================================================

echo.
echo Generating AME collector status report...
echo This will identify any issues with timestamps and install flags.
echo.

REM Execute the validation SQL script
sqlplus -S %DB_LOGIN%/%DB_PWD%@%DB_SRV% as sysdba @sql\validate_ame_collector_status.sql

set ERRORLEVEL_SQL=%ERRORLEVEL%

echo.
echo ============================================================================
echo Validation Complete
echo Completed: %DATE% %TIME%
echo Exit Code: %ERRORLEVEL_SQL%
echo ============================================================================

REM Display log file information
if exist validate_ame_collector_status.log (
    echo.
    echo Report generated: validate_ame_collector_status.log
    echo.
    echo To view the report:
    echo   type validate_ame_collector_status.log
    echo   or notepad validate_ame_collector_status.log
    echo.
    
    REM Ask if user wants to view the report now
    set /p VIEWREPORT=View the report now? (Y/N): 
    if /i "%VIEWREPORT%"=="Y" (
        echo.
        echo ============================================================================
        echo VALIDATION REPORT CONTENTS:
        echo ============================================================================
        type validate_ame_collector_status.log
        echo.
        echo ============================================================================
        echo END OF REPORT
        echo ============================================================================
    )
)

if %ERRORLEVEL_SQL% NEQ 0 (
    echo.
    echo ERROR: Validation script failed. Check for database connection issues.
    pause
    exit /b %ERRORLEVEL_SQL%
)

echo.
echo Validation completed successfully.
pause
