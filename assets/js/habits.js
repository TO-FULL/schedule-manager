/* ===== 时砾 · 习惯打卡 ===== */
(function () {
  function computeStreak(records) {
    let streak = 0;
    let d = new Date();
    if (!records[U.ymd(d)]) d = U.addDays(d, -1); // 今天没打卡则从昨天起算
    while (records[U.ymd(d)]) { streak++; d = U.addDays(d, -1); }
    return streak;
  }

  function openHabitModal(habit) {
    const isEdit = !!habit;
    const colors = Store.COLORS;
    const colorBtns = colors.map(c => `<button data-c="${c}" class="${habit && habit.color === c ? 'sel' : ''}" style="background:${c}"></button>`).join('');
    const body = `
      <div class="field"><label>习惯名称</label><input id="hb-name" value="${U.esc(habit ? habit.name : '')}" placeholder="例如：早起 / 阅读 / 喝水" /></div>
      <div class="field" style="flex-direction:row;gap:12px">
        <div style="flex:1"><label>图标 Emoji</label><input id="hb-emoji" value="${habit ? habit.emoji : '✅'}" maxlength="2" /></div>
        <div style="flex:1"><label>每周目标(天)</label><input id="hb-target" type="number" min="1" max="7" value="${habit ? habit.target : 7}" /></div>
      </div>
      <div class="field"><label>颜色</label><div class="color-pick" id="hb-colors">${colorBtns}</div></div>`;
    const pick = () => (document.querySelector('#hb-colors .sel') || {}).dataset?.c || (habit ? habit.color : colors[0]);
    U.modal({ title: (isEdit ? '✏️ 编辑习惯' : '➕ 新建习惯'), body,
      footer: `<button class="btn ghost" data-close>取消</button>
        ${isEdit ? '<button class="btn danger" id="hb-del">删除</button>' : ''}
        <button class="btn" id="hb-save">保存</button>`,
      onMount: (m) => {
        m.querySelectorAll('#hb-colors button').forEach(b => b.onclick = () => {
          m.querySelectorAll('#hb-colors button').forEach(x => x.classList.remove('sel'));
          b.classList.add('sel');
        });
        m.querySelector('#hb-save').onclick = () => {
          const payload = {
            name: m.querySelector('#hb-name').value.trim() || '新习惯',
            emoji: m.querySelector('#hb-emoji').value || '✅',
            target: Math.min(7, Math.max(1, +m.querySelector('#hb-target').value || 7)),
            color: pick(),
          };
          if (isEdit) Store.updateHabit(habit.id, payload); else Store.addHabit(payload);
          U.closeModal(); render(); toast('已保存');
        };
        const del = m.querySelector('#hb-del');
        if (del) del.onclick = () => { Store.removeHabit(habit.id); U.closeModal(); render(); toast('已删除'); };
      } });
  }

  function render() {
    const root = document.getElementById('view-habits');
    const d = Store.get();
    const today = U.ymd(new Date());

    // 近 7 天
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const dt = U.addDays(new Date(), -i);
      days.push({ ds: U.ymd(dt), label: U.weekdayCN(dt) });
    }

    const cards = d.habits.map(h => {
      const streak = computeStreak(h.records);
      const weekCells = days.map(day => {
        const done = !!h.records[day.ds];
        return `<div class="habit-day ${done ? 'done' : ''} ${day.ds === today ? 'today' : ''}"
          style="${done ? 'background:' + h.color : ''}" data-h="${h.id}" data-d="${day.ds}" title="${day.ds}">
          ${done ? '✓' : day.label}</div>`;
      }).join('');
      const doneThisWeek = days.filter(day => h.records[day.ds]).length;
      return `<div class="habit-card">
        <div class="habit-top">
          <div class="habit-emoji" style="background:${h.color}22">${h.emoji}</div>
          <div style="flex:1">
            <div class="habit-name">${U.esc(h.name)}</div>
            <div class="habit-streak">🔥 连续 ${streak} 天</div>
          </div>
          <button class="icon-btn" data-edit="${h.id}" title="编辑">✏️</button>
        </div>
        <div class="habit-week">${weekCells}</div>
        <div style="margin-top:12px;font-size:12px;color:var(--text-soft)">
          本周 ${doneThisWeek}/${h.target} 天 · ${doneThisWeek >= h.target ? '🎉 已达标' : '继续坚持'}
        </div>
      </div>`;
    }).join('') || `<div class="empty" style="grid-column:1/-1"><span class="ico">🌱</span>还没有习惯，点右上角添加第一个</div>`;

    const monthDone = (() => {
      const ym = today.slice(0, 7);
      let total = 0;
      d.habits.forEach(h => Object.keys(h.records).forEach(k => { if (k.startsWith(ym)) total++; }));
      return total;
    })();

    root.innerHTML = `
      <div style="display:flex;align-items:center;margin-bottom:16px">
        <div>
          <div style="font-size:18px;font-weight:700">🔥 习惯打卡</div>
          <div style="font-size:12px;color:var(--text-soft);margin-top:2px">本月累计打卡 <b style="color:var(--primary)">${monthDone}</b> 次</div>
        </div>
        <button class="btn sm" id="hb-add" style="margin-left:auto">＋ 新建习惯</button>
      </div>
      <div class="habit-grid">${cards}</div>`;

    root.querySelector('#hb-add').onclick = () => openHabitModal(null);
    root.querySelectorAll('[data-edit]').forEach(el => el.onclick = () => openHabitModal(d.habits.find(x => x.id === el.dataset.edit)));
    root.querySelectorAll('.habit-day').forEach(el => el.onclick = () => {
      Store.toggleHabit(el.dataset.h, el.dataset.d); render();
      if (el.dataset.d === today) App.refreshBadge && App.refreshBadge();
    });
  }

  window.HabitsView = { render };
})();
