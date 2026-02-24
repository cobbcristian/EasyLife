SET VERIFY OFF
SET LINES 200
SET FEEDBACK OFF
SET SUFFIX text
SET PAGES 100
SET ECHO OFF
SET TERM OFF
SET SERVEROUTPUT ON SIZE UNLIMITED
SET TRIMSPOOL ON
SET TRIMOUT ON

SPOOL modify_part_ctgry.log

DECLARE
    parent_iuid     VARCHAR2(78) := 'PARENT_IUID';
    child_iuid      VARCHAR2(78) := 'CHILD_IUID';
    h_new_prt_ctgry VARCHAR2(5);
    h_prt_prt_id    NUMBER;
    h_part_ctgry    VARCHAR2(5);
    h_rec_mode      VARCHAR2(6);
BEGIN

    dbms_output.put_line(' Disabling all required fks');

    -- disable all required fks
    EXECUTE IMMEDIATE 'ALTER TABLE eel_owner.PRT_ASSOC_FILE      DISABLE CONSTRAINT PRT_AF_PRT_PRT_FK';
    EXECUTE IMMEDIATE 'ALTER TABLE eel_owner.PRT_CONFIG_DATA     DISABLE CONSTRAINT PRT_CD_PRT_PRT_FK';
    EXECUTE IMMEDIATE 'ALTER TABLE eel_owner.PRT_DSCLSR_CMPNY    DISABLE CONSTRAINT PRT_DC_PRT_PRT_FK';
    EXECUTE IMMEDIATE 'ALTER TABLE eel_owner.PRT_ENGR_CHNG       DISABLE CONSTRAINT PRT_EG_PRT_PRT_FK';
    EXECUTE IMMEDIATE 'ALTER TABLE eel_owner.PRT_EXCON           DISABLE CONSTRAINT PRT_EX_PRT_PRT_FK';
    EXECUTE IMMEDIATE 'ALTER TABLE eel_owner.PRT_EXPORT_AUTH_DOC DISABLE CONSTRAINT PRT_EAD_PRT_FK';
    EXECUTE IMMEDIATE 'ALTER TABLE eel_owner.PRT_PART            DISABLE CONSTRAINT PRT_PRT_PRT_PRT_FK';
    EXECUTE IMMEDIATE 'ALTER TABLE eel_owner.PRT_SCH_EVNT_LOG    DISABLE CONSTRAINT PRT_SEL_PRT_PRT_FK';
    EXECUTE IMMEDIATE 'ALTER TABLE eel_owner.PRT_TCTD            DISABLE CONSTRAINT PRT_TC_PRT_PRT_FK';
    EXECUTE IMMEDIATE 'ALTER TABLE eel_owner.PRT_UNSCH_EVNT_LOG  DISABLE CONSTRAINT PRT_UEL_PRT_PRT_FK';
    EXECUTE IMMEDIATE 'ALTER TABLE eel_owner.PRT_USABLE_ON_CODE  DISABLE CONSTRAINT PRT_UOC_PRT_FK';
    EXECUTE IMMEDIATE 'ALTER TABLE eel_owner.PRT_USAGE           DISABLE CONSTRAINT PRT_US_PRT_PRT_FK';
    EXECUTE IMMEDIATE 'ALTER TABLE eel_owner.PRT_USAGE_MEAS_EVENT DISABLE CONSTRAINT PRT_UME_PRT_US_FK';

    -- get the new part category
    SELECT s.part_ctgry
      INTO h_new_prt_ctgry
      FROM eel_owner.prt_part s
     WHERE s.iuid = parent_iuid;

    dbms_output.put_line(' New Part Category: ' || h_new_prt_ctgry);

    -- get the part id, category and rec mode for the updates
    SELECT prt_prt_id, part_ctgry, rec_mode
      INTO h_prt_prt_id, h_part_ctgry, h_rec_mode
      FROM eel_owner.prt_part
     WHERE iuid = child_iuid;

    dbms_output.put_line(' - Child data for updates: ' || h_prt_prt_id || '|' || h_part_ctgry || '|' || h_rec_mode);

    dbms_output.put_line(' - Updating PRT_USAGE_MEAS_EVENT');
    --update the lowest level records
    UPDATE eel_owner.PRT_USAGE_MEAS_EVENT
       SET part_ctgry = h_new_prt_ctgry
     WHERE (prt_us_id, part_ctgry, rec_mode) IN (SELECT prt_us_id, part_ctgry, rec_mode
    FROM eel_owner.PRT_USAGE
    WHERE (prt_prt_id, part_ctgry, rec_mode) = (SELECT h_prt_prt_id, h_part_ctgry, h_rec_mode FROM dual));

    IF sql%rowcount > 0 THEN
        dbms_output.put_line(' - ' || sql%rowcount || ' rows updated.');
    END IF;

    dbms_output.put_line(' Updating PRT_USAGE');
    --update all of the children
    UPDATE eel_owner.PRT_USAGE
       SET part_ctgry = h_new_prt_ctgry
     WHERE (prt_prt_id, part_ctgry, rec_mode) = (SELECT h_prt_prt_id, h_part_ctgry, h_rec_mode FROM dual);

    IF sql%rowcount > 0 THEN
        dbms_output.put_line(' - ' || sql%rowcount || ' rows updated.');
    END IF;

    dbms_output.put_line(' Updating PRT_USABLE_ON_CODE');
    UPDATE eel_owner.PRT_USABLE_ON_CODE
       SET part_ctgry = h_new_prt_ctgry
     WHERE (prt_prt_id, part_ctgry, rec_mode) in (SELECT h_prt_prt_id, h_part_ctgry, h_rec_mode FROM dual);

    IF sql%rowcount > 0 THEN
        dbms_output.put_line(' - ' || sql%rowcount || ' rows updated.');
    END IF;

    dbms_output.put_line(' - Updating PRT_UNSCH_EVNT_LOG');
    UPDATE eel_owner.PRT_UNSCH_EVNT_LOG
       SET part_ctgry = h_new_prt_ctgry
     WHERE (prt_prt_id, part_ctgry, rec_mode) in (SELECT h_prt_prt_id, h_part_ctgry, h_rec_mode FROM dual);

    IF sql%rowcount > 0 THEN
        dbms_output.put_line(' ' || sql%rowcount || ' rows updated.');
    END IF;

    dbms_output.put_line(' - Updating PRT_TCTD');
    UPDATE eel_owner.PRT_TCTD
       SET part_ctgry = h_new_prt_ctgry
     WHERE (prt_prt_id, part_ctgry, rec_mode) = (SELECT h_prt_prt_id, h_part_ctgry, h_rec_mode FROM dual);

    IF sql%rowcount > 0 THEN
        dbms_output.put_line(' - ' || sql%rowcount || ' rows updated.');
    END IF;

    dbms_output.put_line(' -Updating PRT_SCH_EVNT_LOG');
    UPDATE eel_owner.PRT_SCH_EVNT_LOG
       SET part_ctgry = h_new_prt_ctgry
     WHERE (prt_prt_id, part_ctgry, rec_mode) = (SELECT h_prt_prt_id, h_part_ctgry, h_rec_mode FROM dual);

    IF sql%rowcount > 0 THEN
        dbms_output.put_line(' - ' || sql%rowcount || ' rows updated.');
    END IF;

    dbms_output.put_line(' - Updating PRT_EXPORT_AUTH_DOC');
    UPDATE eel_owner.PRT_EXPORT_AUTH_DOC
       SET part_ctgry = h_new_prt_ctgry
     WHERE (prt_prt_id, part_ctgry, rec_mode) = (SELECT h_prt_prt_id, h_part_ctgry, h_rec_mode FROM dual);

    IF sql%rowcount > 0 THEN
        dbms_output.put_line(' -' || sql%rowcount || ' rows updated.');
    END IF;

    dbms_output.put_line(' - Updating PRT_EXCON');
    UPDATE eel_owner.PRT_EXCON
       SET part_ctgry = h_new_prt_ctgry
     WHERE (prt_prt_id, part_ctgry, rec_mode) = (SELECT h_prt_prt_id, h_part_ctgry, h_rec_mode FROM dual);

    IF sql%rowcount > 0 THEN
        dbms_output.put_line(' - ' || sql%rowcount || ' rows updated.');
    END IF;

    dbms_output.put_line(' - Updating PRT_ENGR_CHNG');
    UPDATE eel_owner.PRT_ENGR_CHNG
       SET part_ctgry = h_new_prt_ctgry
     WHERE (prt_prt_id, part_ctgry, rec_mode) = (SELECT h_prt_prt_id, h_part_ctgry, h_rec_mode FROM dual);

    IF sql%rowcount > 0 THEN
        dbms_output.put_line(' - ' || sql%rowcount || ' rows updated.');
    END IF;

    dbms_output.put_line(' - Updating PRT_DSCLSR_CMPNY');
    UPDATE eel_owner.PRT_DSCLSR_CMPNY
       SET part_ctgry = h_new_prt_ctgry
     WHERE (prt_prt_id, part_ctgry, rec_mode) = (SELECT h_prt_prt_id, h_part_ctgry, h_rec_mode FROM dual);

    IF sql%rowcount > 0 THEN
        dbms_output.put_line(' - ' || sql%rowcount || ' rows updated.');
    END IF;

    dbms_output.put_line(' - Updating PRT_CONFIG_DATA');
    UPDATE eel_owner.PRT_CONFIG_DATA
       SET part_ctgry = h_new_prt_ctgry
     WHERE (prt_prt_id, part_ctgry, rec_mode) = (SELECT h_prt_prt_id, h_part_ctgry, h_rec_mode FROM dual);

    IF sql%rowcount > 0 THEN
        dbms_output.put_line(' - ' || sql%rowcount || ' rows updated.');
    END IF;

    dbms_output.put_line(' Updating PRT_ASSOC_FILE');
    UPDATE eel_owner.PRT_ASSOC_FILE
       SET part_ctgry = h_new_prt_ctgry
     WHERE (prt_prt_id, part_ctgry, rec_mode) = (SELECT h_prt_prt_id, h_part_ctgry, h_rec_mode FROM dual);

    IF sql%rowcount > 0 THEN
        dbms_output.put_line(' -' || sql%rowcount || ' rows updated.');
    END IF;

    dbms_output.put_line(' - Updating PRT_PART');
    --final update
    UPDATE eel_owner.PRT_PART p
       SET p.part_ctgry = h_new_prt_ctgry
     WHERE p.iuid = child_iuid;

    IF sql%rowcount > 0 THEN
        dbms_output.put_line(' -' || sql%rowcount || ' rows updated.');
    END IF;

    dbms_output.put_line(' -Inserting PRT_COMMENT');
    --add a comment for the part category change
    INSERT INTO eel_owner.prt_comment (prt_com_id, prt_prt_id, part_ctgry, 
    rec_mode, comments, comment_date)
    VALUES (eel_owner.prt_com_seq.nextval, h_prt_prt_id, h_new_prt_ctgry, h_rec_mode, 
            'NOTE Switching part category from ' || h_part_ctgry || ' to ' || h_new_prt_ctgry || '.', systimestamp);

    IF sql%rowcount > 0 THEN
        dbms_output.put_line(' - ' || sql%rowcount || ' rows inserted.');
    END IF;

    COMMIT;

    dbms_output.put_line(' Re-enabling all required fks');

    -- enable all fks back
    EXECUTE IMMEDIATE 'ALTER TABLE eel_owner.PRT_ASSOC_FILE      ENABLE CONSTRAINT PRT_AF_PRT_PRT_FK';
    EXECUTE IMMEDIATE 'ALTER TABLE eel_owner.PRT_CONFIG_DATA     ENABLE CONSTRAINT PRT_CD_PRT_PRT_FK';
    EXECUTE IMMEDIATE 'ALTER TABLE eel_owner.PRT_DSCLSR_CMPNY    ENABLE CONSTRAINT PRT_DC_PRT_PRT_FK';
    EXECUTE IMMEDIATE 'ALTER TABLE eel_owner.PRT_ENGR_CHNG       ENABLE CONSTRAINT PRT_EG_PRT_PRT_FK';
    EXECUTE IMMEDIATE 'ALTER TABLE eel_owner.PRT_EXCDN           ENABLE CONSTRAINT PRT_EX_PRT_PRT_FK';
    EXECUTE IMMEDIATE 'ALTER TABLE eel_owner.PRT_EXPORT_AUTH_DOC ENABLE CONSTRAINT PRT_EAD_PRT_PRT_FK';
    EXECUTE IMMEDIATE 'ALTER TABLE eel_owner.PRT_PART            ENABLE CONSTRAINT PRT_PRT_PRT_PRT_FK';
    EXECUTE IMMEDIATE 'ALTER TABLE eel_owner.PRT_SCH_EVNT_LOG    ENABLE CONSTRAINT PRT_SEL_PRT_PRT_FK';
    EXECUTE IMMEDIATE 'ALTER TABLE eel_owner.PRT_TCTD            ENABLE CONSTRAINT PRT_TC_PRT_PRT_FK';
    EXECUTE IMMEDIATE 'ALTER TABLE eel_owner.PRT_UNSCH_EVNT_LOG  ENABLE CONSTRAINT PRT_UEL_PRT_PRT_FK';
    EXECUTE IMMEDIATE 'ALTER TABLE eel_owner.PRT_USABLE_ON_CODE  ENABLE CONSTRAINT PRT_UOC_PRT_PRT_FK';
    EXECUTE IMMEDIATE 'ALTER TABLE eel_owner.PRT_USAGE           ENABLE CONSTRAINT PRT_US_PRT_PRT_FK';
    EXECUTE IMMEDIATE 'ALTER TABLE eel_owner.PRT_USAGE_MEAS_EVENT ENABLE CONSTRAINT PRT_UME_PRT_US_FK';
END;
/

SPOOL OFF;

EXIT;
