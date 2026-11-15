/* ================= 高考复习进度打卡系统 ================= */
const KEY = 'gk_review_v1';
const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const MOODS = [
  { k: 'good', t: '状态好' },
  { k: 'ok', t: '一般' },
  { k: 'tired', t: '有点累' },
  { k: 'bad', t: '状态差' }
];

/* ---------- 工具 ---------- */
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function keyOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function todayStr() { return keyOf(new Date()); }
function parseD(s) { const p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
function daysBetween(a, b) {
  const A = parseD(typeof a === 'string' ? a : keyOf(a));
  const B = parseD(typeof b === 'string' ? b : keyOf(b));
  return Math.round((B - A) / 86400000);
}
function fmtMD(s) { const d = parseD(s); return (d.getMonth() + 1) + '月' + d.getDate() + '日'; }
function weekdayOf(s) { const d = parseD(s); return DAY_NAMES[(d.getDay() + 6) % 7]; }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

/* ---------- 状态 ---------- */
const DEFAULT_STATE = {
  version: 1,
  examDate: '2027-06-07',
  checkins: {},
  progress: {},
  plans: [],
  timetable: [],
  todos: [],
  log: [],
  pomo: { settings: {}, days: {}, run: null }
};

let S = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_STATE));
    const o = JSON.parse(raw);
    const st = Object.assign(JSON.parse(JSON.stringify(DEFAULT_STATE)), o);
    /* pomo 单独合并，避免旧数据覆盖掉新增子字段 */
    if (!st.pomo || typeof st.pomo !== 'object') st.pomo = { settings: {}, days: {}, run: null };
    if (!st.pomo.settings) st.pomo.settings = {};
    if (!st.pomo.days) st.pomo.days = {};
    return st;
  } catch (e) {
    console.warn('读取本地数据失败', e);
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('保存失败：浏览器本地存储不可用'); }
}

/* ---------- 章节计算 ---------- */
function secRec(id) { return S.progress[id] || { l: 0, p: 0, r: 0, note: '' }; }
function secRate(id) {
  const r = secRec(id);
  return ((r.l ? 1 : 0) + (r.p ? 1 : 0) + (r.r ? 1 : 0)) / 3;
}
function secDone(id) { return secRate(id) >= 1; }
function setSec(id, field, val) {
  if (!S.progress[id]) S.progress[id] = { l: 0, p: 0, r: 0, note: '' };
  S.progress[id][field] = val ? 1 : 0;
  S.progress[id].at = todayStr();
  if (!S.log) S.log = [];
  S.log.push({ d: todayStr(), t: Date.now(), id: id, f: field, v: val ? 1 : 0 });
  if (S.log.length > 3000) S.log = S.log.slice(-3000);
  save();
}
function chapterStats(ch) {
  let sum = 0;
  ch.sections.forEach(function (s) { sum += secRate(s.id); });
  return { total: ch.sections.length, rate: ch.sections.length ? sum / ch.sections.length : 0 };
}
function globalStats() {
  let sum = 0, l = 0, p = 0, r = 0, done = 0;
  SECTIONS.forEach(function (s) {
    const sec = secRec(s.id);
    sum += secRate(s.id);
    if (sec.l) l++;
    if (sec.p) p++;
    if (sec.r) r++;
    if (secRate(s.id) >= 1) done++;
  });
  return {
    rate: TOTAL_SECTIONS ? sum / TOTAL_SECTIONS : 0,
    l: l, p: p, r: r, done: done,
    total: TOTAL_SECTIONS
  };
}

/* ---------- 计划 ---------- */
function planSections(pl) {
  const out = [];
  pl.chapters.forEach(function (chId) {
    const ch = BOOK.find(function (c) { return c.id === chId; });
    if (ch) ch.sections.forEach(function (s) {
      const full = SECTION_MAP[s.id];
      if (full) out.push(full);
    });
  });
  return out;
}
function planRate(pl) {
  const list = planSections(pl);
  if (!list.length) return 0;
  let sum = 0;
  list.forEach(function (s) { sum += secRate(s.id); });
  return sum / list.length;
}
function planRemain(pl) {
  return planSections(pl).filter(function (s) { return secRate(s.id) < 1; }).length;
}
function planStatus(pl) {
  const rate = planRate(pl);
  const today = todayStr();
  if (rate >= 0.9999) return 'done';
  if (today > pl.end) return 'overdue';
  if (today < pl.start) return 'pending';
  return 'doing';
}
function activePlans() {
  return S.plans.filter(function (pl) {
    const st = planStatus(pl);
    return st === 'doing' || st === 'pending' || st === 'overdue';
  });
}
function overduePlans() {
  return S.plans.filter(function (pl) { return planStatus(pl) === 'overdue'; });
}

