/* ===== 时砾 · 便签 ===== */
(function () {
  function fmt(ts) {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function render() {
    const root = document.getElementById('view-notes');
    const d = Store.get();
    const pastels = ['#fde68a', '#bfdbfe', '#bbf7d0', '#fbcfe8', '#ddd6fe', '#fecaca', '#a7f3d0'];

    const cards = d.notes.map(n => `
      <div class="note" style="background:${n.color}">
        <textarea data-id="${n.id}" placeholder="写点什么...">${U.esc(n.text)}</textarea>
        <div class="note-foot">
          <span>${fmt(n.createdAt)}</span>
          <span style="display:flex;gap:6px">
            <button class="icon-btn" data-color="${n.id}" title="换色" style="background:rgba(0,0,0,.08);color:#3a3320">🎨</button>
            <button class="icon-btn" data-del="${n.id}" title="删除" style="background:rgba(0,0,0,.08);color:#3a3320">✕</button>
          </span>
        </div>
      </div>`).join('');

    root.innerHTML = `
      <div style="display:flex;align-items:center;margin-bottom:16px">
        <div>
          <div style="font-size:18px;font-weight:700">📝 便签速记</div>
          <div style="font-size:12px;color:var(--text-soft);margin-top:2px">灵感、待想、随手记 —— 实时自动保存</div>
        </div>
        <span style="margin-left:auto;font-size:13px;color:var(--text-faint)">${d.notes.length} 张</span>
      </div>
      <div class="notes-grid">
        <div class="note-add" id="note-add">＋</div>
        ${cards}
      </div>`;

    root.querySelector('#note-add').onclick = () => { Store.addNote({}); render(); toast('已新建便签'); };

    root.querySelectorAll('textarea[data-id]').forEach(ta => {
      ta.oninput = (e) => Store.updateNote(e.target.dataset.id, { text: e.target.value });
    });
    root.querySelectorAll('[data-color]').forEach(b => b.onclick = () => {
      const n = d.notes.find(x => x.id === b.dataset.color);
      const idx = Store.COLORS.indexOf(n.color.replace('33', ''));
      const next = (Store.COLORS[(idx + 1 + Store.COLORS.length) % Store.COLORS.length] || '#fde68a') + '33';
      Store.updateNote(b.dataset.color, { color: next }); render();
    });
    root.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      Store.removeNote(b.dataset.del); render(); toast('已删除便签');
    });
  }

  window.NotesView = { render };
})();
