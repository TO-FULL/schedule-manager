/* ===== 时砾 · 番茄时钟 ===== */
(function () {
  const R = 126, C = 2 * Math.PI * R;
  let mode = 'work';            // work | break | long
  let total = 25 * 60, remaining = 25 * 60;
  let running = false, timer = null;
  let workCount = 0;            // 距离上次长休息已完成的工作番茄数
  let taskId = null;

  function dur() {
    const s = Store.get().settings;
    return (mode === 'work' ? s.workMin : mode === 'break' ? s.breakMin : s.longBreakMin) * 60;
  }
  function modeLabel() { return mode === 'work' ? '专注工作' : mode === 'break' ? '短暂休息' : '长休息'; }
  function ringColor() { return mode === 'work' ? 'var(--primary)' : '#10b981'; }

  function tick() {
    remaining--;
    if (remaining <= 0) { complete(); return; }
    paint();
  }

  function start() {
    if (running) return;
    U.ensureNotify();
    running = true;
    timer = setInterval(tick, 1000);
    paint();
  }
  function pause() { running = false; clearInterval(timer); paint(); }
  function reset() { pause(); total = dur(); remaining = total; paint(); }

  function switchMode(m) {
    mode = m; pause(); total = dur(); remaining = total; paint();
  }

  function complete() {
    clearInterval(timer); running = false;
    const s = Store.get().settings;
    if (s.sound) U.beep(mode === 'work' ? 3 : 2);
    U.notify(mode === 'work' ? '🍅 番茄完成！' : '☕ 休息结束', mode === 'work' ? '该休息一下了' : '继续加油，开始下一个番茄');

    if (mode === 'work') {
      Store.addPomodoro({ taskId, mode: 'work', date: U.ymd(new Date()), minutes: Store.get().settings.workMin });
      if (taskId) { const t = Store.get().tasks.find(x => x.id === taskId); if (t) Store.updateTask(taskId, { pomodoro: (t.pomodoro || 0) + 1 }); }
      workCount++;
      const next = (workCount % Math.max(1, s.longEvery) === 0) ? 'long' : 'break';
      switchMode(next);
      toast('🍅 完成一个番茄，去休息吧');
    } else {
      switchMode('work');
      toast('休息结束，开始下一个番茄');
    }
    if (Store.get().settings.autoStart) { /* 预留：自动开始下一轮 */ }
    render();
  }

  function paint() {
    const ring = document.getElementById('pomo-ring-prog');
    const timeEl = document.getElementById('pomo-time');
    if (!ring || !timeEl) return;
    const ratio = total > 0 ? remaining / total : 0;
    ring.style.strokeDasharray = C;
    ring.style.strokeDashoffset = C * (1 - ratio);
    ring.style.stroke = ringColor();
    const mm = Math.floor(remaining / 60), ss = remaining % 60;
    timeEl.textContent = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    document.getElementById('pomo-mode').textContent = modeLabel();
    const btn = document.getElementById('pomo-toggle');
    if (btn) btn.textContent = running ? '⏸ 暂停' : (remaining < total ? '▶ 继续' : '▶ 开始');
    document.title = (running ? '⏱ ' : '') + timeEl.textContent + ' · 时砾';
  }

  function openSettings() {
    const s = Store.get().settings;
    const body = `
      <div class="field" style="flex-direction:row;gap:12px;">
        <div style="flex:1"><label>工作(分钟)</label><input id="st-w" type="number" min="1" value="${s.workMin}"></div>
        <div style="flex:1"><label>短休(分钟)</label><input id="st-b" type="number" min="1" value="${s.breakMin}"></div>
        <div style="flex:1"><label>长休(分钟)</label><input id="st-l" type="number" min="1" value="${s.longBreakMin}"></div>
      </div>
      <div class="field" style="flex-direction:row;gap:12px;align-items:flex-end">
        <div style="flex:1"><label>每几个番茄长休</label><input id="st-n" type="number" min="1" value="${s.longEvery}"></div>
        <label style="display:flex;gap:8px;align-items:center;padding-bottom:10px;cursor:pointer">
          <input type="checkbox" id="st-snd" ${s.sound ? 'checked' : ''}/> 结束音
        </label>
        <label style="display:flex;gap:8px;align-items:center;padding-bottom:10px;cursor:pointer">
          <input type="checkbox" id="st-ntf" ${s.notify ? 'checked' : ''}/> 桌面通知
        </label>
      </div>`;
    U.modal({ title: '⚙️ 番茄钟设置', body,
      footer: `<button class="btn ghost" data-close>取消</button><button class="btn" id="st-save">保存</button>`,
      onMount: (m) => m.querySelector('#st-save').onclick = () => {
        Store.get().settings = Object.assign({}, s, {
          workMin: Math.max(1, +m.querySelector('#st-w').value || 25),
          breakMin: Math.max(1, +m.querySelector('#st-b').value || 5),
          longBreakMin: Math.max(1, +m.querySelector('#st-l').value || 15),
          longEvery: Math.max(1, +m.querySelector('#st-n').value || 4),
          sound: m.querySelector('#st-snd').checked,
          notify: m.querySelector('#st-ntf').checked,
        });
        Store.save();
        U.closeModal();
        if (!running) { total = dur(); remaining = total; }
        paint(); render(); toast('设置已保存');
      } });
  }

  function todayStats() {
    const d = Store.get();
    const t = U.ymd(new Date());
    const ps = d.pomodoros.filter(p => p.date === t);
    return { count: ps.length, minutes: ps.reduce((s, p) => s + (p.minutes || 0), 0) };
  }

  function render() {
    const root = document.getElementById('view-pomodoro');
    const d = Store.get();
    const active = d.tasks.filter(t => !t.done);
    const taskOpts = `<option value="">不关联任务</option>` +
      active.map(t => `<option value="${t.id}" ${taskId === t.id ? 'selected' : ''}>${U.esc(t.title)}</option>`).join('');
    const st = todayStats();

    root.innerHTML = `
      <div class="card">
        <div class="card-title">🍅 番茄工作法 <span class="sub">专注 25 分钟，休息 5 分钟，效率翻倍</span></div>
        <div class="pomo-wrap">
          <div class="pomo-mode-switch">
            <button data-m="work" class="${mode === 'work' ? 'active' : ''}">工作</button>
            <button data-m="break" class="${mode === 'break' ? 'active' : ''}">短休</button>
            <button data-m="long" class="${mode === 'long' ? 'active' : ''}">长休</button>
          </div>
          <div class="pomo-ring">
            <svg width="280" height="280" viewBox="0 0 280 280">
              <circle class="track" cx="140" cy="140" r="${R}"></circle>
              <circle class="prog" id="pomo-ring-prog" cx="140" cy="140" r="${R}"></circle>
            </svg>
            <div class="pomo-center">
              <div class="pomo-time" id="pomo-time">25:00</div>
              <div class="pomo-mode" id="pomo-mode">专注工作</div>
            </div>
          </div>
          <div class="pomo-controls">
            <button class="btn" id="pomo-toggle">▶ 开始</button>
            <button class="btn ghost" id="pomo-reset">↺ 重置</button>
            <button class="btn soft" id="pomo-set">⚙ 设置</button>
          </div>
        </div>
        <div style="display:flex;gap:16px;align-items:center;justify-content:center;flex-wrap:wrap;margin-top:4px">
          <span style="font-size:13px;color:var(--text-soft)">关联任务：</span>
          <select id="pomo-task" style="padding:8px 12px;border-radius:10px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:13px">${taskOpts}</select>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-title">📈 今日专注</div>
        <div class="pomo-stats">
          <div class="pomo-stat"><b>${st.count}</b><span>完成番茄</span></div>
          <div class="pomo-stat"><b>${st.minutes}</b><span>专注分钟</span></div>
          <div class="pomo-stat"><b>${workCount}</b><span>本轮累计</span></div>
        </div>
        <div style="margin-top:16px;font-size:13px;color:var(--text-soft);line-height:1.7">
          💡 小提示：把大任务拆成多个番茄，每完成一个就在任务上看到累计计数。连续 <b>${d.settings.longEvery}</b> 个番茄后自动进入长休息。
        </div>
      </div>`;

    root.querySelector('#pomo-toggle').onclick = () => running ? pause() : start();
    root.querySelector('#pomo-reset').onclick = () => { reset(); toast('已重置'); };
    root.querySelector('#pomo-set').onclick = openSettings;
    root.querySelectorAll('.pomo-mode-switch button').forEach(b => b.onclick = () => switchMode(b.dataset.m));
    root.querySelector('#pomo-task').onchange = (e) => { taskId = e.target.value || null; U.toast('已关联任务'); };
    taskId = taskId && d.tasks.find(t => t.id === taskId) ? taskId : null;
    paint();
  }

  // 初始未运行时展示设置时长
  function init() { total = dur(); remaining = total; }

  window.PomodoroView = { render, init };
})();
