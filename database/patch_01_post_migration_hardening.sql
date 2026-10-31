-- ============================================================================
-- HOMEOCARE PHASE 7 — POST-MIGRATION SECURITY PATCH (PATCH 01)
-- Target: Applied incrementally on top of existing database/schema.sql
-- Purpose:
--   1. Move 3 RLS helper functions and 4 trigger functions out of `public`
--      into an unexposed `private` schema so PostgREST never exposes them as RPCs.
--   2. Convert trigger functions and the 3 doctor action RPCs (`doctor_approve_invoice`,
--      `doctor_approve_case`, `doctor_amend_progress`) from SECURITY DEFINER to
--      SECURITY INVOKER so RLS is always enforced alongside procedural checks.
--   3. Restrict clinical and invoice approvals strictly to verified Doctors
--      (`role = 'doctor'`), removing `'admin'` from clinical/approval privileges.
--   4. Remove the default `'Cured / Discharged'` assumption from `doctor_approve_case`,
--      requiring the authorizing doctor to explicitly select a clinical status.
--   5. Non-destructive, transactional patch (preserves all tables, policies & records).
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CREATE UNEXPOSED `private` SCHEMA FOR INTERNAL HELPERS & TRIGGERS
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

-- ============================================================================
-- 2. INTERNAL RBAC HELPERS IN `private` (Unreachable via Public REST/RPC API)
-- ============================================================================

CREATE OR REPLACE FUNCTION private.current_staff_role()
RETURNS public.clinic_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private, extensions
AS $$
    SELECT role FROM public.staff_profiles WHERE id = auth.uid() AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION private.is_clinic_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private, extensions
AS $$
    SELECT private.current_staff_role() IS NOT NULL;
$$;

-- Strictly verifies a licensed Doctor identity (`role = 'doctor'`), NOT `'admin'`
CREATE OR REPLACE FUNCTION private.is_doctor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private, extensions
AS $$
    SELECT COALESCE(private.current_staff_role() = 'doctor'::public.clinic_role, false);
$$;

-- Separate helper strictly for read-only audit log oversight by doctors or admins
CREATE OR REPLACE FUNCTION private.can_view_audit_logs()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private, extensions
AS $$
    SELECT COALESCE(private.current_staff_role() IN ('doctor'::public.clinic_role, 'admin'::public.clinic_role), false);
$$;

REVOKE ALL ON FUNCTION private.current_staff_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_staff_role() TO authenticated;

REVOKE ALL ON FUNCTION private.is_clinic_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_clinic_staff() TO authenticated;

REVOKE ALL ON FUNCTION private.is_doctor() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_doctor() TO authenticated;

REVOKE ALL ON FUNCTION private.can_view_audit_logs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_view_audit_logs() TO authenticated;

-- ============================================================================
-- 3. UPDATE RLS POLICIES IN-PLACE TO USE `private.*` HELPERS
-- ============================================================================

-- 3.1 staff_profiles
ALTER POLICY "Profiles readable by authenticated active staff"
    ON public.staff_profiles
    USING (private.is_clinic_staff());

ALTER POLICY "Profiles updatable by self (non-role fields only)"
    ON public.staff_profiles
    USING (id = auth.uid() AND is_active = true)
    WITH CHECK (
        id = auth.uid()
        AND is_active = true
        AND role = private.current_staff_role()
    );

-- 3.2 patients
ALTER POLICY "Patients readable by authenticated staff"
    ON public.patients
    USING (private.is_clinic_staff());

ALTER POLICY "Patients insertable by authenticated staff"
    ON public.patients
    WITH CHECK (private.is_clinic_staff());

ALTER POLICY "Patients updatable by authenticated staff"
    ON public.patients
    USING (private.is_clinic_staff())
    WITH CHECK (private.is_clinic_staff());

-- 3.3 medical_cases
ALTER POLICY "Medical cases readable by clinic staff"
    ON public.medical_cases
    USING (private.is_clinic_staff());

