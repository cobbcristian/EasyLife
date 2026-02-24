SET VERIFY OFF
SET LINES 200
SET FEEDBACK OFF
SET SUFFIX text
SET PAGES 100
SET ECHO ON
SET TERM OFF
SET SERVEROUTPUT ON SIZE UNLIMITED
SET TRIMSPOOL ON

SPOOL validate_ame_collector_status.log

DECLARE
    l_total_ame_collectors      INTEGER := 0;
    l_missing_timestamps        INTEGER := 0;
    l_incorrect_install_flags   INTEGER := 0;
    l_timestamp_mismatches      INTEGER := 0;
    l_healthy_records          INTEGER := 0;
BEGIN
    dbms_output.put_line('================================================');
    dbms_output.put_line('-- AME Collector Status Validation Report');
    dbms_output.put_line('-- Generated: ' || to_char(sysdate, 'MM/DD/YYYY HH24:MI:SS'));
    dbms_output.put_line('================================================');

    -- Count total AME collectors
    SELECT COUNT(*)
    INTO l_total_ame_collectors
    FROM cmmsdata.mm_inventory inv
         JOIN cmmsdata.mm_part mp 
           ON (inv.part_number = mp.part_number AND inv.cage_code = mp.cage_code)
         JOIN eel_owner.prt_part pp
           ON (pp.ref_nbr = inv.part_number 
               AND pp.cage_code = inv.cage_code 
               AND pp.serial_nbr = inv.serial_number)
    WHERE mp.is_eel_required = 'Y'
      AND mp.is_serialized = 'Y'
      AND pp.rec_mode = 'OPEN';

    dbms_output.put_line('Total AME Collectors (EEL-required, serialized, open): ' || l_total_ame_collectors);
    dbms_output.put_line('');

    -- Count records with missing installation timestamps
    SELECT COUNT(*)
    INTO l_missing_timestamps
    FROM cmmsdata.mm_inventory inv
         JOIN cmmsdata.mm_part mp 
           ON (inv.part_number = mp.part_number AND inv.cage_code = mp.cage_code)
         JOIN eel_owner.prt_part pp
           ON (pp.ref_nbr = inv.part_number 
               AND pp.cage_code = inv.cage_code 
               AND pp.serial_nbr = inv.serial_number)
    WHERE mp.is_eel_required = 'Y'
      AND mp.is_serialized = 'Y'
      AND pp.rec_mode = 'OPEN'
      AND inv.installation_timestamp IS NULL;

    dbms_output.put_line('Records with MISSING installation timestamps: ' || l_missing_timestamps);

    -- Count records with incorrect install flags
    SELECT COUNT(*)
    INTO l_incorrect_install_flags
    FROM cmmsdata.mm_inventory inv
         JOIN cmmsdata.mm_part mp 
           ON (inv.part_number = mp.part_number AND inv.cage_code = mp.cage_code)
         JOIN eel_owner.prt_part pp
           ON (pp.ref_nbr = inv.part_number 
               AND pp.cage_code = inv.cage_code 
               AND pp.serial_nbr = inv.serial_number)
    WHERE mp.is_eel_required = 'Y'
      AND mp.is_serialized = 'Y'
      AND pp.rec_mode = 'OPEN'
      AND inv.is_inventory_installed = 'N';

    dbms_output.put_line('Records with INCORRECT install flags (N instead of Y): ' || l_incorrect_install_flags);

    -- Count records with timestamp mismatches
    SELECT COUNT(*)
    INTO l_timestamp_mismatches
    FROM cmmsdata.mm_inventory inv
         JOIN cmmsdata.mm_part mp 
           ON (inv.part_number = mp.part_number AND inv.cage_code = mp.cage_code)
         JOIN eel_owner.prt_part pp
           ON (pp.ref_nbr = inv.part_number 
               AND pp.cage_code = inv.cage_code 
               AND pp.serial_nbr = inv.serial_number)
    WHERE mp.is_eel_required = 'Y'
      AND mp.is_serialized = 'Y'
      AND pp.rec_mode = 'OPEN'
      AND inv.installation_timestamp IS NOT NULL 
      AND pp.date_installed IS NOT NULL 
      AND inv.installation_timestamp != pp.date_installed;

    dbms_output.put_line('Records with timestamp MISMATCHES between inventory and EEL: ' || l_timestamp_mismatches);

    -- Count healthy records
    l_healthy_records := l_total_ame_collectors - l_missing_timestamps - l_incorrect_install_flags - l_timestamp_mismatches;
    dbms_output.put_line('Records that appear HEALTHY: ' || l_healthy_records);

    dbms_output.put_line('');
    dbms_output.put_line('================================================');
    dbms_output.put_line('-- Detailed Problem Records');
    dbms_output.put_line('================================================');

    -- Show detailed information for problematic records
    dbms_output.put_line('');
    dbms_output.put_line('--- Records with Missing Installation Timestamps ---');
    
    FOR r_missing IN (
        SELECT 
            inv.part_number,
            inv.cage_code,
            inv.serial_number,
            pp.iuid,
            pp.date_installed as eel_date_installed,
            pp.nha_iuid
        FROM cmmsdata.mm_inventory inv
             JOIN cmmsdata.mm_part mp 
               ON (inv.part_number = mp.part_number AND inv.cage_code = mp.cage_code)
             JOIN eel_owner.prt_part pp
               ON (pp.ref_nbr = inv.part_number 
                   AND pp.cage_code = inv.cage_code 
                   AND pp.serial_nbr = inv.serial_number)
        WHERE mp.is_eel_required = 'Y'
          AND mp.is_serialized = 'Y'
          AND pp.rec_mode = 'OPEN'
          AND inv.installation_timestamp IS NULL
        ORDER BY inv.part_number, inv.cage_code, inv.serial_number
    ) LOOP
        dbms_output.put_line('  ' || r_missing.part_number || '|' || r_missing.cage_code || '|' || r_missing.serial_number || 
                           ' (IUID: ' || r_missing.iuid || ', EEL Date: ' || r_missing.eel_date_installed || 
                           ', NHA: ' || r_missing.nha_iuid || ')');
    END LOOP;

    dbms_output.put_line('');
    dbms_output.put_line('--- Records with Incorrect Install Flags ---');
    
    FOR r_flag IN (
        SELECT 
            inv.part_number,
            inv.cage_code,
            inv.serial_number,
            pp.iuid,
            inv.installation_timestamp,
            pp.date_installed as eel_date_installed
        FROM cmmsdata.mm_inventory inv
             JOIN cmmsdata.mm_part mp 
               ON (inv.part_number = mp.part_number AND inv.cage_code = mp.cage_code)
             JOIN eel_owner.prt_part pp
               ON (pp.ref_nbr = inv.part_number 
                   AND pp.cage_code = inv.cage_code 
                   AND pp.serial_nbr = inv.serial_number)
        WHERE mp.is_eel_required = 'Y'
          AND mp.is_serialized = 'Y'
          AND pp.rec_mode = 'OPEN'
          AND inv.is_inventory_installed = 'N'
        ORDER BY inv.part_number, inv.cage_code, inv.serial_number
    ) LOOP
        dbms_output.put_line('  ' || r_flag.part_number || '|' || r_flag.cage_code || '|' || r_flag.serial_number || 
                           ' (IUID: ' || r_flag.iuid || ', Inv TS: ' || r_flag.installation_timestamp || 
                           ', EEL Date: ' || r_flag.eel_date_installed || ')');
    END LOOP;

    dbms_output.put_line('');
    dbms_output.put_line('================================================');
    dbms_output.put_line('-- Summary and Recommendations');
    dbms_output.put_line('================================================');
    
    IF l_missing_timestamps > 0 OR l_incorrect_install_flags > 0 OR l_timestamp_mismatches > 0 THEN
        dbms_output.put_line('ISSUES DETECTED: ' || (l_missing_timestamps + l_incorrect_install_flags + l_timestamp_mismatches) || ' total problems found');
        dbms_output.put_line('');
        dbms_output.put_line('RECOMMENDED ACTIONS:');
        dbms_output.put_line('1. Run fix_ame_collector_timestamps.sql in test mode first');
        dbms_output.put_line('2. Review the fix results carefully');
        dbms_output.put_line('3. Run fix_ame_collector_timestamps.sql in COMMIT mode');
        dbms_output.put_line('4. Use update_nha_enhanced.sql for future NHA sync operations');
    ELSE
        dbms_output.put_line('✓ NO ISSUES DETECTED: All AME collector records appear healthy');
        dbms_output.put_line('  Consider using update_nha_enhanced.sql for future NHA sync operations');
        dbms_output.put_line('  to prevent similar issues from occurring.');
    END IF;

    dbms_output.put_line('');
    dbms_output.put_line('Report completed at: ' || to_char(sysdate, 'MM/DD/YYYY HH24:MI:SS'));

END;
/

SPOOL OFF
EXIT 8;