/* ---------- 打卡统计 ---------- */
function streak() {
  let n = 0;
  const d = new Date();
  if (!S.checkins[keyOf(d)]) d.setDate(d.getDate() - 1);
  while (S.checkins[keyOf(d)]) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
function monthCount() {
  const now = new Date();
  const pre = now.getFullYear() + '-' + pad(now.getMonth() + 1);
  return Object.keys(S.checkins).filter(function (k) { return k.indexOf(pre) === 0; }).length;
}
function totalMinutes() {
  let m = 0;
  Object.keys(S.checkins).forEach(function (k) { m += (S.checkins[k].minutes || 0); });
  return m;
}
function maxStreak() {
  const keys = Object.keys(S.checkins).sort();
  if (!keys.length) return 0;
  let best = 1, cur = 1;
  for (let i = 1; i < keys.length; i++) {
    if (daysBetween(keys[i - 1], keys[i]) === 1) cur++;
    else cur = 1;
    if (cur > best) best = cur;
  }
  return best;
}

/* ---------- 今日任务 ---------- */
function buildTodayTasks() {
  const today = todayStr();
  const seen = {};
  const groups = [];
  activePlans().forEach(function (pl) {
    if (today < pl.start) return;
    const undone = planSections(pl).filter(function (s) { return secRate(s.id) < 1; });
    if (!undone.length) return;
    let per;
    if (today > pl.end) {
      per = Math.min(5, Math.max(1, Math.ceil(undone.length / 3))); // 逾期：三天内补
    } else {
      const left = Math.max(1, daysBetween(today, pl.end) + 1);
      per = Math.min(6, Math.max(1, Math.ceil(undone.length / left)));
    }
    const pick = undone.filter(function (s) { return !seen[s.id]; }).slice(0, per);
    pick.forEach(function (s) { seen[s.id] = 1; });
    if (pick.length) groups.push({ plan: pl, items: pick, overdue: today > pl.end });
  });
  return groups;
}
function todayLessons() {
  const wd = (new Date().getDay() + 6) % 7 + 1;
  return S.timetable.filter(function (c) { return Number(c.day) === wd; })
    .sort(function (a, b) { return a.start.localeCompare(b.start); });
}
function dayTouched(date) {
  const ids = {};
  (S.log || []).forEach(function (l) { if (l.d === date) ids[l.id] = 1; });
  let list = Object.keys(ids).map(function (id) { return SECTION_MAP[id]; }).filter(Boolean);
  if (!list.length) {
    // 兼容没有日志的旧数据
    list = SECTIONS.filter(function (s) {
      const r = S.progress[s.id];
      return r && r.at === date && (r.l || r.p || r.r);
    });
  }
  return list;
}
function todayTouched() { return dayTouched(todayStr()); }

/* ================= 渲染 ================= */
let currentPage = 'today';
let openChapters = {};
let bookFilter = 'all';
let bookQuery = '';

function go(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(function (el) { el.classList.remove('on'); });
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('on');
  document.querySelectorAll('.nav-item').forEach(function (b) {
    b.classList.toggle('on', b.dataset.page === page);
  });
  const titles = { today: '今日', book: '章节进度', plan: '阶段计划', timetable: '网课课表', stats: '统计与数据', pomo: '番茄钟' };

  document.getElementById('pageTitle').textContent = titles[page] || '';
  document.querySelector('.page-wrap').scrollTop = 0;
  renderAll();
}

function renderAll() {
  renderShell();
  if (currentPage === 'today') renderToday();
  if (currentPage === 'book') renderBook();
  if (currentPage === 'plan') renderPlan();
  if (currentPage === 'timetable') renderTimetable();
  if (currentPage === 'stats') renderStats();
  if (currentPage === 'pomo') {
    if (typeof pomoRenderPage === 'function') {
      try { pomoRenderPage(); } catch (e) { pomoBroken('渲染出错：' + (e && e.message ? e.message : e)); }
    } else {
      pomoRetryLoad();
    }
  }
}

/* 番茄钟脚本偶尔会因为缓存或网络没加载下来，这里自愈一次 */
let pomoRetrying = false;
function pomoRetryLoad() {
  if (pomoRetrying) return;
  pomoRetrying = true;
  const s = document.createElement('script');
  s.src = 'pomodoro.js?retry=' + Date.now();
  s.onload = function () {
    pomoRetrying = false;
    if (currentPage === 'pomo' && typeof pomoRenderPage === 'function') pomoRenderPage();
  };
  s.onerror = function () {
    pomoRetrying = false;
    pomoBroken('番茄钟脚本没加载下来');
  };
  document.body.appendChild(s);
}

function pomoBroken(msg) {
  const el = document.getElementById('page-pomo');
  if (!el || el.innerHTML.trim()) return;
  el.innerHTML = '<div class="alert warn" style="margin:20px">' + ico('alert') +
    '<div><b>' + esc(msg) + '。</b>按 Ctrl+Shift+R 强制刷新一次就能恢复；' +
    '如果还不行，把浏览器里这个站点的数据清一下。</div></div>';
}

/* ---------- 外壳 ---------- */
function renderShell() {
  const left = daysBetween(todayStr(), S.examDate);
  document.getElementById('countdown').textContent = left > 0 ? left : 0;
  const g = globalStats();
  const pct = Math.round(g.rate * 100);
  document.getElementById('totalPct').textContent = pct + '%';
  document.getElementById('totalBar').style.width = pct + '%';
  document.getElementById('globalHint').textContent = g.done + ' / ' + g.total + ' 节已通关';

  const od = overduePlans().length;
  const badge = document.getElementById('planBadge');
  if (od > 0) { badge.textContent = od; badge.style.display = 'grid'; }
  else badge.style.display = 'none';

  const ck = S.checkins[todayStr()];
  document.title = (od > 0 && !ck ? '● ' : '') + '复习打卡 · 高考数学';
  const td = document.getElementById('topDate');
  if (td) td.textContent = fmtMD(todayStr()) + ' ' + weekdayOf(todayStr());
}

/* ---------- 今日 ---------- */
function renderToday() {
  const today = todayStr();
  const ck = S.checkins[today];
  const left = daysBetween(today, S.examDate);
  const st = streak();
  const mins = totalMinutes();
  const hrs = mins >= 60 ? (mins / 60).toFixed(mins % 60 ? 1 : 0) : '0';
  const lessons = todayLessons();

  let html = '';

  /* 打卡卡 */
  html += '<div class="card hero" style="margin-bottom:16px">' +
    '<div>' +
      '<div class="d-day">' + new Date().getFullYear() + ' · ' + weekdayOf(today) + (left > 0 ? ' · 距高考 ' + left + ' 天' : ' · 高考日') + '</div>' +
      '<div class="d-num">' + fmtMD(today) + '</div>' +
      '<div class="d-meta">' + (ck ? '今天已完成打卡 · ' + (ck.minutes ? '学习 ' + ck.minutes + ' 分钟' : '未记录时长') + (ck.note ? ' · ' + esc(ck.note) : '') : '还没有打卡，今天的复习完成后在这里按一下') + '</div>' +
      (typeof pomoInlineHtml === 'function' ? pomoInlineHtml() : '') +
      '<div class="streak">' +
        '<div><div class="n">' + st + '</div><div class="l">连续打卡</div></div>' +
        '<div><div class="n">' + monthCount() + '</div><div class="l">本月打卡</div></div>' +
        '<div><div class="n">' + hrs + '<small style="font-size:12px;font-weight:500;color:var(--ink3)">h</small></div><div class="l">累计时长</div></div>' +
      '</div>' +
    '</div>' +
    '<div class="stamp-wrap">' +
      (ck
        ? '<button class="stamp done" onclick="openCheckin()" title="点击修改今日记录"><div class="in"><b>已打卡</b><div class="line"></div><i>' + new Date(ck.ts).getHours() + ':' + pad(new Date(ck.ts).getMinutes()) + '</i></div></button>'
        : '<button class="stamp idle" onclick="openCheckin()"><div class="in"><b>打卡</b><i>TAP</i></div></button>') +
      '<div style="font-size:11px;color:var(--ink3)">' + (ck ? '点击可补充记录' : '完成后点这里') + '</div>' +
    '</div>' +
  '</div>';

  /* 提醒 */
  const alerts = [];
  const od = overduePlans();
  if (od.length) {
    alerts.push('<div class="alert warn">' + ico('alert') +
      '<div><b>有 ' + od.length + ' 个计划已逾期</b><ul>' +
      od.map(function (pl) {
        const d = daysBetween(pl.end, today);
        return '<li>' + esc(pl.title) + ' —— 超期 ' + d + ' 天，还差 ' + planRemain(pl) + ' 节</li>';
      }).join('') +
      '</ul></div></div>');
  }
  const soon = S.plans.filter(function (pl) {
    const stt = planStatus(pl);
    if (stt !== 'doing') return false;
    const left2 = daysBetween(today, pl.end);
    return left2 <= 3 && planRate(pl) < 0.9;
  });
  if (soon.length) {
    alerts.push('<div class="alert info">' + ico('clock') +
      '<div>' + soon.map(function (pl) {
        return '<b>' + esc(pl.title) + '</b> 还剩 ' + Math.max(0, daysBetween(today, pl.end)) + ' 天，还有 ' + planRemain(pl) + ' 节没完成';
      }).join('；') + '</div></div>');
  }
  if (lessons.length) {
    alerts.push('<div class="alert info">' + ico('video') +
      '<div>今天有 <b>' + lessons.length + ' 节网课</b>：' +
      lessons.map(function (c) { return esc(c.start) + ' ' + esc(c.subject); }).join(' · ') + '</div></div>');
  }
  html += alerts.join('');

  /* 今日任务 */
  const groups = buildTodayTasks();
  html += '<div class="sec-head"><h3>今日该做的</h3><span class="sub">按计划进度自动推算</span><div class="grow"></div>' +
    '<button class="btn sm" onclick="openTodo()">' + ico('plus') + '加一条</button></div>';

  if (!groups.length && !S.todos.filter(function (t) { return t.date === today; }).length) {
    if (S.plans.length) {
      html += '<div class="empty">今天的计划任务都清完了，去章节页自己挑几节继续。</div>';
    } else {
      html += '<div class="empty" style="padding:34px 20px">开始之前，三步就好' +
        '<div style="display:flex;gap:9px;justify-content:center;margin-top:16px;flex-wrap:wrap">' +
        '<button class="btn primary" onclick="openPlan()">' + ico('plus') + '建阶段计划</button>' +
        '<button class="btn" onclick="go(\'timetable\')">填网课课表</button>' +
        '<button class="btn" onclick="go(\'book\')">直接勾章节</button>' +
        '</div></div>';
    }
  }

  groups.forEach(function (g) {
    const total = g.items.length;
    const doneN = g.items.filter(function (s) { return secDone(s.id); }).length;
    html += '<div class="task-group">' +
      '<div class="tg-head">' + (g.overdue ? '<span class="chip seal">补</span>' : '<span class="chip navy">计划</span>') +
      esc(g.plan.title) + '<span class="n">' + doneN + '/' + total + ' 节</span></div><div class="task-list">' +
      g.items.map(taskRow).join('') + '</div></div>';
  });

  const todos = S.todos.filter(function (t) { return t.date === today; });
  if (todos.length) {
    html += '<div class="task-group"><div class="tg-head"><span class="chip">待办</span>自己加的' +
      '<span class="n">' + todos.filter(function (t) { return t.done; }).length + '/' + todos.length + '</span></div><div class="task-list">' +
      todos.map(function (t) {
        return '<div class="task-row">' +
          '<button class="tick ' + (t.done ? 'on' : '') + '" style="width:22px;height:22px" onclick="toggleTodo(\'' + t.id + '\')">' +
          (t.done ? ico('check') : '') + '</button>' +
          '<div class="tname ' + (t.done ? 'done' : '') + '">' + esc(t.text) + '</div>' +
          '<button class="icon-btn" onclick="delTodo(\'' + t.id + '\')">' + ico('trash') + '</button>' +
          '</div>';
      }).join('') + '</div></div>';
  }

  /* 今天动过的 */
  const touched = todayTouched();
  if (touched.length) {
    html += '<div class="sec-head"><h3>今天动过的</h3><span class="sub">共 ' + touched.length + ' 节</span><div class="grow"></div></div>';
    html += '<div class="card">';
    touched.forEach(function (s) {
      const r = secRec(s.id);
      const full = secRate(s.id) >= 1;
      const dots = (r.l ? '课' : '') + (r.p ? (r.l ? ' · 练' : '练') : '') + (r.r ? ((r.l || r.p) ? ' · 错' : '错') : '');
      html += '<div class="task-row" style="padding:9px 18px">' +
        '<span class="sid">' + s.id + '</span>' +
        '<div class="tname">' + esc(s.title) + '</div>' +
        '<span class="tmeta">' + s.chNo + '</span>' +
        '<span class="chip ' + (full ? 'green' : 'navy') + '">' + (full ? '通关' : dots.trim()) + '</span>' +
      '</div>';
    });
    html += '</div>';
  }

  /* 今日网课 */
  if (lessons.length) {
    html += '<div class="sec-head"><h3>今天要上的课</h3><div class="grow"></div>' +
      '<button class="btn sm" onclick="go(\'timetable\')">课表</button></div>';
    html += '<div class="card" style="padding:6px 0">';
    lessons.forEach(function (c) {
      const linked = (c.sections || []).map(function (id) {
        const s = SECTION_MAP[id];
        return s ? s.id + ' ' + s.title : '';
      }).filter(Boolean);
      html += '<div class="task-row" style="padding:11px 18px">' +
        '<div style="font-size:12px;font-variant-numeric:tabular-nums;color:var(--ink3);width:92px;flex:none">' +
        esc(c.start) + '–' + esc(c.end) + '</div>' +
        '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px">' + esc(c.subject) +
        (c.type === 'online' ? ' <span class="chip seal">网课</span>' : ' <span class="chip green">线下</span>') + '</div>' +
        (c.content ? '<div style="font-size:11.5px;color:var(--ink3)">' + esc(c.content) + '</div>' : '') +
        (linked.length ? '<div style="font-size:11px;color:var(--navy2)">关联：' + esc(linked.join('、')) + '</div>' : '') +
        '</div></div>';
    });
    html += '</div>';
  }

  document.getElementById('page-today').innerHTML = html;
}

function taskRow(s) {
  const r = secRec(s.id);
  const done = secRate(s.id) >= 1;
  return '<div class="task-row">' +
    '<span class="sid">' + s.id + '</span>' +
    '<div class="tname ' + (done ? 'done' : '') + '" title="' + esc(s.title) + '">' + esc(s.title) +
    (s.tag ? ' <span class="chip gold" style="height:18px;font-size:10px">' + s.tag + '</span>' : '') + '</div>' +
    '<span class="tmeta">' + s.chNo + '</span>' +
    '<div class="ticks">' +
      tickBtn(s.id, 'l', r.l, '听课') +
      tickBtn(s.id, 'p', r.p, '刷题') +
      tickBtn(s.id, 'r', r.r, '错题') +
    '</div></div>';
}
function tickBtn(id, f, on, label) {
  const cls = f === 'l' ? 'on' : f === 'p' ? 'on p' : 'on r';
  return '<button class="tick ' + (on ? cls : '') + '" title="' + label + '" onclick="toggleTick(\'' + id + '\',\'' + f + '\')">' +
    (on ? ico('check') : ({ l: '课', p: '练', r: '错' })[f]) + '</button>';
}
function toggleTick(id, f) {
  const r = secRec(id);
  setSec(id, f, !r[f]);
  renderAll();
}

/* ---------- 章节 ---------- */
function renderBook() {
  const g = globalStats();
  const pct = Math.round(g.rate * 100);
  const lp = Math.round((g.l / TOTAL_SECTIONS) * 100);
  const pp = Math.round((g.p / TOTAL_SECTIONS) * 100);
  const rp = Math.round((g.r / TOTAL_SECTIONS) * 100);

  let html = '<div class="toolbar">' +
    '<input class="search" id="bookSearch" placeholder="搜小节名或编号，如 3.2 / 数列" value="' + esc(bookQuery) + '">' +
    '<div class="seg">' +
      ['all|全部', 'undone|未完成', 'doing|进行中', 'done|已完成', 'key|微重点'].map(function (x) {
        const kv = x.split('|');
        return '<button class="' + (bookFilter === kv[0] ? 'on' : '') + '" onclick="setBookFilter(\'' + kv[0] + '\')">' + kv[1] + '</button>';
      }).join('') +
    '</div>' +
    '<div class="grow" style="flex:1"></div>' +
    '<span style="font-size:12px;color:var(--ink3)">课 ' + g.l + ' · 练 ' + g.p + ' · 错 ' + g.r + ' / 共 ' + g.total + ' 节</span>' +
    '</div>';

  html += '<div class="card total-bar">' +
    '<div class="tb-ring" style="--p:' + pct + '"><div class="tb-in">' + pct + '<i>%</i></div></div>' +
    '<div style="flex:1;display:flex;flex-direction:column;gap:8px;min-width:0">' +
      minBar('听课', lp, g.l + ' / ' + g.total, 'var(--navy)') +
      minBar('刷题', pp, g.p + ' / ' + g.total, 'var(--green)') +
      minBar('错题', rp, g.r + ' / ' + g.total, 'var(--gold)') +
    '</div>' +
    '<div class="tb-done"><div class="k">已通关</div><div class="v">' + g.done + '<small> / ' + g.total + ' 节</small></div></div>' +
  '</div>';

  const q = bookQuery.trim().toLowerCase();
  BOOK.forEach(function (ch) {
    const cs = chapterStats(ch);
    const cpct = Math.round(cs.rate * 100);
    let secs = ch.sections;
    if (q) {
      secs = secs.filter(function (s) {
        return (s.id + s.title).toLowerCase().indexOf(q) >= 0;
      });
    }
    if (bookFilter === 'done') secs = secs.filter(function (s) { return secDone(s.id); });
    if (bookFilter === 'undone') secs = secs.filter(function (s) { return !secDone(s.id); });
    if (bookFilter === 'doing') secs = secs.filter(function (s) { const r = secRate(s.id); return r > 0 && r < 1; });
    if (bookFilter === 'key') secs = secs.filter(function (s) { return s.tag; });
    if (!secs.length) return;

    const open = openChapters[ch.id] || (q && secs.length);
    const cls = cpct === 0 ? 'zero' : cpct >= 100 ? 'full' : '';
    html += '<div class="ch-block card ' + (open ? 'open' : '') + '">' +
      '<button class="ch-head" onclick="toggleChapter(\'' + ch.id + '\')">' +
        '<div class="no ' + (ch.no === '进阶篇' ? 'adv' : '') + '">' + ch.no + '</div>' +
        '<div class="ttl"><b>' + esc(ch.title) + '</b><span>' + ch.sections.length + ' 节 · P' + ch.page + ' 起</span></div>' +
        '<div class="pct ' + cls + '">' + cpct + '%</div>' +
        ico('caret') +
      '</button>' +
      '<div class="ch-body">' + secs.map(secRow).join('') + '</div>' +
    '</div>';
  });

  document.getElementById('page-book').innerHTML = html;
  const inp = document.getElementById('bookSearch');
  if (inp) {
    let composing = false;
    inp.addEventListener('compositionstart', function () { composing = true; });
    inp.addEventListener('compositionend', function () {
      composing = false;
      bookQuery = this.value;
      const pos = this.value.length;
      renderBook();
      const i2 = document.getElementById('bookSearch');
      i2.focus();
      i2.setSelectionRange(pos, pos);
    });
    inp.addEventListener('input', function () {
      if (composing) return;
      bookQuery = this.value;
      const pos = this.selectionStart;
      renderBook();
      const i2 = document.getElementById('bookSearch');
      i2.focus();
      i2.setSelectionRange(pos, pos);
    });
  }
}

function secRow(s) {
  const r = secRec(s.id);
  const done = secRate(s.id) >= 1;
  const hasCourse = S.timetable.some(function (c) { return (c.sections || []).indexOf(s.id) >= 0; });
  return '<div class="sec-row ' + (done ? 'done' : '') + '">' +
    '<div class="sid">' + s.id + '</div>' +
    '<div class="body">' +
      '<div class="nm"><em>' + esc(s.title) + '</em>' +
        '<span class="pg">P' + s.page + '</span>' +
        (s.tag ? '<span class="chip gold" style="height:18px;font-size:10px">' + s.tag + '</span>' : '') +
        (hasCourse ? '<span class="chip seal" style="height:18px;font-size:10px">网课</span>' : '') +
      '</div>' +
      (s.tips ? '<div class="tips">' + s.tips.map(function (t) { return '<b>微点</b> ' + esc(t.t) + ' P' + t.p; }).join('　') + '</div>' : '') +
      (r.note ? '<div class="note-txt">' + esc(r.note) + '</div>' : '') +
    '</div>' +
    '<div class="acts">' +
      '<div class="ticks">' +
        tickBtn(s.id, 'l', r.l, '听课/网课') +
        tickBtn(s.id, 'p', r.p, '刷题') +
        tickBtn(s.id, 'r', r.r, '错题复盘') +
      '</div>' +
      '<button class="icon-btn" title="备注" onclick="editNote(\'' + s.id + '\')">' + ico('pen') + '</button>' +
    '</div>' +
  '</div>';
}
function toggleChapter(id) { openChapters[id] = !openChapters[id]; renderBook(); }
function setBookFilter(f) { bookFilter = f; renderBook(); }

/* ---------- 计划 ---------- */
function renderPlan() {
  let html = '<div class="toolbar">' +
    '<div style="font-size:12.5px;color:var(--ink3)">阶段计划把章节和截止日期绑在一起，逾期会自动催你</div>' +
    '<div style="flex:1"></div>' +
    '<button class="btn primary" onclick="openPlan()">' + ico('plus') + '新建计划</button>' +
  '</div>';

  if (!S.plans.length) {
    html += '<div class="empty">还没有阶段计划。建一个，比如「11 月上半月：函数 + 导数」，选好章节和截止日期就行。</div>';
    document.getElementById('page-plan').innerHTML = html;
    return;
  }

  const order = { overdue: 0, doing: 1, pending: 2, done: 3 };
  const list = S.plans.slice().sort(function (a, b) {
    const sa = order[planStatus(a)], sb = order[planStatus(b)];
    if (sa !== sb) return sa - sb;
    return a.end.localeCompare(b.end);
  });

  list.forEach(function (pl) {
    const st = planStatus(pl);
    const rate = planRate(pl);
    const pct = Math.round(rate * 100);
    const totalDays = Math.max(1, daysBetween(pl.start, pl.end) + 1);
    const passed = Math.min(totalDays, Math.max(0, daysBetween(pl.start, todayStr()) + 1));
    const expect = st === 'pending' ? 0 : Math.round((passed / totalDays) * 100);
    const remain = planRemain(pl);
    const totalSec = planSections(pl).length;
    const doneSec = totalSec - remain;
    const leftDays = daysBetween(todayStr(), pl.end);

    let badge, foot = '';
    if (st === 'done') badge = '<span class="chip green">已完成</span>';
    else if (st === 'overdue') badge = '<span class="chip seal">已逾期 ' + daysBetween(pl.end, todayStr()) + ' 天</span>';
    else if (st === 'pending') badge = '<span class="chip">未开始</span>';
    else badge = '<span class="chip navy">进行中</span>';

    if (st === 'done') {
      foot = '<div class="kv ok">全部 <b>' + totalSec + '</b> 节完成</div>';
    } else if (st === 'overdue') {
      foot = '<div class="kv warn">落后 <b>' + Math.max(0, remain) + '</b> 节 · 建议每天补 <b>' + Math.max(1, Math.ceil(remain / 3)) + '</b> 节</div>';
    } else if (st === 'pending') {
      foot = '<div class="kv">开始于 ' + fmtMD(pl.start) + ' · 共 <b>' + totalSec + '</b> 节</div>';
    } else {
      const perDay = Math.max(1, Math.ceil(remain / Math.max(1, leftDays + 1)));
      foot = '<div class="kv ' + (rate * 100 < expect - 12 ? 'warn' : '') + '">剩 <b>' + leftDays + '</b> 天 · 还差 <b>' + remain + '</b> 节 · 每天 <b>' + perDay + '</b> 节</div>';
    }

    html += '<div class="plan-card card ' + (st === 'overdue' ? 'overdue' : '') + '">' +
      '<div class="plan-top">' +
        '<div class="pt"><h4>' + esc(pl.title) + '</h4>' +
          '<div class="range">' + fmtMD(pl.start) + ' — ' + fmtMD(pl.end) +
          ' · ' + pl.chapters.length + ' 个章块 · ' + totalSec + ' 节</div></div>' +
        '<div class="plan-badges">' + badge + '</div>' +
      '</div>' +
      '<div class="plan-progress">' +
        '<div class="track"><i style="width:' + pct + '%"></i>' +
        (st === 'doing' ? '<span class="expect" style="left:' + Math.min(99, expect) + '%" title="按时间应完成 ' + expect + '%"></span>' : '') +
        '</div>' +
        '<div class="num">' + pct + '<small>%</small> <span style="font-weight:400;color:var(--ink3);font-size:11.5px">' + doneSec + '/' + totalSec + '</span></div>' +
      '</div>' +
      '<div class="plan-foot">' + foot +
        '<div class="grow"></div>' +
        '<button class="btn sm ghost" onclick="jumpPlan(\'' + pl.id + '\')">看章节</button>' +
        '<button class="btn sm ghost" onclick="openPlan(\'' + pl.id + '\')">' + ico('pen') + '</button>' +
        '<button class="btn sm ghost" onclick="delPlan(\'' + pl.id + '\')">' + ico('trash') + '</button>' +
      '</div>' +
    '</div>';
  });

  document.getElementById('page-plan').innerHTML = html;
}
function jumpPlan(id) {
  const pl = S.plans.find(function (p) { return p.id === id; });
  if (!pl) return;
  openChapters = {};
  pl.chapters.forEach(function (c) { openChapters[c] = true; });
  bookFilter = 'all'; bookQuery = '';
  go('book');
}

/* ---------- 课表 ---------- */
function renderTimetable() {
  const wd = (new Date().getDay() + 6) % 7 + 1;
  const todayKeyD = todayStr();
  let html = '<div class="toolbar">' +
    '<div style="font-size:12.5px;color:var(--ink3)">点课程可编辑；关联小节后，章节页会出现「网课」标记</div>' +
    '<div style="flex:1"></div>' +
    '<button class="btn primary" onclick="openLesson()">' + ico('plus') + '添加课程</button>' +
  '</div><div class="tt-wrap">';

  for (let d = 1; d <= 7; d++) {
    const items = S.timetable.filter(function (c) { return Number(c.day) === d; })
      .sort(function (a, b) { return a.start.localeCompare(b.start); });
    html += '<div class="tt-col ' + (d === wd ? 'today' : '') + '">' +
      '<div class="day-h">' + DAY_NAMES[d - 1] + (d === wd ? '<small>今天</small>' : '') + '</div>' +
      '<div class="tt-items">';
    items.forEach(function (c) {
      const linked = (c.sections || []).map(function (id) {
        const s = SECTION_MAP[id];
        return s ? s.id : '';
      }).filter(Boolean);
      html += '<button class="tt-item ' + (c.type === 'online' ? 'online' : 'offline') + '" onclick="openLesson(\'' + c.id + '\')">' +
        '<div class="tm">' + esc(c.start) + ' - ' + esc(c.end) + '</div>' +
        '<div class="sb">' + esc(c.subject) + '</div>' +
        (c.content ? '<div class="ct">' + esc(c.content) + '</div>' : '') +
        (linked.length ? '<span class="lk">→ ' + esc(linked.join('、')) + '</span>' : '') +
      '</button>';
    });
    html += '<button class="tt-empty" onclick="openLesson(null,' + d + ')" title="添加">+</button>';
    html += '</div></div>';
  }
  html += '</div>';
  document.getElementById('page-timetable').innerHTML = html;
}

/* ---------- 统计 ---------- */
function renderStats() {
  const g = globalStats();
  const mins = totalMinutes();
  const hours = (mins / 60).toFixed(1);
  const totalDays = Object.keys(S.checkins).length;
  const avg = totalDays ? Math.round(mins / totalDays) : 0;

  let html = '<div class="stat-row" style="margin-bottom:14px">' +
    statCard('连续打卡', streak(), '天', '最长 ' + maxStreak() + ' 天') +
    statCard('累计打卡', totalDays, '天', '本月 ' + monthCount() + ' 天') +
    statCard('累计时长', hours, 'h', '平均每天 ' + avg + ' 分钟') +
    statCard('章节进度', Math.round(g.rate * 100), '%', g.done + '/' + g.total + ' 节通关') +
  '</div>';

  if (typeof pomoTotal === 'function') {
    const pt = pomoTotal();
    const ptd = pomoToday(false);
    const busyDays = pt.days || 1;
    const basis = mins + pt.minutes;   // 打卡时长 + 番茄时长，避免番茄被重复计入分母
    html += '<div class="stat-row" style="margin-bottom:14px">' +
      statCard('今天番茄', ptd.count, '个', ptd.minutes + ' 分钟') +
      statCard('累计番茄', pt.count, '个', pt.days + ' 天有记录') +
      statCard('累计专注', (pt.minutes / 60).toFixed(1), 'h', '占学习总时长 ' + (basis ? Math.round(pt.minutes / basis * 100) : 0) + '%') +
      statCard('日均番茄', (pt.count / busyDays).toFixed(1), '个', '只在有记录的天里算') +
    '</div>';
  }

  html += '<div class="card heat-card" style="margin-bottom:14px">' +
    '<div class="heat-head"><h3>打卡热力</h3><span style="font-size:11.5px;color:var(--ink3)">最近 13 周</span><div class="grow"></div>' +
    '<div class="heat-legend">少<i style="background:#eee9dd"></i><i style="background:#cfe0ee"></i><i style="background:#9dbdd7"></i><i style="background:#6a94b8"></i><i style="background:#2b4a6b"></i>多</div></div>' +
    heatmap() +
  '</div>';

  html += '<div class="card card-pad" style="margin-bottom:14px">' +
    '<div class="sec-head" style="margin:0 0 8px"><h3>最近 7 天</h3><span class="sub">每天动过哪些小节</span></div>' +
    '<div class="tl">';
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = keyOf(d);
    const ck = S.checkins[k];
    const items = dayTouched(k);
    html += '<div class="tl-row">' +
      '<div class="tl-d" ' + (i === 0 ? 'style="color:var(--navy);font-weight:600"' : '') + '>' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + weekdayOf(k) + '</div>' +
      '<div class="tl-c ' + (ck ? 'ok' : '') + '">' + (ck ? '✓ ' + (ck.minutes || 0) + ' 分' : '未打卡') + '</div>' +
      '<div class="tl-i">' + (items.length
        ? items.map(function (s) { return '<span>' + s.id + '</span>'; }).join('') + '<em>' + items.length + ' 节</em>'
        : '<span style="background:none;color:var(--ink3)">没有记录</span>') +
      '</div>' +
    '</div>';
  }
  html += '</div></div>';

  html += '<div class="card card-pad" style="margin-bottom:14px">' +
    '<div class="sec-head" style="margin:0 0 14px"><h3>各章完成度</h3></div><div class="bars">';
  BOOK.forEach(function (ch) {
    const cs = chapterStats(ch);
    const p = Math.round(cs.rate * 100);
    const nm = (ch.no === '进阶篇' ? '进阶' : ch.no) + ' · ' + ch.title;
    html += '<div class="bar-row"><div class="bl" title="' + esc(nm) + '">' + esc(nm) + '</div>' +
      '<div class="bt"><i style="width:' + p + '%"></i></div>' +
      '<div class="bn">' + p + '% · ' + cs.total + '节</div></div>';
  });
  html += '</div></div>';

  document.getElementById('page-stats').innerHTML = html + dataHTML();
}