ALTER POLICY "Medical cases insertable by staff"
    ON public.medical_cases
    WITH CHECK (private.is_clinic_staff());

ALTER POLICY "Medical cases updatable by doctors"
    ON public.medical_cases
    USING (private.is_doctor())
    WITH CHECK (private.is_doctor());

-- 3.4 consultations
ALTER POLICY "Consultations readable by clinic staff"
    ON public.consultations
    USING (private.is_clinic_staff());

ALTER POLICY "Consultations insertable by doctors only"
    ON public.consultations
    WITH CHECK (private.is_doctor());

ALTER POLICY "Consultations updatable by doctors only"
    ON public.consultations
    USING (private.is_doctor())
    WITH CHECK (private.is_doctor());

-- 3.5 treatment_progress
ALTER POLICY "Treatment progress readable by clinic staff"
    ON public.treatment_progress
    USING (private.is_clinic_staff());

ALTER POLICY "Treatment progress insertable by doctors"
    ON public.treatment_progress
    WITH CHECK (private.is_doctor());

ALTER POLICY "Treatment progress updatable by doctors"
    ON public.treatment_progress
    USING (private.is_doctor())
    WITH CHECK (private.is_doctor());

-- 3.6 medicines & inventory_transactions
ALTER POLICY "Medicines readable by clinic staff"
    ON public.medicines
    USING (private.is_clinic_staff());

ALTER POLICY "Medicines insertable by clinic staff"
    ON public.medicines
    WITH CHECK (private.is_clinic_staff());

ALTER POLICY "Medicines updatable by clinic staff"
    ON public.medicines
    USING (private.is_clinic_staff())
    WITH CHECK (private.is_clinic_staff());

ALTER POLICY "Inventory transactions readable by clinic staff"
    ON public.inventory_transactions
    USING (private.is_clinic_staff());

ALTER POLICY "Inventory transactions insertable by clinic staff"
    ON public.inventory_transactions
    WITH CHECK (private.is_clinic_staff());

-- 3.7 appointments
ALTER POLICY "Appointments readable by clinic staff"
    ON public.appointments
    USING (private.is_clinic_staff());

ALTER POLICY "Appointments insertable by clinic staff"
    ON public.appointments
    WITH CHECK (private.is_clinic_staff());

ALTER POLICY "Appointments updatable by clinic staff"
    ON public.appointments
    USING (private.is_clinic_staff())
    WITH CHECK (private.is_clinic_staff());

-- 3.8 invoices
ALTER POLICY "Invoices readable by clinic staff"
    ON public.invoices
    USING (private.is_clinic_staff());

ALTER POLICY "Invoices insertable by clinic staff"
    ON public.invoices
    WITH CHECK (
        private.is_clinic_staff() AND (is_approved = false OR private.is_doctor())
    );

ALTER POLICY "Invoices updatable by clinic staff if draft or by doctor"
    ON public.invoices
    USING (
        private.is_clinic_staff() AND (is_approved = false OR private.is_doctor())
    )
    WITH CHECK (
        private.is_clinic_staff() AND (is_approved = false OR private.is_doctor())
    );

-- 3.9 invoice_items
ALTER POLICY "Invoice items readable by clinic staff"
    ON public.invoice_items
    USING (private.is_clinic_staff());

ALTER POLICY "Invoice items insertable if invoice unapproved or by doctor"
    ON public.invoice_items
    WITH CHECK (
        private.is_clinic_staff() AND EXISTS (
            SELECT 1 FROM public.invoices inv
            WHERE inv.id = invoice_items.invoice_id
              AND (inv.is_approved = false OR private.is_doctor())
        )
    );

ALTER POLICY "Invoice items updatable if invoice unapproved or by doctor"
    ON public.invoice_items
    USING (
        private.is_clinic_staff() AND EXISTS (
            SELECT 1 FROM public.invoices inv
            WHERE inv.id = invoice_items.invoice_id
              AND (inv.is_approved = false OR private.is_doctor())
        )
    )
    WITH CHECK (
        private.is_clinic_staff() AND EXISTS (
            SELECT 1 FROM public.invoices inv
            WHERE inv.id = invoice_items.invoice_id
              AND (inv.is_approved = false OR private.is_doctor())
        )
    );

