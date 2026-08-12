/* ===== 时砾 · 云端同步 ===== */
(function () {
  const API = '/api';
  const TOKEN_KEY = 'shili_sync_v1';
  const state = { token: null, email: null, status: 'off', lastSync: null, enabled: false };
  let pushTimer = null;

  function loadCreds() {
    try {
      const c = JSON.parse(localStorage.getItem(TOKEN_KEY));
      if (c && c.token) { state.token = c.token; state.email = c.email; state.enabled = true; }
    } catch (e) { /* ignore */ }
  }
  function saveCreds() {
    if (state.token) localStorage.setItem(TOKEN_KEY, JSON.stringify({ token: state.token, email: state.email }));
    else localStorage.removeItem(TOKEN_KEY);
  }

  function setHook() { window.__onDataChange = schedulePush; }
  function schedulePush() {
    if (!state.enabled) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(push, 1200);
  }

  async function push() {
    if (!state.enabled || !state.token) return;
    setState('syncing');
    try {
      const res = await fetch(API + '/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + state.token },
        body: JSON.stringify({ data: Store.get() }),
      });
      if (res.status === 401) { logout(true); return; }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      state.lastSync = Date.now();
      setState('ok');
    } catch (e) {
      console.warn('[sync] push failed', e);
      setState('error');
    }
  }

  async function pull() {
    const res = await fetch(API + '/data', { headers: { Authorization: 'Bearer ' + state.token } });
    if (res.status === 401) { logout(true); return null; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    return j.data;
  }

  function hasContent(d) {
    return !!(d && (d.events || []).length + (d.tasks || []).length + (d.habits || []).length + (d.pomodoros || []).length + (d.notes || []).length + (d.targets || []).length);
  }

  function writeLocal(obj) {
    const d = Store.get();
    const merged = {
      settings: Object.assign({ theme: 'light', workMin: 25, breakMin: 5, longBreakMin: 15, longEvery: 4, sound: true, notify: true }, obj.settings || {}),
      events: obj.events || [],
      tasks: obj.tasks || [],
      habits: obj.habits || [],
      pomodoros: obj.pomodoros || [],
      targets: obj.targets || [],
      notes: obj.notes || [],
    };
    Object.keys(d).forEach((k) => delete d[k]);
    Object.assign(d, merged);
    Store.save();
    if (window.App) App.refreshAll();
  }

  async function loginOrRegister(action, email, pass) {
    const res = await fetch(API + '/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, email, pass }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || '操作失败');
    state.token = j.token; state.email = j.email; state.enabled = true;
    saveCreds(); setHook();
    try {
      const cloud = await pull();
      if (cloud && hasContent(cloud)) {
        writeLocal(cloud);
        U.toast('☁️ 已从云端恢复数据');
      } else {
        await push();
        U.toast('☁️ 已创建云端备份');
      }
    } catch (e) {
      U.toast('登录成功，但同步失败：' + e.message);
    }
    setState('ok');
    return true;
  }

  function logout(silent) {
    state.token = null; state.email = null; state.enabled = false;
    saveCreds();
    if (window.__onDataChange) window.__onDataChange = null;
    if (!silent) U.toast('已退出登录，数据保留在本机');
    setState('off');
  }

  function setState(s) {
    state.status = s;
    renderStatus();
    const lo = document.getElementById('sync-logout');
    if (lo) lo.hidden = (s === 'off');
  }

  function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return s + '秒前';
    if (s < 3600) return Math.floor(s / 60) + '分前';
    return Math.floor(s / 3600) + '小时前';
  }

  function renderStatus() {
    const el = document.getElementById('sync-status');
    if (!el) return;
    const map = {
      off: '☁️ 未同步',
      syncing: '⟳ 同步中…',
      ok: '☁️ 已同步' + (state.lastSync ? ' · ' + timeAgo(state.lastSync) : ''),
      error: '⚠️ 同步失败',
    };
    el.textContent = map[state.status] || '';
    el.className = 'sync-status ' + state.status;
  }

  function openModal() {
    const m = U.modal({ title: '☁️ 云端同步', wide: false });
    m.body.innerHTML = `
      <div class="sync-tabs">
        <button class="sync-tab active" data-tab="login">登录</button>
        <button class="sync-tab" data-tab="register">注册</button>
      </div>
      <form id="sync-form" class="sync-form">
        <div class="field"><label>邮箱</label><input id="sync-email" type="email" placeholder="you@example.com" autocomplete="email" required></div>
        <div class="field"><label>密码</label><input id="sync-pass" type="password" placeholder="至少 6 位" autocomplete="current-password" required></div>
        <p class="sync-hint">数据保存在你的 Upstash Redis，仅你本人可访问；未登录时数据仍只存在本机浏览器。</p>
        <button type="submit" class="btn-primary" id="sync-submit">登录</button>
      </form>`;
    let tab = 'login';
    const submit = m.body.querySelector('#sync-submit');
    m.body.querySelectorAll('.sync-tab').forEach((b) => {
      b.onclick = () => {
        tab = b.dataset.tab; m.body.querySelectorAll('.sync-tab').forEach((x) => x.classList.toggle('active', x === b));
        submit.textContent = tab === 'login' ? '登录' : '注册并同步'; m.body.querySelector('#sync-pass').autocomplete = tab === 'login' ? 'current-password' : 'new-password';
      };
    });
    m.body.querySelector('#sync-form').onsubmit = async (e) => {
      e.preventDefault();
      const email = m.body.querySelector('#sync-email').value.trim();
      const pass = m.body.querySelector('#sync-pass').value;
      submit.disabled = true; submit.textContent = '处理中…';
      try {
        await loginOrRegister(tab, email, pass);
        U.closeModal(m.id);
      } catch (err) {
        U.toast('⚠️ ' + err.message);
        submit.disabled = false; submit.textContent = tab === 'login' ? '登录' : '注册并同步';
      }
    };
  }

  function bindHeader() {
    const btn = document.getElementById('sync-btn');
    if (btn) btn.onclick = () => { if (!state.enabled) openModal(); else { push(); U.toast('已触发同步'); } };
    const lo = document.getElementById('sync-logout');
    if (lo) lo.onclick = () => logout();
  }

  function init() {
    loadCreds();
    if (state.enabled) {
      setHook();
      setState('ok');
      // 后台静默拉取一次，保证多设备一致
      pull().then((cloud) => { if (cloud && hasContent(cloud)) writeLocal(cloud); }).catch(() => {});
    } else {
      setState('off');
    }
    bindHeader();
  }

  window.Sync = { init, open: openModal, loginOrRegister, push, pull, logout, get state() { return state; } };
})();
