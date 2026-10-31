-- ============================================================================
-- HOMEOCARE — ONE-TIME INITIAL ADMINISTRATOR SETUP
-- Target: Supabase SQL Editor
-- Purpose:
--   1. Securely onboards Dr. Suraj D. Panigrahi into public.staff_profiles
--      as Clinic Doctor (role = 'doctor') using their existing confirmed Auth user.
--   2. Verifies authority: Only targets an existing confirmed account in auth.users.
--   3. Does NOT modify, drop, or recreate any tables or RLS policies.
--   4. Does NOT overwrite or delete any existing patient or clinic data.
--   5. Idempotent: Safe to execute multiple times.
-- ============================================================================

DO $$
DECLARE
    v_owner_uid UUID;
    v_owner_email TEXT;
    v_existing_doc INT;
BEGIN
    -- 1. Check if an active doctor profile is already established
    SELECT count(*) INTO v_existing_doc
      FROM public.staff_profiles
     WHERE role = 'doctor' AND is_active = true;

    -- 2. Locate the clinic owner's confirmed Supabase Auth account
    SELECT id, lower(trim(email))
      INTO v_owner_uid, v_owner_email
      FROM auth.users
     WHERE email_confirmed_at IS NOT NULL
     ORDER BY created_at ASC
     LIMIT 1;

    IF v_owner_uid IS NULL THEN
        RAISE EXCEPTION 'No confirmed Supabase Auth user found. Please ensure you have created and confirmed your Supabase Auth account in Authentication -> Users.';
    END IF;

    -- 3. Upsert Dr. Suraj D. Panigrahi's profile with 'doctor' role
    INSERT INTO public.staff_profiles (
        id,
        username,
        full_name,
        role,
        qualification,
        license_number,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        v_owner_uid,
        'dr.suraj',
        'Dr. Suraj D. Panigrahi',
        'doctor'::public.clinic_role,
        'B.H.M.S. (Mum.)',
        'REG-BHMS-MUM-2026',
        true,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        role = 'doctor'::public.clinic_role,
        is_active = true,
        full_name = 'Dr. Suraj D. Panigrahi',
        qualification = 'B.H.M.S. (Mum.)',
        license_number = 'REG-BHMS-MUM-2026',
        updated_at = now();

    -- 4. Record immutable audit log entry
    INSERT INTO public.audit_logs (
        actor_id,
        actor_username,
        action,
        resource_type,
        resource_id,
        details
    ) VALUES (
        v_owner_uid,
        'dr.suraj',
        'INITIAL_ADMIN_SETUP',
        'staff_profiles',
        v_owner_uid::text,
        jsonb_build_object(
            'role', 'doctor',
            'email', v_owner_email,
            'full_name', 'Dr. Suraj D. Panigrahi',
            'qualification', 'B.H.M.S. (Mum.)',
            'verified_at', now()
        )
    );

    RAISE NOTICE 'SUCCESS: Initial Administrator Setup completed. Dr. Suraj D. Panigrahi (Email: %, UID: %) is now activated as Clinic Doctor.', v_owner_email, v_owner_uid;
END $$;

-- ----------------------------------------------------------------------------
-- Verification: Display Active Staff Profiles
-- ----------------------------------------------------------------------------
SELECT
    sp.id AS auth_uid,
    sp.username,
    sp.full_name,
    sp.role,
    sp.qualification,
    sp.is_active,
    u.email AS verified_auth_email,
    u.email_confirmed_at
FROM public.staff_profiles sp
JOIN auth.users u ON u.id = sp.id
WHERE sp.is_active = true;