ALTER POLICY "Invoice items deletable if invoice unapproved or by doctor"
    ON public.invoice_items
    USING (
        private.is_clinic_staff() AND EXISTS (
            SELECT 1 FROM public.invoices inv
            WHERE inv.id = invoice_items.invoice_id
              AND (inv.is_approved = false OR private.is_doctor())
        )
    );

-- 3.10 payments
ALTER POLICY "Payments readable by clinic staff"
    ON public.payments
    USING (private.is_clinic_staff());

ALTER POLICY "Payments insertable by clinic staff"
    ON public.payments
    WITH CHECK (private.is_clinic_staff());

-- 3.11 doctor_approvals
ALTER POLICY "Doctor approvals readable by clinic staff"
    ON public.doctor_approvals
    USING (private.is_clinic_staff());

ALTER POLICY "Doctor approvals insertable by doctors only"
    ON public.doctor_approvals
    WITH CHECK (private.is_doctor());

-- 3.12 audit_logs
ALTER POLICY "Audit logs readable by doctors and admins"
    ON public.audit_logs
    USING (private.can_view_audit_logs());

ALTER POLICY "Audit logs insertable by clinic staff"
    ON public.audit_logs
    WITH CHECK (private.is_clinic_staff());

-- ============================================================================
-- 4. MOVE TRIGGER FUNCTIONS TO `private` SCHEMA AS `SECURITY INVOKER`
-- ============================================================================

CREATE OR REPLACE FUNCTION private.check_invoice_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private, extensions
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.is_approved = true AND NOT private.is_doctor() THEN
            RAISE EXCEPTION 'Access Denied: Non-doctor staff cannot create pre-approved invoices.';
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF (OLD.is_approved = true OR NEW.is_approved = true) AND NOT private.is_doctor() THEN
            RAISE EXCEPTION 'Approved and finalized invoices are permanently locked. Only a verified doctor can approve or modify approved records.';
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.check_staff_profile_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private, extensions
AS $$
BEGIN
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'Security Violation: Staff profile primary identity and creation timestamp are immutable.';
    END IF;

    IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active) THEN
        IF private.current_staff_role() IS DISTINCT FROM 'admin' THEN
            RAISE EXCEPTION 'Security Violation: Staff role and active status cannot be modified without administrator authorization.';
        END IF;
    END IF;

    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.prevent_permanent_clinical_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private, extensions
AS $$
BEGIN
    RAISE EXCEPTION 'Permanent deletion of % records is prohibited to preserve clinical and financial history. Use audited corrections or archival (is_archived = true) instead.', TG_TABLE_NAME;
END;
$$;

CREATE OR REPLACE FUNCTION private.audit_clinical_corrections()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private, extensions
AS $$
DECLARE
    actor_uname TEXT;
BEGIN
    SELECT username INTO actor_uname FROM public.staff_profiles WHERE id = auth.uid();
    INSERT INTO public.audit_logs (
        actor_id,
        actor_username,
        action,
        resource_type,
        resource_id,
        details
    ) VALUES (
        auth.uid(),
        COALESCE(actor_uname, 'unknown'),
        'CLINICAL_RECORD_AMENDED',
        TG_TABLE_NAME,
        OLD.id::text,
        jsonb_build_object(
            'before', to_jsonb(OLD),
            'after', to_jsonb(NEW)
        )
    );
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.check_invoice_immutability() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.check_staff_profile_immutability() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.prevent_permanent_clinical_deletion() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.audit_clinical_corrections() FROM PUBLIC, anon, authenticated;

-- Re-bind all 14 table triggers to the unexposed `private.*` trigger functions
CREATE OR REPLACE TRIGGER trg_invoice_immutability
    BEFORE INSERT OR UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION private.check_invoice_immutability();

