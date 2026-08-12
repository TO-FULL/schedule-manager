/* ===== 时砾 · 主程序 ===== */
(function () {
  const VIEWS = {
    dashboard: { el: 'view-dashboard', title: '总览', fn: () => DashboardView.render() },
    calendar: { el: 'view-calendar', title: '日历', fn: () => CalendarView.render() },
    tasks: { el: 'view-tasks', title: '待办', fn: () => TasksView.render() },
    pomodoro: { el: 'view-pomodoro', title: '番茄钟', fn: () => PomodoroView.render() },
    habits: { el: 'view-habits', title: '习惯', fn: () => HabitsView.render() },
    notes: { el: 'view-notes', title: '便签', fn: () => NotesView.render() },
    data: { el: 'view-data', title: '数据', fn: () => DataView.render() },
  };
  let current = 'dashboard';

  function switchView(name) {
    if (!VIEWS[name]) return;
    current = name;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === name));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const v = document.getElementById(VIEWS[name].el);
    v.classList.add('active');
    document.getElementById('topbar-title').textContent = VIEWS[name].title;
    VIEWS[name].fn();
    document.querySelector('.sidebar')?.classList.remove('open');
  }

  function refreshBadge() {
    const n = Store.get().tasks.filter(t => !t.done).length;
    const badge = document.getElementById('nav-task-badge');
    badge.textContent = n;
    badge.style.display = n > 0 ? 'flex' : 'none';
  }

  function refreshAll() { refreshBadge(); VIEWS[current].fn(); }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('theme-toggle');
    btn.textContent = theme === 'dark' ? '🌜 深色' : '🌞 浅色';
    Store.get().settings.theme = theme; Store.save();
  }

  function startClock() {
    const tick = () => {
      const d = new Date();
      const w = '日一二三四五六'[d.getDay()];
      document.getElementById('topbar-clock').textContent =
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
      document.getElementById('topbar-date').textContent =
        `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 周${w}`;
    };
    tick(); setInterval(tick, 1000);
  }

  function init() {
    Store.load();
    applyTheme(Store.get().settings.theme || 'light');
    PomodoroView.init();
    if (window.Sync) Sync.init();
    startClock();
    refreshBadge();

    document.querySelectorAll('.nav-item').forEach(b => b.onclick = () => switchView(b.dataset.view));
    document.getElementById('theme-toggle').onclick = () => {
      const cur = document.documentElement.getAttribute('data-theme');
      applyTheme(cur === 'dark' ? 'light' : 'dark');
    };
    document.getElementById('menu-btn').onclick = () => document.querySelector('.sidebar').classList.toggle('open');

    switchView('dashboard');
    window.App = { refreshBadge, refreshAll, switchView };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