function statCard(l, v, unit, s) {
  return '<div class="stat"><div class="l">' + l + '</div><div class="v">' + v + '<small>' + unit + '</small></div><div class="s">' + s + '</div></div>';
}

function minBar(label, pct, txt, color) {
  return '<div class="mb" title="' + label + ' ' + txt + '">' +
    '<span class="lb">' + label + '</span>' +
    '<span class="tr"><i style="width:' + pct + '%;background:' + color + '"></i></span>' +
    '<span class="vv">' + pct + '%</span></div>';
}

function heatmap() {
  const today = new Date();
  const dow = (today.getDay() + 6) % 7; // 0 = 周一
  const start = new Date(today);
  start.setDate(start.getDate() - dow - 12 * 7);

  let cells = '', labels = '';
  for (let w = 0; w < 13; w++) {
    const first = new Date(start);
    first.setDate(first.getDate() + w * 7);
    const m = first.getMonth() + 1;
    labels += '<span>' + (w === 0 || first.getDate() <= 7 ? m + '月' : '') + '</span>';
    for (let d = 0; d < 7; d++) {
      const cur = new Date(start);
      cur.setDate(cur.getDate() + w * 7 + d);
      const k = keyOf(cur);
      if (cur > today) {
        cells += '<i class="out"></i>';
        continue;
      }
      const ck = S.checkins[k];
      let lv = 0;
      if (ck) {
        const mm = ck.minutes || 0;
        lv = mm >= 180 ? 4 : mm >= 120 ? 3 : mm >= 60 ? 2 : 1;
        if (!mm) lv = 1;
      }
      cells += '<i class="l' + lv + '" title="' + k + (ck ? ' · ' + (ck.minutes || 0) + ' 分钟' : ' · 未打卡') + '"></i>';
    }
  }
  return '<div class="heat">' + cells + '</div><div class="heat-axis">' + labels + '</div>';
}

