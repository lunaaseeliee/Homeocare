-- ============================================================================
-- HOMEOCARE PHASE 7 — PATCH 02: HARDENED STAFF ONBOARDING & SINGLE-USE INVITES
-- Target: Applied incrementally on top of database/schema.sql + Patch 01
-- Purpose:
--   1. Non-destructive schema hardening on `public.staff_authorization_codes`:
--      - Add `target_email TEXT` column to bind each one-time invitation code
--        to the exact administrator-provisioned Supabase Auth user email.
--      - Enforce table CHECK constraints requiring single-use (`max_uses = 1`,
--        `uses_count <= 1`) and a mandatory expiration timestamp (`expires_at IS NOT NULL`).
--   2. Harden `public.register_authorized_staff(TEXT, TEXT, TEXT)` (the sole
--      intentional SECURITY DEFINER function in `public`) so it cannot be abused:
--      - Fixed `search_path = public, private, extensions, pg_temp`
--      - Verifies caller is authenticated (`auth.uid() IS NOT NULL`) AND has a
--        confirmed email in `auth.users` (`email_confirmed_at IS NOT NULL`)
--      - Rejects if caller already has a `public.staff_profiles` record
--      - Requires high-entropy invitation code (min 16 characters)
--      - Atomically locks (`FOR UPDATE`) the matching SHA-256 token where
--        `is_active = true`, `uses_count = 0`, `max_uses = 1`, `expires_at > now()`,
--        and `lower(target_email) = lower(caller_auth_email)`
--      - Immediately consumes and deactivates the token (`uses_count = 1, is_active = false`)
--      - Assigns clinic role strictly from `token_rec.assigned_role`
-- ============================================================================

BEGIN;

-- 1. Add `target_email` to bind each invitation token to a specific admin-provisioned account
ALTER TABLE public.staff_authorization_codes
    ADD COLUMN IF NOT EXISTS target_email TEXT;

-- 2. Enforce strict single-use and mandatory-expiration CHECK constraints
DO $$ BEGIN
    ALTER TABLE public.staff_authorization_codes
        ADD CONSTRAINT chk_single_use_invite_code
        CHECK (max_uses = 1 AND uses_count >= 0 AND uses_count <= 1);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.staff_authorization_codes
        ADD CONSTRAINT chk_invite_expiry_required
        CHECK (expires_at IS NOT NULL);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 3. Harden `public.register_authorized_staff` in-place (same 3-arg signature, no overload)