CREATE OR REPLACE TRIGGER trg_staff_profile_immutability
    BEFORE UPDATE ON public.staff_profiles
    FOR EACH ROW EXECUTE FUNCTION private.check_staff_profile_immutability();

CREATE OR REPLACE TRIGGER trg_no_delete_patients
    BEFORE DELETE ON public.patients
    FOR EACH ROW EXECUTE FUNCTION private.prevent_permanent_clinical_deletion();

CREATE OR REPLACE TRIGGER trg_no_delete_medical_cases
    BEFORE DELETE ON public.medical_cases
    FOR EACH ROW EXECUTE FUNCTION private.prevent_permanent_clinical_deletion();

CREATE OR REPLACE TRIGGER trg_no_delete_consultations
    BEFORE DELETE ON public.consultations
    FOR EACH ROW EXECUTE FUNCTION private.prevent_permanent_clinical_deletion();

CREATE OR REPLACE TRIGGER trg_no_delete_treatment_progress
    BEFORE DELETE ON public.treatment_progress
    FOR EACH ROW EXECUTE FUNCTION private.prevent_permanent_clinical_deletion();

CREATE OR REPLACE TRIGGER trg_no_delete_medicines
    BEFORE DELETE ON public.medicines
    FOR EACH ROW EXECUTE FUNCTION private.prevent_permanent_clinical_deletion();

CREATE OR REPLACE TRIGGER trg_no_delete_inventory_transactions
    BEFORE DELETE ON public.inventory_transactions
    FOR EACH ROW EXECUTE FUNCTION private.prevent_permanent_clinical_deletion();

CREATE OR REPLACE TRIGGER trg_no_delete_invoices
    BEFORE DELETE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION private.prevent_permanent_clinical_deletion();

CREATE OR REPLACE TRIGGER trg_no_delete_payments
    BEFORE DELETE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION private.prevent_permanent_clinical_deletion();

CREATE OR REPLACE TRIGGER trg_no_delete_doctor_approvals
    BEFORE DELETE ON public.doctor_approvals
    FOR EACH ROW EXECUTE FUNCTION private.prevent_permanent_clinical_deletion();

CREATE OR REPLACE TRIGGER trg_no_delete_audit_logs
    BEFORE DELETE ON public.audit_logs
    FOR EACH ROW EXECUTE FUNCTION private.prevent_permanent_clinical_deletion();

CREATE OR REPLACE TRIGGER trg_audit_consultation_amendment
    AFTER UPDATE ON public.consultations
    FOR EACH ROW EXECUTE FUNCTION private.audit_clinical_corrections();

CREATE OR REPLACE TRIGGER trg_audit_progress_amendment
    AFTER UPDATE ON public.treatment_progress
    FOR EACH ROW EXECUTE FUNCTION private.audit_clinical_corrections();

-- Remove the 7 helper/trigger functions from the public API schema
DROP FUNCTION IF EXISTS public.current_staff_role();
DROP FUNCTION IF EXISTS public.is_clinic_staff();
DROP FUNCTION IF EXISTS public.is_doctor();
DROP FUNCTION IF EXISTS public.check_invoice_immutability();
DROP FUNCTION IF EXISTS public.check_staff_profile_immutability();
DROP FUNCTION IF EXISTS public.prevent_permanent_clinical_deletion();
DROP FUNCTION IF EXISTS public.audit_clinical_corrections();

