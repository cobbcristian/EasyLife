@echo off
set utilname="NHA_IUID_Synch-ILP"
call J:\Alis_Utilities\ReleaseAwareness\modules\Util_Usage_tracker.bat %utilname%

call env
call .\Env_Files\version

echo ************************************************************
echo Identifying EEL with NHA
echo ************************************************************

echo Identifying CIPROD Updates...
sqlplus -S %DB_LOGIN%/%DB_PWD%@%DB_SRV% as sysdba @sql\identify_eel_with_nha.sql

echo.
echo Please review discrepancies identified in loose_inv_with_eels_having_nha.log
set /p perform_updates=Do you wish to perform the reviewed updates [Y/N](Defaults to N):
echo.
if /I "%perform_updates%" EQU "Y" (
    echo Performing Changes...
    sqlplus -S %DB_LOGIN%/%DB_PWD%@%DB_SRV% as sysdba @sql\update_loose_eel_with_nha.sql %UTIL_VERSION%
    echo Completed.........
) else (echo Canceling. No modifications were made.)

pause