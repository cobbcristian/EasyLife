# NHA IUID Sync Enhanced Solution

## Problem Description

When the NHA_IUID_SYNC utility on DB1 is executed, AME collectors experience the following issues:
- Installation timestamps disappear (become NULL)
- The `is_inventory_installed` flag is incorrectly set to 'N' even though AME collectors are installed
- A 6-second window exists where records get updated with null values
- The update message may be sent before the EEL gets created, causing timing issues

## Root Cause Analysis

The original `update_nha.sql` script has the following limitations:
1. **Missing Inventory Updates**: Updates `eel_owner.prt_part` but doesn't synchronize `cmmsdata.mm_inventory`
2. **Race Condition**: No protection against timing issues between EEL creation and inventory updates
3. **Timestamp Loss**: Doesn't preserve existing installation timestamps during NHA updates
4. **Install Flag Reset**: Doesn't maintain the `is_inventory_installed` flag state

## Solution Overview

This enhanced solution provides:
1. **Synchronized Updates**: Updates both EEL and inventory tables in the same transaction
2. **Timestamp Preservation**: Prioritizes existing timestamps and prevents data loss
3. **Install Flag Protection**: Ensures `is_inventory_installed` remains 'Y' for installed components
4. **Comprehensive Logging**: Detailed output for troubleshooting and audit trails
5. **Validation Tools**: Scripts to identify and fix existing issues

## Files Included

### Core Solution Files

1. **`update_nha_enhanced.sql`** - Enhanced NHA IUID sync script
   - Replaces the original `update_nha.sql`
   - Preserves timestamps and install flags
   - Provides comprehensive logging

2. **`fix_ame_collector_timestamps.sql`** - Remediation script
   - Fixes existing records affected by the original issue
   - Restores missing timestamps and corrects install flags
   - Can be run in test mode first

3. **`validate_ame_collector_status.sql`** - Validation and reporting script
   - Identifies problematic records before running fixes
   - Provides detailed status reports
   - Helps assess the scope of the issue

### Batch Files for Easy Execution

4. **`run_nha_enhanced.bat`** - Execute enhanced NHA sync
   - Standardized execution with parameter validation
   - Automatic log file management
   - Safety warnings for COMMIT mode

5. **`validate_ame_status.bat`** - Run validation report
   - Simple execution of validation script
   - Option to view report immediately
   - User-friendly output formatting

6. **`fix_ame_timestamps.bat`** - Execute timestamp fix
   - Test mode (ROLLBACK) and production mode (COMMIT)
   - Clear warnings and recommendations
   - Automatic log file handling

7. **`run_complete_nha_process.bat`** - Complete end-to-end process
   - Runs validation → fix → enhanced sync in sequence
   - Single command for full remediation
   - Comprehensive error handling

### Original Files (Reference)

4. **`update_nha.sql`** - Original NHA sync script (problematic)
5. **`update_loose_eel_with_nha.sql`** - Loose inventory cleanup
6. **`identify_eel_with_nha.sql`** - EEL identification script
7. **`modify_part_ctgry.sql`** - Part category modification utility

## Usage Instructions

### Option A: Quick Complete Process (Recommended)

Run the complete end-to-end process with a single command:

```batch
REM Test mode - see what would be done without making changes
run_complete_nha_process.bat ROLLBACK 1.0

REM Production mode - apply all fixes and sync
run_complete_nha_process.bat COMMIT 1.0
```

### Option B: Step-by-Step Process

#### Step 1: Assess Current State

Run the validation to understand the scope of existing issues:

```batch
validate_ame_status.bat
```

Or directly with SQL:
```sql
@validate_ame_collector_status.sql
```

This will generate a report showing:
- Total number of AME collectors
- Records with missing timestamps
- Records with incorrect install flags
- Records with timestamp mismatches

#### Step 2: Fix Existing Issues (if any)

If the validation reveals problems, run the fix in test mode first:

```batch
REM Test mode - see what would be fixed
fix_ame_timestamps.bat ROLLBACK 1.0

REM Production mode - apply the fixes
fix_ame_timestamps.bat COMMIT 1.0
```

Or directly with SQL:
```sql
@fix_ame_collector_timestamps.sql ROLLBACK 1.0
@fix_ame_collector_timestamps.sql COMMIT 1.0
```

#### Step 3: Use Enhanced NHA Sync Going Forward

Replace your existing NHA sync process with the enhanced version:

```batch
REM Test mode first
run_nha_enhanced.bat ROLLBACK 1.0

REM Production mode
run_nha_enhanced.bat COMMIT 1.0
```

