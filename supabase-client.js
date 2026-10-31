/**
 * HomeoCare - Supabase Client & Authentication Service Layer (Phase 7)
 * Clinic: Shri Siddhivinayak Clinic | Dr. Suraj D. Panigrahi, B.H.M.S. (Mum.)
 *
 * Security Architecture:
 * - Browsers cannot directly read `.env` files.
 * - `server.js` reads `.env` on the Node.js backend, blocks any secret or
 *   service_role key, and injects only the public Project URL and Publishable Key.
 * - Fictional `@homeocare.clinic` email synthesis and open public signups are prohibited.
 * - Accounts are administrator-provisioned in Supabase Auth with confirmed emails
 *   and activated via single-use, email-bound, expiring SHA-256 invitation codes
 *   verified by `public.register_authorized_staff()`.
 * - CAPTCHA challenges are generated and verified server-side (`server.js`) with
 *   strict per-IP rate limiting on both login and registration endpoints.
 */

(function(window) {
  "use strict";

const SUPABASE_CDN_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

const SUPABASE_CONFIG = {
  url: window.__HOMEOCARE_SUPABASE_URL || "",
  publishableKey:
    window.__HOMEOCARE_SUPABASE_PUBLISHABLE_KEY ||
    window.__HOMEOCARE_SUPABASE_ANON_KEY ||
    ""
};

let _supabaseClient = null;
let _sdkLoadingPromise = null;

/**
 * Security Guard: Reject secret or service_role keys in browser code.
 */
function isForbiddenBrowserKey(key) {
  if (!key || typeof key !== "string") return false;
  const trimmed = key.trim();
  if (trimmed.startsWith("sb_secret_")) return true;
  const parts = trimmed.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload.role === "service_role" || payload.role === "supabase_admin") {
        return true;
      }
    } catch (_) {
      // Ignore parse errors for non-JWT publishable keys
    }
  }
  return false;
}

const COMMONLY_USED_PASSWORDS = new Set([
  "12345678", "123456789", "1234567890", "password", "passphrase",
  "password123", "password1", "admin123", "administrator", "clinic123",
  "homeocare", "homeocare123", "homeopathy", "doctor123", "reception123",
  "qwerty123", "qwertyuiop", "welcome1", "welcome123", "letmein123",
  "iloveyou1", "sunshine1", "monkey123", "dragon123", "master123",
  "shadow123", "football1", "trustno1", "suraj123", "panigrahi"
]);

function isCommonPassword(password) {
  if (!password) return false;
  const clean = String(password).trim().toLowerCase();
  return COMMONLY_USED_PASSWORDS.has(clean);
}

/**
 * Map authoritative database `staff_profiles` row into the UI session user shape.
 */
function formatStaffSessionUser(authUser, profile) {
  const dbRole = profile.role; // 'doctor' | 'receptionist' | 'admin'
  let uiRoleLabel = "Clinic Staff";
  if (dbRole === "doctor") {
    uiRoleLabel = "Dr. Suraj D. Panigrahi";
  } else if (dbRole === "admin") {
    uiRoleLabel = "Clinic Administrator";
  }

  return {
    id: authUser.id,
    email: authUser.email,
    username: profile.username,
    dbRole: dbRole,
    isDoctor: dbRole === "doctor",
    isAdmin: dbRole === "admin",
    role: uiRoleLabel,
    name:
      profile.full_name ||
      (dbRole === "doctor" ? "Dr. Suraj D. Panigrahi" : profile.username),
    qualification: profile.qualification || "B.H.M.S. (Mum.)",
    licenseNumber: profile.license_number || null,
    loginTime: new Date().toISOString()
  };
}

/**
 * Dynamically load the official @supabase/supabase-js v2 client if not already loaded.
 */
function ensureSupabaseSDK() {
  if (typeof window.supabase !== "undefined" && typeof window.supabase.createClient === "function") {
    return Promise.resolve(window.supabase);
  }
  if (_sdkLoadingPromise) return _sdkLoadingPromise;

  _sdkLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SUPABASE_CDN_URL;
    script.async = true;
    script.onload = () => {
      if (typeof window.supabase !== "undefined" && typeof window.supabase.createClient === "function") {
        resolve(window.supabase);
      } else {
        reject(new Error("Supabase JS SDK loaded but window.supabase.createClient is unavailable."));
      }
    };
    script.onerror = () => reject(new Error("Failed to load official @supabase/supabase-js SDK from CDN."));
    document.head.appendChild(script);
  });

  return _sdkLoadingPromise;
}

/**
 * Fetch public configuration from the local Node.js server (/api/supabase-config)
 * if window globals were not pre-injected.
 */