CREATE OR REPLACE FUNCTION public.register_authorized_staff(
    invite_code_input TEXT,
    desired_username TEXT,
    desired_full_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions, pg_temp
AS $$
DECLARE
    current_uid UUID;
    caller_email TEXT;
    caller_confirmed TIMESTAMPTZ;
    clean_uname TEXT;
    clean_fname TEXT;
    code_hash_calc TEXT;
    token_rec RECORD;
BEGIN
    current_uid := auth.uid();
    IF current_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required: You must sign in with your administrator-provisioned account first.';
    END IF;

    -- Verify caller account exists in auth.users and is confirmed by administrator/email
    SELECT email, email_confirmed_at
      INTO caller_email, caller_confirmed
      FROM auth.users
     WHERE id = current_uid;

    IF caller_email IS NULL OR caller_confirmed IS NULL THEN
        RAISE EXCEPTION 'Account verification required: Only confirmed administrator-provisioned accounts can activate a clinic staff profile.';
    END IF;

    -- Require high-entropy single-use invitation code (min 16 characters)
    IF invite_code_input IS NULL OR length(trim(invite_code_input)) < 16 THEN
        RAISE EXCEPTION 'Invalid invitation code: A high-entropy single-use clinic authorization code (min 16 chars) is required.';
    END IF;

    clean_uname := lower(trim(COALESCE(desired_username, '')));
    clean_fname := trim(COALESCE(desired_full_name, ''));

    IF clean_uname !~ '^[a-z0-9_.-]{3,32}$' THEN
        RAISE EXCEPTION 'Username must be 3 to 32 characters (lowercase letters, numbers, dots, hyphens, or underscores).';
    END IF;

    IF length(clean_fname) < 2 THEN
        RAISE EXCEPTION 'Full name is required (minimum 2 characters).';
    END IF;

    -- Single-registration guard: reject if this Auth UID already has a profile
    IF EXISTS (SELECT 1 FROM public.staff_profiles WHERE id = current_uid) THEN
        RAISE EXCEPTION 'Staff profile already exists for this account. Role or status changes require administrator authorization.';
    END IF;

    -- Uniqueness guard: reject if username is already taken
    IF EXISTS (SELECT 1 FROM public.staff_profiles WHERE lower(username) = clean_uname) THEN
        RAISE EXCEPTION 'Username "%" is already registered. Please choose a different username.', clean_uname;
    END IF;

    -- Compute SHA-256 digest of the invitation code
    code_hash_calc := encode(digest(trim(invite_code_input), 'sha256'), 'hex');

    -- Atomically lock and validate the single-use, non-expired, email-bound token
    SELECT * INTO token_rec
      FROM public.staff_authorization_codes
     WHERE code_hash = code_hash_calc
       AND is_active = true
       AND uses_count = 0
       AND max_uses = 1
       AND expires_at IS NOT NULL
       AND expires_at > now()
       AND (target_email IS NULL OR lower(trim(target_email)) = lower(trim(caller_email)))
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid, expired, already-used, or email-mismatched clinic authorization code. Registration rejected.';
    END IF;

    -- Permanently consume and deactivate the single-use invitation code
    UPDATE public.staff_authorization_codes
       SET uses_count = 1,
           is_active = false
     WHERE id = token_rec.id;

    -- Create the staff profile with role strictly dictated by the server-side token
    INSERT INTO public.staff_profiles (
        id,
        username,
        full_name,
        role,
        is_active
    ) VALUES (
        current_uid,
        clean_uname,
        clean_fname,
        token_rec.assigned_role,
        true
    );

    -- Write immutable audit log entry
    INSERT INTO public.audit_logs (
        actor_id,
        actor_username,
        action,
        resource_type,
        resource_id,
        details
    ) VALUES (
        current_uid,
        clean_uname,
        'STAFF_REGISTERED',
        'staff_profiles',
        current_uid::text,
        jsonb_build_object(
            'role', token_rec.assigned_role,
            'email', lower(trim(caller_email)),
            'token_id', token_rec.id,
            'single_use_consumed', true
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'user_id', current_uid,
        'role', token_rec.assigned_role,
        'username', clean_uname,
        'full_name', clean_fname,
        'email', lower(trim(caller_email))
    );
END;
$$;

REVOKE ALL ON FUNCTION public.register_authorized_staff(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_authorized_staff(TEXT, TEXT, TEXT) TO authenticated;

COMMIT;

-- ============================================================================
-- ADMINISTRATOR-CONTROLLED PROVISIONING & RECOVERY TEMPLATES (DO NOT AUTO-RUN)
-- ============================================================================
/*
-- STEP A: Generate a cryptographically random 128-bit single-use invitation code
-- bound to a specific administrator-provisioned email and role (expires in 24h):
WITH generated AS (
    SELECT
        'SSC-INV-' || upper(encode(extensions.gen_random_bytes(12), 'hex')) AS plain_invite_code,
        'doctor'::public.clinic_role AS target_role,
        'replace_with_doctor_real_email@example.com'::text AS provisioned_email
)
INSERT INTO public.staff_authorization_codes (
    code_hash,
    assigned_role,
    target_email,
    max_uses,
    uses_count,
    is_active,
    expires_at,
    notes
)
SELECT
    encode(extensions.digest(plain_invite_code, 'sha256'), 'hex'),
    target_role,
    lower(trim(provisioned_email)),
    1,
    0,
    true,
    now() + interval '24 hours',
    'Single-use admin-provisioned invite for ' || provisioned_email
FROM generated
RETURNING
    (SELECT plain_invite_code FROM generated) AS one_time_invite_code_copy_now,
    assigned_role,
    target_email,
    expires_at;
*/
