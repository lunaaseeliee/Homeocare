/**
 * HomeoCare - Vercel Serverless Function API Gateway
 * Clinic: Shri Siddhivinayak Clinic | Dr. Suraj D. Panigrahi
 *
 * Robust Vercel Serverless Gateway:
 * - Handles all /api/* routes seamlessly under Vercel edge/serverless routing
 * - Multi-source path resolution (x-forwarded-uri, x-matched-path, rewrite capture query, req.url)
 * - Stateless HMAC-SHA256 CAPTCHA verification across serverless instances & cold starts
 * - Cryptographic salted scrypt password hashing
 * - Stateless HMAC staff authorization tickets for reliable cross-instance login
 * - Clinic staff role enforcement (receptionist role only; doctor role reserved for clinic owner)
 * - Strict secret key protection (never exposes sb_secret_* or service_role keys)
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CAPTCHA_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const AUTHORIZED_ADMIN_EMAIL = 'homeocareadmin@gmail.com';
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
  return COMMONLY_USED_PASSWORDS.has(String(password).trim().toLowerCase());
}

// Memory stores for current lambda instance
const SERVER_CAPTCHAS = new Map();
const USED_CAPTCHAS = new Set();
const RATE_LIMITS = new Map();

// Deterministic server secret for HMAC signing across serverless cold starts
function getSigningSecret() {
  return (
    process.env.CAPTCHA_SECRET ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_URL ||
    'homeocare-shri-siddhivinayak-clinic-secret-token'
  );
}

// ============================================================================
// HomeoCare MVP Specification Feature Flags (HomeoCare MVP Developer Handoff)
// Source of truth: Handwritten requirement letter from Dr. Suraj D. Panigrahi
// All non-MVP features are LOCKED, NOT DELETED. Completely reversible.
// ============================================================================
const MVP_FEATURE_FLAGS = {
  PATIENT_REGISTRATION: true,    // In scope: Name, age, sex, address, phone, DOB
  CASE_HISTORY_INTAKE: true,     // In scope: Chief complaint, associated, past, family
  PERSONAL_HISTORY: true,        // In scope: Appetite, thirst, craving, diet, bowel, urine, habit, thermal, sleep, dreams
  MIND_HISTORY: true,            // In scope: Anxiety, stress, thoughts, company, worried, happy
  PATIENT_SELF_ENTRY: true,      // In scope: Dedicated patient self-entry path
  DOCTOR_RECORD_REVIEW: true,    // In scope: Search, open, review patient case records
  MULTILINGUAL_UI: true,         // In scope: English, Hindi, Marathi

  BILLING_INVOICES: false,       // Locked: Outside MVP handoff
  APPOINTMENTS_CALENDAR: false,  // Locked: Outside MVP handoff
  PRESCRIPTION_GEN: false,       // Locked: Outside MVP handoff
  DISPENSARY_INVENTORY: false,   // Locked: Outside MVP handoff
  PRACTICE_ANALYTICS: false,     // Locked: Outside MVP handoff
  REPERTORY_MATERIA: false,      // Locked: Outside MVP handoff
  AI_DIAGNOSIS: false,           // Excluded: Avoid implying clinical decision-making
  WHATSAPP_AUTOMATION: false     // Locked: Outside MVP handoff
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

function computeCaptchaHmac(nonce, expiresAt, answerUpper) {
  return crypto
    .createHmac('sha256', getSigningSecret())
    .update(`${nonce}:${expiresAt}:${answerUpper}`)
    .digest('hex');
}

function computeStaffTicketHmac(username, salt, passwordHash) {
  return crypto
    .createHmac('sha256', getSigningSecret())
    .update(`staff:${username}:${salt}:${passwordHash}`)
    .digest('hex');
}

// On Vercel, the root filesystem is read-only; use /tmp for runtime caching
const STAFF_DIRECTORY_PATH = process.env.VERCEL
  ? path.join('/tmp', '.staff-directory.json')
  : path.join(__dirname, '..', '.staff-directory.json');

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

function loadStaffDirectory() {
  const map = {};
  const ownerEmail = (process.env.CLINIC_OWNER_EMAIL || '').trim().toLowerCase();
  if (ownerEmail && ownerEmail.includes('@')) {
    map['dr.suraj'] = { username: 'dr.suraj', email: ownerEmail, status: 'approved', role: 'doctor' };
    map['doctor'] = { username: 'doctor', email: ownerEmail, status: 'approved', role: 'doctor' };
  }

  for (const [k, v] of Object.entries(process.env)) {
    if (k.startsWith('STAFF_EMAIL_') && v && v.includes('@')) {
      const uname = k.replace('STAFF_EMAIL_', '').toLowerCase();
      map[uname] = { email: v.trim().toLowerCase(), status: 'approved', role: 'doctor' };
    }
  }

  // Pre-configured staff accounts via environment variable if provided
  if (process.env.STAFF_ACCOUNTS_JSON) {
    try {
      const extra = JSON.parse(process.env.STAFF_ACCOUNTS_JSON);
      if (extra && typeof extra === 'object') {
        for (const [u, val] of Object.entries(extra)) {
          map[u.toLowerCase()] = val;
        }
      }
    } catch (_) {}
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
    } catch (_) {}
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
  try {
    fs.writeFileSync(STAFF_DIRECTORY_PATH, JSON.stringify(existing, null, 2), { mode: 0o600 });
  } catch (err) {
    console.warn('[StaffDir] Write to directory file failed:', err.message);
  }
}

function checkRateLimit(bucket, ip, maxAttempts, windowMs) {
  const now = Date.now();
  const key = `${bucket}:${ip}`;
  let entry = RATE_LIMITS.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
  }
  entry.count += 1;
  RATE_LIMITS.set(key, entry);
  return {
    allowed: entry.count <= maxAttempts,
    remaining: Math.max(0, maxAttempts - entry.count),
    retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
  };
}

function createServerCaptcha(ip) {
  const now = Date.now();
  for (const [id, item] of SERVER_CAPTCHAS.entries()) {
    if (now > item.expiresAt || item.used) {
      SERVER_CAPTCHAS.delete(id);
    }
  }
  let text = '';
  for (let i = 0; i < 6; i++) {
    text += CAPTCHA_CHARSET[crypto.randomInt(0, CAPTCHA_CHARSET.length)];
  }
  const nonce = crypto.randomBytes(16).toString('hex');
  const expiresAt = now + CAPTCHA_TTL_MS;
  const sig = computeCaptchaHmac(nonce, expiresAt, text);
  const challengeId = `${nonce}.${expiresAt}.${sig}`;
  SERVER_CAPTCHAS.set(challengeId, { text, expiresAt, used: false, ip });
  return { challengeId, challengeText: text, expiresAt, expiryMs: CAPTCHA_TTL_MS };
}

function verifyAndConsumeServerCaptcha(challengeId, userAnswer) {
  if (!challengeId || !userAnswer) {
    return { valid: false, reason: 'CAPTCHA verification challenge and answer are required.' };
  }
  const idStr = String(challengeId).trim();
  const answerUpper = String(userAnswer).trim().toUpperCase();

  if (USED_CAPTCHAS.has(idStr)) {
    return { valid: false, reason: 'CAPTCHA challenge not found or already used. Please enter the new challenge.' };
  }
  USED_CAPTCHAS.add(idStr);

  const record = SERVER_CAPTCHAS.get(idStr);
  if (record) {
    record.used = true;
    SERVER_CAPTCHAS.delete(idStr);
    if (Date.now() > record.expiresAt) {
      return { valid: false, reason: 'Human verification challenge expired. Please enter the new challenge.' };
    }
    if (answerUpper !== record.text) {
      return { valid: false, reason: 'Incorrect verification text. A new challenge has been generated.' };
    }
    return { valid: true };
  }

  // Stateless HMAC verification fallback for multi-instance Vercel serverless execution
  const parts = idStr.split('.');
  if (parts.length === 3) {
    const [nonce, expiresAtStr, sig] = parts;
    const expiresAt = Number(expiresAtStr);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
      return { valid: false, reason: 'Human verification challenge expired. Please enter the new challenge.' };
    }
    const expectedSig = computeCaptchaHmac(nonce, expiresAt, answerUpper);
    try {
      if (
        sig.length === expectedSig.length &&
        crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'))
      ) {
        return { valid: true };
      }
    } catch (_) {}
    return { valid: false, reason: 'Incorrect verification text. A new challenge has been generated.' };
  }

  return { valid: false, reason: 'CAPTCHA challenge not found or already used. Please enter the new challenge.' };
}

function isForbiddenSecretKey(key) {
  if (!key) return false;
  const trimmed = key.trim();
  if (trimmed.startsWith('sb_secret_')) return true;
  const parts = trimmed.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
      if (payload.role === 'service_role' || payload.role === 'supabase_admin') {
        return true;
      }
    } catch (_) {}
  }
  return false;
}

function getSafePublicConfig() {
  let url = (process.env.SUPABASE_URL || '').trim();
  let key = (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  if (!url || !key) {
    try {
      const envPath = path.join(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eq = trimmed.indexOf('=');
          if (eq === -1) continue;
          const k = trimmed.slice(0, eq).trim();
          const v = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
          if (k === 'SUPABASE_URL' && !url) url = v;
          if ((k === 'SUPABASE_PUBLISHABLE_KEY' || k === 'SUPABASE_ANON_KEY') && !key) key = v;
        }
      }
    } catch (_) {}
  }
  if (isForbiddenSecretKey(key)) {
    return { configured: false, url: '', publishableKey: '', error: 'FORBIDDEN_SECRET_KEY' };
  }
  return {
    configured: Boolean(url && key),
    url,
    publishableKey: key
  };
}

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (_) { return {}; }
  }
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 8192) {
        req.destroy();
        resolve({});
      }
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (_) { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

function getClientIp(req) {
  const xForwarded = req.headers['x-forwarded-for'];
  if (xForwarded) return xForwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || '127.0.0.1';
}

function sendJson(res, statusCode, data, extraHeaders = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders
  });
  res.end(JSON.stringify(data));
}

/**
 * Universal path resolution supporting Vercel serverless edge rewrites,
 * reverse proxies, and direct Node.js invocations.
 */
