SET VERIFY OFF
SET LINES 100
SET FEEDBACK OFF
SET SUFFIX text
SET PAGES 100
SET ECHO ON
SET TERM OFF
SET SERVEROUTPUT ON SIZE UNLIMITED
SET TRIMSPOOL ON

SPOOL update_loose_inv_with_eels_having_nha.log

DECLARE
  l_parent_iuid  VARCHAR2(256);
  l_child_iuid   VARCHAR2(256);
  l_count        INTEGER;
  err            VARCHAR2(250);
  l_version      VARCHAR2(256);
  CURSOR retrieve_loose_eel_parts
  IS
    WITH r_part AS (
      SELECT
        inv.part_number,
        inv.cage_code,
        inv.serial_number
      FROM
        cmmsdata.mm_inventory inv,
        cmmsdata.mm_part mp
      WHERE
        inv.part_number = mp.part_number AND 
        inv.cage_code = mp.cage_code AND 
        (inv.condition_code IS NULL OR inv.condition_code = 'ARCHIVE') AND 
        mp.is_eel_required = 'Y'
      MINUS
      SELECT
        am.part_number,
        am.cage_code,
        am.serial_number
      FROM cmmsdata.mm_as_maintained am
    )
    SELECT prt_part.ref_nbr pn, prt_part.cage_code cc, prt_part.serial_nbr sn, prt_part.nha_iuid, prt_part.rec_mode
    FROM eel_owner.prt_part,
         r_part
    WHERE prt_part.ref_nbr    = r_part.part_number
      AND prt_part.cage_code  = r_part.cage_code
      AND prt_part.serial_nbr = r_part.serial_number
      AND prt_part.nha_iuid IS NOT NULL
    ORDER BY prt_part.ref_nbr, prt_part.cage_code, prt_part.serial_nbr
    ;

BEGIN
  l_version := '&1';
  dbms_output.put_line('---------------------------------------------------------------');
  dbms_output.put_line('--  Updating Loose Inventory With EEL Having NHA              --');
  dbms_output.put_line('---------------------------------------------------------------');

  FOR r_part IN retrieve_loose_eel_parts 
  LOOP
    IF (r_part.rec_mode = 'WAIT' OR r_part.rec_mode = 'INDUCT') THEN
      dbms_output.put_line('### FAILED to update the following inventory as it is in a ' || r_part.rec_mode || ' state');
      dbms_output.put_line('   PN: ' || r_part.pn);
      dbms_output.put_line('   CC: ' || r_part.cc);
      dbms_output.put_line('   SN: ' || r_part.sn);
      dbms_output.put_line('   Parent NHA: ' || r_part.nha_iuid);
    ELSE
      BEGIN
        UPDATE 
        eel_owner.prt_part SET nha_iuid = NULL
         WHERE 
         ref_nbr    = r_part.pn AND 
         cage_code  = r_part.cc AND 
         serial_nbr = r_part.sn;

        dbms_output.put_line('### NHA removed for the following inventory');
        dbms_output.put_line('   PN: ' || r_part.pn);
        dbms_output.put_line('   CC: ' || r_part.cc);
        dbms_output.put_line('   SN: ' || r_part.sn);
        dbms_output.put_line('   Parent NHA: ' || r_part.nha_iuid);

      EXCEPTION
        WHEN OTHERS THEN
          err := SQLERRM;
          dbms_output.put_line('### FAILED to update the following inventory due to ' || err);
          dbms_output.put_line('   PN: ' || r_part.pn);
          dbms_output.put_line('   CC: ' || r_part.cc);
          dbms_output.put_line('   SN: ' || r_part.sn);
          dbms_output.put_line('   Parent NHA: ' || r_part.nha_iuid);
      END;

    END IF;

  END LOOP;


  -- Add an entry in the summary to record that this has been run, even when no errors detected.
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
      'Utility Version: ' 
      || l_version
      || ' - '
      || 'NHA IUID Synch Utility was executed - '
      || to_char(sysdate, 'MM_DD_HH24_MI_SS')
    );

  COMMIT;

END;
/

SPOOL OFF

EXIT 8;
