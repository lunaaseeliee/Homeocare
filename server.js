const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STAFF_DIRECTORY_PATH = path.join(__dirname, '.staff-directory.json');
const CAPTCHA_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CAPTCHA_TTL_MS = 3 * 60 * 1000; // 3 minutes

const COMMONLY_USED_PASSWORDS = new Set([
  '12345678', '123456789', '1234567890', 'password', 'passphrase',
  'password123', 'password1', 'admin123', 'administrator', 'clinic123',
  'homeocare', 'homeocare123', 'homeopathy', 'doctor123', 'reception123',
  'qwerty123', 'qwertyuiop', 'welcome1', 'welcome123', 'letmein123',
  'iloveyou1', 'sunshine1', 'monkey123', 'dragon123', 'master123',
  'shadow123', 'football1', 'trustno1', 'suraj123', 'panigrahi'
]);

function isCommonPassword(password) {
  if (!password) return false;
  const clean = String(password).trim().toLowerCase();
  return COMMONLY_USED_PASSWORDS.has(clean);
}

// Single authorized clinic administrator email for OTP login
const AUTHORIZED_ADMIN_EMAIL = 'homeocareadmin@gmail.com';

// Server-side in-memory stores for single-use CAPTCHAs and IP rate limiting
const SERVER_CAPTCHAS = new Map(); // challengeId -> { text, expiresAt, used, ip }
const RATE_LIMITS = new Map();     // `${bucket}:${ip}` -> { count, resetAt }

/**
 * Load environment variables from local .env file without external dependencies.
 * Reads fresh values so updates to .env take effect immediately.
 */
function loadLocalEnv() {
  const envPath = path.join(__dirname, '.env');
  const parsed = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIndex = line.indexOf('=');
      if (eqIndex === -1) continue;
      const key = line.slice(0, eqIndex).trim();
      let val = line.slice(eqIndex + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      parsed[key] = val;
    }
  }
  return {
    SUPABASE_URL: parsed.SUPABASE_URL || process.env.SUPABASE_URL || '',
    SUPABASE_PUBLISHABLE_KEY:
      parsed.SUPABASE_PUBLISHABLE_KEY ||
      parsed.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      '',
    PORT: parsed.PORT || process.env.PORT || 3000,
    RAW: parsed
  };
}

/**
 * Password hashing and verification using Node crypto (never plaintext).
 */
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password, salt, hash) {
  try {
    const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(hash, 'hex'));
  } catch (_) {
    return false;
  }
}

function getSigningSecret() {
  const env = loadLocalEnv();
  return (
    process.env.CAPTCHA_SECRET ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_URL ||
    'homeocare-shri-siddhivinayak-clinic-secret-token'
  );
}

function computeStaffTicketHmac(username, salt, passwordHash) {
  return crypto
    .createHmac('sha256', getSigningSecret())
    .update(`staff:${username}:${salt}:${passwordHash}`)
    .digest('hex');
}

/**
 * Load and save administrator-provisioned username -> real email bindings on the server.
 */
function loadStaffDirectory() {
  const map = {};
  const env = loadLocalEnv().RAW || {};

  // Support clinic owner email in .env
  if (env.CLINIC_OWNER_EMAIL && env.CLINIC_OWNER_EMAIL.includes('@')) {
    const ownerEmail = env.CLINIC_OWNER_EMAIL.trim().toLowerCase();
    map['dr.suraj'] = { username: 'dr.suraj', email: ownerEmail, status: 'approved', role: 'doctor' };
    map['doctor'] = { username: 'doctor', email: ownerEmail, status: 'approved', role: 'doctor' };
  }

  // Support optional .env mappings (e.g. STAFF_EMAIL_DR_SURAJ=...)
  for (const [k, v] of Object.entries(env)) {
    if (k.startsWith('STAFF_EMAIL_') && v && v.includes('@')) {
      const uname = k.replace('STAFF_EMAIL_', '').toLowerCase();
      map[uname] = { email: v.trim().toLowerCase(), status: 'approved', role: 'doctor' };
    }
  }
  if (fs.existsSync(STAFF_DIRECTORY_PATH)) {
    try {
      const stored = JSON.parse(fs.readFileSync(STAFF_DIRECTORY_PATH, 'utf-8'));
      if (stored && typeof stored === 'object') {
        for (const [u, val] of Object.entries(stored)) {
          const lowerU = u.toLowerCase();
          if (typeof val === 'string' && val.includes('@')) {
            map[lowerU] = { email: val.trim().toLowerCase(), status: 'approved' };
          } else if (val && typeof val === 'object') {
            map[lowerU] = val;
          }
        }
      }
    } catch (_) {
      // Ignore corrupt file
    }
  }
  return map;
}

