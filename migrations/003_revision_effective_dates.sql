
-- C1SE82-40: Add document revision effective dates
-- PostgreSQL migration for existing databases

ALTER TABLE revisions
ADD COLUMN IF NOT EXISTS effective_from DATE;

ALTER TABLE revisions
ADD COLUMN IF NOT EXISTS effective_to DATE;
