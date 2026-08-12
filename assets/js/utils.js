/* ===== 时砾 · 工具函数 ===== */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  function esc(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---- Toast ---- */
  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
  }

  /* ---- Modal ---- */
  function modal({ title, body, footer, onMount }) {
    const layer = $('#modal-layer');
    layer.innerHTML = `
      <div class="modal-mask" data-close></div>
      <div class="modal">
        ${title ? `<h3>${esc(title)}</h3>` : ''}
        <div class="modal-body">${body}</div>
        <div class="modal-foot">${footer || ''}</div>
      </div>`;
    layer.classList.add('show');
    layer.querySelectorAll('[data-close]').forEach(b => b.onclick = closeModal);
    if (onMount) onMount(layer.querySelector('.modal'));
    return layer;
  }
  function closeModal() {
    const layer = $('#modal-layer');
    layer.classList.remove('show');
    layer.innerHTML = '';
  }

  /* ---- 日期工具 ---- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function parseYmd(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function daysBetween(a, b) { return Math.round((parseYmd(b) - parseYmd(a)) / 86400000); }
  function weekdayCN(d) { return '日一二三四五六'[d.getDay()]; }
  function fmtDateCN(s) {
    if (!s) return '';
    const d = parseYmd(s);
    return `${d.getMonth() + 1}月${d.getDate()}日 周${weekdayCN(d)}`;
  }
  const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  function monthMatrix(year, month) {
    const first = new Date(year, month, 1);
    const startDow = first.getDay();
    const gridStart = addDays(first, -startDow);
    const cells = [];
    for (let i = 0; i < 42; i++) cells.push(addDays(gridStart, i));
    return cells;
  }

  /* ---- 蜂鸣（番茄钟结束提醒，无需音频文件）---- */
  let audioCtx = null;
  function beep(times = 2) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      let t = audioCtx.currentTime;
      for (let i = 0; i < times; i++) {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = 'sine'; o.frequency.value = 880;
        o.connect(g); g.connect(audioCtx.destination);
        g.gain.setValueAtTime(0.001, t);
        g.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        o.start(t); o.stop(t + 0.3);
        t += 0.4;
      }
    } catch (e) { /* 忽略 */ }
  }

  /* ---- 浏览器通知 ---- */
  function notify(title, body) {
    const s = Store.get().settings;
    if (!s.notify) return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => { if (p === 'granted') new Notification(title, { body }); });
    }
  }
  function ensureNotify() {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  }

  /* ---- SVG 图表 ---- */
  function svgEl(w, h) { return `<svg class="chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">`; }

  // 柱状图：data=[{label,value,color}]
  function barChart(data, opts = {}) {
    const w = 520, h = 220, padL = 36, padB = 28, padT = 14;
    const max = Math.max(1, ...data.map(d => d.value));
    const bw = (w - padL - 10) / data.length;
    let bars = '';
    data.forEach((d, i) => {
      const bh = (d.value / max) * (h - padB - padT);
      const x = padL + i * bw + bw * 0.18;
      const y = h - padB - bh;
      bars += `<rect x="${x}" y="${y}" width="${bw * 0.64}" height="${bh}" rx="5" fill="${d.color || '#6366f1'}">
        <title>${esc(d.label)}: ${d.value}</title></rect>`;
      bars += `<text x="${x + bw * 0.32}" y="${y - 5}" font-size="11" style="fill:var(--text-soft)" text-anchor="middle">${d.value}</text>`;
      bars += `<text x="${x + bw * 0.32}" y="${h - 10}" font-size="11" style="fill:var(--text-faint)" text-anchor="middle">${esc(d.label)}</text>`;
    });
    return svgEl(w, h) + `<line x1="${padL}" y1="${h - padB}" x2="${w}" y2="${h - padB}" stroke="var(--border)"/>` + bars + '</svg>';
  }

  // 折线/面积图：points=[{label,value}]
  function lineChart(points, color = '#6366f1') {
    const w = 520, h = 220, padL = 36, padB = 28, padT = 14;
    const max = Math.max(1, ...points.map(p => p.value));
    const step = (w - padL - 10) / Math.max(1, points.length - 1);
    const xy = points.map((p, i) => [padL + i * step, h - padB - (p.value / max) * (h - padB - padT)]);
    const path = xy.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ');
    const area = path + ` L${xy[xy.length - 1][0].toFixed(1)} ${h - padB} L${xy[0][0].toFixed(1)} ${h - padB} Z`;
    const dots = xy.map(([x, y], i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${color}"><title>${esc(points[i].label)}: ${points[i].value}</title></circle>`).join('');
    const labs = points.map((p, i) => `<text x="${xy[i][0].toFixed(1)}" y="${h - 10}" font-size="10" style="fill:var(--text-faint)" text-anchor="middle">${esc(p.label)}</text>`).join('');
    return svgEl(w, h) +
      `<path d="${area}" fill="${color}" opacity="0.1"/>` +
      `<path d="${path}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>` +
      dots + labs + '</svg>';
  }

  // 圆环/甜甜圈：segments=[{label,value,color}]
  function donutChart(segments, size = 180) {
    const r = size / 2 - 14, cx = size / 2, cy = size / 2, C = 2 * Math.PI * r;
    const total = segments.reduce((s, x) => s + x.value, 0) || 1;
    let off = 0, arcs = '';
    segments.forEach(seg => {
      const len = (seg.value / total) * C;
      if (seg.value > 0) {
        arcs += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="16" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 ${cx} ${cy})"/>`;
      }
      off += len;
    });
    const mid = segments.length ? `${segments.reduce((s, x) => s + x.value, 0)}` : '0';
    return svgEl(size, size) + arcs +
      `<text x="${cx}" y="${cy - 2}" font-size="26" font-weight="800" style="fill:var(--text)" text-anchor="middle">${mid}</text>` +
      `<text x="${cx}" y="${cy + 18}" font-size="11" style="fill:var(--text-faint)" text-anchor="middle">总计</text></svg>`;
  }

  window.U = {
    $, $$, esc, toast, modal, closeModal,
    pad, ymd, parseYmd, addDays, daysBetween, weekdayCN, fmtDateCN, MONTHS, monthMatrix,
    beep, notify, ensureNotify,
    barChart, lineChart, donutChart,
  };
  window.toast = toast; // 供各模块以裸名调用
})();