function saveStaffUser(username, record) {
  const cleanUser = String(username || '').trim().toLowerCase();
  if (!cleanUser) return;
  let existing = {};
  if (fs.existsSync(STAFF_DIRECTORY_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(STAFF_DIRECTORY_PATH, 'utf-8')) || {};
    } catch (_) {
      existing = {};
    }
  }
  existing[cleanUser] = record;
  fs.writeFileSync(STAFF_DIRECTORY_PATH, JSON.stringify(existing, null, 2), { mode: 0o600 });
}

function saveStaffUsernameBinding(username, email) {
  const cleanUser = String(username || '').trim().toLowerCase();
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanUser || !cleanEmail.includes('@')) return;
  saveStaffUser(cleanUser, {
    username: cleanUser,
    email: cleanEmail,
    status: 'approved',
    updatedAt: new Date().toISOString()
  });
}

/**
 * Per-IP fixed-window rate limiter.
 */
function checkRateLimit(bucket, ip, maxAttempts, windowMs) {
  const now = Date.now();
  const key = `${bucket}:${ip}`;
  let entry = RATE_LIMITS.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
  }
  entry.count += 1;
  RATE_LIMITS.set(key, entry);
  const allowed = entry.count <= maxAttempts;
  const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  return {
    allowed,
    remaining: Math.max(0, maxAttempts - entry.count),
    retryAfterSec
  };
}

/**
 * Cryptographic server-side CAPTCHA generator & single-use verifier.
 */
function createServerCaptcha(ip) {
  const now = Date.now();
  // Prune expired challenges
  for (const [id, item] of SERVER_CAPTCHAS.entries()) {
    if (now > item.expiresAt || item.used) {
      SERVER_CAPTCHAS.delete(id);
    }
  }
  let text = '';
  for (let i = 0; i < 6; i++) {
    text += CAPTCHA_CHARSET[crypto.randomInt(0, CAPTCHA_CHARSET.length)];
  }
  const challengeId = crypto.randomBytes(16).toString('hex');
  const expiresAt = now + CAPTCHA_TTL_MS;
  SERVER_CAPTCHAS.set(challengeId, {
    text,
    expiresAt,
    used: false,
    ip
  });
  return { challengeId, challengeText: text, expiresAt, expiryMs: CAPTCHA_TTL_MS };
}

function verifyAndConsumeServerCaptcha(challengeId, userAnswer) {
  if (!challengeId || !userAnswer) {
    return { valid: false, reason: 'CAPTCHA verification challenge and answer are required.' };
  }
  const record = SERVER_CAPTCHAS.get(String(challengeId));
  if (!record) {
    return { valid: false, reason: 'CAPTCHA challenge not found or already used. Please enter the new challenge.' };
  }
  // Always mark as used immediately on first verification attempt (strictly single-use)
  record.used = true;
  SERVER_CAPTCHAS.delete(String(challengeId));

  if (Date.now() > record.expiresAt) {
    return { valid: false, reason: 'Human verification challenge expired. Please enter the new challenge.' };
  }
  if (String(userAnswer).trim().toUpperCase() !== record.text) {
    return { valid: false, reason: 'Incorrect verification text. A new challenge has been generated.' };
  }
  return { valid: true };
}

