/* ===== 时砾 · 日历视图 ===== */
(function () {
  let cur = new Date(); // 当前展示月份
  let selected = U.ymd(new Date());

  function openEventModal(dateStr, ev) {
    const isEdit = !!ev;
    const title = isEdit ? '编辑日程' : '新建日程';
    const d = Store.get();
    const catOpts = Store.CATEGORIES.map(c =>
      `<option value="${c.id}" ${ev && ev.category === c.id ? 'selected' : ''}>${c.name}</option>`).join('');
    const body = `
      <div class="field"><label>标题</label><input id="ev-title" value="${U.esc(ev ? ev.title : '')}" placeholder="例如：需求评审会" /></div>
      <div class="field"><label>日期</label><input id="ev-date" type="date" value="${ev ? ev.date : dateStr}" /></div>
      <div class="field" style="flex-direction:row;gap:12px;">
        <div style="flex:1"><label>时间</label><input id="ev-time" type="time" value="${ev ? ev.time : '09:00'}" /></div>
        <div style="flex:1"><label>时长(分钟)</label><input id="ev-dur" type="number" min="0" value="${ev ? ev.duration : 60}" /></div>
      </div>
      <div class="field"><label>分类</label><select id="ev-cat">${catOpts}</select></div>
      <div class="field"><label>备注</label><textarea id="ev-note" placeholder="会议链接 / 要点 ...">${U.esc(ev ? ev.note : '')}</textarea></div>`;
    U.modal({
      title: (isEdit ? '✏️ ' : '➕ ') + title, body,
      footer: `<button class="btn ghost" data-close>取消</button>
        ${isEdit ? '<button class="btn danger" id="ev-del">删除</button>' : ''}
        <button class="btn" id="ev-save">保存</button>`,
      onMount: (m) => {
        m.querySelector('#ev-save').onclick = () => {
          const payload = {
            title: m.querySelector('#ev-title').value.trim() || '未命名日程',
            date: m.querySelector('#ev-date').value,
            time: m.querySelector('#ev-time').value || '09:00',
            duration: Number(m.querySelector('#ev-dur').value) || 0,
            category: m.querySelector('#ev-cat').value,
            note: m.querySelector('#ev-note').value.trim(),
          };
          if (isEdit) Store.updateEvent(ev.id, payload); else Store.addEvent(payload);
          U.closeModal(); render(); toast(isEdit ? '已更新' : '已添加日程');
        };
        const del = m.querySelector('#ev-del');
        if (del) del.onclick = () => { Store.removeEvent(ev.id); U.closeModal(); render(); toast('已删除'); };
      }
    });
  }

  function render() {
    const root = document.getElementById('view-calendar');
    const y = cur.getFullYear(), m = cur.getMonth();
    const cells = U.monthMatrix(y, m);
    const d = Store.get();
    const evMap = {};
    d.events.forEach(e => { (evMap[e.date] = evMap[e.date] || []).push(e); });

    const today = U.ymd(new Date());
    let grid = cells.map(date => {
      const ds = U.ymd(date);
      const inMonth = date.getMonth() === m;
      const list = evMap[ds] || [];
      const dots = list.slice(0, 2).map(e => {
        const c = Store.cat(e.category).color;
        return `<span class="cal-dot" style="background:${c}">${U.esc(e.time ? e.time + ' ' : '')}${U.esc(e.title)}</span>`;
      }).join('');
      const more = list.length > 2 ? `<span class="cal-more">+${list.length - 2}</span>` : '';
      return `<div class="cal-cell ${inMonth ? '' : 'other'} ${ds === today ? 'today' : ''} ${ds === selected ? 'sel' : ''}" data-date="${ds}">
        <span class="cal-day">${date.getDate()}</span>
        <div class="cal-events">${dots}${more}</div>
      </div>`;
    }).join('');

    const selEvents = (evMap[selected] || []).map(e => {
      const c = Store.cat(e.category);
      return `<div class="task">
        <div class="task-body">
          <div class="task-title" style="display:flex;align-items:center;gap:8px;">
            <span class="prio" style="background:${c.color}"></span>${U.esc(e.title)}
            <span class="chip">${U.esc(c.name)}</span>
            <span class="chip">${U.esc(e.time)}${e.duration ? ' · ' + e.duration + '分钟' : ''}</span>
          </div>
          ${e.note ? `<div style="font-size:12px;color:var(--text-soft);margin-top:6px">${U.esc(e.note)}</div>` : ''}
        </div>
        <div class="task-actions">
          <button class="icon-btn" data-edit="${e.id}" title="编辑">✏️</button>
          <button class="icon-btn" data-del="${e.id}" title="删除">🗑️</button>
        </div>
      </div>`;
    }).join('') || `<div class="empty"><span class="ico">📭</span>这一天还没有安排</div>`;

    root.innerHTML = `
      <div class="card">
        <div class="cal-head">
          <h2>${y}年 ${U.MONTHS[m]}</h2>
          <div class="cal-nav">
            <button id="cal-prev">‹</button>
            <button class="btn soft sm" id="cal-today">今天</button>
            <button id="cal-next">›</button>
          </div>
          <button class="btn sm" id="cal-add" style="margin-left:auto">＋ 新建日程</button>
        </div>
        <div class="cal-grid">
          ${['日', '一', '二', '三', '四', '五', '六'].map(x => `<div class="cal-dow">${x}</div>`).join('')}
          ${grid}
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-title">📌 ${U.fmtDateCN(selected)} 的安排 <span class="sub">点击日期查看</span></div>
        <div class="list">${selEvents}</div>
      </div>`;

    root.querySelectorAll('.cal-cell').forEach(c => c.onclick = () => { selected = c.dataset.date; render(); });
    root.querySelector('#cal-prev').onclick = () => { cur = U.addDays(new Date(y, m, 1), -1); render(); };
    root.querySelector('#cal-next').onclick = () => { cur = new Date(y, m + 1, 1); render(); };
    root.querySelector('#cal-today').onclick = () => { cur = new Date(); selected = today; render(); };
    root.querySelector('#cal-add').onclick = () => openEventModal(selected);
    root.querySelectorAll('[data-edit]').forEach(b => b.onclick = (e) => {
      e.stopPropagation();
      openEventModal(selected, d.events.find(x => x.id === b.dataset.edit));
    });
    root.querySelectorAll('[data-del]').forEach(b => b.onclick = (e) => {
      e.stopPropagation(); Store.removeEvent(b.dataset.del); render(); toast('已删除');
    });
  }

  window.CalendarView = { render };
})();