/* ---------- 数据页 ---------- */
function dataHTML() {
  const size = new Blob([JSON.stringify(S)]).size;
  return '<div class="sec-head"><h3>数据与设置</h3><span class="sub">所有记录只存在这台电脑的浏览器里</span></div>' +
    '<div class="data-grid">' +
      '<div class="data-item"><h4>高考日期</h4><p>用于首页倒计时，默认 2027-06-07。</p>' +
        '<input class="input" type="date" id="examDate" value="' + S.examDate + '" onchange="setExamDate(this.value)"></div>' +
      '<div class="data-item"><h4>导出备份</h4><p>生成一个 JSON 文件，含全部打卡、进度、计划、课表。建议每周导一次。</p>' +
        '<div class="acts"><button class="btn primary" onclick="exportData()">' + ico('download') + '导出 JSON</button>' +
        '<span style="font-size:11px;color:var(--ink3);align-self:center">当前 ' + (size / 1024).toFixed(1) + ' KB</span></div></div>' +
      '<div class="data-item"><h4>导入恢复</h4><p>选择之前导出的 JSON，会覆盖当前全部记录。</p>' +
        '<div class="acts"><label class="btn" style="cursor:pointer">' + ico('upload') + '选择文件<input type="file" accept=".json,application/json" style="display:none" onchange="importData(this)"></label></div></div>' +
      '<div class="data-item"><h4>清空数据</h4><p>删除本机全部记录，不可恢复。导出备份后再操作。</p>' +
        '<div class="acts"><button class="btn" style="color:var(--seal);border-color:#eed6cd" onclick="clearData()">清空</button></div></div>' +
    '</div>' +

    '<div class="sec-head"><h3>怎么用</h3></div>' +
    '<div class="card card-pad" style="font-size:13px;color:var(--ink2);line-height:1.75">' +
      '<div style="display:grid;gap:11px">' +
        '<div><b style="color:var(--ink)">① 章节页</b> · 每小节三个格子：<b>课</b>＝听完课或看完网课，<b>练</b>＝做完配套练习，<b>错</b>＝错题整理完。三个都亮＝这一节通关。</div>' +
        '<div><b style="color:var(--ink)">② 阶段计划</b> · 选章节 + 定截止日，首页会按剩余天数自动算每天该做几节，逾期红字催。</div>' +
        '<div><b style="color:var(--ink)">③ 课表</b> · 把网课时间填进去，能关联到具体小节，上课那天首页会提醒今天有课。</div>' +
        '<div><b style="color:var(--ink)">④ 打卡</b> · 每天按一次印章，顺手记学习时长，热力图会慢慢长出颜色。</div>' +
      '</div>' +
    '</div>';
}

