SET VERIFY OFF
SET LINES 200
SET FEEDBACK OFF
SET SUFFIX text
SET PAGES 100
SET ECHO ON
SET TERM OFF
SET SERVEROUTPUT ON SIZE UNLIMITED
SET TRIMSPOOL ON

-- Dynamic spool file
col spoolname new_value spoolname
select 'fix_ame_collector_timestamps_' || to_char(sysdate,'MM_DD_HH24_MI_SS') || '.log' spoolname from dual;
SPOOL '&spoolname'

DECLARE
    l_commit            VARCHAR2(40);
    l_count             INTEGER := 0;
    l_fixed_count       INTEGER := 0;
    l_eel_timestamp     TIMESTAMP(6);
    l_version           VARCHAR2(256);
BEGIN
    -- Read in external parameters
    l_commit := '&1';
    l_version := '&2';

    IF l_commit = 'COMMIT' THEN
        dbms_output.put_line('AME Collector Fix Utility is running in COMMIT mode.');
    ELSE
        dbms_output.put_line('AME Collector Fix Utility is running in ROLLBACK mode.');
    END IF;

    -- Add entry in summary to record execution
    INSERT 
    INTO cmmsstage.ext_proc_summary
        (
            dtr_id, 
        err_cd, 
        err_src, 
        sev_code,
        err_cnt,
        err_msg
        )
    VALUES
        (
         '',
         'GEN-002',
         'UTILITY',
         'I',
         '1',
         'AME Collector Fix Utility Version: ' 
         || l_version 
         || ' _ '
         || ' AME Collector Timestamp Fix was executed by ' || (SELECT sys_context('userenv', 'os_user') FROM dual) ||' '
         ||to_char(sysdate, 'MM_DD_HH24_MI_SS')
        );

    COMMIT;

    dbms_output.put_line('------------------------------------------------');
    dbms_output.put_line('-- Fixing AME Collector Timestamps and Install Flags');
    dbms_output.put_line('-- Identifying records with missing timestamps or incorrect flags');
    dbms_output.put_line('------------------------------------------------');

    -- Find AME collectors with missing timestamps or incorrect install flags
    FOR r_inv IN (
        SELECT 
            inv.part_number,
            inv.cage_code,
            inv.serial_number,
            inv.installation_timestamp,
            inv.is_inventory_installed,
            pp.installation_timestamp as eel_install_timestamp,
            pp.date_installed as eel_date_installed,
            pp.iuid
        FROM 
            cmmsdata.mm_inventory inv
            JOIN cmmsdata.mm_part mp 
              ON (inv.part_number = mp.part_number AND inv.cage_code = mp.cage_code)
            JOIN eel_owner.prt_part pp
              ON (pp.ref_nbr = inv.part_number 
                  AND pp.cage_code = inv.cage_code 
                  AND pp.serial_nbr = inv.serial_number)
        WHERE 
            mp.is_eel_required = 'Y'
            AND mp.is_serialized = 'Y'
            AND pp.rec_mode = 'OPEN'
            AND (
                -- Missing installation timestamp in inventory
                inv.installation_timestamp IS NULL
                -- Or incorrect install flag
                OR inv.is_inventory_installed = 'N'
                -- Or timestamp mismatch between inventory and EEL
                OR (inv.installation_timestamp IS NOT NULL 
                    AND pp.date_installed IS NOT NULL 
                    AND inv.installation_timestamp != pp.date_installed)
            )
        ORDER BY inv.part_number, inv.cage_code, inv.serial_number
    ) 
    LOOP
        l_count := l_count + 1;
        l_eel_timestamp := NULL;

        dbms_output.put_line('### Processing AME Collector: ' || r_inv.part_number || '|' || r_inv.cage_code || '|' || r_inv.serial_number);
        dbms_output.put_line('    IUID: ' || r_inv.iuid);
        dbms_output.put_line('    Current Inventory Timestamp: ' || r_inv.installation_timestamp);
        dbms_output.put_line('    Current Install Flag: ' || r_inv.is_inventory_installed);
        dbms_output.put_line('    EEL Date Installed: ' || r_inv.eel_date_installed);
        dbms_output.put_line('    EEL Install Timestamp: ' || r_inv.eel_install_timestamp);

        -- Determine the best timestamp to use
        IF r_inv.eel_date_installed IS NOT NULL THEN
            l_eel_timestamp := r_inv.eel_date_installed;
            dbms_output.put_line('    Using EEL date_installed: ' || l_eel_timestamp);
        ELSIF r_inv.eel_install_timestamp IS NOT NULL THEN
            l_eel_timestamp := r_inv.eel_install_timestamp;
            dbms_output.put_line('    Using EEL installation_timestamp: ' || l_eel_timestamp);
        ELSIF r_inv.installation_timestamp IS NOT NULL THEN
            l_eel_timestamp := r_inv.installation_timestamp;
            dbms_output.put_line('    Keeping existing inventory timestamp: ' || l_eel_timestamp);
        ELSE
            -- Check for unscheduled maintenance events with install dates
            BEGIN
                SELECT MAX(evnt_date)
                INTO l_eel_timestamp
                FROM eel_owner.prt_unsch_evnt_log
                WHERE prt_prt_id = (
                    SELECT prt_prt_id 
                    FROM eel_owner.prt_part 
                    WHERE iuid = r_inv.iuid
                )
                AND evnt_type_code = 'INSTALL'
                AND evnt_date IS NOT NULL;

                IF l_eel_timestamp IS NOT NULL THEN
                    dbms_output.put_line('    Found install date in unscheduled maintenance: ' || l_eel_timestamp);
                END IF;
            EXCEPTION
                WHEN NO_DATA_FOUND THEN
                    NULL;
            END;

            -- If still no timestamp, use current time
            IF l_eel_timestamp IS NULL THEN
                l_eel_timestamp := SYSTIMESTAMP;
                dbms_output.put_line('    No historical timestamp found, using current time: ' || l_eel_timestamp);
            END IF;
        END IF;

        -- Update the inventory record
        BEGIN
            UPDATE cmmsdata.mm_inventory
            SET installation_timestamp = l_eel_timestamp,
                is_inventory_installed = 'Y'
            WHERE part_number = r_inv.part_number
              AND cage_code = r_inv.cage_code
              AND serial_number = r_inv.serial_number;

            IF sql%rowcount > 0 THEN
                l_fixed_count := l_fixed_count + 1;
                dbms_output.put_line('    ✓ Updated inventory record successfully');
                
                -- Also update EEL if needed
                UPDATE eel_owner.prt_part
                SET date_installed = l_eel_timestamp
                WHERE iuid = r_inv.iuid
                  AND (date_installed IS NULL OR date_installed != l_eel_timestamp);
                  
                IF sql%rowcount > 0 THEN
                    dbms_output.put_line('    ✓ Updated EEL date_installed as well');
                END IF;
            ELSE
                dbms_output.put_line('    ✗ Failed to update inventory record');
            END IF;

        EXCEPTION
            WHEN OTHERS THEN
                dbms_output.put_line('    ✗ Error updating record: ' || SQLERRM);
        END;

        dbms_output.put_line('    ----------------------------------------');

        -- Commit after each record if in COMMIT mode
        IF l_commit = 'COMMIT' THEN
            COMMIT;
        END IF;

    END LOOP;

    dbms_output.put_line('================================================');
    dbms_output.put_line('-- AME Collector Fix Summary');
    dbms_output.put_line('-- Total records processed: ' || l_count);
    dbms_output.put_line('-- Records successfully fixed: ' || l_fixed_count);
    dbms_output.put_line('================================================');

    -- Final commit if in COMMIT mode
    IF l_commit = 'COMMIT' THEN
        COMMIT;
        dbms_output.put_line('All changes committed successfully.');
    ELSE
        ROLLBACK;
        dbms_output.put_line('All changes rolled back (running in test mode).');
    END IF;

END;
/
SPOOL OFF
EXIT 8;

