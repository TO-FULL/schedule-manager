/* ===== 时砾 · 数据管理 ===== */
(function () {
  function render() {
    const root = document.getElementById('view-data');
    const d = Store.get();
    const json = Store.exportData();
    const sizeKB = (new Blob([json]).size / 1024).toFixed(1);

    root.innerHTML = `
      <div class="card">
        <div class="card-title">💾 数据存储</div>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">
          <div class="stat-card"><div class="v">${d.events.length}</div><div class="l">日程</div></div>
          <div class="stat-card"><div class="v">${d.tasks.length}</div><div class="l">任务</div></div>
          <div class="stat-card"><div class="v">${d.habits.length}</div><div class="l">习惯</div></div>
          <div class="stat-card"><div class="v">${d.pomodoros.length}</div><div class="l">番茄记录</div></div>
          <div class="stat-card"><div class="v">${d.notes.length}</div><div class="l">便签</div></div>
          <div class="stat-card"><div class="v">${sizeKB}K</div><div class="l">占用空间</div></div>
        </div>
        <p style="margin-top:14px;font-size:13px;color:var(--text-soft);line-height:1.7">
          🔒 所有数据仅保存在你当前浏览器的 <b>localStorage</b> 中，不会上传任何服务器。换浏览器或清理缓存会丢失数据，建议定期导出备份。
        </p>
      </div>

      <div class="card" style="margin-top:16px">
        <div class="card-title">⬇️⬆️ 备份与恢复</div>
        <div class="filters">
          <button class="btn" id="data-export">⬇️ 导出 JSON 备份</button>
          <button class="btn ghost" id="data-import">⬆️ 导入备份</button>
          <button class="btn danger" id="data-reset">🗑️ 清空所有数据</button>
          <input type="file" id="data-file" accept="application/json" hidden />
        </div>
        <div class="field" style="margin-top:8px">
          <label>当前数据预览（可直接复制保存）</label>
          <textarea readonly style="font-family:monospace;font-size:11px;min-height:140px;opacity:.8">${U.esc(json).slice(0, 4000)}${json.length > 4000 ? '\n... (已截断预览)' : ''}</textarea>
        </div>
      </div>`;

    root.querySelector('#data-export').onclick = () => {
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `时砾备份_${U.ymd(new Date())}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      U.toast('已导出备份');
    };
    root.querySelector('#data-import').onclick = () => root.querySelector('#data-file').click();
    root.querySelector('#data-file').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try { Store.importData(reader.result); U.closeModal && U.closeModal(); render(); App.refreshAll && App.refreshAll(); U.toast('导入成功'); }
        catch (err) { U.toast('导入失败：文件格式不正确'); }
      };
      reader.readAsText(file);
    };
    root.querySelector('#data-reset').onclick = () => {
      U.modal({ title: '⚠️ 确认清空', body: '<p style="color:var(--text-soft)">这将删除全部日程、任务、习惯、便签和番茄记录，且<b>无法恢复</b>。建议先导出备份。</p>',
        footer: `<button class="btn ghost" data-close>取消</button><button class="btn danger" id="cfm-reset">确认清空</button>`,
        onMount: (m) => m.querySelector('#cfm-reset').onclick = () => { Store.reset(); U.closeModal(); render(); App.refreshAll && App.refreshAll(); U.toast('已清空，恢复初始示例数据'); } });
    };
  }

  window.DataView = { render };
})();