/* ================= 弹窗 ================= */
function openModal(html, wide) {
  document.getElementById('modal').className = 'modal' + (wide ? ' wide' : '');
  document.getElementById('modal').innerHTML = html;
  document.getElementById('mask').classList.add('on');
}
function closeModal() { document.getElementById('mask').classList.remove('on'); }

/* --- 打卡 --- */
function openCheckin() {
  const today = todayStr();
  const pm = (typeof pomoToday === 'function') ? pomoToday(false) : { minutes: 0, count: 0 };
  const ck = S.checkins[today] || { minutes: pm.minutes > 0 ? pm.minutes : 60, mood: 'ok', note: '' };
  const mins = [30, 60, 90, 120, 180, 240];
  openModal('<div class="m-head"><h3>' + (S.checkins[today] ? '修改 ' : '') + '今日打卡</h3>' +
    '<button class="icon-btn" onclick="closeModal()">' + ico('x') + '</button></div>' +
    '<div class="m-body">' +
      '<div class="field"><label>今天学了多久</label>' +
        '<div class="min-row" id="minRow">' + mins.map(function (m) {
          return '<button class="' + (ck.minutes === m ? 'on' : '') + '" data-m="' + m + '" onclick="pickMin(this)">' + (m >= 60 ? (m / 60) + ' 小时' : m + ' 分钟') + '</button>';
        }).join('') + '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;margin-top:9px">' +
          '<input class="input" id="ckMin" type="number" min="0" max="900" value="' + ck.minutes + '" style="width:110px">' +
          '<span style="font-size:12px;color:var(--ink3)">分钟，可自己填</span>' +
        '</div>' +
        (pm.count > 0 ? '<div class="hint" style="margin-top:7px;color:var(--green)">番茄钟今天记了 ' + pm.count + ' 个 · ' + pm.minutes + ' 分钟，已自动填好</div>' : '') +
      '</div>' +
      '<div class="field"><label>今天状态</label><div class="mood-row" id="moodRow">' +
        MOODS.map(function (m) {
          return '<button class="' + (ck.mood === m.k ? 'on' : '') + '" data-mood="' + m.k + '" onclick="pickMood(this)">' + m.t + '</button>';
        }).join('') + '</div></div>' +
      '<div class="field"><label>一句话（可选）</label>' +
        '<input class="input" id="ckNote" maxlength="60" placeholder="今天卡在哪个知识点上了" value="' + esc(ck.note || '') + '"></div>' +
    '</div>' +
    '<div class="m-foot">' +
      (S.checkins[today] ? '<button class="btn" style="color:var(--seal)" onclick="undoCheckin()">取消打卡</button>' : '') +
      '<div class="grow"></div>' +
      '<button class="btn" onclick="closeModal()">取消</button>' +
      '<button class="btn seal" onclick="doCheckin()">盖章打卡</button>' +
    '</div>');
  setTimeout(function () { const i = document.getElementById('ckMin'); if (i) i.focus(); }, 80);
}
function pickMin(el) {
  document.querySelectorAll('#minRow button').forEach(function (b) { b.classList.remove('on'); });
  el.classList.add('on');
  document.getElementById('ckMin').value = el.dataset.m;
}
function pickMood(el) {
  document.querySelectorAll('#moodRow button').forEach(function (b) { b.classList.remove('on'); });
  el.classList.add('on');
}
function doCheckin() {
  const m = parseInt(document.getElementById('ckMin').value, 10) || 0;
  const moodBtn = document.querySelector('#moodRow button.on');
  const note = document.getElementById('ckNote').value.trim();
  const today = todayStr();
  S.checkins[today] = {
    ts: (S.checkins[today] && S.checkins[today].ts) || Date.now(),
    minutes: m,
    mood: moodBtn ? moodBtn.dataset.mood : 'ok',
    note: note
  };
  save(); closeModal(); renderAll();
  toast('打卡完成 · 连续 ' + streak() + ' 天');
}
function undoCheckin() {
  delete S.checkins[todayStr()];
  save(); closeModal(); renderAll(); toast('已取消今日打卡');
}

