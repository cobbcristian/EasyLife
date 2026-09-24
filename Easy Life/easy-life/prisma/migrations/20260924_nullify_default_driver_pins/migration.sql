-- Migration: Nullify default driver PINs
-- 
-- Security fix: TramDriver.pin no longer has a default value of '1234'.
-- Existing drivers with the insecure default PIN are set to NULL,
-- requiring an admin to set a new PIN before they can log in.
--
-- This migration:
-- 1. Alters the column to remove the default and make it nullable
-- 2. Sets pin = NULL where pin = '1234' (the old insecure default)

-- Make pin nullable and remove default
ALTER TABLE "TramDriver" ALTER COLUMN "pin" DROP DEFAULT;
ALTER TABLE "TramDriver" ALTER COLUMN "pin" DROP NOT NULL;

-- Nullify rows that still have the insecure default PIN
UPDATE "TramDriver" SET "pin" = NULL WHERE "pin" = '1234';
