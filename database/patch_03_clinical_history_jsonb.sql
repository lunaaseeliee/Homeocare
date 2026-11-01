-- ============================================================================
-- HOMEOCARE — PATCH 03: STRUCTURED CLINICAL HISTORY JSONB COLUMNS
-- Clinic: Shri Siddhivinayak Clinic | Dr. Suraj D. Panigrahi, B.H.M.S. (Mum.)
-- Purpose:
--   Minimally invasive, backward-compatible, reversible addition of structured
--   history columns on `public.patients` for the Approved Clinical Form UI.
--   - Does NOT drop or alter any existing columns, tables, or RLS policies.
--   - Existing free-text records remain 100% intact.
-- ============================================================================

ALTER TABLE public.patients
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS chief_complaint TEXT,
    ADD COLUMN IF NOT EXISTS past_history JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS personal_history JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS mind_history JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS consultations_log JSONB DEFAULT '[]'::jsonb;

-- Rollback instructions (only if ever needed):
-- ALTER TABLE public.patients
--     DROP COLUMN IF EXISTS email,
--     DROP COLUMN IF EXISTS chief_complaint,
--     DROP COLUMN IF EXISTS past_history,
--     DROP COLUMN IF EXISTS personal_history,
--     DROP COLUMN IF EXISTS mind_history,
--     DROP COLUMN IF EXISTS consultations_log;