/* --- 小节备注 --- */
function editNote(id) {
  const s = SECTION_MAP[id];
  if (!s) return;
  const r = secRec(id);
  openModal('<div class="m-head"><h3>' + id + ' ' + esc(s.title) + '</h3>' +
    '<button class="icon-btn" onclick="closeModal()">' + ico('x') + '</button></div>' +
    '<div class="m-body">' +
      '<div class="field"><label>状态</label><div style="display:flex;gap:8px">' +
        ['l|听课', 'p|刷题', 'r|错题'].map(function (x) {
          const kv = x.split('|');
          return '<button class="btn ' + (r[kv[0]] ? 'primary' : '') + '" style="flex:1" onclick="toggleTick(\'' + id + '\',\'' + kv[0] + '\');editNote(\'' + id + '\')">' + kv[1] + '</button>';
        }).join('') +
      '</div></div>' +
      '<div class="field"><label>备注 / 卡住的地方</label>' +
        '<textarea class="textarea" id="noteTxt" placeholder="例：极值点偏移第 2 问不会，回看 P76">' + esc(r.note || '') + '</textarea></div>' +
    '</div>' +
    '<div class="m-foot"><button class="btn" onclick="closeModal()">取消</button>' +
    '<button class="btn primary" onclick="saveNote(\'' + id + '\')">保存</button></div>');
}
function saveNote(id) {
  if (!S.progress[id]) S.progress[id] = { l: 0, p: 0, r: 0, note: '' };
  S.progress[id].note = document.getElementById('noteTxt').value.trim();
  save(); closeModal(); renderAll(); toast('备注已保存');
}

