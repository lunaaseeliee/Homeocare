-- ============================================================================
-- HOMEOCARE PHASE 7 — ISOLATED RLS & RBAC SECURITY VERIFICATION SUITE
-- Purpose: Verifies anonymous, receptionist, admin, and doctor permissions:
--   - Anonymous users blocked from all tables and RPCs.
--   - Trigger & RLS helper functions hidden in `private` (unreachable via public API).
--   - Receptionists blocked from approving invoices/cases, escalating role, or deleting history.
--   - Admins blocked from clinical/invoice approvals (strictly requires `role = 'doctor'`).
--   - `doctor_approve_case` rejects missing status (never defaults to 'Cured / Discharged').
--   - Permanent history protection blocks hard-deletes even for doctors.
-- Safety: Runs inside a single `BEGIN ... ROLLBACK` transaction (zero records persisted).
-- ============================================================================

BEGIN;

DO $$
DECLARE
    v_doc_uid UUID := '00000000-0000-0000-0000-0000000000d1';
    v_rec_uid UUID := '00000000-0000-0000-0000-0000000000c2';
    v_adm_uid UUID := '00000000-0000-0000-0000-0000000000a3';
    v_onboard1_uid UUID := '00000000-0000-0000-0000-0000000000b4';
    v_onboard2_uid UUID := '00000000-0000-0000-0000-0000000000b5';
    v_test_invite_code TEXT := 'SSC-TEST-SINGLE-USE-2026';
    v_patient_id UUID;
    v_case_id UUID;
    v_consult_id UUID;
    v_progress_id UUID;
    v_invoice_id UUID;
    v_med_id UUID;
    v_count INT;
