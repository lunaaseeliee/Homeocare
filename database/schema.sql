-- ============================================================================
-- HOMEOCARE CLINICAL MANAGEMENT SYSTEM - PHASE 7 DATABASE SCHEMA
-- Clinic: Shri Siddhivinayak Clinic | Dr. Suraj D. Panigrahi, B.H.M.S. (Mum.)
-- Database: Supabase PostgreSQL (Postgres 15+)
-- Description: Comprehensive relational schema, UUIDs, RBAC, Row Level Security,
--              Doctor-only server approvals, immutable audit logs, and returning case tracking.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ENUMS & ROLES
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE clinic_role AS ENUM ('doctor', 'receptionist', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE miasm_type AS ENUM ('Psoric', 'Sycotic', 'Tubercular', 'Syphilitic', 'Mixed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE case_status AS ENUM ('Active', 'Follow-up Needed', 'Under Observation', 'Cured / Discharged', 'Inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE visit_type AS ENUM ('First Consultation', 'Follow-up Visit', 'Emergency Case', 'Routine Checkup');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE visit_status AS ENUM ('Scheduled', 'In Consultation', 'Completed', 'Cancelled', 'No Show');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('Paid', 'Pending', 'Partially Paid', 'Refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('UPI / QR Code', 'Cash', 'Credit/Debit Card', 'Net Banking', 'Cheque');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE medicine_form AS ENUM ('Dilution', 'Globules', 'Trituration', 'Biochemic', 'Mother Tincture', 'Ointment', 'Syrup');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. CLINIC STAFF AUTHORIZATION & PROFILES
-- ============================================================================

-- Table for secret authorization tokens to restrict registration to authorized clinic personnel
CREATE TABLE IF NOT EXISTS public.staff_authorization_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of single-use registration key
    assigned_role clinic_role NOT NULL,
    target_email TEXT, -- Administrator-provisioned email bound to this token
    max_uses INT NOT NULL DEFAULT 1,
    uses_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_single_use_invite_code CHECK (max_uses = 1 AND uses_count >= 0 AND uses_count <= 1),
    CONSTRAINT chk_invite_expiry_required CHECK (expires_at IS NOT NULL)
);

-- Authorized staff & doctor profiles linked directly to Supabase auth.users
CREATE TABLE IF NOT EXISTS public.staff_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role clinic_role NOT NULL DEFAULT 'receptionist',
    license_number TEXT, -- e.g. B.H.M.S. Council Registration No.
    qualification TEXT DEFAULT 'B.H.M.S. (Mum.)',
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Unexposed private schema for internal RBAC helpers & triggers (hidden from PostgREST API)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

-- Helper functions for RBAC in RLS policies (placed in `private` so they are never exposed as public RPCs)
-- SECURITY NOTE: Roles are read strictly from public.staff_profiles (table-backed RBAC).
-- Editable JWT user_metadata / raw_user_meta_data is NEVER trusted or consulted.
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

-- ============================================================================
-- 3. PATIENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_patient_id TEXT UNIQUE NOT NULL, -- e.g. SSC-2026-1001
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    age INT CHECK (age >= 0 AND age <= 130),
    gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
    address TEXT,
    primary_miasm miasm_type DEFAULT 'Psoric',
    constitutional_type TEXT,
    blood_group TEXT,
    allergies TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    archived_by UUID REFERENCES public.staff_profiles(id),
    archive_reason TEXT,
    created_by UUID REFERENCES public.staff_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON public.patients(clinic_patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_name ON public.patients(full_name);

-- ============================================================================
-- 4. MEDICAL CASES (Preserves previous episodes when patient returns)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.medical_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_number TEXT UNIQUE NOT NULL, -- e.g. CASE-SSC-2026-001
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
    chief_complaint TEXT NOT NULL,
    onset_duration TEXT,
    miasmatic_assessment miasm_type,
    constitutional_analysis TEXT,
    status case_status NOT NULL DEFAULT 'Active',
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMPTZ,
    primary_doctor_id UUID REFERENCES public.staff_profiles(id),
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    correction_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_cases_patient ON public.medical_cases(patient_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON public.medical_cases(status);

-- ============================================================================
-- 5. CONSULTATIONS & SYMPTOM RUBRICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.consultations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES public.medical_cases(id) ON DELETE RESTRICT,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
    consultation_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    visit_type visit_type NOT NULL DEFAULT 'Follow-up Visit',
    duration_mins INT DEFAULT 45,
    doctor_id UUID NOT NULL REFERENCES public.staff_profiles(id),
    vitals JSONB DEFAULT '{}'::jsonb, -- e.g. {"bp": "120/80", "pulse": 76, "temp": "98.4 F"}
    clinical_notes TEXT,
    repertorial_rubrics JSONB DEFAULT '[]'::jsonb, -- Repertorized rubrics, intensities & modalities
    totality_of_symptoms TEXT,
    prescribed_remedy TEXT,
    remedy_potency TEXT, -- e.g. 200 CH, 1M, 30 CH
    dosage_instructions TEXT,
    diet_lifestyle_advice TEXT DEFAULT 'Strict avoidance of raw onion, garlic, coffee, and strong camphorated products.',
    next_followup_date DATE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    correction_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_consultations_case ON public.consultations(case_id);
CREATE INDEX IF NOT EXISTS idx_consultations_patient ON public.consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_date ON public.consultations(consultation_date DESC);

-- ============================================================================
-- 6. TREATMENT PROGRESS & FOLLOW-UPS (Hering's Law of Cure Tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.treatment_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE RESTRICT,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
    case_id UUID NOT NULL REFERENCES public.medical_cases(id) ON DELETE RESTRICT,
    progress_date DATE NOT NULL DEFAULT CURRENT_DATE,
    observation_notes TEXT NOT NULL,
    aggravation_reported BOOLEAN DEFAULT FALSE,
    amelioration_reported BOOLEAN DEFAULT TRUE,
    direction_of_cure TEXT, -- In accordance with Hering's Law of Cure
    cure_index_score NUMERIC(5,2) CHECK (cure_index_score >= 0 AND cure_index_score <= 100),
    evaluated_by UUID NOT NULL REFERENCES public.staff_profiles(id),
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    correction_notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_progress_patient ON public.treatment_progress(patient_id);
CREATE INDEX IF NOT EXISTS idx_progress_case ON public.treatment_progress(case_id);

-- ============================================================================
-- 7. MEDICINES & DISPENSARY INVENTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.medicines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL, -- e.g. Arsenicum Album, Lycopodium Clavatum
    potency TEXT NOT NULL, -- e.g. 30 CH, 200 CH, 1M, Q
    form medicine_form NOT NULL DEFAULT 'Dilution',
    current_stock_qty INT NOT NULL DEFAULT 0 CHECK (current_stock_qty >= 0),
    minimum_threshold_qty INT NOT NULL DEFAULT 5,
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    manufacturer TEXT,
    batch_number TEXT,
    expiry_date DATE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_medicine_potency_form UNIQUE (name, potency, form)
);

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE RESTRICT,
    change_qty INT NOT NULL, -- positive for restock, negative for dispensed
    balance_after_qty INT NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('Restock', 'Dispensed', 'Adjustment', 'Expired')),
    related_invoice_id UUID,
    performed_by UUID NOT NULL REFERENCES public.staff_profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_inventory_med ON public.inventory_transactions(medicine_id);

-- ============================================================================
-- 8. SCHEDULES & APPOINTMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
    doctor_id UUID REFERENCES public.staff_profiles(id),
    scheduled_at TIMESTAMPTZ NOT NULL,
    estimated_duration_mins INT DEFAULT 30,
    visit_type visit_type NOT NULL DEFAULT 'Follow-up Visit',
    status visit_status NOT NULL DEFAULT 'Scheduled',
    notes TEXT,
    created_by UUID NOT NULL REFERENCES public.staff_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_appointments_schedule ON public.appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_id);

-- ============================================================================
-- 9. INVOICES & BILLING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT UNIQUE NOT NULL, -- e.g. SSC-INV-2026-0001
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
    case_id UUID REFERENCES public.medical_cases(id) ON DELETE RESTRICT,
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE RESTRICT,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    consult_date DATE NOT NULL DEFAULT CURRENT_DATE,
    followup_date DATE,
    
    -- Clinical snapshot on invoice
    chief_complaint TEXT,
    diagnosis TEXT,
    treatment_plan TEXT,
    consult_duration TEXT DEFAULT '45 Mins',
    treatment_duration_days INT DEFAULT 30,
    show_clinical_details BOOLEAN DEFAULT TRUE,
    doctor_note TEXT,

    -- Financial Breakdown
    consult_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    medicines_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    other_charges NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    remaining_balance NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    
    payment_method payment_method DEFAULT 'UPI / QR Code',
    payment_status payment_status NOT NULL DEFAULT 'Pending',

    -- Draft & Approval Lifecycle
    is_draft BOOLEAN NOT NULL DEFAULT TRUE,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by UUID REFERENCES public.staff_profiles(id),
    approval_timestamp TIMESTAMPTZ,
    approval_digital_signature TEXT, -- e.g. Hash or Doctor Qualification Stamped String
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,

    created_by UUID NOT NULL REFERENCES public.staff_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_invoices_patient ON public.invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(payment_status);

-- Itemized line items for invoices
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    description TEXT NOT NULL,
    potency TEXT,
    qty INT NOT NULL DEFAULT 1 CHECK (qty > 0),
    days_supply INT DEFAULT 30,
    rate NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    item_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_inv ON public.invoice_items(invoice_id);

-- ============================================================================
-- 10. PAYMENTS (Tracks individual transactions against invoices)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    payment_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    method payment_method NOT NULL DEFAULT 'UPI / QR Code',
    transaction_reference TEXT, -- UPI UTR / Card transaction ID / Cheque No.
    received_by UUID NOT NULL REFERENCES public.staff_profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);

-- ============================================================================
-- 11. DOCTOR APPROVALS (Formal sign-off & prescription validation audit)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.doctor_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('invoice', 'prescription', 'case_discharge')),
    entity_id UUID NOT NULL,
    doctor_id UUID NOT NULL REFERENCES public.staff_profiles(id),
    approval_status TEXT NOT NULL DEFAULT 'Approved' CHECK (approval_status IN ('Approved', 'Rejected', 'Revoked')),
    clinical_remarks TEXT,
    digital_signature_stamp TEXT NOT NULL,
    ip_address TEXT,
    approved_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_approvals_entity ON public.doctor_approvals(entity_type, entity_id);

