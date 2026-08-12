/* ===== 时砾 · 待办清单 ===== */
(function () {
  let filter = { status: 'active', cat: 'all', q: '' };

  const PRIO = { high: { name: '高', color: '#ef4444' }, medium: { name: '中', color: '#f59e0b' }, low: { name: '低', color: '#94a3b8' } };

  function openTaskModal(task) {
    const isEdit = !!task;
    const d = Store.get();
    const catOpts = Store.CATEGORIES.map(c =>
      `<option value="${c.id}" ${task && task.category === c.id ? 'selected' : ''}>${c.name}</option>`).join('');
    const prioOpts = Object.entries(PRIO).map(([k, v]) =>
      `<option value="${k}" ${task && task.priority === k ? 'selected' : ''}>${v.name}优先级</option>`).join('');
    const body = `
      <div class="field"><label>任务标题</label><input id="tk-title" value="${U.esc(task ? task.title : '')}" placeholder="要完成的事情" /></div>
      <div class="field"><label>备注</label><textarea id="tk-note" placeholder="拆解步骤 / 上下文 ...">${U.esc(task ? task.note : '')}</textarea></div>
      <div class="field" style="flex-direction:row;gap:12px;">
        <div style="flex:1"><label>分类</label><select id="tk-cat">${catOpts}</select></div>
        <div style="flex:1"><label>优先级</label><select id="tk-prio">${prioOpts}</select></div>
      </div>
      <div class="field"><label>截止日期（可选）</label><input id="tk-due" type="date" value="${task ? task.due : ''}" /></div>`;
    U.modal({
      title: (isEdit ? '✏️ 编辑任务' : '➕ 新建任务'), body,
      footer: `<button class="btn ghost" data-close>取消</button>
        ${isEdit ? '<button class="btn danger" id="tk-del">删除</button>' : ''}
        <button class="btn" id="tk-save">保存</button>`,
      onMount: (m) => {
        m.querySelector('#tk-save').onclick = () => {
          const payload = {
            title: m.querySelector('#tk-title').value.trim() || '未命名任务',
            note: m.querySelector('#tk-note').value.trim(),
            category: m.querySelector('#tk-cat').value,
            priority: m.querySelector('#tk-prio').value,
            due: m.querySelector('#tk-due').value,
          };
          if (isEdit) Store.updateTask(task.id, payload); else Store.addTask(payload);
          U.closeModal(); render(); App.refreshBadge(); toast(isEdit ? '已更新' : '已添加任务');
        };
        const del = m.querySelector('#tk-del');
        if (del) del.onclick = () => { Store.removeTask(task.id); U.closeModal(); render(); App.refreshBadge(); toast('已删除'); };
      }
    });
  }

  function dueState(t) {
    if (t.done) return { cls: '', text: '已完成' };
    if (!t.due) return { cls: '', text: '' };
    const diff = U.daysBetween(U.ymd(new Date()), t.due);
    if (diff < 0) return { cls: 'danger', text: `逾期${-diff}天` };
    if (diff === 0) return { cls: 'warn', text: '今天截止' };
    if (diff <= 2) return { cls: 'warn', text: `${diff}天后` };
    return { cls: '', text: `${diff}天后` };
  }

  function render() {
    const root = document.getElementById('view-tasks');
    const d = Store.get();
    let list = d.tasks.slice();

    if (filter.q) list = list.filter(t => t.title.includes(filter.q) || (t.note || '').includes(filter.q));
    if (filter.cat !== 'all') list = list.filter(t => t.category === filter.cat);
    if (filter.status === 'active') list = list.filter(t => !t.done);
    if (filter.status === 'done') list = list.filter(t => t.done);

    const order = { high: 0, medium: 1, low: 2 };
    list.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.due && b.due) return a.due.localeCompare(b.due);
      if (a.due && !b.due) return -1;
      return order[a.priority] - order[b.priority];
    });

    const total = d.tasks.length;
    const active = d.tasks.filter(t => !t.done).length;
    const done = total - active;

    const chips = [
      { k: 'all', t: `全部 ${total}` }, { k: 'active', t: `进行中 ${active}` }, { k: 'done', t: `已完成 ${done}` }
    ].map(s => `<span class="chip ${filter.status === s.k ? 'active' : ''}" data-st="${s.k}">${s.t}</span>`).join('');
    const catChips = [{ id: 'all', name: '全部分类' }, ...Store.CATEGORIES]
      .map(c => `<span class="chip ${filter.cat === c.id ? 'active' : ''}" data-cat="${c.id}">${c.name}</span>`).join('');

    const items = list.map(t => {
      const c = Store.cat(t.category);
      const ds = dueState(t);
      const prio = PRIO[t.priority];
      return `<div class="task ${t.done ? 'done' : ''}" data-id="${t.id}">
        <div class="check ${t.done ? 'on' : ''}" data-toggle="${t.id}">✓</div>
        <div class="task-body">
          <div class="task-title">${U.esc(t.title)}
            <span class="prio" style="background:${prio.color}" title="${prio.name}优先级"></span>
            <span class="chip" style="background:${c.color}22;color:${c.color}">${c.name}</span>
          </div>
          ${t.note ? `<div style="font-size:12px;color:var(--text-soft);margin-top:5px">${U.esc(t.note)}</div>` : ''}
          <div class="task-meta">
            ${t.due ? `<span class="chip ${ds.cls}">📅 ${U.fmtDateCN(t.due)}${ds.text ? ' · ' + ds.text : ''}</span>` : ''}
            ${t.pomodoro ? `<span class="chip">🍅 ${t.pomodoro} 个番茄</span>` : ''}
          </div>
        </div>
        <div class="task-actions">
          <button class="icon-btn" data-edit="${t.id}" title="编辑">✏️</button>
          <button class="icon-btn" data-del="${t.id}" title="删除">🗑️</button>
        </div>
      </div>`;
    }).join('') || `<div class="empty"><span class="ico">🎉</span>${filter.status === 'done' ? '还没有已完成的任务' : '没有匹配的任务，去添加一个吧'}</div>`;

    root.innerHTML = `
      <div class="filters">
        ${chips}
        <span style="width:1px;height:20px;background:var(--border);margin:0 4px"></span>
        ${catChips}
        <input id="tk-search" placeholder="🔍 搜索任务" value="${U.esc(filter.q)}"
          style="margin-left:auto;padding:7px 12px;border-radius:9px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:13px;width:160px" />
        <button class="btn sm" id="tk-add">＋ 新建任务</button>
      </div>
      <div class="list">${items}</div>`;

    root.querySelector('#tk-add').onclick = () => openTaskModal(null);
    root.querySelector('#tk-search').oninput = (e) => { filter.q = e.target.value; render(); };
    root.querySelectorAll('[data-st]').forEach(el => el.onclick = () => { filter.status = el.dataset.st; render(); });
    root.querySelectorAll('[data-cat]').forEach(el => el.onclick = () => { filter.cat = el.dataset.cat; render(); });
    root.querySelectorAll('[data-toggle]').forEach(el => el.onclick = (e) => {
      e.stopPropagation(); Store.toggleTask(el.dataset.toggle); render(); App.refreshBadge();
    });
    root.querySelectorAll('[data-edit]').forEach(el => el.onclick = (e) => {
      e.stopPropagation(); openTaskModal(d.tasks.find(x => x.id === el.dataset.edit));
    });
    root.querySelectorAll('[data-del]').forEach(el => el.onclick = (e) => {
      e.stopPropagation();
      const id = el.dataset.del;
      U.modal({ title: '🗑️ 确认删除', body: '<p style="color:var(--text-soft)">确定要删除这个任务吗？此操作不可撤销。</p>',
        footer: `<button class="btn ghost" data-close>取消</button><button class="btn danger" id="cfm">删除</button>`,
        onMount: (m) => m.querySelector('#cfm').onclick = () => { Store.removeTask(id); U.closeModal(); render(); App.refreshBadge(); toast('已删除'); } });
    });
  }

  window.TasksView = { render };
})();
