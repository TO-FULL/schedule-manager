/* ===== 时砾 · 数据层 ===== */
(function () {
  const KEY = 'shili_store_v1';

  const CATEGORIES = [
    { id: 'work', name: '工作', color: '#6366f1' },
    { id: 'study', name: '学习', color: '#06b6d4' },
    { id: 'life', name: '生活', color: '#10b981' },
    { id: 'health', name: '健康', color: '#ef4444' },
    { id: 'fun', name: '娱乐', color: '#ec4899' },
  ];

  const COLORS = ['#6366f1', '#ec4899', '#06b6d4', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#0ea5e9'];

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function seed() {
    const t = todayStr();
    const cat = (id) => CATEGORIES.find(c => c.id === id);
    return {
      settings: { theme: 'light', workMin: 25, breakMin: 5, longBreakMin: 15, longEvery: 4, sound: true, notify: true },
      events: [
        { id: uid(), title: '团队周会', date: t, time: '10:00', duration: 60, category: 'work', note: '同步本周增长实验进度' },
        { id: uid(), title: '健身', date: t, time: '19:30', duration: 60, category: 'health', note: '' },
      ],
      tasks: [
        { id: uid(), title: '梳理 Q3 增长实验清单', note: '优先级排序 + 负责人', category: 'work', priority: 'high', due: t, done: false, doneAt: null, pomodoro: 0 },
        { id: uid(), title: '阅读《增长黑客》第 4 章', note: '', category: 'study', priority: 'medium', due: '', done: false, doneAt: null, pomodoro: 0 },
        { id: uid(), title: '采购周末食材', note: '', category: 'life', priority: 'low', due: '', done: true, doneAt: Date.now() - 86400000, pomodoro: 0 },
      ],
      habits: [
        { id: uid(), name: '阅读 30 分钟', emoji: '📚', color: '#6366f1', target: 7, records: {} },
        { id: uid(), name: '运动', emoji: '🏃', color: '#10b981', target: 5, records: {} },
        { id: uid(), name: '早睡 11 点前', emoji: '🌙', color: '#8b5cf6', target: 6, records: {} },
      ],
      pomodoros: [],
      targets: [
        { id: uid(), name: '产品评审', emoji: '🎯', date: offsetDate(14) },
        { id: uid(), name: '国庆假期', emoji: '🏖️', date: offsetDate(50) },
      ],
      notes: [
        { id: uid(), text: '灵感：把番茄钟与任务打通，统计每日专注时长。', color: '#fde68a', createdAt: Date.now() },
      ],
    };
  }

  function offsetDate(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  let data = null;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { data = JSON.parse(raw); return; }
    } catch (e) { console.warn('读取本地数据失败', e); }
    data = seed();
    save();
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { console.warn('保存失败', e); if (window.U) U.toast('⚠️ 保存失败，存储空间可能已满'); }
    if (typeof window !== 'undefined' && window.__onDataChange) {
      try { window.__onDataChange(); } catch (e) { console.warn('同步钩子失败', e); }
    }
  }

  function exportData() { return JSON.stringify(data, null, 2); }

  function importData(json) {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') throw new Error('格式错误');
    data = Object.assign(seed(), parsed);
    save();
  }

  function reset() { data = seed(); save(); }
  function get() { return data; }

  /* ===== 通用 CRUD ===== */
  const Store = {
    KEY, CATEGORIES, COLORS, uid, todayStr, offsetDate,
    load, save, get, exportData, importData, reset,
    cat: (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[0],

    // events
    addEvent(e) { data.events.push(Object.assign({ id: uid(), duration: 60, note: '', time: '09:00' }, e)); save(); },
    updateEvent(id, patch) { const i = data.events.findIndex(x => x.id === id); if (i >= 0) { Object.assign(data.events[i], patch); save(); } },
    removeEvent(id) { data.events = data.events.filter(x => x.id !== id); save(); },
    eventsOn(date) { return data.events.filter(e => e.date === date).sort((a, b) => (a.time || '').localeCompare(b.time || '')); },

    // tasks
    addTask(t) { data.tasks.unshift(Object.assign({ id: uid(), note: '', category: 'work', priority: 'medium', due: '', done: false, doneAt: null, pomodoro: 0 }, t)); save(); },
    updateTask(id, patch) { const i = data.tasks.findIndex(x => x.id === id); if (i >= 0) { Object.assign(data.tasks[i], patch); save(); } },
    removeTask(id) { data.tasks = data.tasks.filter(x => x.id !== id); save(); },
    toggleTask(id) { const t = data.tasks.find(x => x.id === id); if (t) { t.done = !t.done; t.doneAt = t.done ? Date.now() : null; save(); } },

    // habits
    addHabit(h) { data.habits.push(Object.assign({ id: uid(), emoji: '✅', color: COLORS[data.habits.length % COLORS.length], target: 7, records: {} }, h)); save(); },
    toggleHabit(id, date) { const h = data.habits.find(x => x.id === id); if (!h) return; if (h.records[date]) delete h.records[date]; else h.records[date] = true; save(); },
    updateHabit(id, patch) { const i = data.habits.findIndex(x => x.id === id); if (i >= 0) { Object.assign(data.habits[i], patch); save(); } },
    removeHabit(id) { data.habits = data.habits.filter(x => x.id !== id); save(); },

    // pomodoros
    addPomodoro(p) { data.pomodoros.push(Object.assign({ id: uid() }, p)); save(); },

    // targets
    addTarget(t) { data.targets.push(Object.assign({ id: uid() }, t)); save(); },
    removeTarget(id) { data.targets = data.targets.filter(x => x.id !== id); save(); },

    // notes
    addNote(n) { data.notes.unshift(Object.assign({ id: uid(), text: '', color: COLORS[Math.floor(Math.random() * COLORS.length)] + '33', createdAt: Date.now() }, n)); save(); },
    updateNote(id, patch) { const i = data.notes.findIndex(x => x.id === id); if (i >= 0) { Object.assign(data.notes[i], patch); save(); } },
    removeNote(id) { data.notes = data.notes.filter(x => x.id !== id); save(); },
  };

  window.Store = Store;
})();
