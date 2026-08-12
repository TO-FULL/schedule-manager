/* 注册 / 登录接口 —— POST /api/auth */
const crypto = require('crypto');
const { setCors, sendJson, readBody } = require('./lib/http');
const { signToken, hashPassword, verifyPassword } = require('./lib/auth');
const db = require('./lib/upstash');

const emailKey = (e) => `user:email:${e.toLowerCase().trim()}`;
const userKey = (id) => `user:${id}`;
const dataKey = (id) => `data:${id}`;

function emptyStore() {
  return {
    settings: { theme: 'light', workMin: 25, breakMin: 5, longBreakMin: 15, longEvery: 4, sound: true, notify: true },
    events: [], tasks: [], habits: [], pomodoros: [], targets: [], notes: [],
  };
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.statusCode = 204, res.end();
  try {
    const body = await readBody(req);
    const action = body && body.action;
    const email = (body.email || '').toLowerCase().trim();
    const pass = body.pass || '';

    if (action === 'register') {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return sendJson(res, 400, { error: '邮箱格式不正确' });
      if (pass.length < 6) return sendJson(res, 400, { error: '密码至少 6 位' });
      const existing = await db.getJSON(emailKey(email));
      if (existing) return sendJson(res, 409, { error: '该邮箱已注册，请直接登录' });
      const user = {
        id: crypto.randomUUID(),
        email,
        passHash: hashPassword(pass),
        createdAt: Date.now(),
      };
      await db.setJSON(userKey(user.id), user);
      await db.setJSON(emailKey(email), { id: user.id });
      await db.setJSON(dataKey(user.id), Object.assign({}, emptyStore(), { _meta: { updatedAt: Date.now() } }));
      const token = signToken(user.id);
      return sendJson(res, 200, { token, email: user.email });
    }

    if (action === 'login') {
      const ref = await db.getJSON(emailKey(email));
      if (!ref) return sendJson(res, 401, { error: '该邮箱未注册' });
      const user = await db.getJSON(userKey(ref.id));
      if (!user || !verifyPassword(pass, user.passHash)) return sendJson(res, 401, { error: '邮箱或密码错误' });
      const token = signToken(user.id);
      return sendJson(res, 200, { token, email: user.email });
    }

    return sendJson(res, 400, { error: '未知操作' });
  } catch (e) {
    console.error('[auth]', e);
    return sendJson(res, 500, { error: '服务器错误' });
  }
};