async function ensureConfigLoaded() {
  if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.publishableKey) {
    return SUPABASE_CONFIG;
  }
  try {
    const res = await fetch("/api/supabase-config", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.url) SUPABASE_CONFIG.url = data.url;
      if (data.publishableKey) SUPABASE_CONFIG.publishableKey = data.publishableKey;
    }
  } catch (_) {
    // Server offline; keep existing config
  }
  return SUPABASE_CONFIG;
}

/**
 * Synchronously return the active client if already initialized, or initialize if SDK is present.
 */
function getSupabase() {
  if (_supabaseClient) return _supabaseClient;

  if (isForbiddenBrowserKey(SUPABASE_CONFIG.publishableKey)) {
    console.error("[HomeoCare Security] Forbidden secret/service_role key rejected in browser.");
    return null;
  }

  if (
    typeof window.supabase !== "undefined" &&
    typeof window.supabase.createClient === "function" &&
    SUPABASE_CONFIG.url &&
    SUPABASE_CONFIG.publishableKey
  ) {
    _supabaseClient = window.supabase.createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.publishableKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          storageKey: "homeocare_supabase_auth_token"
        }
      }
    );
    return _supabaseClient;
  }
  return null;
}

/**
 * Asynchronously initialize the official Supabase client after ensuring config and SDK are loaded.
 */
async function initSupabaseAsync() {
  if (_supabaseClient) return _supabaseClient;
  await ensureConfigLoaded();
  if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.publishableKey) {
    return null;
  }
  if (isForbiddenBrowserKey(SUPABASE_CONFIG.publishableKey)) {
    throw new Error("Security Violation: Never use a secret or service_role key in the browser.");
  }
  await ensureSupabaseSDK();
  return getSupabase();
}