-- ============================================================================
-- 12. AUDIT LOGS (Immutable security and operational access record)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES public.staff_profiles(id),
    actor_username TEXT NOT NULL,
    action TEXT NOT NULL, -- e.g. 'LOGIN', 'LOGOUT', 'CREATE_PATIENT', 'APPROVE_INVOICE'
    resource_type TEXT NOT NULL, -- e.g. 'patients', 'invoices', 'prescriptions'
    resource_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.audit_logs(actor_id);

-- ============================================================================
-- 13. SERVER-SIDE DOCTOR APPROVAL FUNCTIONS (SECURITY INVOKER + STRICT DOCTOR CHECK)
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
    
    -- Verify caller is logged in
    IF current_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required. Operation rejected.';
    END IF;

    -- Strictly require a verified Doctor identity (`role = 'doctor'`), not `'admin'`
    SELECT * INTO staff_rec FROM public.staff_profiles 
    WHERE id = current_uid AND is_active = true;

    IF NOT FOUND OR staff_rec.role IS DISTINCT FROM 'doctor' THEN
        RAISE EXCEPTION 'Access Denied: Only a certified Doctor (role = doctor) can authorize and approve invoices & prescriptions.';
    END IF;

    -- Fetch invoice
    SELECT * INTO inv_rec FROM public.invoices WHERE id = target_invoice_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found with id: %', target_invoice_id;
    END IF;

    IF inv_rec.is_approved THEN
        RAISE EXCEPTION 'Invoice % has already been approved and locked.', inv_rec.invoice_number;
    END IF;

    sig_stamp := staff_rec.full_name || ' [' || COALESCE(staff_rec.license_number, 'B.H.M.S.') || '] - ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS UTC');

    -- Update invoice to approved
    UPDATE public.invoices
    SET is_approved = true,
        is_draft = false,
        approved_by = current_uid,
        approval_timestamp = now(),
        approval_digital_signature = sig_stamp,
        updated_at = now()
    WHERE id = target_invoice_id;

    -- Insert into formal doctor_approvals table
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

    -- Log action in immutable audit log
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
        resolved_at = CASE WHEN new_case_status = 'Cured / Discharged' THEN now() ELSE NULL END,
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