Or directly with SQL:
```sql
@update_nha_enhanced.sql ROLLBACK 1.0
@update_nha_enhanced.sql COMMIT 1.0
```

## Key Enhancements

### Timestamp Preservation Logic

The enhanced script uses the following priority order for installation timestamps:
1. **EEL `date_installed`** - If available, use the EEL's installation date
2. **Inventory `installation_timestamp`** - If EEL date is null, use inventory timestamp
3. **Unscheduled Maintenance Events** - Check for install events in maintenance logs
4. **Current Timestamp** - As a last resort, use the current system time

### Synchronized Updates

Both tables are updated in the same transaction:
```sql
-- Update EEL
UPDATE eel_owner.prt_part
SET nha_iuid = l_parent_iuid,
    date_installed = l_eel_install_date
WHERE iuid = r_part.iuid;

-- Update Inventory (if exists)
UPDATE cmmsdata.mm_inventory
SET installation_timestamp = l_eel_install_date,
    is_inventory_installed = 'Y'
WHERE part_number = r_part.part_number
  AND cage_code = r_part.cage_code
  AND serial_number = r_part.serial_number;
```

### Enhanced Logging

The enhanced script provides detailed logging including:
- Current state of each record before processing
- Timestamp sources and decisions
- Success/failure status for each update
- Error details and resolution guidance

## Validation Queries

Use these queries to verify the solution is working correctly:

### Check for Missing Timestamps
```sql
SELECT COUNT(*) as missing_timestamps
FROM cmmsdata.mm_inventory inv
JOIN cmmsdata.mm_part mp ON (inv.part_number = mp.part_number AND inv.cage_code = mp.cage_code)
WHERE mp.is_eel_required = 'Y'
  AND mp.is_serialized = 'Y'
  AND inv.installation_timestamp IS NULL;
```

### Check for Incorrect Install Flags
```sql
SELECT COUNT(*) as incorrect_flags
FROM cmmsdata.mm_inventory inv
JOIN cmmsdata.mm_part mp ON (inv.part_number = mp.part_number AND inv.cage_code = mp.cage_code)
JOIN eel_owner.prt_part pp ON (pp.ref_nbr = inv.part_number AND pp.cage_code = inv.cage_code AND pp.serial_nbr = inv.serial_number)
WHERE mp.is_eel_required = 'Y'
  AND mp.is_serialized = 'Y'
  AND pp.rec_mode = 'OPEN'
  AND inv.is_inventory_installed = 'N';
```

### Verify Timestamp Synchronization
```sql
SELECT 
    inv.part_number,
    inv.cage_code,
    inv.serial_number,
    inv.installation_timestamp,
    pp.date_installed,
    CASE 
        WHEN inv.installation_timestamp = pp.date_installed THEN 'SYNCHRONIZED'
        ELSE 'MISMATCH'
    END as sync_status
FROM cmmsdata.mm_inventory inv
JOIN eel_owner.prt_part pp ON (pp.ref_nbr = inv.part_number AND pp.cage_code = inv.cage_code AND pp.serial_nbr = inv.serial_number)
WHERE inv.installation_timestamp IS NOT NULL
  AND pp.date_installed IS NOT NULL;
```

## Migration Strategy

1. **Immediate**: Use `validate_ame_collector_status.sql` to assess current issues
2. **Short-term**: Run `fix_ame_collector_timestamps.sql` to remediate existing problems
3. **Long-term**: Replace `update_nha.sql` with `update_nha_enhanced.sql` in all environments

## Monitoring and Maintenance

- Run validation queries regularly to ensure data integrity
- Monitor log files for any new error patterns
- Consider scheduling periodic validation reports
- Update documentation as the solution evolves

## Support and Troubleshooting

### Common Issues

1. **"No EEL for Parent"** - Indicates missing parent part records
2. **"No Install Timestamp found"** - Inventory record exists but lacks timestamp
3. **Part category mismatches** - Use `modify_part_ctgry.sql` as directed in error messages

### Log File Analysis

Each script generates detailed log files with timestamps. Key indicators:
- `✓` symbols indicate successful operations
- `✗` symbols indicate failures or issues
- `###` prefixes highlight important status messages

### Contact Information

For issues not covered in this documentation, contact the ALIS team with:
- Log file excerpts showing the specific error
- Part number, cage code, and serial number of affected components
- Environment details (DB1, etc.)

## Version History

- **v1.0** - Initial enhanced solution addressing timestamp and install flag issues
- Replaces original NHA_IUID_SYNC utility functionality
- Adds comprehensive validation and remediation capabilities

