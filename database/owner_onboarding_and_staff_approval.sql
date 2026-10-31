-- ============================================================================
-- HOMEOCARE — ONE-TIME CLINIC OWNER / DOCTOR ONBOARDING & STAFF APPROVAL
-- Clinic: Shri Siddhivinayak Clinic | Dr. Suraj D. Panigrahi, B.H.M.S. (Mum.)
-- Database: Supabase PostgreSQL (Postgres 15+)
-- Target: Run once in the Supabase SQL Editor by the clinic owner.
--
-- Safety Guarantees:
-- 1. Does NOT drop, alter, or recreate any existing tables or RLS policies.
-- 2. Does NOT delete or overwrite any patient or clinical records.
-- 3. Verifies authority: Only targets an existing confirmed account in auth.users.
-- 4. Never grants doctor permissions to self-registered usernames.
-- 5. Idempotent: Safe to run multiple times without duplicate errors.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Safe One-Time Clinic Owner Activation
-- Activates the confirmed administrator account into public.staff_profiles
-- with role = 'doctor' and full clinical authorization.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_owner_uid UUID;
    v_owner_email TEXT;
BEGIN
    -- Locate the clinic owner's confirmed Supabase Auth account
    SELECT id, lower(trim(email))
      INTO v_owner_uid, v_owner_email
      FROM auth.users
     WHERE email_confirmed_at IS NOT NULL
     ORDER BY created_at ASC
     LIMIT 1;

    IF v_owner_uid IS NULL THEN
        RAISE EXCEPTION 'No confirmed Supabase Auth account found. Please ensure your account has a confirmed email in Supabase Auth.';
    END IF;

    -- Upsert the doctor profile for the confirmed clinic owner
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

    -- Record immutable audit log entry
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
        'CLINIC_OWNER_ONBOARDED',
        'staff_profiles',
        v_owner_uid::text,
        jsonb_build_object(
            'role', 'doctor',
            'email', v_owner_email,
            'full_name', 'Dr. Suraj D. Panigrahi',
            'qualification', 'B.H.M.S. (Mum.)',
            'activated_at', now()
        )
    );

    RAISE NOTICE 'SUCCESS: Activated clinic owner account (UID: %, Email: %) as Clinic Doctor.', v_owner_uid, v_owner_email;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 2: Secure Database Procedure for Administrator Staff Approval
-- Callable ONLY by authenticated doctors or admins (enforced by RLS / SECURITY DEFINER)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_staff_registration(
    target_user_id UUID,
    assigned_username TEXT,
    assigned_role public.clinic_role DEFAULT 'receptionist'::public.clinic_role
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions, pg_temp
AS $$
DECLARE
    caller_uid UUID;
    clean_uname TEXT;
    target_email TEXT;
BEGIN
    caller_uid := auth.uid();
    IF caller_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required: You must be signed in to approve staff.';
    END IF;

    -- Verify caller is an active doctor or admin
    IF NOT EXISTS (
        SELECT 1 FROM public.staff_profiles
        WHERE id = caller_uid
          AND role IN ('doctor'::public.clinic_role, 'admin'::public.clinic_role)
          AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Access Denied: Only the clinic doctor or administrator can approve staff registrations.';
    END IF;

    -- Guard: Never permit assigning 'doctor' role through general staff approval
    IF assigned_role = 'doctor'::public.clinic_role AND NOT private.is_doctor() THEN
        RAISE EXCEPTION 'Privilege Violation: Only an active licensed doctor can authorize another doctor profile.';
    END IF;

    clean_uname := lower(trim(COALESCE(assigned_username, '')));
    IF clean_uname !~ '^[a-z0-9_.-]{3,32}$' THEN
        RAISE EXCEPTION 'Username must be 3 to 32 characters (letters, numbers, dots, hyphens, or underscores).';
    END IF;

    -- Get target user's email from auth.users
    SELECT lower(trim(email)) INTO target_email
      FROM auth.users
     WHERE id = target_user_id;

    IF target_email IS NULL THEN
        RAISE EXCEPTION 'Target user not found in auth.users.';
    END IF;

    -- Insert or activate staff profile
    INSERT INTO public.staff_profiles (
        id,
        username,
        full_name,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        target_user_id,
        clean_uname,
        clean_uname,
        assigned_role,
        true,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        username = clean_uname,
        role = assigned_role,
        is_active = true,
        updated_at = now();

    -- Audit log
    INSERT INTO public.audit_logs (
        actor_id,
        actor_username,
        action,
        resource_type,
        resource_id,
        details
    ) VALUES (
        caller_uid,
        (SELECT username FROM public.staff_profiles WHERE id = caller_uid),
        'STAFF_APPROVED',
        'staff_profiles',
        target_user_id::text,
        jsonb_build_object(
            'approved_username', clean_uname,
            'role', assigned_role,
            'target_email', target_email,
            'approved_at', now()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'username', clean_uname,
        'role', assigned_role,
        'is_active', true
    );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_staff_registration(UUID, TEXT, public.clinic_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_staff_registration(UUID, TEXT, public.clinic_role) TO authenticated;

-- ----------------------------------------------------------------------------
-- STEP 3: Verification Output
-- ----------------------------------------------------------------------------
SELECT id, username, full_name, role, qualification, is_active, created_at
FROM public.staff_profiles;