/* --- 计划 --- */
let planPick = {};
function openPlan(id) {
  const pl = id ? S.plans.find(function (p) { return p.id === id; }) : null;
  planPick = {};
  const today = todayStr();
  const defEnd = keyOf(new Date(Date.now() + 14 * 86400000));
  if (pl) pl.chapters.forEach(function (c) { planPick[c] = true; });
  openModal('<div class="m-head"><h3>' + (pl ? '编辑计划' : '新建阶段计划') + '</h3>' +
    '<button class="icon-btn" onclick="closeModal()">' + ico('x') + '</button></div>' +
    '<div class="m-body">' +
      '<div class="field"><label>计划名称</label>' +
        '<input class="input" id="plTitle" maxlength="30" placeholder="例：11 月上半月 · 函数与导数" value="' + esc(pl ? pl.title : '') + '"></div>' +
      '<div class="row2">' +
        '<div class="field"><label>开始日期</label><input class="input" type="date" id="plStart" value="' + (pl ? pl.start : today) + '"></div>' +
        '<div class="field"><label>截止日期</label><input class="input" type="date" id="plEnd" value="' + (pl ? pl.end : defEnd) + '"></div>' +
      '</div>' +
      '<div class="field"><label>覆盖哪些章节</label>' +
        '<div class="pick chapters" id="chPick">' +
          BOOK.map(function (ch) {
            return '<button class="' + (planPick[ch.id] ? 'on' : '') + '" data-ch="' + ch.id + '" onclick="pickCh(this)">' +
              (ch.no === '进阶篇' ? '进阶·' : ch.no.replace('第', '').replace('章', '') + '章') + ' ' + esc(ch.title) + '</button>';
          }).join('') +
        '</div>' +
        '<div class="hint" id="pickHint">已选 0 节</div></div>' +
    '</div>' +
    '<div class="m-foot"><button class="btn" onclick="closeModal()">取消</button>' +
    '<button class="btn primary" onclick="savePlan(' + (pl ? '\'' + pl.id + '\'' : 'null') + ')">' + (pl ? '保存' : '创建') + '</button></div>', true);
  updatePickHint();
  if (!pl) {
    const t = document.getElementById('plTitle');
    setTimeout(function () { t.focus(); }, 80);
  }
}
function pickCh(el) {
  const id = el.dataset.ch;
  planPick[id] = !planPick[id];
  el.classList.toggle('on', !!planPick[id]);
  updatePickHint();
}
function updatePickHint() {
  const n = Object.keys(planPick).filter(function (k) { return planPick[k]; });
  let secN = 0;
  n.forEach(function (c) {
    const ch = BOOK.find(function (x) { return x.id === c; });
    if (ch) secN += ch.sections.length;
  });
  const h = document.getElementById('pickHint');
  if (h) h.textContent = '已选 ' + n.length + ' 个章块，共 ' + secN + ' 节';
}
function savePlan(id) {
  const title = document.getElementById('plTitle').value.trim();
  const start = document.getElementById('plStart').value;
  const end = document.getElementById('plEnd').value;
  const chapters = Object.keys(planPick).filter(function (k) { return planPick[k]; });
  if (!title) return toast('给计划起个名字');
  if (!chapters.length) return toast('至少选一个章节');
  if (!start || !end) return toast('填好起止日期');
  if (end < start) return toast('截止日期不能早于开始');

  if (id) {
    const pl = S.plans.find(function (p) { return p.id === id; });
    Object.assign(pl, { title: title, start: start, end: end, chapters: chapters });
  } else {
    S.plans.push({ id: uid(), title: title, start: start, end: end, chapters: chapters, created: Date.now() });
  }
  save(); closeModal(); renderAll(); toast(id ? '计划已更新' : '计划已创建');
}
function delPlan(id) {
  const pl = S.plans.find(function (p) { return p.id === id; });
  if (!pl) return;
  if (!confirm('删除计划「' + pl.title + '」？章节进度不会被删。')) return;
  S.plans = S.plans.filter(function (p) { return p.id !== id; });
  save(); renderAll(); toast('已删除');
}