function readJsonBody(req, maxBytes = 8192) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > maxBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function getClientIp(req) {
  return req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Security check: Ensure a secret or service_role key is NEVER exposed to the browser.
 */
function isForbiddenSecretKey(key) {
  if (!key) return false;
  const trimmed = key.trim();
  if (trimmed.startsWith('sb_secret_')) return true;
  const parts = trimmed.split('.');
  if (parts.length === 3) {
    try {
      const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf-8');
      const payload = JSON.parse(payloadJson);
      if (payload.role === 'service_role' || payload.role === 'supabase_admin') {
        return true;
      }
    } catch (_) {
      // Ignore malformed base64
    }
  }
  return false;
}

function getSafePublicSupabaseConfig() {
  const env = loadLocalEnv();
  const url = env.SUPABASE_URL.trim();
  const key = env.SUPABASE_PUBLISHABLE_KEY.trim();

  if (isForbiddenSecretKey(key)) {
    console.error(
      '[SECURITY BLOCK] A secret or service_role key was detected in SUPABASE_PUBLISHABLE_KEY. Refusing to expose it to the client.'
    );
    return { configured: false, url: '', publishableKey: '', error: 'FORBIDDEN_SECRET_KEY' };
  }

  return {
    configured: Boolean(url && key),
    url,
    publishableKey: key
  };
}

const initialEnv = loadLocalEnv();
const PORT = initialEnv.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

// Block sensitive local files and directories from HTTP static serving
const BLOCKED_PREFIXES = ['.env', '.git', '.staff-directory.json', '_checkpoints', 'database'];

// HomeoCare MVP Specification Feature Flags (HomeoCare MVP Developer Handoff)
const MVP_FEATURE_FLAGS = {
  PATIENT_REGISTRATION: true,
  CASE_HISTORY_INTAKE: true,
  PERSONAL_HISTORY: true,
  MIND_HISTORY: true,
  PATIENT_SELF_ENTRY: true,
  DOCTOR_RECORD_REVIEW: true,
  MULTILINGUAL_UI: true,

  BILLING_INVOICES: false,
  APPOINTMENTS_CALENDAR: false,
  PRESCRIPTION_GEN: false,
  DISPENSARY_INVENTORY: false,
  PRACTICE_ANALYTICS: false,
  REPERTORY_MATERIA: false,
  AI_DIAGNOSIS: false,
  WHATSAPP_AUTOMATION: false
};

const LOCKED_API_PREFIXES = [
  '/api/invoices',
  '/api/billing',
  '/api/payments',
  '/api/appointments',
  '/api/dispensary',
  '/api/prescriptions',
  '/api/repertory',
  '/api/analytics'
];

const server = http.createServer(async (req, res) => {
  const cleanUrl = req.url.split('?')[0];
  const clientIp = getClientIp(req);

  // 1. Safe Public Config Endpoint (Publishable Key + URL only)
  if (cleanUrl === '/api/supabase-config' && req.method === 'GET') {
    const config = getSafePublicSupabaseConfig();
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify(config));
    return;
  }

  // 1a. Feature Flags Endpoint
  if (cleanUrl === '/api/features' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify({
      success: true,
      specification: 'HomeoCare MVP Developer Handoff (29 October 2026)',
      stakeholder: 'Dr. Suraj D. Panigrahi, Shri Siddhivinayak Clinic',
      flags: MVP_FEATURE_FLAGS,
      lockedReason: 'Preserved in codebase & database. Temporarily locked for MVP Phase 1. Reversible upon doctor approval.'
    }));
    return;
  }

  // 1b. Server-side Protection: Block direct API requests to locked features
  const isLockedRoute = LOCKED_API_PREFIXES.some(prefix => cleanUrl === prefix || cleanUrl.startsWith(prefix + '/'));
  if (isLockedRoute) {
    res.writeHead(403, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify({
      success: false,
      error: 'FEATURE_LOCKED',
      code: 'MVP_SCOPE_LOCK',
      message: 'This module is locked in HomeoCare MVP Phase 1 as per the approved Developer Handoff specification. All data and source code remain intact and will be unlocked upon explicit clinic approval.'
    }));
    return;
  }

  // 1b. Safe Read-Only Connectivity Verification Endpoint
  if (cleanUrl === '/api/supabase-verify' && req.method === 'GET') {
    const config = getSafePublicSupabaseConfig();
    if (!config.url) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, stage: 'config', message: 'SUPABASE_URL is missing in .env' }));
      return;
    }
    const headers = config.publishableKey ? { apikey: config.publishableKey } : {};
    fetch(`${config.url.replace(/\/$/, '')}/auth/v1/settings`, { method: 'GET', headers })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            ok: r.ok && config.configured,
            urlReachable: true,
            httpStatus: r.status,
            hasPublishableKey: Boolean(config.publishableKey),
            url: config.url,
            emailAuthEnabled: Boolean(body?.external?.email)
          })
        );
      })
      .catch((err) => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            ok: false,
            urlReachable: false,
            hasPublishableKey: Boolean(config.publishableKey),
            url: config.url,
            error: err.message
          })
        );
      });
    return;
  }

  // 1c. Single-Email OTP Authentication Endpoints (Authorized: homeocareadmin@gmail.com)
  if (cleanUrl === '/api/auth/send-otp' && req.method === 'POST') {
    const limit = checkRateLimit('send-otp', clientIp, 10, 15 * 60 * 1000);
    if (!limit.allowed) {
      res.writeHead(429, {
        'Content-Type': 'application/json; charset=utf-8',
        'Retry-After': String(limit.retryAfterSec)
      });
      res.end(
        JSON.stringify({
          ok: false,
          error: `Too many verification code requests. Please wait ${Math.ceil(limit.retryAfterSec / 60)} minutes before retrying.`
        })
      );
      return;
    }

    try {
      const body = await readJsonBody(req);
      const email = String(body.email || '').trim().toLowerCase();

      if (email !== AUTHORIZED_ADMIN_EMAIL) {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            ok: false,
            error: `Access restricted: Only the authorized HomeoCare administrator (${AUTHORIZED_ADMIN_EMAIL}) is permitted to request access.`
          })
        );
        return;
      }

      const config = getSafePublicSupabaseConfig();
      if (!config.configured) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Supabase configuration is missing on server.' }));
        return;
      }

      const otpRes = await fetch(`${config.url.replace(/\/$/, '')}/auth/v1/otp`, {
        method: 'POST',
        headers: {
          apikey: config.publishableKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: AUTHORIZED_ADMIN_EMAIL,
          create_user: false
        })
      });

      if (otpRes.status === 429) {
        const data = await otpRes.json().catch(() => ({}));
        res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            ok: false,
            error: data.msg || 'For security purposes, you can only request a code once per minute. Please check your inbox or wait before retrying.'
          })
        );
        return;
      }

      if (!otpRes.ok) {
        const errData = await otpRes.json().catch(() => ({}));
        res.writeHead(otpRes.status, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            ok: false,
            error: errData.msg || errData.message || 'Failed to dispatch verification code.'
          })
        );
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          ok: true,
          email: AUTHORIZED_ADMIN_EMAIL,
          message: `A 6-digit verification code has been dispatched to ${AUTHORIZED_ADMIN_EMAIL}.`
        })
      );
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
      return;
    }
  }

  if (cleanUrl === '/api/auth/verify-otp' && req.method === 'POST') {
    const limit = checkRateLimit('verify-otp', clientIp, 20, 15 * 60 * 1000);
    if (!limit.allowed) {
      res.writeHead(429, {
        'Content-Type': 'application/json; charset=utf-8',
        'Retry-After': String(limit.retryAfterSec)
      });
      res.end(
        JSON.stringify({
          ok: false,
          error: `Too many verification attempts. Please wait ${Math.ceil(limit.retryAfterSec / 60)} minutes before retrying.`
        })
      );
      return;
    }

    try {
      const body = await readJsonBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const token = String(body.token || body.code || '').trim();

      if (email !== AUTHORIZED_ADMIN_EMAIL) {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            ok: false,
            error: `Access restricted: Only the authorized HomeoCare administrator (${AUTHORIZED_ADMIN_EMAIL}) is permitted.`
          })
        );
        return;
      }

      if (!token || token.length !== 6) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Please enter a valid 6-digit verification code.' }));
        return;
      }

      const config = getSafePublicSupabaseConfig();
      if (!config.configured) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Supabase configuration is missing on server.' }));
        return;
      }

      const verifyRes = await fetch(`${config.url.replace(/\/$/, '')}/auth/v1/verify`, {
        method: 'POST',
        headers: {
          apikey: config.publishableKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: AUTHORIZED_ADMIN_EMAIL,
          token: token,
          type: 'email'
        })
      });

      const verifyData = await verifyRes.json().catch(() => ({}));

      if (!verifyRes.ok) {
        let errMsg = verifyData.msg || verifyData.message || 'Invalid verification code.';
        if (verifyData.error_code === 'otp_expired' || errMsg.toLowerCase().includes('expired')) {
          errMsg = 'The verification code has expired or is invalid. Please request a new code.';
        }
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: errMsg }));
        return;
      }

      const sessionUser = {
        id: verifyData.user?.id || 'admin-doc',
        email: AUTHORIZED_ADMIN_EMAIL,
        username: 'dr.suraj',
        dbRole: 'doctor',
        isDoctor: true,
        isAdmin: true,
        role: 'Dr. Suraj D. Panigrahi',
        name: 'Dr. Suraj D. Panigrahi',
        qualification: 'B.H.M.S. (Mum.)',
        licenseNumber: 'REG-BHMS-MUM-2026',
        loginTime: new Date().toISOString()
      };

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          ok: true,
          session: verifyData,
          user: sessionUser,
          message: 'Verification successful. Welcome to HomeoCare!'
        })
      );
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
      return;
    }
  }

  if (cleanUrl === '/api/auth/verify-session' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const accessToken = String(body.accessToken || '').trim();
      if (!accessToken) {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Missing access token.' }));
        return;
      }
      const config = getSafePublicSupabaseConfig();
      const userRes = await fetch(`${config.url.replace(/\/$/, '')}/auth/v1/user`, {
        method: 'GET',
        headers: {
          apikey: config.publishableKey,
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (!userRes.ok) {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Invalid or expired session token.' }));
        return;
      }
      const userData = await userRes.json();
      if (userData.email?.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL) {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Unauthorized: Session user is not the clinic administrator.' }));
        return;
      }
      const sessionUser = {
        id: userData.id,
        email: AUTHORIZED_ADMIN_EMAIL,
        username: 'dr.suraj',
        dbRole: 'doctor',
        isDoctor: true,
        isAdmin: true,
        role: 'Dr. Suraj D. Panigrahi',
        name: 'Dr. Suraj D. Panigrahi',
        qualification: 'B.H.M.S. (Mum.)',
        licenseNumber: 'REG-BHMS-MUM-2026',
        loginTime: new Date().toISOString()
      };
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, user: sessionUser }));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
      return;
    }
  }

  // 1d. Rate-Limited Server-Side Registration Endpoint (Disabled in Single-Email OTP Mode)
  if (cleanUrl === '/api/auth/register' && req.method === 'POST') {
    res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        ok: false,
        error: 'Public registration is disabled. Please log in using the authorized email (homeocareadmin@gmail.com) via OTP.'
      })
    );
    return;
  }

  if (cleanUrl === '/api/auth/verify-registration' && req.method === 'POST') {
    res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        ok: false,
        error: 'Public registration is disabled. Please log in using the authorized email (homeocareadmin@gmail.com) via OTP.'
      })
    );
    return;
  }

  // 1c. Server-Side Cryptographic CAPTCHA Challenge Endpoint
  if (cleanUrl === '/api/auth/captcha' && req.method === 'GET') {
    const challenge = createServerCaptcha(clientIp);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify(challenge));
    return;
  }

  // 1d. Rate-Limited Server-Side Registration Endpoint (Username + Password + CAPTCHA)
  if (cleanUrl === '/api/auth/register' && req.method === 'POST') {
    const limit = checkRateLimit('register', clientIp, 15, 15 * 60 * 1000); // 15 attempts per 15 mins
    if (!limit.allowed) {
      res.writeHead(429, {
        'Content-Type': 'application/json; charset=utf-8',
        'Retry-After': String(limit.retryAfterSec)
      });
      res.end(
        JSON.stringify({
          ok: false,
          error: `Too many registration attempts. Please wait ${Math.ceil(limit.retryAfterSec / 60)} minutes before retrying.`
        })
      );
      return;
    }

    try {
      const body = await readJsonBody(req);

      // 1. CAPTCHA validation (strictly single-use, regenerates on invalid/expired attempt)
      const captchaCheck = verifyAndConsumeServerCaptcha(body.challengeId, body.captchaInput);
      if (!captchaCheck.valid) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: captchaCheck.reason, regenerateCaptcha: true }));
        return;
      }

      // 2. Username validation (case-insensitive, unique)
      const username = String(body.username || '').trim();
      const cleanUsername = username.toLowerCase();

      if (!/^[a-z0-9_.-]{3,32}$/.test(cleanUsername)) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            ok: false,
            error: 'Username must be 3 to 32 characters (letters, numbers, dots, hyphens, or underscores).'
          })
        );
        return;
      }

      // Reserved clinic administration usernames
      const RESERVED_USERNAMES = new Set(['doctor', 'dr.suraj', 'admin', 'administrator', 'root', 'system']);
      if (RESERVED_USERNAMES.has(cleanUsername)) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            ok: false,
            error: `Username "${cleanUsername}" is reserved for clinic administration. Please choose a different username.`
          })
        );
        return;
      }

      const directory = loadStaffDirectory();
      if (directory[cleanUsername]) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            ok: false,
            error: `Username "${cleanUsername}" is already registered. Please choose a different username.`
          })
        );
        return;
      }

      // 3. Password validation (min 8 chars, matching confirm password, not common)
      const password = String(body.password || '');
      const confirmPassword = String(body.confirmPassword || '');

      if (password.length < 8) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Password must be at least 8 characters long.' }));
        return;
      }

      if (password !== confirmPassword) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Password and Confirm Password do not match.' }));
        return;
      }

      if (isCommonPassword(password)) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            ok: false,
            error: 'This password is too common or easily compromised. Please choose a more secure password.'
          })
        );
        return;
      }

      // Check clinic staff allowlist if configured via environment variable
      const envAllow = process.env.CLINIC_STAFF_ALLOWLIST || loadLocalEnv().RAW?.CLINIC_STAFF_ALLOWLIST;
      if (envAllow && envAllow !== '*') {
        const allowedUsers = new Set(envAllow.split(',').map((u) => u.trim().toLowerCase()));
        if (!allowedUsers.has(cleanUsername)) {
          res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(
            JSON.stringify({
              ok: false,
              error: `Registration restricted: Username "${cleanUsername}" is not on the authorized clinic personnel roster.`
            })
          );
          return;
        }
      }

      // 4. Register staff user locally with cryptographic password hashing (salted scrypt, never plaintext)
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashPassword(password, salt);
      const ticketSig = computeStaffTicketHmac(cleanUsername, salt, passwordHash);
      const staffTicket = `${cleanUsername}.${salt}.${passwordHash}.${ticketSig}`;

      saveStaffUser(cleanUsername, {
        username: cleanUsername,
        passwordHash,
        salt,
        status: 'active',
        role: 'receptionist',
        isDoctor: false,
        createdAt: new Date().toISOString()
      });

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          ok: true,
          username: cleanUsername,
          activated: true,
          status: 'active',
          staffTicket,
          message: 'Registration successful! You may now sign in.'
        })
      );
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  // 1e. Rate-Limited Server-Side Registration & CAPTCHA Verification Endpoint (Legacy compatibility)
  if (cleanUrl === '/api/auth/verify-registration' && req.method === 'POST') {
    const limit = checkRateLimit('register', clientIp, 20, 15 * 60 * 1000); // 20 attempts per 15 mins
    if (!limit.allowed) {
      res.writeHead(429, {
        'Content-Type': 'application/json; charset=utf-8',
        'Retry-After': String(limit.retryAfterSec)
      });
      res.end(
        JSON.stringify({
          ok: false,
          error: `Too many registration attempts. Please wait ${Math.ceil(limit.retryAfterSec / 60)} minutes before retrying.`
        })
      );
      return;
    }

    try {
      const body = await readJsonBody(req);
      const captchaCheck = verifyAndConsumeServerCaptcha(body.challengeId, body.captchaInput);
      if (!captchaCheck.valid) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: captchaCheck.reason }));
        return;
      }

      const inviteCode = String(body.inviteCode || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const username = String(body.username || '').trim().toLowerCase();

      if (inviteCode.length < 16) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            ok: false,
            error: 'Invalid invitation code: A high-entropy single-use clinic authorization code (min 16 characters) is required.'
          })
        );
        return;
      }

      if (!email || !email.includes('@') || email.endsWith('@homeocare.clinic')) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            ok: false,
            error: 'Please enter your real administrator-provisioned email address (fictional @homeocare.clinic addresses are not permitted).'
          })
        );
        return;
      }

      if (!/^[a-z0-9_.-]{3,32}$/.test(username)) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            ok: false,
            error: 'Username must be 3 to 32 characters (letters, numbers, dots, hyphens, or underscores).'
          })
        );
        return;
      }

      if (body.password) {
        const pass = String(body.password);
        if (pass.length < 8) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: 'Password must be at least 8 characters long.' }));
          return;
        }
        if (isCommonPassword(pass)) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(
            JSON.stringify({
              ok: false,
              error: 'This password is too common or easily compromised. Please choose a more secure password.'
            })
          );
          return;
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, verified: true, remainingAttempts: limit.remaining }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  // 1f. Rate-Limited Login Pre-Check & Username-to-Provisioned-Email Resolution
  if (cleanUrl === '/api/auth/prepare-login' && req.method === 'POST') {
    const limit = checkRateLimit('login', clientIp, 30, 15 * 60 * 1000); // 30 attempts per 15 mins
    if (!limit.allowed) {
      res.writeHead(429, {
        'Content-Type': 'application/json; charset=utf-8',
        'Retry-After': String(limit.retryAfterSec)
      });
      res.end(
        JSON.stringify({
          ok: false,
          error: `Too many login attempts. Account login is rate-limited for ${Math.ceil(limit.retryAfterSec / 60)} minutes.`
        })
      );
      return;
    }

    try {
      const body = await readJsonBody(req);
      const identifier = String(body.identifier || '').trim().toLowerCase();
      const password = String(body.password || '');
      const staffTicket = String(body.staffTicket || '').trim();

      if (!identifier) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Username is required.' }));
        return;
      }

      const directory = loadStaffDirectory();
      let userRecord = directory[identifier];

      if (!userRecord && staffTicket) {
        const parts = staffTicket.split('.');
        if (parts.length === 4) {
          const [tUname, tSalt, tHash, tSig] = parts;
          if (tUname.toLowerCase() === identifier) {
            const expectedSig = computeStaffTicketHmac(tUname, tSalt, tHash);
            if (
              tSig.length === expectedSig.length &&
              crypto.timingSafeEqual(Buffer.from(tSig, 'hex'), Buffer.from(expectedSig, 'hex'))
            ) {
              userRecord = {
                username: tUname,
                passwordHash: tHash,
                salt: tSalt,
                status: 'active',
                role: 'receptionist',
                isDoctor: false
              };
              saveStaffUser(tUname, userRecord);
            }
          }
        }
      }

      // If registered account exists in directory, verify password and grant basic workspace access
      if (userRecord) {
        if (password && userRecord.salt && userRecord.passwordHash) {
          const passOk = verifyPassword(password, userRecord.salt, userRecord.passwordHash);
          if (!passOk) {
            res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: false, error: 'Invalid username or password. Please verify your credentials.' }));
            return;
          }
        }

        // If user is linked to an Auth email (e.g. Dr. Suraj)
        if (userRecord.email) {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(
            JSON.stringify({
              ok: true,
              email: userRecord.email,
              user: {
                id: userRecord.id || `staff-${identifier}`,
                username: userRecord.username || identifier,
                name: userRecord.fullName || userRecord.name || (userRecord.role === 'doctor' ? 'Dr. Suraj D. Panigrahi' : identifier),
                role: userRecord.role || 'doctor',
                isDoctor: userRecord.role === 'doctor',
                isActive: true
              }
            })
          );
          return;
        }

        // Standard registered staff user (immediately functional basic workspace, role: receptionist, isDoctor: false)
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            ok: true,
            email: null,
            user: {
              id: userRecord.id || `staff-${identifier}`,
              username: userRecord.username || identifier,
              name: userRecord.fullName || userRecord.username || identifier,
              role: userRecord.role || 'receptionist',
              isDoctor: Boolean(userRecord.isDoctor),
              isActive: true
            }
          })
        );
        return;
      }

      let resolvedEmail = identifier.includes('@') ? identifier : null;
      if (!resolvedEmail) {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Invalid username or password. Please verify your credentials.' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, email: resolvedEmail }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  // 1g. Administrator Staff Approval Endpoints
  if (cleanUrl === '/api/auth/admin/pending-staff' && req.method === 'GET') {
    try {
      const directory = loadStaffDirectory();
      const pending = [];
      for (const [uname, record] of Object.entries(directory)) {
        if (record && record.status === 'pending_approval') {
          pending.push({
            username: record.username || uname,
            role: record.role || 'receptionist',
            status: record.status,
            createdAt: record.createdAt || null
          });
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, pendingStaff: pending }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  if (cleanUrl === '/api/auth/admin/approve-staff' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const targetUsername = String(body.username || '').trim().toLowerCase();
      if (!targetUsername) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Target username is required.' }));
        return;
      }

      const directory = loadStaffDirectory();
      const userRecord = directory[targetUsername];
      if (!userRecord) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: `User "${targetUsername}" not found.` }));
        return;
      }

      // Enforce: newly approved staff receive receptionist role, NEVER doctor
      const assignedRole = 'receptionist';
      userRecord.status = 'approved';
      userRecord.role = assignedRole;
      userRecord.approvedAt = new Date().toISOString();
      userRecord.approvedBy = 'Dr. Suraj D. Panigrahi';

      saveStaffUser(targetUsername, userRecord);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          ok: true,
          username: targetUsername,
          role: assignedRole,
          status: 'approved',
          message: `Staff member "${targetUsername}" approved successfully as ${assignedRole}.`
        })
      );
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  if (cleanUrl === '/api/auth/admin/reject-staff' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const targetUsername = String(body.username || '').trim().toLowerCase();
      if (!targetUsername) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Target username is required.' }));
        return;
      }

      const directory = loadStaffDirectory();
      delete directory[targetUsername];
      fs.writeFileSync(STAFF_DIRECTORY_PATH, JSON.stringify(directory, null, 2), { mode: 0o600 });

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, message: `Registration for "${targetUsername}" was rejected and removed.` }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  // 1f. Verified Username Binding Endpoint (Requires active Supabase JWT after register_authorized_staff)
  if (cleanUrl === '/api/auth/bind-username' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const accessToken = String(body.accessToken || '').trim();
      const username = String(body.username || '').trim().toLowerCase();
      const config = getSafePublicSupabaseConfig();

      if (!accessToken || !username || !config.configured) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Missing token or username.' }));
        return;
      }

      // Verify token authenticity directly with Supabase Auth server
      const userRes = await fetch(`${config.url.replace(/\/$/, '')}/auth/v1/user`, {
        method: 'GET',
        headers: {
          apikey: config.publishableKey,
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!userRes.ok) {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Unauthorized session token.' }));
        return;
      }

      const authUser = await userRes.json();
      if (authUser?.email) {
        saveStaffUsernameBinding(username, authUser.email);
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  // 2. Normalize path and enforce security blocklist
  let safePath = path.normalize(cleanUrl).replace(/^(\.\.[\/\\])+/, '');
  const relativeClean = safePath.replace(/^[\/\\]+/, '');

  if (
    relativeClean.startsWith('.') ||
    BLOCKED_PREFIXES.some(
      (prefix) =>
        relativeClean === prefix ||
        relativeClean.startsWith(prefix + '/') ||
        relativeClean.startsWith(prefix + '\\')
    )
  ) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  let filePath = path.join(__dirname, safePath === '/' || safePath === '\\' ? 'index.html' : safePath);

  // 3. Inject public runtime environment variables when serving supabase-client.js
  if (relativeClean === 'supabase-client.js') {
    fs.readFile(filePath, 'utf-8', (readErr, content) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
      }
      const pubConfig = getSafePublicSupabaseConfig();
      const injectedHeader = [
        `window.__HOMEOCARE_SUPABASE_URL = ${JSON.stringify(pubConfig.url)};`,
        `window.__HOMEOCARE_SUPABASE_PUBLISHABLE_KEY = ${JSON.stringify(pubConfig.publishableKey)};`,
        `window.__HOMEOCARE_SUPABASE_ANON_KEY = ${JSON.stringify(pubConfig.publishableKey)};`
      ].join('\n');

      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      res.end(`${injectedHeader}\n\n${content}`);
    });
    return;
  }

  // 4. Standard static file serving (preserves approved HomeoCare frontend untouched)
  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        if (readErr.code === 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('404 Not Found');
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end(`Server Error: ${readErr.code}`);
        }
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });

      if (path.basename(filePath).toLowerCase() === 'index.html') {
        const htmlStr = content.toString('utf-8');
        const injectedHtml = htmlStr.includes('supabase-client.js')
          ? htmlStr
          : htmlStr.replace(
              '<script src="app.js"></script>',
              '<script src="supabase-client.js"></script>\n  <script src="app.js"></script>'
            );
        res.end(injectedHtml, 'utf-8');
        return;
      }

      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  const pubConfig = getSafePublicSupabaseConfig();
  console.log(`HomeoCare running at http://localhost:${PORT}/`);
  console.log(
    `Supabase Configuration Status: ${
      pubConfig.configured ? 'CONFIGURED (' + pubConfig.url + ')' : 'AWAITING .env CREDENTIALS'
    }`
  );
});