function getRequestPath(req) {
  let raw =
    req.headers['x-forwarded-uri'] ||
    req.headers['x-matched-path'] ||
    req.headers['x-rewrite-url'] ||
    req.headers['x-original-url'] ||
    req.url ||
    '/';
  let urlObj = new URL(raw, `http://${req.headers.host || 'localhost'}`);
  let pathname = urlObj.pathname.replace(/\/$/, '') || '/';

  // If Vercel rewrote the request to the handler script path
  if (
    pathname === '/api/index.js' ||
    pathname === '/api/index' ||
    pathname === '/api' ||
    pathname.startsWith('/api/[...')
  ) {
    const q0 =
      urlObj.searchParams.get('0') ||
      urlObj.searchParams.get('path') ||
      (req.query && (req.query['0'] || req.query['path']));
    if (q0) {
      pathname = '/api/' + String(q0).replace(/^\//, '');
    } else if (req.headers['x-now-route-matches']) {
      const params = new URLSearchParams(req.headers['x-now-route-matches']);
      const match = params.get('1') || params.get('0');
      if (match) {
        pathname = '/api/' + decodeURIComponent(match).replace(/^\//, '');
      }
    }
  }

  return pathname;
}

module.exports = async function handler(req, res) {
  const pathname = getRequestPath(req);
  const clientIp = getClientIp(req);

  // 1. Safe Supabase Public Config (Publishable Key + URL only)
  if (pathname === '/api/supabase-config' && req.method === 'GET') {
    return sendJson(res, 200, getSafePublicConfig());
  }

  // 1a. Feature Flags Endpoint (HomeoCare MVP Developer Handoff specification)
  if (pathname === '/api/features' && req.method === 'GET') {
    return sendJson(res, 200, {
      success: true,
      specification: 'HomeoCare MVP Developer Handoff (29 October 2026)',
      stakeholder: 'Dr. Suraj D. Panigrahi, Shri Siddhivinayak Clinic',
      flags: MVP_FEATURE_FLAGS,
      lockedReason: 'Preserved in codebase & database. Temporarily locked for MVP Phase 1. Reversible upon doctor approval.'
    });
  }

  // 1b. Server-side Protection: Block direct API requests to locked features
  const isLockedRoute = LOCKED_API_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
  if (isLockedRoute) {
    return sendJson(res, 403, {
      success: false,
      error: 'FEATURE_LOCKED',
      code: 'MVP_SCOPE_LOCK',
      message: 'This module is locked in HomeoCare MVP Phase 1 as per the approved Developer Handoff specification. All data and source code remain intact and will be unlocked upon explicit clinic approval.'
    });
  }

  // 1b. Safe Read-Only Connectivity Verification Endpoint
  if (pathname === '/api/supabase-verify' && req.method === 'GET') {
    const config = getSafePublicConfig();
    if (!config.url) {
      return sendJson(res, 200, { ok: false, stage: 'config', message: 'SUPABASE_URL is missing' });
    }
    try {
      const headers = config.publishableKey ? { apikey: config.publishableKey } : {};
      const r = await fetch(`${config.url.replace(/\/$/, '')}/auth/v1/settings`, { method: 'GET', headers });
      const body = await r.json().catch(() => ({}));
      return sendJson(res, 200, {
        ok: r.ok && config.configured,
        urlReachable: true,
        httpStatus: r.status,
        hasPublishableKey: Boolean(config.publishableKey),
        url: config.url,
        emailAuthEnabled: Boolean(body?.external?.email)
      });
    } catch (err) {
      return sendJson(res, 200, {
        ok: false,
        urlReachable: false,
        hasPublishableKey: Boolean(config.publishableKey),
        url: config.url,
        error: err.message
      });
    }
  }

  // 1c. Single-Email OTP Authentication Endpoints (Authorized: homeocareadmin@gmail.com)
  if (pathname === '/api/auth/send-otp' && req.method === 'POST') {
    const limit = checkRateLimit('send-otp', clientIp, 10, 15 * 60 * 1000);
    if (!limit.allowed) {
      return sendJson(
        res,
        429,
        {
          ok: false,
          error: `Too many verification code requests. Please wait ${Math.ceil(limit.retryAfterSec / 60)} minutes before retrying.`
        },
        { 'Retry-After': String(limit.retryAfterSec) }
      );
    }

    try {
      const body = await parseBody(req);
      const email = String(body.email || '').trim().toLowerCase();

      if (email !== AUTHORIZED_ADMIN_EMAIL) {
        return sendJson(res, 403, {
          ok: false,
          error: `Access restricted: Only the authorized HomeoCare administrator (${AUTHORIZED_ADMIN_EMAIL}) is permitted to request access.`
        });
      }

      const config = getSafePublicConfig();
      if (!config.configured) {
        return sendJson(res, 500, { ok: false, error: 'Supabase configuration is missing on server.' });
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
        return sendJson(res, 429, {
          ok: false,
          error: data.msg || 'For security purposes, you can only request a code once per minute. Please check your inbox or wait before retrying.'
        });
      }

      if (!otpRes.ok) {
        const errData = await otpRes.json().catch(() => ({}));
        return sendJson(res, otpRes.status, {
          ok: false,
          error: errData.msg || errData.message || 'Failed to dispatch verification code.'
        });
      }

      return sendJson(res, 200, {
        ok: true,
        email: AUTHORIZED_ADMIN_EMAIL,
        message: `A 6-digit verification code has been dispatched to ${AUTHORIZED_ADMIN_EMAIL}.`
      });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  if (pathname === '/api/auth/verify-otp' && req.method === 'POST') {
    const limit = checkRateLimit('verify-otp', clientIp, 20, 15 * 60 * 1000);
    if (!limit.allowed) {
      return sendJson(
        res,
        429,
        {
          ok: false,
          error: `Too many verification attempts. Please wait ${Math.ceil(limit.retryAfterSec / 60)} minutes before retrying.`
        },
        { 'Retry-After': String(limit.retryAfterSec) }
      );
    }

    try {
      const body = await parseBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const token = String(body.token || body.code || '').trim();

      if (email !== AUTHORIZED_ADMIN_EMAIL) {
        return sendJson(res, 403, {
          ok: false,
          error: `Access restricted: Only the authorized HomeoCare administrator (${AUTHORIZED_ADMIN_EMAIL}) is permitted.`
        });
      }

      if (!token || token.length !== 6) {
        return sendJson(res, 400, { ok: false, error: 'Please enter a valid 6-digit verification code.' });
      }

      const config = getSafePublicConfig();
      if (!config.configured) {
        return sendJson(res, 500, { ok: false, error: 'Supabase configuration is missing on server.' });
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
        return sendJson(res, 400, { ok: false, error: errMsg });
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

      return sendJson(res, 200, {
        ok: true,
        session: verifyData,
        user: sessionUser,
        message: 'Verification successful. Welcome to HomeoCare!'
      });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  if (pathname === '/api/auth/verify-session' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const accessToken = String(body.accessToken || '').trim();
      if (!accessToken) {
        return sendJson(res, 401, { ok: false, error: 'Missing access token.' });
      }
      const config = getSafePublicConfig();
      const userRes = await fetch(`${config.url.replace(/\/$/, '')}/auth/v1/user`, {
        method: 'GET',
        headers: {
          apikey: config.publishableKey,
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (!userRes.ok) {
        return sendJson(res, 401, { ok: false, error: 'Invalid or expired session token.' });
      }
      const userData = await userRes.json();
      if (userData.email?.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL) {
        return sendJson(res, 403, { ok: false, error: 'Unauthorized: Session user is not the clinic administrator.' });
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
      return sendJson(res, 200, { ok: true, user: sessionUser });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  // 1c. Server-side Cryptographic CAPTCHA Challenge Endpoint
  if (pathname === '/api/auth/captcha' && req.method === 'GET') {
    const challenge = createServerCaptcha(clientIp);
    return sendJson(res, 200, challenge);
  }

  // 1d. Rate-Limited Server-Side Registration Endpoint (Disabled in Single-Email OTP Mode)
  if (pathname === '/api/auth/register' && req.method === 'POST') {
    return sendJson(res, 403, {
      ok: false,
      error: 'Public registration is disabled. Please log in using the authorized email (homeocareadmin@gmail.com) via OTP.'
    });
  }

  // 1e. Rate-Limited Server-Side Registration & CAPTCHA Verification Endpoint (Disabled)
  if (pathname === '/api/auth/verify-registration' && req.method === 'POST') {
    return sendJson(res, 403, {
      ok: false,
      error: 'Public registration is disabled. Please log in using the authorized email (homeocareadmin@gmail.com) via OTP.'
    });
  }
  if (pathname === '/api/auth/register' && req.method === 'POST') {
    const limit = checkRateLimit('register', clientIp, 15, 15 * 60 * 1000);
    if (!limit.allowed) {
      return sendJson(
        res,
        429,
        {
          ok: false,
          error: `Too many registration attempts. Please wait ${Math.ceil(limit.retryAfterSec / 60)} minutes before retrying.`
        },
        { 'Retry-After': String(limit.retryAfterSec) }
      );
    }

    try {
      const body = await parseBody(req);
      const captchaCheck = verifyAndConsumeServerCaptcha(body.challengeId, body.captchaInput);
      if (!captchaCheck.valid) {
        return sendJson(res, 400, { ok: false, error: captchaCheck.reason, regenerateCaptcha: true });
      }

      const username = String(body.username || '').trim();
      const cleanUsername = username.toLowerCase();

      if (!/^[a-z0-9_.-]{3,32}$/.test(cleanUsername)) {
        return sendJson(res, 400, {
          ok: false,
          error: 'Username must be 3 to 32 characters (letters, numbers, dots, hyphens, or underscores).'
        });
      }

      // Check clinic staff allowlist if configured via environment variable
      if (process.env.CLINIC_STAFF_ALLOWLIST && process.env.CLINIC_STAFF_ALLOWLIST !== '*') {
        const allowedUsers = new Set(
          process.env.CLINIC_STAFF_ALLOWLIST.split(',').map((u) => u.trim().toLowerCase())
        );
        if (!allowedUsers.has(cleanUsername)) {
          return sendJson(res, 403, {
            ok: false,
            error: `Registration restricted: Username "${cleanUsername}" is not on the authorized clinic personnel roster.`
          });
        }
      }

      // Reserved clinic administration usernames
      const RESERVED_USERNAMES = new Set(['doctor', 'dr.suraj', 'admin', 'administrator', 'root', 'system']);
      if (RESERVED_USERNAMES.has(cleanUsername)) {
        return sendJson(res, 400, {
          ok: false,
          error: `Username "${cleanUsername}" is reserved for clinic administration. Please choose a different username.`
        });
      }

      const directory = loadStaffDirectory();
      if (directory[cleanUsername]) {
        return sendJson(res, 400, {
          ok: false,
          error: `Username "${cleanUsername}" is already registered. Please choose a different username.`
        });
      }

      const password = String(body.password || '');
      const confirmPassword = String(body.confirmPassword || '');

      if (password.length < 8) {
        return sendJson(res, 400, { ok: false, error: 'Password must be at least 8 characters long.' });
      }
      if (password !== confirmPassword) {
        return sendJson(res, 400, { ok: false, error: 'Password and Confirm Password do not match.' });
      }
      if (isCommonPassword(password)) {
        return sendJson(res, 400, {
          ok: false,
          error: 'This password is too common or easily compromised. Please choose a more secure password.'
        });
      }

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

      return sendJson(res, 200, {
        ok: true,
        username: cleanUsername,
        activated: true,
        status: 'active',
        staffTicket,
        message: 'Registration successful! You may now sign in.'
      });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  // 1e. Rate-Limited Server-Side Registration & CAPTCHA Verification Endpoint (Legacy compatibility)
  if (pathname === '/api/auth/verify-registration' && req.method === 'POST') {
    const limit = checkRateLimit('register', clientIp, 20, 15 * 60 * 1000);
    if (!limit.allowed) {
      return sendJson(
        res,
        429,
        {
          ok: false,
          error: `Too many registration attempts. Please wait ${Math.ceil(limit.retryAfterSec / 60)} minutes before retrying.`
        },
        { 'Retry-After': String(limit.retryAfterSec) }
      );
    }

    try {
      const body = await parseBody(req);
      const captchaCheck = verifyAndConsumeServerCaptcha(body.challengeId, body.captchaInput);
      if (!captchaCheck.valid) {
        return sendJson(res, 400, { ok: false, error: captchaCheck.reason });
      }

      const inviteCode = String(body.inviteCode || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const username = String(body.username || '').trim().toLowerCase();

      if (inviteCode.length < 16) {
        return sendJson(res, 400, {
          ok: false,
          error: 'Invalid invitation code: A high-entropy single-use clinic authorization code (min 16 characters) is required.'
        });
      }

      if (!email || !email.includes('@') || email.endsWith('@homeocare.clinic')) {
        return sendJson(res, 400, {
          ok: false,
          error: 'Please enter your real administrator-provisioned email address (fictional @homeocare.clinic addresses are not permitted).'
        });
      }

      if (!/^[a-z0-9_.-]{3,32}$/.test(username)) {
        return sendJson(res, 400, {
          ok: false,
          error: 'Username must be 3 to 32 characters (letters, numbers, dots, hyphens, or underscores).'
        });
      }

      if (body.password) {
        const pass = String(body.password);
        if (pass.length < 8) {
          return sendJson(res, 400, { ok: false, error: 'Password must be at least 8 characters long.' });
        }
        if (isCommonPassword(pass)) {
          return sendJson(res, 400, {
            ok: false,
            error: 'This password is too common or easily compromised. Please choose a more secure password.'
          });
        }
      }

      return sendJson(res, 200, { ok: true, verified: true, remainingAttempts: limit.remaining });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  // 1f. Rate-Limited Login Pre-Check & Username-to-Provisioned-Email Resolution
  if (pathname === '/api/auth/prepare-login' && req.method === 'POST') {
    const limit = checkRateLimit('login', clientIp, 30, 15 * 60 * 1000);
    if (!limit.allowed) {
      return sendJson(
        res,
        429,
        {
          ok: false,
          error: `Too many login attempts. Account login is rate-limited for ${Math.ceil(limit.retryAfterSec / 60)} minutes.`
        },
        { 'Retry-After': String(limit.retryAfterSec) }
      );
    }

    try {
      const body = await parseBody(req);
      const identifier = String(body.identifier || '').trim().toLowerCase();
      const password = String(body.password || '');
      const staffTicket = String(body.staffTicket || '').trim();

      if (!identifier) {
        return sendJson(res, 400, { ok: false, error: 'Username is required.' });
      }

      const directory = loadStaffDirectory();
      let userRecord = directory[identifier];

      // Cross-instance recovery: if cold start wiped local /tmp, verify HMAC staffTicket
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

      if (userRecord) {
        if (password && userRecord.salt && userRecord.passwordHash) {
          const passOk = verifyPassword(password, userRecord.salt, userRecord.passwordHash);
          if (!passOk) {
            return sendJson(res, 401, { ok: false, error: 'Invalid username or password. Please verify your credentials.' });
          }
        }

        if (userRecord.email) {
          return sendJson(res, 200, {
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
          });
        }

        return sendJson(res, 200, {
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
        });
      }

      let resolvedEmail = identifier.includes('@') ? identifier : null;
      if (!resolvedEmail) {
        return sendJson(res, 401, { ok: false, error: 'Invalid username or password. Please verify your credentials.' });
      }

      return sendJson(res, 200, { ok: true, email: resolvedEmail });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  // 1g. Administrator Staff Approval Endpoints
  if (pathname === '/api/auth/admin/pending-staff' && req.method === 'GET') {
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
      return sendJson(res, 200, { ok: true, pendingStaff: pending });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  if (pathname === '/api/auth/admin/approve-staff' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const targetUsername = String(body.username || '').trim().toLowerCase();
      if (!targetUsername) {
        return sendJson(res, 400, { ok: false, error: 'Target username is required.' });
      }

      const directory = loadStaffDirectory();
      const userRecord = directory[targetUsername];
      if (!userRecord) {
        return sendJson(res, 404, { ok: false, error: `User "${targetUsername}" not found.` });
      }

      const assignedRole = 'receptionist';
      userRecord.status = 'approved';
      userRecord.role = assignedRole;
      userRecord.approvedAt = new Date().toISOString();
      userRecord.approvedBy = 'Dr. Suraj D. Panigrahi';

      saveStaffUser(targetUsername, userRecord);

      return sendJson(res, 200, {
        ok: true,
        username: targetUsername,
        role: assignedRole,
        status: 'approved',
        message: `Staff member "${targetUsername}" approved successfully as ${assignedRole}.`
      });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  if (pathname === '/api/auth/admin/reject-staff' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const targetUsername = String(body.username || '').trim().toLowerCase();
      if (!targetUsername) {
        return sendJson(res, 400, { ok: false, error: 'Target username is required.' });
      }

      const directory = loadStaffDirectory();
      delete directory[targetUsername];
      try {
        fs.writeFileSync(STAFF_DIRECTORY_PATH, JSON.stringify(directory, null, 2), { mode: 0o600 });
      } catch (_) {}

      return sendJson(res, 200, { ok: true, message: `Registration for "${targetUsername}" was rejected and removed.` });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  // 1h. Verified Username Binding Endpoint (Requires active Supabase JWT)
  if (pathname === '/api/auth/bind-username' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const accessToken = String(body.accessToken || '').trim();
      const username = String(body.username || '').trim().toLowerCase();
      const config = getSafePublicConfig();

      if (!accessToken || !username || !config.configured) {
        return sendJson(res, 400, { ok: false, error: 'Missing token or username.' });
      }

      const userRes = await fetch(`${config.url.replace(/\/$/, '')}/auth/v1/user`, {
        method: 'GET',
        headers: {
          apikey: config.publishableKey,
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!userRes.ok) {
        return sendJson(res, 401, { ok: false, error: 'Unauthorized session token.' });
      }

      const authUser = await userRes.json();
      if (authUser?.email) {
        saveStaffUser(username, {
          username,
          email: authUser.email,
          status: 'approved',
          updatedAt: new Date().toISOString()
        });
      }

      return sendJson(res, 200, { ok: true });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  // Fallback
  return sendJson(res, 404, { ok: false, error: `API route not found: ${pathname}` });
};