-- ============================================================================
-- 14. RESTRICTED REGISTRATION & AUDITED CORRECTION RPCs
-- ============================================================================

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

    SELECT email, email_confirmed_at
      INTO caller_email, caller_confirmed
      FROM auth.users
     WHERE id = current_uid;

    IF caller_email IS NULL OR caller_confirmed IS NULL THEN
        RAISE EXCEPTION 'Account verification required: Only confirmed administrator-provisioned accounts can activate a clinic staff profile.';
    END IF;

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

    -- Reject if profile already exists (prevents role re-escalation)
    IF EXISTS (SELECT 1 FROM public.staff_profiles WHERE id = current_uid) THEN
        RAISE EXCEPTION 'Staff profile already exists for this account. Role or status changes require administrator authorization.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.staff_profiles WHERE lower(username) = clean_uname) THEN
        RAISE EXCEPTION 'Username "%" is already registered. Please choose a different username.', clean_uname;
    END IF;

    -- Calculate SHA-256 of provided single-use code
    code_hash_calc := encode(digest(trim(invite_code_input), 'sha256'), 'hex');

    -- Atomically lock and verify matching unconsumed single-use invite token
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

    -- Immediately consume and deactivate single-use token
    UPDATE public.staff_authorization_codes
    SET uses_count = 1,
        is_active = false
    WHERE id = token_rec.id;

    -- Insert new staff profile (role assigned strictly from server token, never from user_metadata)
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

    -- Audit log
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

