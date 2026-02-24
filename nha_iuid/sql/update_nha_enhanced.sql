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
select 'update_nha_iuid_enhanced_' || '&1' || '_' || to_char(sysdate,'MM_DD_HH24_MI_SS') || '.log' spoolname from dual;
SPOOL '&spoolname'

DECLARE
    l_parent_iuid       VARCHAR2(256);
    l_asmx_parent_iuid  VARCHAR2(256);
    l_continue          BOOLEAN;
    l_commit            VARCHAR2(40);
    l_count             INTEGER;
    l_version           VARCHAR2(256);
    l_comment           VARCHAR2(40);
    l_timestamp         TIMESTAMP(6);
    l_eel_install_date  TIMESTAMP(6);
    l_inventory_exists  INTEGER;
    l_current_install_flag VARCHAR2(1);
BEGIN
    -- Read in external parameters
    l_commit := '&1';
    l_version := '&2';

    IF l_commit = 'COMMIT' THEN
        dbms_output.put_line('Enhanced NHA Utility is running in COMMIT mode.');
    ELSE
        dbms_output.put_line('Enhanced NHA Utility is running in ROLLBACK mode.');
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
         'GEN-001',
         'UTILITY',
         'I',
         '1',
         'Enhanced NHA Utility Version: ' 
         || l_version 
         || ' _ '
         || ' NHA IUID Synch Utility (Enhanced) was executed by ' || (SELECT sys_context('userenv', 'os_user') FROM dual) ||' '
         ||to_char(sysdate, 'MM_DD_HH24_MI_SS')
        );

    COMMIT;

    dbms_output.put_line('------------------------------------------------');
    dbms_output.put_line('-- Enhanced NHA IUID Sync - Updating EEL NHA IUIDs');
    dbms_output.put_line('-- Preserving AME collector timestamps and inventory flags');
    dbms_output.put_line('------------------------------------------------');

    -- Retrieve asmx eel parts where nha_iuid is null
    FOR r_part IN (
        SELECT 
               am.parent_part_number,
               am.parent_cage_code,
               am.parent_serial_number,
               am.part_number,
               am.cage_code,
               am.serial_number,
               pp.iuid,
               pp.nha_iuid,
               pp.date_installed as eel_date_installed
        FROM 
        cmmsdata.mm_as_maintained am
             JOIN cmmsdata.mm_part mp
               ON (am.part_number = mp.part_number AND 
               am.cage_code = mp.cage_code)
             JOIN eel_owner.prt_part pp
               ON (pp.ref_nbr = am.part_number
                   AND pp.cage_code = am.cage_code
                   AND pp.serial_nbr = am.serial_number)
        WHERE 
        am.part_number IS NOT NULL
          AND mp.is_eel_required = 'Y'
          AND mp.is_serialized = 'Y' AND
          --- pp.nha_iuid IS NULL AND
          pp.rec_mode = 'OPEN'
    ) 
    LOOP
        l_continue := true;
        l_timestamp := NULL;
        l_eel_install_date := NULL;
        l_inventory_exists := 0;
        l_current_install_flag := 'N';

        -- Lookup IUIDs for parent part
        BEGIN
            SELECT iuid
            INTO l_parent_iuid
            FROM eel_owner.prt_part
            WHERE ref_nbr = r_part.parent_part_number
              AND cage_code = r_part.parent_cage_code
              AND serial_nbr = r_part.parent_serial_number;

        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                dbms_output.put_line('### No EEL for Parent when updating: ' || r_part.iuid||' |'||r_part.part_number||' |'||r_part.cage_code||' |'||r_part.serial_number);
                dbms_output.put_line(' Parent PN:' || r_part.parent_part_number);
                dbms_output.put_line(' Parent CC:' || r_part.parent_cage_code);
                dbms_output.put_line(' Parent SN:' || r_part.parent_serial_number);
                l_continue := false;
                dbms_output.put_line('... Skipping rest of checks...');
        END;

        -- Check if inventory record exists and get current state
        IF l_continue = true THEN
            BEGIN
                SELECT installation_timestamp, is_inventory_installed, 1
                INTO l_timestamp, l_current_install_flag, l_inventory_exists
                FROM cmmsdata.mm_inventory
                WHERE part_number = r_part.part_number
                  AND cage_code = r_part.cage_code
                  AND serial_number = r_part.serial_number;

                dbms_output.put_line('### Inventory Record Found for: ' || r_part.iuid);
                dbms_output.put_line('    Current install_timestamp: ' || l_timestamp);
                dbms_output.put_line('    Current is_inventory_installed: ' || l_current_install_flag);

            EXCEPTION
                WHEN NO_DATA_FOUND THEN
                    dbms_output.put_line('### No Inventory Record found for: ' || r_part.iuid||' |'||r_part.part_number||' |'||r_part.cage_code||' |'||r_part.serial_number);
                    l_inventory_exists := 0;
            END;
        END IF;

        -- Determine best installation timestamp to use
        IF l_continue = true THEN
            -- Priority: 1) EEL date_installed, 2) Inventory installation_timestamp, 3) Current timestamp
            IF r_part.eel_date_installed IS NOT NULL THEN
                l_eel_install_date := r_part.eel_date_installed;
                dbms_output.put_line('    Using EEL installation date: ' || l_eel_install_date);
            ELSIF l_timestamp IS NOT NULL THEN
                l_eel_install_date := l_timestamp;
                dbms_output.put_line('    Using Inventory installation date: ' || l_eel_install_date);
            ELSE
                l_eel_install_date := SYSTIMESTAMP;
                dbms_output.put_line('    Using current timestamp as installation date: ' || l_eel_install_date);
            END IF;

            -- If NHA_IUID is null, update to parent
            IF r_part.nha_iuid IS NULL THEN
                dbms_output.put_line('Updating NHA for IUID: ' || r_part.iuid||' From Null to '||l_parent_iuid);

                --nha_iuid should be null for the child part here
                UPDATE eel_owner.prt_part
                SET nha_iuid = l_parent_iuid,
                    date_installed = l_eel_install_date
                WHERE iuid = r_part.iuid
                  AND r_part.iuid != l_parent_iuid;

                IF sql%rowcount > 0 THEN
                    dbms_output.put_line('_' || sql%rowcount || ' prt_part rows updated.');
                    
                    -- Update inventory record if it exists
                    IF l_inventory_exists > 0 THEN
                        UPDATE cmmsdata.mm_inventory
                        SET installation_timestamp = l_eel_install_date,
                            is_inventory_installed = 'Y'
                        WHERE part_number = r_part.part_number
                          AND cage_code = r_part.cage_code
                          AND serial_number = r_part.serial_number;
                          
                        IF sql%rowcount > 0 THEN
                            dbms_output.put_line('_' || sql%rowcount || ' mm_inventory rows updated with preserved timestamp and install flag.');
                        END IF;
                    END IF;
                END IF;
            END IF;

            -- If NHA_IUID is improperly set
            IF r_part.nha_iuid <> l_parent_iuid THEN
                dbms_output.put_line('- updating NHA for IUID: ' || r_part.iuid|| ' From '||r_part.nha_iuid||' to '||l_parent_iuid);

                UPDATE eel_owner.prt_part
                SET nha_iuid = l_parent_iuid,
                    date_installed = l_eel_install_date
                WHERE iuid = r_part.iuid
                  AND r_part.iuid <> l_parent_iuid;

                IF sql%rowcount > 0 THEN
                    dbms_output.put_line(' _ ' || sql%rowcount || ' prt_part rows updated.');
                    
                    -- Update inventory record if it exists
                    IF l_inventory_exists > 0 THEN
                        UPDATE cmmsdata.mm_inventory
                        SET installation_timestamp = l_eel_install_date,
                            is_inventory_installed = 'Y'
                        WHERE part_number = r_part.part_number
                          AND cage_code = r_part.cage_code
                          AND serial_number = r_part.serial_number;
                          
                        IF sql%rowcount > 0 THEN
                            dbms_output.put_line(' _ ' || sql%rowcount || ' mm_inventory rows updated with preserved timestamp and install flag.');
                        END IF;
                    END IF;
                END IF;

            END IF;

        END IF;

        IF l_commit = 'COMMIT' THEN

            BEGIN
                COMMIT;

            EXCEPTION
                WHEN OTHERS THEN
                select count(*) into l_count 
                from eel_owner.prt_part where 
                rec_mode = 'WAIT' AND
                ref_nbr = r_part.parent_part_number AND
                cage_code = r_part.parent_cage_code AND
                serial_nbr = r_part.parent_serial_number;

                if l_count > 0 then
                    l_comment:='### Bad rec_mode on parent: ';
                ELSE
                    l_comment:='### update failed ';
                end if;
                dbms_output.put_line(l_comment||r_part.iuid);
                dbms_output.put_line('==============');
                dbms_output.put_line('PARENT INFORMATION');
                dbms_output.put_line('Parent NHA: ' || l_parent_iuid);
                dbms_output.put_line('Parent PN: ' || r_part.parent_part_number);
                dbms_output.put_line('Parent CC: ' || r_part.parent_cage_code);
                dbms_output.put_line('Parent SN: ' || r_part.parent_serial_number);
                dbms_output.put_line('------------');
                dbms_output.put_line('--- ERROR details ----');
                dbms_output.put_line('### error');
                dbms_output.put_line('ERROR STACK: ' || DBMS_UTILITY.format_error_stack);
                dbms_output.put_line('ERROR BACKTRACE: ' || DBMS_UTILITY.format_error_backtrace);
                dbms_output.put_line('------------');
                dbms_output.put_line('---error resolution---');
                if DBMS_UTILITY.format_error_stack like '%(EEL_OWNER.PRT_PRT_FK)%' then
                    -- check if the part_ctgry different between parent and child
                    select count(*) into l_count
                    from eel_owner.prt_part where iuid=l_parent_iuid and part_ctgry = (select part_ctgry from eel_owner.prt_part where iuid=r_part.iuid);

                if l_count > 0 then
                    dbms_output.put_line('- parent IUID ('||l_parent_iuid||') has same part_ctgry as child iuid ('||r_part.iuid||')');
                    dbms_output.put_line('### resolution unknown. please contact alis.');
                else
                    dbms_output.put_line('### parent iuid ('||l_parent_iuid||') has different part_ctgry than child iuid ('||r_part.iuid||')');
                    dbms_output.put_line('- resolution is as follows:');
                    dbms_output.put_line('1. edit the modify_part_ctgry.sql file in sql directory. set the parent_iuid and child iuid records in the file. run modify_part_ctgry.sql.');
                    dbms_output.put_line('2. re-run nha_iuid_synch in commit mode. from the log file, expect this record to succeed on the second try');
                end if;
            end if;

            dbms_output.put_line('=========');
            CONTINUE;
            END;
        ELSE
            ROLLBACK;
        END IF;
    END LOOP;

    dbms_output.put_line('------------------------------------------------');
    dbms_output.put_line('-- Enhanced NHA IUID Sync Complete');
    dbms_output.put_line('------------------------------------------------');

END;
/
SPOOL OFF
EXIT 8;
