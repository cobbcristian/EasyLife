SET VERIFY OFF
SET LINES 100
SET FEEDBACK OFF
SET SUFFIX text
SET PAGES 100
SET ECHO ON
SET TERM OFF
SET SERVEROUTPUT ON SIZE UNLIMITED
SET TRIMSPOOL ON

SPOOL loose_inv_with_eels_having_nha.log

DECLARE
    l_parent_iuid   VARCHAR2(256);
    l_child_iuid    VARCHAR2(256);
    l_count         INTEGER;

    CURSOR retrieve_loose_eel_parts IS
        SELECT
            inv.part_number,
            inv.cage_code,
            inv.serial_number
        FROM
            cmmsdata.mm_inventory inv,
            cmmsdata.mm_part mp
        WHERE
            inv.part_number = mp.part_number
            AND inv.cage_code = mp.cage_code
            AND mp.is_eel_required = 'Y'
            AND (inv.condition_code IS NULL OR inv.condition_code = 'ARCHIVE')
        MINUS
        SELECT
            am.part_number,
            am.cage_code,
            am.serial_number
        FROM cmmsdata.mm_as_maintained am
        ORDER BY part_number ASC, cage_code ASC, serial_number ASC
        ;
BEGIN
    dbms_output.put_line('------------------------------------------------------------');
    dbms_output.put_line(' Loose Inventory With EEL Having NHA');
    dbms_output.put_line('------------------------------------------------------------');

    FOR r_part IN retrieve_loose_eel_parts 
    LOOP
        -- Check if the eel has an NHA set
        SELECT COUNT(*)
        INTO l_count
        FROM eel_owner.prt_part
        WHERE ref_nbr = r_part.part_number
          AND cage_code = r_part.cage_code
          AND serial_nbr = r_part.serial_number
          AND nha_iuid IS NOT NULL;

        IF l_count > 0 THEN
            dbms_output.put_line('### EEL Has NHA Value Set When Loose In CMMS:');
            dbms_output.put_line('  PN: ' || r_part.part_number);
            dbms_output.put_line('  CC: ' || r_part.cage_code);
            dbms_output.put_line('  SN: ' || r_part.serial_number);
        END IF;
    END LOOP;
END;
/

SPOOL OFF
EXIT 8;