-- Audited Clinical Progress Amendment / Soft-Archive RPC (Doctor Only)
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

-- Restrict EXECUTE permissions on all helper & RPC functions (revoke from PUBLIC & anon)
REVOKE ALL ON FUNCTION private.current_staff_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_staff_role() TO authenticated;

REVOKE ALL ON FUNCTION private.is_clinic_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_clinic_staff() TO authenticated;

REVOKE ALL ON FUNCTION private.is_doctor() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_doctor() TO authenticated;

REVOKE ALL ON FUNCTION private.can_view_audit_logs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_view_audit_logs() TO authenticated;

REVOKE ALL ON FUNCTION public.doctor_approve_invoice(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.doctor_approve_invoice(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.doctor_approve_case(UUID, public.case_status, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.doctor_approve_case(UUID, public.case_status, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.register_authorized_staff(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_authorized_staff(TEXT, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.doctor_amend_progress(UUID, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.doctor_amend_progress(UUID, TEXT, TEXT, BOOLEAN) TO authenticated;

-- ============================================================================
-- 15. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on every table
ALTER TABLE public.staff_authorization_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 15.0 STAFF AUTHORIZATION CODES (Deny-all: accessed only via SECURITY DEFINER RPCs)
DO $$ BEGIN
    CREATE POLICY "Authorization codes not directly accessible"
        ON public.staff_authorization_codes FOR ALL
        TO authenticated
        USING (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 15.1 STAFF PROFILES
DO $$ BEGIN
    CREATE POLICY "Profiles readable by authenticated active staff"
        ON public.staff_profiles FOR SELECT
        TO authenticated
        USING (private.is_clinic_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Uses SECURITY DEFINER helper private.current_staff_role() instead of a direct subquery
-- on public.staff_profiles to prevent PostgreSQL 42P17 RLS infinite recursion.
DO $$ BEGIN
    CREATE POLICY "Profiles updatable by self (non-role fields only)"
        ON public.staff_profiles FOR UPDATE
        TO authenticated
        USING (id = auth.uid() AND is_active = true)
        WITH CHECK (
            id = auth.uid()
            AND is_active = true
            AND role = private.current_staff_role()
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 15.2 PATIENTS (Permanent records: no DELETE policy; use is_archived for archival)
DO $$ BEGIN
    CREATE POLICY "Patients readable by authenticated staff"
        ON public.patients FOR SELECT
        TO authenticated
        USING (private.is_clinic_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Patients insertable by authenticated staff"
        ON public.patients FOR INSERT
        TO authenticated
        WITH CHECK (private.is_clinic_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Patients updatable by authenticated staff"
        ON public.patients FOR UPDATE
        TO authenticated
        USING (private.is_clinic_staff())
        WITH CHECK (private.is_clinic_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 15.3 MEDICAL CASES (Permanent case history: no DELETE policy)
DO $$ BEGIN
    CREATE POLICY "Medical cases readable by clinic staff"
        ON public.medical_cases FOR SELECT
        TO authenticated
        USING (private.is_clinic_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Medical cases insertable by staff"
        ON public.medical_cases FOR INSERT
        TO authenticated
        WITH CHECK (private.is_clinic_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Medical cases updatable by doctors"
        ON public.medical_cases FOR UPDATE
        TO authenticated
        USING (private.is_doctor())
        WITH CHECK (private.is_doctor());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 15.4 CONSULTATIONS & CLINICAL NOTES (Permanent consultation history: no DELETE policy)
DO $$ BEGIN
    CREATE POLICY "Consultations readable by clinic staff"
        ON public.consultations FOR SELECT
        TO authenticated
        USING (private.is_clinic_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Consultations insertable by doctors only"
        ON public.consultations FOR INSERT
        TO authenticated
        WITH CHECK (private.is_doctor());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Consultations updatable by doctors only"
        ON public.consultations FOR UPDATE
        TO authenticated
        USING (private.is_doctor())
        WITH CHECK (private.is_doctor());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 15.5 TREATMENT PROGRESS (Permanent progress history: no DELETE policy; audited corrections only)
DO $$ BEGIN
    CREATE POLICY "Treatment progress readable by clinic staff"
        ON public.treatment_progress FOR SELECT
        TO authenticated
        USING (private.is_clinic_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Treatment progress insertable by doctors"
        ON public.treatment_progress FOR INSERT
        TO authenticated
        WITH CHECK (private.is_doctor());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Treatment progress updatable by doctors"
        ON public.treatment_progress FOR UPDATE
        TO authenticated
        USING (private.is_doctor())
        WITH CHECK (private.is_doctor());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 15.6 MEDICINES & DISPENSARY (Explicit SELECT/INSERT/UPDATE only; no DELETE policy)
DO $$ BEGIN
    CREATE POLICY "Medicines readable by clinic staff"
        ON public.medicines FOR SELECT
        TO authenticated
        USING (private.is_clinic_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Medicines insertable by clinic staff"
        ON public.medicines FOR INSERT
        TO authenticated
        WITH CHECK (private.is_clinic_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Medicines updatable by clinic staff"
        ON public.medicines FOR UPDATE
        TO authenticated
        USING (private.is_clinic_staff())
        WITH CHECK (private.is_clinic_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Inventory transactions readable by clinic staff"
        ON public.inventory_transactions FOR SELECT
        TO authenticated
        USING (private.is_clinic_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Inventory transactions insertable by clinic staff"
        ON public.inventory_transactions FOR INSERT
        TO authenticated
        WITH CHECK (private.is_clinic_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 15.7 APPOINTMENTS (Explicit SELECT/INSERT/UPDATE only; no DELETE policy — cancel via status)
DO $$ BEGIN
    CREATE POLICY "Appointments readable by clinic staff"
        ON public.appointments FOR SELECT
        TO authenticated
        USING (private.is_clinic_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Appointments insertable by clinic staff"
        ON public.appointments FOR INSERT
        TO authenticated
        WITH CHECK (private.is_clinic_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Appointments updatable by clinic staff"
        ON public.appointments FOR UPDATE
        TO authenticated
        USING (private.is_clinic_staff())
        WITH CHECK (private.is_clinic_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 15.8 INVOICES (Permanent billing history: no DELETE policy)
DO $$ BEGIN
    CREATE POLICY "Invoices readable by clinic staff"
        ON public.invoices FOR SELECT
        TO authenticated
        USING (private.is_clinic_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Non-doctor staff can only insert unapproved draft/pending invoices
DO $$ BEGIN
    CREATE POLICY "Invoices insertable by clinic staff"
        ON public.invoices FOR INSERT
        TO authenticated
        WITH CHECK (
            private.is_clinic_staff() AND (is_approved = false OR private.is_doctor())
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Invoices can only be modified if not approved yet, OR by Doctor
DO $$ BEGIN
    CREATE POLICY "Invoices updatable by clinic staff if draft or by doctor"
        ON public.invoices FOR UPDATE
        TO authenticated
        USING (
            private.is_clinic_staff() AND (is_approved = false OR private.is_doctor())
        )
        WITH CHECK (
            private.is_clinic_staff() AND (is_approved = false OR private.is_doctor())
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 15.9 INVOICE ITEMS (Locked against non-doctor edits once parent invoice is approved)
DO $$ BEGIN
    CREATE POLICY "Invoice items readable by clinic staff"
        ON public.invoice_items FOR SELECT
        TO authenticated
        USING (private.is_clinic_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Invoice items insertable if invoice unapproved or by doctor"
        ON public.invoice_items FOR INSERT
        TO authenticated
        WITH CHECK (
            private.is_clinic_staff() AND EXISTS (
                SELECT 1 FROM public.invoices inv
                WHERE inv.id = invoice_items.invoice_id
                  AND (inv.is_approved = false OR private.is_doctor())
            )
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Invoice items updatable if invoice unapproved or by doctor"
        ON public.invoice_items FOR UPDATE
        TO authenticated
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
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Invoice items deletable if invoice unapproved or by doctor"
        ON public.invoice_items FOR DELETE
        TO authenticated
        USING (
            private.is_clinic_staff() AND EXISTS (
                SELECT 1 FROM public.invoices inv
                WHERE inv.id = invoice_items.invoice_id
                  AND (inv.is_approved = false OR private.is_doctor())
            )
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 15.10 PAYMENTS
DO $$ BEGIN
    CREATE POLICY "Payments readable by clinic staff"
        ON public.payments FOR SELECT
        TO authenticated
        USING (private.is_clinic_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Payments insertable by clinic staff"
        ON public.payments FOR INSERT
        TO authenticated
        WITH CHECK (private.is_clinic_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 15.11 DOCTOR APPROVALS
DO $$ BEGIN
    CREATE POLICY "Doctor approvals readable by clinic staff"
        ON public.doctor_approvals FOR SELECT
        TO authenticated
        USING (private.is_clinic_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Doctor approvals insertable by doctors only"
        ON public.doctor_approvals FOR INSERT
        TO authenticated
        WITH CHECK (private.is_doctor());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 15.12 AUDIT LOGS (Immutable: read-only by admin/doctor, write via system trigger/RPC)
DO $$ BEGIN
    CREATE POLICY "Audit logs readable by doctors and admins"
        ON public.audit_logs FOR SELECT
        TO authenticated
        USING (private.can_view_audit_logs());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Audit logs insertable by clinic staff"
        ON public.audit_logs FOR INSERT
        TO authenticated
        WITH CHECK (private.is_clinic_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 16. IMMUTABILITY TRIGGER: PREVENT MODIFICATION OR SPOOFED APPROVAL OF INVOICES
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
        -- Prevent non-doctors from modifying already-approved invoices OR marking an invoice approved
        IF (OLD.is_approved = true OR NEW.is_approved = true) AND NOT private.is_doctor() THEN
            RAISE EXCEPTION 'Approved and finalized invoices are permanently locked. Only a verified doctor can approve or modify approved records.';
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_invoice_immutability
    BEFORE INSERT OR UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION private.check_invoice_immutability();

-- ============================================================================
-- 17. ROLE ESCALATION GUARD: PREVENT SELF-ESCALATION ON STAFF PROFILES
-- ============================================================================

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

CREATE OR REPLACE TRIGGER trg_staff_profile_immutability
    BEFORE UPDATE ON public.staff_profiles
    FOR EACH ROW
    EXECUTE FUNCTION private.check_staff_profile_immutability();

-- ============================================================================
-- 18. PERMANENT HISTORY PROTECTION: BLOCK HARD-DELETE ON CLINICAL & BILLING TABLES
-- ============================================================================

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

-- ============================================================================
-- 19. AUDITED CLINICAL CORRECTIONS TRIGGER (CONSULTATIONS & TREATMENT PROGRESS)
-- ============================================================================

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

CREATE OR REPLACE TRIGGER trg_audit_consultation_amendment
    AFTER UPDATE ON public.consultations
    FOR EACH ROW EXECUTE FUNCTION private.audit_clinical_corrections();

CREATE OR REPLACE TRIGGER trg_audit_progress_amendment
    AFTER UPDATE ON public.treatment_progress
    FOR EACH ROW EXECUTE FUNCTION private.audit_clinical_corrections();

-- Restrict EXECUTE permissions on internal trigger functions from PUBLIC, anon, and authenticated
REVOKE ALL ON FUNCTION private.check_invoice_immutability() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.check_staff_profile_immutability() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.prevent_permanent_clinical_deletion() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.audit_clinical_corrections() FROM PUBLIC, anon, authenticated;




