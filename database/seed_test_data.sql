-- ============================================================================
-- HOMEOCARE PHASE 7 - SEED DATA (Authorization Tokens & Dispensary Stock)
-- Clinic: Shri Siddhivinayak Clinic | Dr. Suraj D. Panigrahi, B.H.M.S. (Mum.)
-- IMPORTANT: Invite code cleartext values are NOT stored here.
--            Distribute them securely to authorized personnel only.
-- ============================================================================

-- 1. Pre-computed Registration Authorization Token Hashes (SHA-256)
--    Cleartext codes must be distributed via secure channel (not committed to source).
INSERT INTO public.staff_authorization_codes (
    code_hash,
    assigned_role,
    max_uses,
    uses_count,
    is_active,
    notes
) VALUES 
(
    'df78d40d447d32081afac9ccc9f04ea44a58e78bb7fe68ffd39cb8307691002c',
    'doctor',
    2,
    0,
    true,
    'Doctor registration token — distribute securely to Dr. Suraj D. Panigrahi'
),
(
    '344d2b197fd4ac4cb64fb4789363c9ee0c5b3d5912a0cd703cdead07a2c9ce26',
    'receptionist',
    10,
    0,
    true,
    'Receptionist registration token — distribute securely to authorized clinic staff'
)
ON CONFLICT (code_hash) DO NOTHING;

-- 2. Sample Dispensary Stock (Medicines & Potencies — no patient data)
INSERT INTO public.medicines (name, potency, form, current_stock_qty, minimum_threshold_qty, unit_price, manufacturer)
VALUES 
('Arsenicum Album', '200 CH', 'Dilution', 45, 5, 120.00, 'Dr. Reckeweg & Co.'),
('Nux Vomica', '30 CH', 'Dilution', 60, 5, 110.00, 'SBL Pvt. Ltd.'),
('Lycopodium Clavatum', '1M', 'Dilution', 30, 5, 150.00, 'Dr. Reckeweg & Co.'),
('Thuja Occidentalis', '200 CH', 'Dilution', 50, 5, 125.00, 'Schwabe India'),
('Arnica Montana', 'Q', 'Mother Tincture', 25, 5, 210.00, 'SBL Pvt. Ltd.'),
('Pulsatilla Nigricans', '30 CH', 'Globules', 75, 10, 85.00, 'SBL Pvt. Ltd.'),
('Silicea', '6X', 'Biochemic', 80, 10, 95.00, 'Schwabe India')
ON CONFLICT ON CONSTRAINT uq_medicine_potency_form DO NOTHING;
