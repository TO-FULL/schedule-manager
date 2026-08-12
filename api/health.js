/* 健康检查 —— GET /api/health （部署后用于验证接口是否通） */
const { setCors, sendJson } = require('./lib/http');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.statusCode = 204, res.end();
  return sendJson(res, 200, { ok: true, ts: Date.now() });
};
