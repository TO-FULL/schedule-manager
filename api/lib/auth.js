/* 认证工具：HMAC 签名 token + scrypt 密码哈希（零依赖） */
const crypto = require('crypto');
const SECRET = process.env.SYNC_SECRET || 'dev-insecure-secret-change-me';

function signToken(userId) {
  const exp = Date.now() + 30 * 24 * 3600 * 1000; // 30 天有效
  const payload = Buffer.from(`${userId}.${exp}`).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string' || token.split('.').length !== 2) return null;
  const [payload, sig] = token.split('.');
  let expected;
  try { expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url'); }
  catch { return null; }
  if (sig.length !== expected.length) return null;
  try { if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null; }
  catch { return null; }
  let userId, exp;
  try {
    const s = Buffer.from(payload, 'base64url').toString('utf8');
    const parts = s.split('.');
    userId = parts[0]; exp = Number(parts[1]);
  } catch { return null; }
  if (!userId || !Number.isFinite(exp) || Date.now() > exp) return null;
  return userId;
}

function hashPassword(pass) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(pass, salt, 64);
  return salt.toString('hex') + ':' + derived.toString('hex');
}

function verifyPassword(pass, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [saltHex, hashHex] = stored.split(':');
  let salt, derived, expected;
  try {
    salt = Buffer.from(saltHex, 'hex');
    derived = crypto.scryptSync(pass, salt, 64);
    expected = Buffer.from(hashHex, 'hex');
  } catch { return false; }
  try { return crypto.timingSafeEqual(derived, expected); }
  catch { return false; }
}

module.exports = { signToken, verifyToken, hashPassword, verifyPassword, SECRET };
