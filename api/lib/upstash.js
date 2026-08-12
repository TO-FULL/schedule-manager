/* Upstash Redis REST 封装 —— 零 npm 依赖，直接用内置 fetch 调用 Upstash REST API */
const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function call(command, ...args) {
  if (!URL || !TOKEN) {
    throw new Error('Upstash 环境变量未配置 (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)');
  }
  const res = await fetch(URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([command, ...args]),
  });
  if (!res.ok) throw new Error('Upstash HTTP ' + res.status);
  const j = await res.json();
  if (j.error) throw new Error('Upstash: ' + j.error);
  return j.result;
}

async function get(key) { return call('GET', key); }
async function set(key, value) { return call('SET', key, value); }
async function del(key) { return call('DEL', key); }

async function getJSON(key) {
  const v = await get(key);
  if (v == null) return null;
  try { return JSON.parse(v); } catch { return null; }
}

async function setJSON(key, value) { return set(key, JSON.stringify(value)); }

module.exports = { call, get, set, del, getJSON, setJSON };
