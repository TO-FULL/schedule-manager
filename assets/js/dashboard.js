/* ===== 时砾 · 总览仪表盘 ===== */
(function () {
  function lastNDates(n) {
    const arr = [];
    for (let i = n - 1; i >= 0; i--) arr.push(U.addDays(new Date(), -i));
    return arr;
  }

  function render() {
    const root = document.getElementById('view-dashboard');
    const d = Store.get();
    const today = U.ymd(new Date());

    const active = d.tasks.filter(t => !t.done);
    const done = d.tasks.filter(t => t.done);
    const ps = d.pomodoros.filter(p => p.date === today);
    const focusMin = ps.reduce((s, p) => s + (p.minutes || 0), 0);
    const bestStreak = Math.max(0, ...d.habits.map(h => {
      let s = 0; let dt = new Date();
      if (!h.records[U.ymd(dt)]) dt = U.addDays(dt, -1);
      while (h.records[U.ymd(dt)]) { s++; dt = U.addDays(dt, -1); }
      return s;
    }));

    const statCards = `
      <div class="stat-card"><div class="i">✅</div><div class="v">${active.length}</div><div class="l">进行中任务</div></div>
      <div class="stat-card"><div class="i">🍅</div><div class="v">${ps.length}</div><div class="l">今日番茄</div></div>
      <div class="stat-card"><div class="i">⏱️</div><div class="v">${focusMin}</div><div class="l">今日专注(分)</div></div>
      <div class="stat-card"><div class="i">🔥</div><div class="v">${bestStreak}</div><div class="l">最长连续打卡</div></div>`;

    // 今日安排
    const todays = [
      ...d.events.filter(e => e.date === today).map(e => ({ type: 'ev', title: e.title, sub: `${e.time} · ${Store.cat(e.category).name}`, color: Store.cat(e.category).color })),
      ...d.tasks.filter(t => !t.done && t.due === today).map(t => ({ type: 'tk', title: t.title, sub: '今日截止', color: Store.cat(t.category).color })),
    ].sort((a, b) => a.sub.localeCompare(b.sub));
    const todayHtml = todays.length ? todays.map(x => `
      <div class="row">
        <span class="prio" style="background:${x.color}"></span>
        <span style="flex:1">${U.esc(x.title)}</span>
        <span class="chip">${U.esc(x.sub)}</span>
      </div>`).join('') : `<div class="empty" style="padding:20px"><span class="ico">🌤️</span>今天很轻松，没有安排</div>`;

    // 迷你日历
    const cells = U.monthMatrix(new Date().getFullYear(), new Date().getMonth());
    const evDates = {};
    d.events.forEach(e => evDates[e.date] = true);
    const mini = cells.map(date => {
      const ds = U.ymd(date);
      return `<div class="d ${ds === today ? 'today' : ''} ${evDates[ds] ? 'has' : ''}">${date.getDate()}</div>`;
    }).join('');

    // 近 7 天专注趋势
    const days = lastNDates(7);
    const focusPts = days.map(dt => {
      const ds = U.ymd(dt);
      const m = d.pomodoros.filter(p => p.date === ds).reduce((s, p) => s + (p.minutes || 0), 0);
      return { label: `${dt.getMonth() + 1}/${dt.getDate()}`, value: m };
    });
    const chart = U.lineChart(focusPts, '#4f46e5');

    // 目标倒计时
    const targets = d.targets.map(t => {
      const diff = U.daysBetween(today, t.date);
      return { ...t, diff };
    }).sort((a, b) => a.diff - b.diff);
    const targetHtml = targets.length ? targets.map(t => `
      <div class="target">
        <div class="emoji">${t.emoji}</div>
        <div class="info">
          <div class="name">${U.esc(t.name)}</div>
          <div class="dday">${U.fmtDateCN(t.date)}</div>
        </div>
        <div class="count">${t.diff >= 0 ? t.diff + ' 天' : '已过期'}</div>
        <button class="icon-btn" data-tdel="${t.id}" title="删除">🗑️</button>
      </div>`).join('') : `<div class="empty" style="padding:20px"><span class="ico">🎯</span>还没有设置目标</div>`;

    // 习惯概览
    const habitHtml = d.habits.slice(0, 4).map(h => {
      let s = 0; let dt = new Date();
      if (!h.records[U.ymd(dt)]) dt = U.addDays(dt, -1);
      while (h.records[U.ymd(dt)]) { s++; dt = U.addDays(dt, -1); }
      return `<div class="row"><span style="font-size:18px">${h.emoji}</span>
        <span style="flex:1">${U.esc(h.name)}</span>
        <span class="chip" style="background:${s ? 'var(--warn-soft)' : 'var(--bg-soft)'};color:${s ? 'var(--warn)' : 'var(--text-faint)'}">🔥 ${s} 天</span></div>`;
    }).join('') || `<div class="empty" style="padding:16px"><span class="ico">🌱</span>暂无习惯</div>`;

    root.innerHTML = `
      <div class="dash-grid">
        <div class="card full">
          <div class="card-title">👋 你好，小刘 · ${U.fmtDateCN(today)}</div>
          <div class="stat-cards">${statCards}</div>
        </div>

        <div class="card wide">
          <div class="card-title">📌 今日安排 <span class="sub">日程 + 今日截止任务</span></div>
          <div class="dash-todo">${todayHtml}</div>
        </div>

        <div class="card">
          <div class="card-title">📅 本月</div>
          <div class="mini-cal">${mini}</div>
          <div style="margin-top:12px;font-size:12px;color:var(--text-soft)">带 <span style="color:var(--primary)">●</span> 的日期有日程</div>
        </div>

        <div class="card wide">
          <div class="card-title">📈 近 7 天专注时长(分钟)</div>
          ${chart}
        </div>

        <div class="card">
          <div class="card-title">🔥 习惯概览</div>
          <div class="dash-todo">${habitHtml}</div>
        </div>

        <div class="card full">
          <div class="card-title">🎯 目标倒计时 <button class="btn sm soft" id="dash-add-target" style="margin-left:auto">＋ 添加目标</button></div>
          <div class="grid">${targetHtml}</div>
        </div>
      </div>`;

    root.querySelector('#dash-add-target').onclick = () => openTargetModal();
    root.querySelectorAll('[data-tdel]').forEach(b => b.onclick = () => { Store.removeTarget(b.dataset.tdel); render(); toast('已删除'); });
  }

  function openTargetModal() {
    const body = `
      <div class="field"><label>目标名称</label><input id="tg-name" placeholder="例如：产品上线 / 生日 / 旅行" /></div>
      <div class="field"><label>图标 Emoji</label><input id="tg-emoji" value="🎯" maxlength="2" /></div>
      <div class="field"><label>目标日期</label><input id="tg-date" type="date" value="${Store.offsetDate(30)}" /></div>`;
    U.modal({ title: '🎯 添加目标倒计时', body,
      footer: `<button class="btn ghost" data-close>取消</button><button class="btn" id="tg-save">添加</button>`,
      onMount: (m) => m.querySelector('#tg-save').onclick = () => {
        const name = m.querySelector('#tg-name').value.trim();
        if (!name) { U.toast('请填写目标名称'); return; }
        Store.addTarget({ name, emoji: m.querySelector('#tg-emoji').value || '🎯', date: m.querySelector('#tg-date').value });
        U.closeModal(); render(); toast('已添加目标');
      } });
  }

  window.DashboardView = { render };
})();
