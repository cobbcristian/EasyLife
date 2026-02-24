@echo off
set utilname="NHA_IUID_Synch-UC"
call J:\Alis_Utilities\ReleaseAwareness\modules\Util_Usage_tracker.bat %utilname%

call env
call ..\Env_Files\version

echo ************************************************************
echo Updating EEL NHA IUID Values
echo ************************************************************

echo Performing EEL Updates...
sqlplus -S %DB_LOGIN%/%DB_PWD%@%DB_SRV% as sysdba @sql\update_nha.sql 'COMMIT' %UTIL_VERSION%

echo Completed.........

pause