/* --- 课程 --- */
function openLesson(id, day) {
  const c = id ? S.timetable.find(function (x) { return x.id === id; }) : null;
  const d = c ? Number(c.day) : (day || 1);
  openModal('<div class="m-head"><h3>' + (c ? '编辑课程' : '添加课程') + '</h3>' +
    '<button class="icon-btn" onclick="closeModal()">' + ico('x') + '</button></div>' +
    '<div class="m-body">' +
      '<div class="field"><label>星期</label><div class="pick" id="dayPick">' +
        DAY_NAMES.map(function (n, i) {
          return '<button class="' + (d === i + 1 ? 'on' : '') + '" data-d="' + (i + 1) + '" onclick="pickDay(this)">' + n + '</button>';
        }).join('') + '</div></div>' +
      '<div class="row2">' +
        '<div class="field"><label>开始</label><input class="input" type="time" id="lsStart" value="' + (c ? c.start : '19:00') + '"></div>' +
        '<div class="field"><label>结束</label><input class="input" type="time" id="lsEnd" value="' + (c ? c.end : '20:30') + '"></div>' +
      '</div>' +
      '<div class="field"><label>科目 / 课程名</label>' +
        '<input class="input" id="lsSub" maxlength="24" placeholder="例：数学网课 · 导数专题" value="' + esc(c ? c.subject : '') + '"></div>' +
      '<div class="field"><label>内容（可选）</label>' +
        '<input class="input" id="lsCon" maxlength="40" placeholder="例：3.5 函数构造问题" value="' + esc(c ? c.content : '') + '"></div>' +
      '<div class="field"><label>类型</label><div class="pick" id="typePick">' +
        '<button class="' + (!c || c.type === 'online' ? 'on' : '') + '" data-t="online" onclick="pickType(this)">网课</button>' +
        '<button class="' + (c && c.type === 'offline' ? 'on' : '') + '" data-t="offline" onclick="pickType(this)">线下</button>' +
      '</div></div>' +
      '<div class="field"><label>关联小节（可选）</label>' +
        '<select class="select" id="lsSec"><option value="">不关联</option>' +
        SECTIONS.map(function (s) {
          return '<option value="' + s.id + '" ' + (c && (c.sections || []).indexOf(s.id) >= 0 ? 'selected' : '') + '>' + s.id + ' ' + esc(s.title) + '</option>';
        }).join('') + '</select>' +
        '<div class="hint">关联后章节页会出现「网课」标记，方便知道这节已经排了课。</div></div>' +
    '</div>' +
    '<div class="m-foot">' +
      (c ? '<button class="btn" style="color:var(--seal)" onclick="delLesson(\'' + c.id + '\')">删除</button>' : '') +
      '<div class="grow"></div>' +
      '<button class="btn" onclick="closeModal()">取消</button>' +
      '<button class="btn primary" onclick="saveLesson(' + (c ? '\'' + c.id + '\'' : 'null') + ')">保存</button>' +
    '</div>');
}
function pickDay(el) {
  document.querySelectorAll('#dayPick button').forEach(function (b) { b.classList.remove('on'); });
  el.classList.add('on');
}
function pickType(el) {
  document.querySelectorAll('#typePick button').forEach(function (b) { b.classList.remove('on'); });
  el.classList.add('on');
}
function saveLesson(id) {
  const dayBtn = document.querySelector('#dayPick button.on');
  const typeBtn = document.querySelector('#typePick button.on');
  const sub = document.getElementById('lsSub').value.trim();
  const start = document.getElementById('lsStart').value;
  const end = document.getElementById('lsEnd').value;
  if (!sub) return toast('填一下科目或课程名');
  if (!start || !end) return toast('填好上课时间');
  const sec = document.getElementById('lsSec').value;
  const obj = {
    day: Number(dayBtn.dataset.d),
    start: start, end: end, subject: sub,
    content: document.getElementById('lsCon').value.trim(),
    type: typeBtn.dataset.t,
    sections: sec ? [sec] : []
  };
  if (id) {
    const c = S.timetable.find(function (x) { return x.id === id; });
    Object.assign(c, obj);
  } else {
    S.timetable.push(Object.assign({ id: uid() }, obj));
  }
  save(); closeModal(); renderAll(); toast('课程已保存');
}
function delLesson(id) {
  if (!confirm('删除这节课？')) return;
  S.timetable = S.timetable.filter(function (c) { return c.id !== id; });
  save(); closeModal(); renderAll(); toast('已删除');
}

/* --- 今日待办 --- */
function openTodo() {
  openModal('<div class="m-head"><h3>加一条今日待办</h3>' +
    '<button class="icon-btn" onclick="closeModal()">' + ico('x') + '</button></div>' +
    '<div class="m-body"><div class="field"><label>做什么</label>' +
    '<input class="input" id="todoTxt" maxlength="50" placeholder="例：把 3.3 的错题重做一遍"></div></div>' +
    '<div class="m-foot"><button class="btn" onclick="closeModal()">取消</button>' +
    '<button class="btn primary" onclick="saveTodo()">添加</button></div>');
  setTimeout(function () { document.getElementById('todoTxt').focus(); }, 80);
}
function saveTodo() {
  const t = document.getElementById('todoTxt').value.trim();
  if (!t) return toast('写点内容');
  S.todos.push({ id: uid(), date: todayStr(), text: t, done: 0 });
  save(); closeModal(); renderAll();
}
function toggleTodo(id) {
  const t = S.todos.find(function (x) { return x.id === id; });
  if (!t) return;
  t.done = t.done ? 0 : 1;
  save(); renderAll();
}
function delTodo(id) {
  S.todos = S.todos.filter(function (x) { return x.id !== id; });
  save(); renderAll();
}

/* --- 数据 --- */
function setExamDate(v) {
  if (!v) return;
  S.examDate = v; save(); renderAll(); toast('高考日期已更新');
}
function exportData() {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  const d = new Date();
  a.href = URL.createObjectURL(blob);
  a.download = '复习打卡备份_' + keyOf(d) + '.json';
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  toast('已导出到下载文件夹');
}
function importData(input) {
  const f = input.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = function () {
    try {
      const o = JSON.parse(reader.result);
      if (!o || typeof o !== 'object' || !o.progress) throw new Error('格式不对');
      if (!confirm('导入会覆盖当前全部记录，确定吗？')) return;
      S = Object.assign(JSON.parse(JSON.stringify(DEFAULT_STATE)), o);
      save(); renderAll(); toast('导入成功');
    } catch (e) {
      toast('文件读不了：不是有效的备份');
    }
    input.value = '';
  };
  reader.readAsText(f);
}
function clearData() {
  if (!confirm('将删除本机全部打卡、进度、计划和课表，且不可恢复。确定？')) return;
  if (!confirm('再确认一次：真的要清空吗？建议先导出备份。')) return;
  S = JSON.parse(JSON.stringify(DEFAULT_STATE));
  save(); renderAll(); toast('已清空');
}

/* ---------- 图标 ---------- */
function ico(name) {
  const p = {
    check: '<path d="m4 12 5 5L20 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    pen: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    caret: '<path d="m9 18 6-6-6-6"/>',
    alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    video: '<rect x="2" y="6" width="13" height="12" rx="2"/><path d="m15 10 6-3v10l-6-3"/>',
    bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z"/>',
    download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 17v3h16v-3"/>',
    upload: '<path d="M12 17V5m0 0-4 4m4-4 4 4"/><path d="M4 17v3h16v-3"/>'
  };
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;flex:none">' + (p[name] || '') + '</svg>';
}

/* ---------- toast ---------- */
let toastTimer;
function toast(msg) {
  let el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.classList.remove('on'); }, 2200);
}

/* ---------- 初始化 ---------- */
function init() {
  if ((location.search || '').indexOf('noanim') >= 0) document.body.classList.add('noanim');

  // 装成应用后支持离线打开（file:// 下不注册）
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('./sw.js').catch(function () { /* 离线能力不可用不影响主流程 */ });
  }

  document.getElementById('mask').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });
  document.querySelectorAll('.nav-item').forEach(function (b) {
    b.addEventListener('click', function () { go(b.dataset.page); });
  });

  // 默认展开第一个没做完的章
  for (let i = 0; i < BOOK.length; i++) {
    if (chapterStats(BOOK[i]).rate < 0.9999) { openChapters[BOOK[i].id] = true; break; }
  }
  const now = new Date();
  document.querySelectorAll('.nav-item[data-page="today"]').forEach(function (b) { b.classList.add('on'); });
  document.getElementById('page-today').classList.add('on');
  renderAll();

  const hash = (location.hash || '').replace('#', '');
  if (hash && document.getElementById('page-' + hash)) go(hash);
}

document.addEventListener('DOMContentLoaded', init);