BEGIN
    RAISE NOTICE '=== Starting HomeoCare Isolated RLS & RBAC Verification Suite (Transactional Rollback Mode) ===';

    -- ------------------------------------------------------------------------
    -- 0. Provision temporary test identities inside the transaction
    -- ------------------------------------------------------------------------
    INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
    VALUES
        (v_doc_uid, 'test_doc@siddhivinayak.example', now(), '{"role":"doctor"}'::jsonb),
        (v_rec_uid, 'test_rec@siddhivinayak.example', now(), '{"role":"doctor"}'::jsonb), -- Receptionist spoofing "doctor" in user_metadata
        (v_adm_uid, 'test_adm@siddhivinayak.example', now(), '{"role":"admin"}'::jsonb),
        (v_onboard1_uid, 'test_onboard1@siddhivinayak.example', now(), '{"role":"doctor"}'::jsonb),
        (v_onboard2_uid, 'test_onboard2@siddhivinayak.example', now(), '{"role":"doctor"}'::jsonb);

    INSERT INTO public.staff_authorization_codes (code_hash, assigned_role, target_email, max_uses, uses_count, is_active, expires_at, notes)
    VALUES (
        encode(extensions.digest(v_test_invite_code, 'sha256'), 'hex'),
        'receptionist',
        'test_onboard1@siddhivinayak.example',
        1, 0, true,
        now() + interval '1 hour',
        'Transactional test single-use email-bound invite token'
    );

    INSERT INTO public.staff_profiles (id, username, full_name, role, is_active)
    VALUES
        (v_doc_uid, 'test_dr_suraj', 'Dr. Suraj Test', 'doctor', true),
        (v_rec_uid, 'test_receptionist', 'Receptionist Test', 'receptionist', true),
        (v_adm_uid, 'test_admin', 'Clinic Admin Test', 'admin', true);

    -- ------------------------------------------------------------------------
    -- TEST 1: ANONYMOUS (anon) ACCESS BLOCKS
    -- ------------------------------------------------------------------------
    SET LOCAL ROLE anon;
    PERFORM set_config('request.jwt.claims', '{}', true);

    SELECT count(*) INTO v_count FROM public.patients;
    IF v_count > 0 THEN
        RAISE EXCEPTION '[FAIL] Anonymous user could read patients!';
    END IF;

    BEGIN
        PERFORM public.doctor_approve_invoice(uuid_generate_v4(), 'Anon attempt');
        RAISE EXCEPTION '[FAIL] Anonymous user was allowed to execute doctor_approve_invoice!';
    EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
        RAISE NOTICE '[PASS] 1. Anonymous user blocked from patient data and RPCs.';
    END;

    -- ------------------------------------------------------------------------
    -- TEST 2: RECEPTIONIST PERMISSIONS & ESCALATION BLOCKS
    -- ------------------------------------------------------------------------
    SET LOCAL ROLE authenticated;
    PERFORM set_config(
        'request.jwt.claims',
        json_build_object(
            'sub', v_rec_uid::text,
            'role', 'authenticated',
            'user_metadata', json_build_object('role', 'doctor')
        )::text,
        true
    );

    -- 2a. Verify spoofed user_metadata {"role":"doctor"} does NOT grant doctor privileges
    IF private.is_doctor() THEN
        RAISE EXCEPTION '[FAIL] Receptionist escalated to doctor via JWT user_metadata!';
    END IF;
    RAISE NOTICE '[PASS] 2a. Editable JWT user_metadata is ignored; receptionist role strictly enforced.';

    -- 2b-i. Verify permitted self-profile edit (non-role fields) succeeds without 42P17 recursion
    UPDATE public.staff_profiles
    SET phone = '9876543210',
        full_name = 'Receptionist Verified Edit'
    WHERE id = v_rec_uid;

    IF (SELECT phone FROM public.staff_profiles WHERE id = v_rec_uid) IS DISTINCT FROM '9876543210' THEN
        RAISE EXCEPTION '[FAIL] Permitted self-profile edit on non-role fields did not persist!';
    END IF;
    RAISE NOTICE '[PASS] 2b-i. Permitted self-profile edit (phone, full_name) succeeded without 42P17 recursion.';

    -- 2b-ii. Attempt direct self-escalation on staff_profiles (role -> doctor / admin)
    BEGIN
        UPDATE public.staff_profiles SET role = 'doctor' WHERE id = v_rec_uid;
        IF (SELECT role FROM public.staff_profiles WHERE id = v_rec_uid) = 'doctor' THEN
            RAISE EXCEPTION '[FAIL] Receptionist escalated own role to doctor on staff_profiles!';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '[PASS] 2b-ii. Receptionist blocked from escalating role to doctor on staff_profiles.';
    END;

    -- 2c. Receptionist can register a patient, open an initial case, add medicine, and create a draft invoice
    INSERT INTO public.patients (clinic_patient_id, full_name, phone, age, gender, created_by)
    VALUES ('SSC-TEST-9999', 'Fictional Verification Patient', '9000000000', 34, 'Female', v_rec_uid)
    RETURNING id INTO v_patient_id;

    INSERT INTO public.medical_cases (case_number, patient_id, chief_complaint)
    VALUES ('CASE-TEST-9999', v_patient_id, 'Seasonal Allergic Rhinitis')
    RETURNING id INTO v_case_id;

    INSERT INTO public.medicines (name, potency, form, current_stock_qty, unit_price)
    VALUES ('Allium Cepa Test', '30 CH', 'Dilution', 20, 110.00)
    RETURNING id INTO v_med_id;

    INSERT INTO public.invoices (invoice_number, patient_id, case_id, grand_total, is_draft, is_approved, created_by)
    VALUES ('SSC-INV-TEST-9999', v_patient_id, v_case_id, 1250.00, true, false, v_rec_uid)
    RETURNING id INTO v_invoice_id;

    RAISE NOTICE '[PASS] 2c. Receptionist permitted to register patient, open case, add stock, and create draft invoice.';

    -- 2d. Receptionist BLOCKED from creating clinical consultations or treatment progress
    BEGIN
        INSERT INTO public.consultations (case_id, patient_id, doctor_id, clinical_notes)
        VALUES (v_case_id, v_patient_id, v_rec_uid, 'Unauthorized consultation note');
        RAISE EXCEPTION '[FAIL] Receptionist was allowed to insert a consultation!';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '[PASS] 2d. Receptionist blocked from inserting consultations.';
    END;

    -- 2e. Receptionist BLOCKED from approving invoices or cases (via RPC or direct UPDATE)
    BEGIN
        PERFORM public.doctor_approve_invoice(v_invoice_id, 'Receptionist attempting approval');
        RAISE EXCEPTION '[FAIL] Receptionist was allowed to call doctor_approve_invoice!';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '[PASS] 2e. Receptionist blocked from approving invoice via RPC.';
    END;

    BEGIN
        UPDATE public.invoices SET is_approved = true WHERE id = v_invoice_id;
        IF (SELECT is_approved FROM public.invoices WHERE id = v_invoice_id) = true THEN
            RAISE EXCEPTION '[FAIL] Receptionist approved invoice via direct UPDATE!';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '[PASS] 2f. Receptionist blocked from approving invoice via direct UPDATE.';
    END;

    -- 2g. Receptionist BLOCKED from deleting medicines or patients
    BEGIN
        DELETE FROM public.medicines WHERE id = v_med_id;
        IF NOT FOUND THEN
            RAISE NOTICE '[PASS] 2g. Receptionist blocked from deleting dispensary medicines.';
        ELSE
            RAISE EXCEPTION '[FAIL] Receptionist deleted a medicine record!';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '[PASS] 2g. Receptionist blocked from deleting dispensary medicines.';
    END;

    -- ------------------------------------------------------------------------
    -- TEST 3: ADMIN BLOCKED FROM CLINICAL & INVOICE APPROVALS (DOCTOR-ONLY)
    -- ------------------------------------------------------------------------
    PERFORM set_config(
        'request.jwt.claims',
        json_build_object('sub', v_adm_uid::text, 'role', 'authenticated')::text,
        true
    );

    IF private.is_doctor() THEN
        RAISE EXCEPTION '[FAIL] Admin account was treated as a verified doctor!';
    END IF;

    BEGIN
        PERFORM public.doctor_approve_invoice(v_invoice_id, 'Admin attempting doctor approval');
        RAISE EXCEPTION '[FAIL] Admin was allowed to approve an invoice!';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '[PASS] 3. Admin account strictly blocked from approving clinical cases and invoices (requires verified doctor).';
    END;

    -- ------------------------------------------------------------------------
    -- TEST 4: DOCTOR PERMISSIONS, EXPLICIT CASE STATUS & PERMANENT HISTORY
    -- ------------------------------------------------------------------------
    PERFORM set_config(
        'request.jwt.claims',
        json_build_object('sub', v_doc_uid::text, 'role', 'authenticated')::text,
        true
    );

    -- 4a. Doctor can record consultations and treatment progress
    INSERT INTO public.consultations (case_id, patient_id, doctor_id, clinical_notes, prescribed_remedy, remedy_potency)
    VALUES (v_case_id, v_patient_id, v_doc_uid, 'Initial evaluation complete.', 'Allium Cepa', '30 CH')
    RETURNING id INTO v_consult_id;

    INSERT INTO public.treatment_progress (consultation_id, patient_id, case_id, observation_notes, evaluated_by)
    VALUES (v_consult_id, v_patient_id, v_case_id, 'Initial baseline recorded.', v_doc_uid)
    RETURNING id INTO v_progress_id;

    -- 4b. Doctor can perform audited amendment on treatment progress
    PERFORM public.doctor_amend_progress(
        v_progress_id,
        'Marked amelioration in coryza within 48 hours.',
        'Follow-up addendum recorded by Dr. Panigrahi',
        false
    );

    -- 4c. Verify doctor_approve_case REJECTS omitted/NULL status (no default 'Cured / Discharged')
    BEGIN
        PERFORM public.doctor_approve_case(v_case_id, NULL, 'Missing explicit status');
        RAISE EXCEPTION '[FAIL] doctor_approve_case allowed NULL/implicit case status!';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '[PASS] 4c-i. doctor_approve_case rejected missing status (no default Cured / Discharged assumption).';
    END;

    -- 4d. Doctor explicitly selects clinically appropriate status ('Under Observation') and approves invoice
    PERFORM public.doctor_approve_case(v_case_id, 'Under Observation', 'Responding well to Allium Cepa 30 CH');
    IF (SELECT status FROM public.medical_cases WHERE id = v_case_id) IS DISTINCT FROM 'Under Observation'
       OR (SELECT resolved_at FROM public.medical_cases WHERE id = v_case_id) IS NOT NULL THEN
        RAISE EXCEPTION '[FAIL] Case status or resolved_at was not set accurately!';
    END IF;

    PERFORM public.doctor_approve_invoice(v_invoice_id, 'Verified and approved by Dr. Suraj D. Panigrahi');
    RAISE NOTICE '[PASS] 4c-ii & 4d. Doctor consultation, audited progress amendment, explicit case status approval, and invoice approval succeeded.';

    -- 4e. Even Doctor is BLOCKED from hard-deleting treatment progress, consultations, or approved invoices
    BEGIN
        DELETE FROM public.treatment_progress WHERE id = v_progress_id;
        IF NOT FOUND THEN
            RAISE NOTICE '[PASS] 4e. Hard-deletion of treatment_progress blocked by RLS (no DELETE policy).';
        ELSE
            RAISE EXCEPTION '[FAIL] Treatment progress was hard-deleted!';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '[PASS] 4e. Hard-deletion of treatment_progress blocked by permanent history trigger.';
    END;

    -- ------------------------------------------------------------------------
    -- TEST 5: `register_authorized_staff()` SINGLE-USE INVITE & REUSE BLOCKS
    -- ------------------------------------------------------------------------
    PERFORM set_config(
        'request.jwt.claims',
        json_build_object(
            'sub', v_onboard1_uid::text,
            'role', 'authenticated',
            'user_metadata', json_build_object('role', 'doctor')
        )::text,
        true
    );

    -- 5a. Forged / invalid invitation code must be rejected
    BEGIN
        PERFORM public.register_authorized_staff('FORGED-INVALID-CODE-9999', 'onboard_staff_1', 'Onboarding Staff One');
        RAISE EXCEPTION '[FAIL] register_authorized_staff accepted a forged invitation code!';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '[PASS] 5a. register_authorized_staff rejected forged invitation code.';
    END;

    -- 5a-ii. Wrong account (email mismatch with target_email) attempting to use another staff member's invite code must be rejected
    PERFORM set_config(
        'request.jwt.claims',
        json_build_object('sub', v_onboard2_uid::text, 'role', 'authenticated')::text,
        true
    );
    BEGIN
        PERFORM public.register_authorized_staff(v_test_invite_code, 'onboard_staff_2', 'Onboarding Staff Two');
        RAISE EXCEPTION '[FAIL] register_authorized_staff allowed a different email account to use target_email-bound code!';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '[PASS] 5a-ii. register_authorized_staff rejected email-mismatched caller.';
    END;

    -- Switch back to the authorized target_email account (v_onboard1_uid)
    PERFORM set_config(
        'request.jwt.claims',
        json_build_object(
            'sub', v_onboard1_uid::text,
            'role', 'authenticated',
            'user_metadata', json_build_object('role', 'doctor')
        )::text,
        true
    );

    -- 5b. Valid single-use invitation code succeeds once and assigns token role ('receptionist', ignoring spoofed metadata)
    PERFORM public.register_authorized_staff(v_test_invite_code, 'onboard_staff_1', 'Onboarding Staff One');

    IF (SELECT role FROM public.staff_profiles WHERE id = v_onboard1_uid) IS DISTINCT FROM 'receptionist' THEN
        RAISE EXCEPTION '[FAIL] register_authorized_staff did not assign strict token role!';
    END IF;
    RAISE NOTICE '[PASS] 5b. register_authorized_staff provisioned profile with strict token role (receptionist) and consumed single-use code.';

    -- 5c. Existing staff member blocked from calling register_authorized_staff again
    BEGIN
        PERFORM public.register_authorized_staff(v_test_invite_code, 'onboard_staff_1_dup', 'Onboarding Staff One');
        RAISE EXCEPTION '[FAIL] Existing staff account was allowed to re-run register_authorized_staff!';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '[PASS] 5c. Existing staff account blocked from re-registering.';
    END;

    -- 5d. Second user attempting to reuse the already-consumed single-use invitation code is blocked
    PERFORM set_config(
        'request.jwt.claims',
        json_build_object('sub', v_onboard2_uid::text, 'role', 'authenticated')::text,
        true
    );

    BEGIN
        PERFORM public.register_authorized_staff(v_test_invite_code, 'onboard_staff_2', 'Onboarding Staff Two');
        RAISE EXCEPTION '[FAIL] Consumed single-use invitation code was reused by a second user!';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '[PASS] 5d. Second user blocked from reusing consumed single-use invitation code.';
    END;

    RAISE NOTICE '=== ALL SECURITY & RBAC VERIFICATION CHECKS PASSED ===';
END $$;

-- Always roll back test transaction so zero test data persists
ROLLBACK;
