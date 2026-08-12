/* 数据读写接口 —— GET/PUT /api/data （需登录） */
const { setCors, sendJson, readBody, getToken } = require('./lib/http');
const { verifyToken } = require('./lib/auth');
const db = require('./lib/upstash');

const ALLOWED = ['settings', 'events', 'tasks', 'habits', 'pomodoros', 'targets', 'notes'];

function sanitize(obj) {
  const out = {};
  for (const k of ALLOWED) out[k] = Array.isArray(obj[k]) ? obj[k] : (obj[k] && typeof obj[k] === 'object' ? obj[k] : (k === 'settings' ? {} : []));
  if (!out.settings || typeof out.settings !== 'object') out.settings = {};
  return out;
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.statusCode = 204, res.end();

  let userId;
  try { userId = verifyToken(getToken(req)); }
  catch { userId = null; }
  if (!userId) return sendJson(res, 401, { error: '未登录或登录已过期' });

  const key = `data:${userId}`;
  try {
    if (req.method === 'GET') {
      const d = await db.getJSON(key);
      return sendJson(res, 200, { data: d || null });
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      const body = await readBody(req);
      if (!body || !body.data || typeof body.data !== 'object') return sendJson(res, 400, { error: '数据格式错误' });
      const payload = Object.assign({}, sanitize(body.data), { _meta: { updatedAt: Date.now() } });
      await db.setJSON(key, payload);
      return sendJson(res, 200, { ok: true, updatedAt: Date.now() });
    }
    return sendJson(res, 405, { error: '方法不允许' });
  } catch (e) {
    console.error('[data]', e);
    return sendJson(res, 500, { error: '服务器错误' });
  }
};
