/**
 * HomeoCare Production Build & Static Asset Isolation Script
 * Clinic: Shri Siddhivinayak Clinic | Dr. Suraj D. Panigrahi
 *
 * 1. Validates all required frontend and serverless backend files.
 * 2. Performs syntax checks on all JavaScript modules.
 * 3. Assembles an isolated `public/` output directory containing ONLY safe
 *    client-side assets so that `.env`, `.staff-directory.json`, `database/*.sql`,
 *    `server.js`, `verify-supabase.js`, and `package.json` are NEVER publicly served.
 * 4. Injects safe public `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` globals into
 *    `public/supabase-client.js` when provided at build time (after verifying no
 *    secret/service_role key is present).
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const REQUIRED_SOURCE_FILES = [
  'index.html',
  'style.css',
  'app.js',
  'supabase-client.js',
  'server.js',
  'api/index.js',
  'api/[...path].js',
  'lucide.min.js',
  'supabase.min.js',
  'manifest.json',
  'sw.js'
];

const SAFE_PUBLIC_FILES = [
  'index.html',
  'style.css',
  'app.js',
  'supabase-client.js',
  'lucide.min.js',
  'supabase.min.js',
  'manifest.json',
  'sw.js'
];

const SAFE_PUBLIC_DIRS = [
  'icons',
  '.well-known'
];

const FORBIDDEN_IN_PUBLIC = [
  '.env',
  '.env.local',
  '.staff-directory.json',
  'server.js',
  'verify-supabase.js',
  'package.json',
  'database'
];

function isForbiddenSecretKey(key) {
  if (!key) return false;
  const trimmed = String(key).trim();
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

function copyRecursiveSync(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursiveSync(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

console.log('=== HomeoCare Production Build & Security Verification ===\n');

let hasErrors = false;

// 1. Verify required source files exist
for (const file of REQUIRED_SOURCE_FILES) {
  const filePath = path.join(ROOT_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.error(`[FAIL] Required file missing: ${file}`);
    hasErrors = true;
  } else {
    const stats = fs.statSync(filePath);
    console.log(`[OK] Verified source: ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
  }
}

// 2. Syntax check JS files using Node's vm.Script compiler
const JS_FILES = ['app.js', 'supabase-client.js', 'server.js', 'api/index.js', 'api/[...path].js', 'sw.js'];
for (const jsFile of JS_FILES) {
  const fullPath = path.join(ROOT_DIR, jsFile);
  if (fs.existsSync(fullPath)) {
    try {
      const code = fs.readFileSync(fullPath, 'utf-8');
      new vm.Script(code, { filename: jsFile });
      console.log(`[OK] Syntax check passed: ${jsFile}`);
    } catch (syntaxErr) {
      console.error(`[FAIL] Syntax error in ${jsFile}: ${syntaxErr.message}`);
      hasErrors = true;
    }
  }
}

if (hasErrors) {
  console.error('\nBuild verification FAILED prior to asset packaging.');
  process.exit(1);
}

// 3. Assemble isolated `public/` directory for Vercel static output
if (fs.existsSync(PUBLIC_DIR)) {
  fs.rmSync(PUBLIC_DIR, { recursive: true, force: true });
}
fs.mkdirSync(PUBLIC_DIR, { recursive: true });

for (const file of SAFE_PUBLIC_FILES) {
  const srcPath = path.join(ROOT_DIR, file);
  const destPath = path.join(PUBLIC_DIR, file);
  fs.copyFileSync(srcPath, destPath);
}

for (const dir of SAFE_PUBLIC_DIRS) {
  const srcDir = path.join(ROOT_DIR, dir);
  const destDir = path.join(PUBLIC_DIR, dir);
  if (fs.existsSync(srcDir)) {
    copyRecursiveSync(srcDir, destDir);
    console.log(`[OK] Copied static directory to public/${dir}`);
  }
}

// 4. Optional build-time injection of safe public Supabase config into public/supabase-client.js
const envUrl = (process.env.SUPABASE_URL || '').trim();
const envKey = (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

if (isForbiddenSecretKey(envKey)) {
  console.error('[SECURITY BLOCK] SUPABASE_PUBLISHABLE_KEY contains a secret/service_role key! Aborting build.');
  process.exit(1);
}

if (envUrl && envKey) {
  const clientJsPath = path.join(PUBLIC_DIR, 'supabase-client.js');
  const originalClientJs = fs.readFileSync(clientJsPath, 'utf-8');
  const injectedBanner = [
    `window.__HOMEOCARE_SUPABASE_URL = ${JSON.stringify(envUrl)};`,
    `window.__HOMEOCARE_SUPABASE_PUBLISHABLE_KEY = ${JSON.stringify(envKey)};`,
    `window.__HOMEOCARE_SUPABASE_ANON_KEY = ${JSON.stringify(envKey)};`
  ].join('\n');
  fs.writeFileSync(clientJsPath, `${injectedBanner}\n\n${originalClientJs}`, 'utf-8');
  console.log('[OK] Injected safe public Supabase URL & Publishable Key into public/supabase-client.js');
} else {
  console.log('[INFO] Build-time SUPABASE_URL not set in environment; public/supabase-client.js will fetch /api/supabase-config at runtime.');
}

// 5. Security audit of `public/` output directory
for (const forbidden of FORBIDDEN_IN_PUBLIC) {
  if (fs.existsSync(path.join(PUBLIC_DIR, forbidden))) {
    console.error(`[SECURITY FAIL] Forbidden file/folder found in public/: ${forbidden}`);
    process.exit(1);
  }
}

console.log('\n[SECURITY OK] Confirmed .env, .staff-directory.json, database/*.sql, and backend source are excluded from public/.');
console.log('=== Build verification PASSED: public/ directory is ready for Vercel deployment ===');