const HomeoCareAPI = {
  isConfigured: () => {
    return Boolean(
      SUPABASE_CONFIG.url &&
        SUPABASE_CONFIG.publishableKey &&
        !isForbiddenBrowserKey(SUPABASE_CONFIG.publishableKey)
    );
  },

  getConfigStatus: () => ({
    url: SUPABASE_CONFIG.url || null,
    hasPublishableKey: Boolean(SUPABASE_CONFIG.publishableKey),
    sdkLoaded: typeof window.supabase !== "undefined",
    clientInitialized: Boolean(_supabaseClient)
  }),

  /**
   * Safe, read-only connectivity verification.
   */
  async verifyConnection() {
    await ensureConfigLoaded();
    if (!SUPABASE_CONFIG.url) {
      return { connected: false, reason: "Missing SUPABASE_URL in .env" };
    }
    if (!SUPABASE_CONFIG.publishableKey) {
      return {
        connected: false,
        url: SUPABASE_CONFIG.url,
        reason: "Missing SUPABASE_PUBLISHABLE_KEY in .env"
      };
    }
    const client = await initSupabaseAsync();
    if (!client) {
      return { connected: false, reason: "Supabase client could not be initialized." };
    }
    const { data, error } = await client.auth.getSession();
    if (error) {
      return { connected: false, url: SUPABASE_CONFIG.url, error: error.message };
    }
    return {
      connected: true,
      url: SUPABASE_CONFIG.url,
      activeSession: Boolean(data?.session),
      message: "Official Supabase client connected and verified safely (read-only auth session check)."
    };
  },

  // --- Real Supabase Auth, Server CAPTCHA & Table-Backed RBAC Services ---
  auth: {
    /**
     * Request a fresh cryptographic CAPTCHA challenge generated on the server.
     */
    async fetchServerCaptcha() {
      const res = await fetch("/api/auth/captcha", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to fetch server CAPTCHA challenge.");
      }
      return await res.json();
    },

    /**
     * Authenticate staff member with username (or administrator-provisioned email) + password,
     * enforced by server-side login rate limiting and verified against `public.staff_profiles`.
     */
    async login(usernameOrEmail, password) {
      const client = await initSupabaseAsync();
      if (!client) throw new Error("Supabase connection is not configured.");

      const identifier = String(usernameOrEmail || "").trim().toLowerCase();
      if (!identifier || !password) {
        throw new Error("Username and password are required.");
      }

      // 1. Server-side rate limit check + username-to-provisioned-email resolution
      let staffTicket = null;
      try {
        staffTicket = localStorage.getItem("homeocare_staff_ticket_" + identifier.toLowerCase());
      } catch (_) {}

      const prepRes = await fetch("/api/auth/prepare-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, staffTicket })
      });
      const prepData = await prepRes.json().catch(() => ({}));
      if (!prepRes.ok || !prepData.ok) {
        throw new Error(prepData.error || "Invalid username or password.");
      }

      // 2. If account is linked to Supabase Auth email, authenticate with GoTrue
      if (prepData.email && client) {
        const { data, error } = await client.auth.signInWithPassword({ email: prepData.email, password });
        if (error) throw error;
        if (!data?.user) {
          throw new Error("Authentication failed. No user returned.");
        }

        // 3. Verify active profile strictly from `public.staff_profiles`
        const { data: profile, error: profileErr } = await client
          .from("staff_profiles")
          .select("*")
          .eq("id", data.user.id)
          .eq("is_active", true)
          .maybeSingle();

        if (profileErr) {
          await client.auth.signOut();
          throw new Error("Could not verify clinic staff profile: " + profileErr.message);
        }

        if (!profile) {
          await client.auth.signOut();
          throw new Error(
            "Access Denied: Account registered, but clinical authorization is pending. Contact Dr. Suraj D. Panigrahi to approve your staff profile."
          );
        }

        // Ensure username -> email binding is cached on local server for future username logins
        if (data.session?.access_token && profile.username) {
          fetch("/api/auth/bind-username", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accessToken: data.session.access_token,
              username: profile.username
            })
          }).catch(() => {});
        }

        return formatStaffSessionUser(data.user, profile);
      }

      // 4. Return staff session user for basic workspace
      if (prepData.user || prepData.approvedUser) {
        return prepData.user || prepData.approvedUser;
      }

      throw new Error("Authentication failed: Unrecognized staff identity.");
    },

    /**
     * Administrator Staff Approval Services (Doctor / Admin Oversight)
     */
    async getPendingStaff() {
      const res = await fetch("/api/auth/admin/pending-staff");
      if (!res.ok) throw new Error("Failed to load pending staff list.");
      return await res.json();
    },

    async approveStaff(username) {
      const res = await fetch("/api/auth/admin/approve-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Approval failed.");
      return data;
    },

    async rejectStaff(username) {
      const res = await fetch("/api/auth/admin/reject-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Rejection failed.");
      return data;
    },

    /**
     * Simplified, secure username-only registration:
     * 1) Server-verified single-use 6-character CAPTCHA
     * 2) Unique username validation
     * 3) Minimum 8-character password & matching confirmation
     * 4) Server-managed internal identity with Supabase Auth
     */
    async register({
      username,
      password,
      confirmPassword,
      challengeId,
      captchaInput
    }) {
      const cleanUsername = String(username || "").trim().toLowerCase();
      const pass = String(password || "");
      const confirmPass = String(confirmPassword || "");

      if (!cleanUsername) {
        throw new Error("Username is required.");
      }
      if (!pass || pass.length < 8) {
        throw new Error("Password must be at least 8 characters long.");
      }
      if (pass !== confirmPass) {
        throw new Error("Password and Confirm Password do not match.");
      }
      if (!captchaInput) {
        throw new Error("Please enter the 6-character security verification code.");
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUsername,
          password: pass,
          confirmPassword: confirmPass,
          challengeId,
          captchaInput
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        const err = new Error(data.error || "Registration failed.");
        if (data.regenerateCaptcha) err.regenerateCaptcha = true;
        throw err;
      }

      if (data.staffTicket) {
        try {
          localStorage.setItem("homeocare_staff_ticket_" + cleanUsername, data.staffTicket);
        } catch (_) {}
      }

      return data;
    },

    /**
     * Activate an administrator-provisioned Supabase Auth account using:
     * 1) Server-verified single-use CAPTCHA & IP rate-limiting (`/api/auth/verify-registration`)
     * 2) Administrator-provisioned email + password authentication
     * 3) Database-verified single-use, expiring, email-bound SHA-256 invitation code (`register_authorized_staff`)
     */
    async registerWithInviteCode({
      username,
      fullName,
      email,
      password,
      inviteCode,
      challengeId,
      captchaInput
    }) {
      const client = await initSupabaseAsync();
      if (!client) throw new Error("Supabase connection is not configured.");

      const cleanUsername = String(username || "").trim().toLowerCase();
      const cleanEmail = String(email || "").trim().toLowerCase();
      const cleanInvite = String(inviteCode || "").trim();
      const cleanFullName = String(fullName || cleanUsername).trim();

      if (!password || password.length < 8) {
        throw new Error("Password must be at least 8 characters long.");
      }

      if (isCommonPassword(password)) {
        throw new Error(
          "This password is too common or easily compromised. Please choose a more secure password."
        );
      }

      // 1. Server-side CAPTCHA verification + IP rate limiting (cannot be bypassed in browser JS)
      const verifyRes = await fetch("/api/auth/verify-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId,
          captchaInput,
          inviteCode: cleanInvite,
          email: cleanEmail,
          username: cleanUsername
        })
      });
      const verifyData = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok || !verifyData.ok) {
        throw new Error(verifyData.error || "Server registration verification failed.");
      }

      // 2. Authenticate the administrator-provisioned Supabase Auth account
      const { data: signInData, error: signInErr } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (signInErr || !signInData?.user || !signInData?.session) {
        throw new Error(
          "Registration requires an administrator-provisioned Supabase Auth account. Verify your provisioned email and password, or contact the Clinic Administrator."
        );
      }

      // 3. Redeem the single-use, email-bound SHA-256 invitation code via database RPC
      const { data: rpcData, error: rpcError } = await client.rpc("register_authorized_staff", {
        invite_code_input: cleanInvite,
        desired_username: cleanUsername,
        desired_full_name: cleanFullName
      });

      if (rpcError) {
        await client.auth.signOut();
        throw new Error(rpcError.message || "Invalid, expired, or already-used clinic authorization code.");
      }

      // 4. Bind the activated username to the administrator-provisioned email on the server
      await fetch("/api/auth/bind-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: signInData.session.access_token,
          username: cleanUsername
        })
      }).catch(() => {});

      // 5. Fetch authoritative staff_profiles record
      const { data: profile, error: profileErr } = await client
        .from("staff_profiles")
        .select("*")
        .eq("id", signInData.user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (profileErr || !profile) {
        return formatStaffSessionUser(signInData.user, {
          username: rpcData?.username || cleanUsername,
          full_name: rpcData?.full_name || cleanFullName,
          role: rpcData?.role || "receptionist"
        });
      }

      return formatStaffSessionUser(signInData.user, profile);
    },

    /**
     * Restore and verify an existing Supabase session across page refreshes.
     */
    async restoreSession() {
      const client = await initSupabaseAsync();
      if (!client) return null;

      const { data, error } = await client.auth.getSession();
      if (error || !data?.session?.user) {
        return null;
      }

      const authUser = data.session.user;
      const { data: profile, error: profileErr } = await client
        .from("staff_profiles")
        .select("*")
        .eq("id", authUser.id)
        .eq("is_active", true)
        .maybeSingle();

      if (profileErr || !profile) {
        await client.auth.signOut();
        return null;
      }

      return formatStaffSessionUser(authUser, profile);
    },

    /**
     * Terminate the Supabase session and clear local auth state.
     */
    async logout() {
      const client = await initSupabaseAsync();
      if (client) {
        await client.auth.signOut();
      }
    },

    async getSession() {
      const client = await initSupabaseAsync();
      if (!client) return null;
      const { data } = await client.auth.getSession();
      return data?.session || null;
    }
  },

  // --- Patients & Clinical Cases ---
  patients: {
    async listAll() {
      const client = await initSupabaseAsync();
      if (!client) return null;
      const { data, error } = await client
        .from("patients")
        .select(`
          *,
          medical_cases (
            id, case_number, chief_complaint, status, started_at,
            consultations (*)
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },

    async create(patientData) {
      const client = await initSupabaseAsync();
      if (!client) return null;
      const { data, error } = await client.from("patients").insert(patientData).select().single();
      if (error) throw error;
      return data;
    }
  },

  // --- Clinical Case & Progress Approvals (Doctor-Only RPCs) ---
  clinical: {
    async doctorApproveCase(caseId, explicitStatus, remarks = "") {
      const client = await initSupabaseAsync();
      if (!client) throw new Error("Supabase connection is not configured.");
      if (!explicitStatus) {
        throw new Error(
          "Explicit clinical status is required (Active, Follow-up Needed, Under Observation, Cured / Discharged, or Inactive)."
        );
      }
      const { data, error } = await client.rpc("doctor_approve_case", {
        target_case_id: caseId,
        new_case_status: explicitStatus,
        clinical_remarks_input: remarks
      });
      if (error) throw error;
      return data;
    },

    async doctorAmendProgress(progressId, updatedObservation, correctionReason, archiveEntry = false) {
      const client = await initSupabaseAsync();
      if (!client) throw new Error("Supabase connection is not configured.");
      const { data, error } = await client.rpc("doctor_amend_progress", {
        target_progress_id: progressId,
        updated_observation: updatedObservation,
        correction_reason: correctionReason,
        archive_entry: Boolean(archiveEntry)
      });
      if (error) throw error;
      return data;
    }
  },

  // --- Invoices & Billing ---
  invoices: {
    async listAll() {
      const client = await initSupabaseAsync();
      if (!client) return null;
      const { data, error } = await client
        .from("invoices")
        .select(`
          *,
          items:invoice_items (*)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },

    async doctorApprove(invoiceId, remarks = "") {
      const client = await initSupabaseAsync();
      if (!client) throw new Error("Supabase connection is not configured.");
      const { data, error } = await client.rpc("doctor_approve_invoice", {
        target_invoice_id: invoiceId,
        clinical_remarks_input: remarks
      });
      if (error) throw error;
      return data;
    }
  }
};

window.HomeoCareAPI = HomeoCareAPI;

// Pre-warm SDK & config in background if configured
ensureConfigLoaded().then((cfg) => {
  if (cfg.url && cfg.publishableKey) {
    initSupabaseAsync().catch(() => {});
  }
});

})(window);