-- ============================================================================
-- 5. HARDEN DOCTOR RPCs (`SECURITY INVOKER` + STRICT `role = 'doctor'` + EXPLICIT CASE STATUS)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.doctor_approve_invoice(
    target_invoice_id UUID,
    clinical_remarks_input TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private, extensions
AS $$
DECLARE
    current_uid UUID;
    staff_rec RECORD;
    inv_rec RECORD;
    sig_stamp TEXT;
BEGIN
    current_uid := auth.uid();
    IF current_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required. Operation rejected.';
    END IF;

    -- Strictly require a verified Doctor identity (`role = 'doctor'`), not `'admin'`
    SELECT * INTO staff_rec FROM public.staff_profiles
    WHERE id = current_uid AND is_active = true;

    IF NOT FOUND OR staff_rec.role IS DISTINCT FROM 'doctor' THEN
        RAISE EXCEPTION 'Access Denied: Only a certified Doctor (role = doctor) can authorize and approve invoices & prescriptions.';
    END IF;

    SELECT * INTO inv_rec FROM public.invoices WHERE id = target_invoice_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found with id: %', target_invoice_id;
    END IF;

    IF inv_rec.is_approved THEN
        RAISE EXCEPTION 'Invoice % has already been approved and locked.', inv_rec.invoice_number;
    END IF;

    sig_stamp := staff_rec.full_name || ' [' || COALESCE(staff_rec.license_number, 'B.H.M.S.') || '] - ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS UTC');

    UPDATE public.invoices
    SET is_approved = true,
        is_draft = false,
        approved_by = current_uid,
        approval_timestamp = now(),
        approval_digital_signature = sig_stamp,
        updated_at = now()
    WHERE id = target_invoice_id;

    INSERT INTO public.doctor_approvals (
        entity_type,
        entity_id,
        doctor_id,
        approval_status,
        clinical_remarks,
        digital_signature_stamp,
        approved_at
    ) VALUES (
        'invoice',
        target_invoice_id,
        current_uid,
        'Approved',
        clinical_remarks_input,
        sig_stamp,
        now()
    );

    INSERT INTO public.audit_logs (
        actor_id,
        actor_username,
        action,
        resource_type,
        resource_id,
        details
    ) VALUES (
        current_uid,
        staff_rec.username,
        'APPROVE_INVOICE',
        'invoices',
        target_invoice_id::text,
        jsonb_build_object(
            'invoice_number', inv_rec.invoice_number,
            'amount', inv_rec.grand_total,
            'signature', sig_stamp
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', target_invoice_id,
        'invoice_number', inv_rec.invoice_number,
        'approved_by', staff_rec.full_name,
        'signature', sig_stamp
    );
END;
$$;

-- Requires explicit `new_case_status` selected by the verified Doctor (never assumes 'Cured / Discharged')
CREATE OR REPLACE FUNCTION public.doctor_approve_case(
    target_case_id UUID,
    new_case_status public.case_status DEFAULT NULL,
    clinical_remarks_input TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private, extensions
AS $$
DECLARE
    current_uid UUID;
    staff_rec RECORD;
    case_rec RECORD;
    sig_stamp TEXT;
BEGIN
    current_uid := auth.uid();
    IF current_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required. Operation rejected.';
    END IF;

    -- Strictly require a verified Doctor identity (`role = 'doctor'`), not `'admin'`
    SELECT * INTO staff_rec FROM public.staff_profiles
    WHERE id = current_uid AND is_active = true;

    IF NOT FOUND OR staff_rec.role IS DISTINCT FROM 'doctor' THEN
        RAISE EXCEPTION 'Access Denied: Only a certified Doctor (role = doctor) can approve or update medical case status.';
    END IF;

    -- Reject missing/default status: Doctor must explicitly choose the clinically appropriate status
    IF new_case_status IS NULL THEN
        RAISE EXCEPTION 'Explicit clinical status required: Please select Active, Follow-up Needed, Under Observation, Cured / Discharged, or Inactive.';
    END IF;

    SELECT * INTO case_rec FROM public.medical_cases WHERE id = target_case_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Medical case not found with id: %', target_case_id;
    END IF;

    sig_stamp := staff_rec.full_name || ' [' || COALESCE(staff_rec.license_number, 'B.H.M.S.') || '] - ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS UTC');

    UPDATE public.medical_cases
    SET status = new_case_status,
        primary_doctor_id = COALESCE(primary_doctor_id, current_uid),
        resolved_at = CASE
            WHEN new_case_status = 'Cured / Discharged' THEN now()
            ELSE NULL
        END,
        updated_at = now()
    WHERE id = target_case_id;

    INSERT INTO public.doctor_approvals (
        entity_type,
        entity_id,
        doctor_id,
        approval_status,
        clinical_remarks,
        digital_signature_stamp,
        approved_at
    ) VALUES (
        'case_discharge',
        target_case_id,
        current_uid,
        'Approved',
        clinical_remarks_input,
        sig_stamp,
        now()
    );

    INSERT INTO public.audit_logs (
        actor_id,
        actor_username,
        action,
        resource_type,
        resource_id,
        details
    ) VALUES (
        current_uid,
        staff_rec.username,
        'APPROVE_MEDICAL_CASE',
        'medical_cases',
        target_case_id::text,
        jsonb_build_object(
            'case_number', case_rec.case_number,
            'previous_status', case_rec.status,
            'new_status', new_case_status,
            'signature', sig_stamp
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'case_id', target_case_id,
        'case_number', case_rec.case_number,
        'status', new_case_status,
        'approved_by', staff_rec.full_name,
        'signature', sig_stamp
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.doctor_amend_progress(
    target_progress_id UUID,
    updated_observation TEXT,
    correction_reason TEXT,
    archive_entry BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private, extensions
AS $$
DECLARE
    current_uid UUID;
    staff_rec RECORD;
    prog_rec RECORD;
BEGIN
    current_uid := auth.uid();
    IF current_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required. Operation rejected.';
    END IF;

    -- Strictly require a verified Doctor identity (`role = 'doctor'`), not `'admin'`
    SELECT * INTO staff_rec FROM public.staff_profiles
    WHERE id = current_uid AND is_active = true;

    IF NOT FOUND OR staff_rec.role IS DISTINCT FROM 'doctor' THEN
        RAISE EXCEPTION 'Access Denied: Only a certified Doctor (role = doctor) can amend or archive treatment progress records.';
    END IF;

    IF correction_reason IS NULL OR length(trim(correction_reason)) < 5 THEN
        RAISE EXCEPTION 'A clinical correction reason (min 5 characters) is mandatory for auditing.';
    END IF;

    SELECT * INTO prog_rec FROM public.treatment_progress WHERE id = target_progress_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Treatment progress record not found: %', target_progress_id;
    END IF;

    UPDATE public.treatment_progress
    SET observation_notes = COALESCE(nullif(trim(updated_observation), ''), observation_notes),
        correction_notes = trim(correction_reason),
        is_archived = COALESCE(archive_entry, is_archived),
        updated_at = now()
    WHERE id = target_progress_id;

    INSERT INTO public.audit_logs (
        actor_id,
        actor_username,
        action,
        resource_type,
        resource_id,
        details
    ) VALUES (
        current_uid,
        staff_rec.username,
        CASE WHEN archive_entry THEN 'ARCHIVE_TREATMENT_PROGRESS' ELSE 'AMEND_TREATMENT_PROGRESS' END,
        'treatment_progress',
        target_progress_id::text,
        jsonb_build_object(
            'previous_observation', prog_rec.observation_notes,
            'updated_observation', COALESCE(nullif(trim(updated_observation), ''), prog_rec.observation_notes),
            'correction_reason', trim(correction_reason),
            'is_archived', COALESCE(archive_entry, prog_rec.is_archived)
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'progress_id', target_progress_id,
        'amended_by', staff_rec.full_name,
        'is_archived', COALESCE(archive_entry, prog_rec.is_archived)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.doctor_approve_invoice(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.doctor_approve_invoice(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.doctor_approve_case(UUID, public.case_status, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.doctor_approve_case(UUID, public.case_status, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.doctor_amend_progress(UUID, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.doctor_amend_progress(UUID, TEXT, TEXT, BOOLEAN) TO authenticated;

REVOKE ALL ON FUNCTION public.register_authorized_staff(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_authorized_staff(TEXT, TEXT, TEXT) TO authenticated;

COMMIT;

