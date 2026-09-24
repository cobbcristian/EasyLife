-- Add unique constraint to MemberCharge.payToken
-- Note: Nullable unique constraints are supported in PostgreSQL (nulls are distinct)
-- Pre-check: SELECT payToken, COUNT(*) FROM "MemberCharge" WHERE payToken IS NOT NULL GROUP BY payToken HAVING COUNT(*) > 1;
-- If duplicates exist, they must be resolved before applying this migration.

-- Drop the existing index first (it's being replaced by the unique constraint)
DROP INDEX IF EXISTS "MemberCharge_payToken_idx";

-- Create unique constraint (which also creates an index)
CREATE UNIQUE INDEX "MemberCharge_payToken_key" ON "MemberCharge"("payToken");
