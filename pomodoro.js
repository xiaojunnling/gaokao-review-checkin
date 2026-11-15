/* ================= 番茄钟 =================
 * 25 分钟专注 → 5 分钟休息 → 无限循环
 * 浮窗：Document Picture-in-Picture，始终压在最上层，切标签页也不消失
 * 提醒：网页直接把提示音送到指定喇叭（绕过耳机）+ 整屏变色 + 系统通知 + 浮窗闪红
 * 记录：每完成一个专注段，自动把时长累加进当天打卡数据
 * 依赖 app.js 里的 S / save() / todayStr() / toast() / esc()
 */

var POMO_DEF = {
  work: 25,
  rest: 5,
  longOn: false,
  long: 15,
  longEvery: 4,
  sound: true,
  volume: 90,
  sinkId: '',
  sinkLabel: '',
  fullscreen: true,
  pushBrowser: true
};

var POMO_PHASE = {
  idle: { t: '准备开始', c: '#2b4a6b' },
  work: { t: '专注中', c: '#b34a33' },
  rest: { t: '休息中', c: '#4f7a5b' },
  longRest: { t: '长休息', c: '#4f7a5b' }
};

var pomoS = { phase: 'idle', endAt: 0, paused: false, remain: 0, total: 0, left: 0 };
var pomoTimer = null;
var pipTimer = null;
var pipWin = null;
var pomoFinishing = false;
var pomoFlashTimer = null;
var pomoTitleTimer = null;

/* ---------- 数据 ---------- */

function pomoSettings() {
  if (!S.pomo) S.pomo = {};
  if (!S.pomo.settings) S.pomo.settings = {};
  if (!S.pomo.days) S.pomo.days = {};
  var st = S.pomo.settings;
  Object.keys(POMO_DEF).forEach(function (k) {
    if (st[k] === undefined) st[k] = POMO_DEF[k];
  });
  return st;
}

function pomoToday(create) {
  pomoSettings();
  var k = todayStr();
  if (!S.pomo.days[k] && create) {
    S.pomo.days[k] = { count: 0, minutes: 0, list: [] };
  }
  return S.pomo.days[k] || { count: 0, minutes: 0, list: [] };
}

function pomoTotal() {
  pomoSettings();
  var days = 0, count = 0, minutes = 0;
  Object.keys(S.pomo.days).forEach(function (k) {
    var d = S.pomo.days[k];
    if (!d || !d.count) return;
    days++;
    count += d.count;
    minutes += d.minutes || 0;
  });
  return { days: days, count: count, minutes: minutes };
}

function pomoAddRecord(min) {
  var d = pomoToday(true);
  d.count++;
  d.minutes = (d.minutes || 0) + min;
  if (!d.list) d.list = [];
  d.list.push({ at: Date.now(), min: min });
  if (d.list.length > 60) d.list = d.list.slice(-60);
  save();
}

/* ---------- 计时核心 ---------- */

function pomoMinutesOf(phase) {
  var st = pomoSettings();
  if (phase === 'work') return Math.max(1, Number(st.work) || 25);
  if (phase === 'longRest') return Math.max(1, Number(st.long) || 15);
  return Math.max(1, Number(st.rest) || 5);
}

function pomoEnter(phase) {
  var min = pomoMinutesOf(phase);
  pomoS.phase = phase;
  pomoS.total = min * 60000;
  pomoS.endAt = Date.now() + pomoS.total;
  pomoS.remain = pomoS.total;
  pomoS.paused = false;
  pomoS.left = pomoS.total;
  pomoSave();
  pomoStartTimer();
  pomoRender();
}

function pomoSave() {
  if (!S.pomo) S.pomo = {};
  S.pomo.run = pomoS.phase === 'idle' ? null : {
    phase: pomoS.phase,
    endAt: pomoS.endAt,
    paused: pomoS.paused,
    remain: pomoS.paused ? pomoS.remain : 0,
    total: pomoS.total
  };
  save();
}

function pomoRestore() {
  if (!S.pomo || !S.pomo.run) return;
  var r = S.pomo.run;
  var left = r.paused ? (r.remain || 0) : (r.endAt - Date.now());
  if (left <= 0 || left > (r.total || 0) + 1000) {
    S.pomo.run = null;
    save();
    return;
  }
  pomoS.phase = r.phase;
  pomoS.endAt = r.endAt;
  pomoS.paused = !!r.paused;
  pomoS.remain = r.remain || left;
  pomoS.total = r.total || left;
  pomoS.left = left;
  pomoStartTimer();
}

function pomoStartTimer() {
  if (pomoTimer) return;
  pomoTimer = setInterval(pomoTick, 250);
}

function pomoStopTimer() {
  if (pomoTimer) { clearInterval(pomoTimer); pomoTimer = null; }
}

function pomoTick() {
  if (pomoS.phase === 'idle') { pomoStopTimer(); return; }
  var left = pomoS.paused ? pomoS.remain : (pomoS.endAt - Date.now());
  pomoS.left = left;
  if (left <= 0) { pomoFinish(); return; }
  pomoRenderLight();
}

function pomoFinish() {
  /* 防重入：提醒环节万一出错，也绝不能让心跳重复判定「这段结束了」而重复记时长 */
  if (pomoFinishing) return;
  pomoFinishing = true;

  var st = pomoSettings();
  var from = pomoS.phase;
  var addMin = 0, n = 0, next = 'work';
  var title = '', content = '', kind = 'work';

  if (from === 'work') {
    addMin = pomoMinutesOf('work');
    n = pomoToday(false).count + 1;
    var isLong = !!st.longOn && Number(st.longEvery) > 0 && n % Number(st.longEvery) === 0;
    next = isLong ? 'longRest' : 'rest';
    var restMin = pomoMinutesOf(next);
    title = '第 ' + n + ' 个番茄完成';
    content = '已专注 ' + addMin + ' 分钟。' + (isLong ? '长休息' : '休息') + ' ' + restMin + ' 分钟，起来走走、看看远处。';
    kind = 'rest';
  } else {
    n = pomoToday(false).count;
    next = 'work';
    title = '休息结束，回来学习';
    content = '开始第 ' + (n + 1) + ' 个番茄，专注 ' + pomoMinutesOf('work') + ' 分钟。';
    kind = 'work';
  }

  /* 先把状态推进到下一段——这一步必须成功，后面的提醒只是锦上添花 */
  try {
    pomoEnter(next);
  } finally {
    pomoFinishing = false;
  }

  if (addMin) pomoAddRecord(addMin);

  try {
    pomoFlash();
    pomoNotify(title, content, kind);
  } catch (e) {
    console.warn('[番茄钟] 提醒失败', e);
  }
}

/* ---------- 控制 ---------- */

function pomoToggle() {
  var st = pomoSettings();
  pomoEnsureAudio();   // 借用户这一次点击把音频解锁，不然到点放不出声
  if (pomoS.phase === 'idle') {
    if (st.pushBrowser && 'Notification' in window && Notification.permission === 'default') {
      try { Notification.requestPermission(); } catch (e) { }
    }
    pomoEnter('work');
    toast('番茄开始 · ' + pomoMinutesOf('work') + ' 分钟');
    return;
  }
  if (pomoS.paused) {
    pomoS.paused = false;
    pomoS.endAt = Date.now() + pomoS.remain;
    pomoStartTimer();
  } else {
    pomoS.remain = Math.max(0, pomoS.endAt - Date.now());
    pomoS.paused = true;
  }
  pomoSave();
  pomoRender();
}

function pomoSkip() {
  if (pomoS.phase === 'idle') return;
  var from = pomoS.phase;
  if (from === 'work') {
    // 跳过专注段：不记时长，直接进休息
    pomoEnter('rest');
    toast('已跳过本段专注');
  } else {
    pomoEnter('work');
    toast('已跳过休息');
  }
}

function pomoStop() {
  pomoStopTimer();
  pomoS.phase = 'idle';
  pomoS.paused = false;
  pomoS.endAt = 0;
  pomoS.left = 0;
  pomoS.total = 0;
  pomoSave();
  pomoRender();
  toast('番茄钟已结束');
}

/* ---------- 提醒 ---------- */

var pomoAudioCtx = null;
var pomoSinkList = [];

/* 网页自己发声，并且指定从哪只喇叭出，绕过耳机 */
function pomoEnsureAudio() {
  if (!pomoAudioCtx) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { pomoAudioCtx = new AC(); } catch (e) { return null; }
  }
  if (pomoAudioCtx.state === 'suspended') {
    try { pomoAudioCtx.resume(); } catch (e) { }
  }
  return pomoAudioCtx;
}

function pomoWithSink(ctx, cb) {
  var st = pomoSettings();
  if (!st.sinkId || typeof ctx.setSinkId !== 'function') { cb(); return; }
  ctx.setSinkId(st.sinkId).then(cb).catch(function (e) {
    console.warn('[番茄钟] 指定扬声器失败，改用系统默认', e);
    cb();
  });
}

function pomoBeep(times, freqA, freqB) {
  try {
    var st = pomoSettings();
    if (!st.sound) return;
    var ctx = pomoEnsureAudio();
    if (!ctx) return;
    var vol = Math.min(1, Math.max(0.05, (Number(st.volume) || 90) / 100));
    var n = times || 6;
    var fa = freqA || 880;
    var fb = freqB || 660;

    pomoWithSink(ctx, function () {
      try {
        var t0 = ctx.currentTime + 0.06;
        for (var i = 0; i < n; i++) {
          var s = t0 + i * 0.34;
          var o = ctx.createOscillator();
          var g = ctx.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(i % 2 ? fb : fa, s);
          g.gain.setValueAtTime(0.0001, s);
          g.gain.exponentialRampToValueAtTime(vol, s + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0001, s + 0.26);
          o.connect(g);
          g.connect(ctx.destination);
          o.start(s);
          o.stop(s + 0.28);
        }
      } catch (e) {
        console.warn('[番茄钟] 播放提示音失败', e);
      }
    });
  } catch (e) {
    console.warn('[番茄钟] 播放提示音失败', e);
  }
}

function pomoSelectSpeaker() {
  var md = navigator.mediaDevices;
  if (!md) { toast('这个浏览器不支持选设备'); return; }
  pomoEnsureAudio();

  if (typeof md.selectAudioOutput === 'function') {
    md.selectAudioOutput().then(function (dev) {
      pomoSetSink(dev.deviceId, dev.label || '已选扬声器');
    }).catch(function (e) {
      if (e && e.name === 'NotAllowedError') return;
      pomoSelectSpeakerFallback();
    });
    return;
  }
  pomoSelectSpeakerFallback();
}

function pomoSelectSpeakerFallback() {
  var md = navigator.mediaDevices;
  if (!md || !md.getUserMedia) { toast('这个浏览器不支持选设备'); return; }
  var tip = document.getElementById('pomoSinkHint');
  if (tip) tip.textContent = '浏览器正在问麦克风权限。这是为了让它报出喇叭的名字，不会录音、不会上传。';
  md.getUserMedia({ audio: true }).then(function (stream) {
    stream.getTracks().forEach(function (t) { t.stop(); });
    return md.enumerateDevices();
  }).then(function (list) {
    var outs = list.filter(function (d) { return d.kind === 'audiooutput'; });
    if (!outs.length) {
      toast('没找到第二只喇叭，这台机器可能只有一路输出');
      return;
    }
    pomoShowSinkPicker(outs);
  }).catch(function (e) {
    if (e && e.name === 'NotAllowedError') toast('麦克风权限被拒了，就没法认出喇叭的名字');
    else toast('拿不到设备列表，检查浏览器的麦克风权限');
  });
}

function pomoShowSinkPicker(outs) {
  pomoSinkList = outs;
  var st = pomoSettings();
  openModal('<div class="m-head"><h3>提示音从哪只喇叭出</h3>' +
    '<button class="icon-btn" onclick="closeModal()">' + ico('x') + '</button></div>' +
    '<div class="m-body"><div class="field"><label>输出设备</label>' +
      '<div class="pick" style="display:flex;flex-direction:column;gap:8px">' +
      outs.map(function (d, i) {
        var nm = d.label || ('设备 ' + (i + 1));
        var on = st.sinkId && d.deviceId === st.sinkId;
        return '<button class="' + (on ? 'on' : '') + '" onclick="pomoPickSink(' + i + ')">' + esc(nm) + '</button>';
      }).join('') +
      '</div>' +
      '<div class="hint" style="margin-top:9px">选笔记本自带的那只（一般是 Realtek），这样你戴着耳机也能听到。</div>' +
    '</div></div>' +
    '<div class="m-foot"><div class="grow"></div><button class="btn" onclick="closeModal()">取消</button></div>');
}

function pomoPickSink(i) {
  var d = pomoSinkList[i];
  if (!d) return;
  pomoSetSink(d.deviceId, d.label || ('设备 ' + (i + 1)));
}

function pomoSetSink(id, label) {
  var st = pomoSettings();
  st.sinkId = id || '';
  st.sinkLabel = label || '';
  save();
  closeModal();
  if (currentPage === 'pomo') pomoRenderPage();
  toast('提示音从「' + (label || '系统默认') + '」出');
  pomoBeep(3);
}

function pomoClearSink() {
  var st = pomoSettings();
  st.sinkId = '';
  st.sinkLabel = '';
  save();
  if (currentPage === 'pomo') pomoRenderPage();
  toast('已改回系统默认设备');
}

function pomoTestSound() {
  pomoBeep(3);
  toast('听得到吗？听不到就换设备，或者把音量拉满');
}

/* 到点时整块屏幕变红／变绿，抢注意力 */
function pomoAlarm(title, sub, kind) {
  try {
    var st = pomoSettings();
    if (!st.fullscreen) return;
    var old = document.getElementById('pomoAlarm');
    if (old && old.parentNode) old.parentNode.removeChild(old);

    var div = document.createElement('div');
    div.id = 'pomoAlarm';
    div.className = 'pomo-alarm ' + (kind === 'rest' ? 'is-rest' : 'is-work');
    div.innerHTML = '<div class="pa-in">' +
        '<div class="pa-k">' + (kind === 'rest' ? '专注结束' : '休息结束') + '</div>' +
        '<div class="pa-t">' + esc(title) + '</div>' +
        '<div class="pa-s">' + esc(sub) + '</div>' +
        '<div class="pa-h">点一下关掉</div>' +
      '</div>';
    div.onclick = function () { if (div.parentNode) div.parentNode.removeChild(div); };
    document.body.appendChild(div);

    setTimeout(function () { if (div.parentNode) div.parentNode.removeChild(div); }, 25000);
  } catch (e) {
    console.warn('[番茄钟] 整屏提醒失败', e);
  }
}

function pomoNotify(title, content, kind) {
  var st = pomoSettings();

  pomoBeep(6);
  pomoAlarm(title, content, kind);

  if (st.pushBrowser && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body: content, tag: 'gk-pomo', renotify: true, requireInteraction: true });
    } catch (e) { }
  }

  pomoTitleFlash(title);
}

function pomoTitleFlash(text) {
  if (pomoTitleTimer) clearInterval(pomoTitleTimer);
  var base = '复习打卡 · 高考数学';
  var on = true;
  document.title = '⏰ ' + text;
  pomoTitleTimer = setInterval(function () {
    on = !on;
    document.title = on ? '⏰ ' + text : base;
  }, 1200);
  setTimeout(function () {
    clearInterval(pomoTitleTimer);
    pomoTitleTimer = null;
    document.title = base;
  }, 12000);
}

function pomoFlash() {
  if (pomoFlashTimer) clearTimeout(pomoFlashTimer);
  var inner = pipWin && pipWin.document.getElementById('pipInner');
  if (inner) inner.classList.add('flash');
  pomoFlashTimer = setTimeout(function () {
    if (inner) inner.classList.remove('flash');
  }, 9000);
}

/* ---------- 主页面画法 ---------- */

function pomoMMSS(ms) {
  var s = Math.max(0, Math.ceil(ms / 1000));
  return pad(Math.floor(s / 60)) + ':' + pad(s % 60);
}

function pomoRingOffset(left, total, r) {
  var C = 2 * Math.PI * r;
  var p = total > 0 ? Math.min(1, Math.max(0, left / total)) : 1;
  return C * (1 - p);
}

function pomoRender() {
  if (currentPage === 'pomo') pomoRenderPage();
  pomoRenderLight();
  pomoRenderPip();
}

/* 只更新会变的部分，避免整页重绘打断输入 */
function pomoRenderLight() {
  var ph = POMO_PHASE[pomoS.phase] || POMO_PHASE.idle;
  var timeStr = pomoS.phase === 'idle' ? pomoMMSS(pomoMinutesOf('work') * 60000) : pomoMMSS(Math.max(0, pomoS.left));
  var today = pomoToday(false);

  var t = document.getElementById('pomoTime');
  if (t) t.textContent = timeStr;
  var p = document.getElementById('pomoPhase');
  if (p) { p.textContent = ph.t; p.style.color = ph.c; }
  var arc = document.getElementById('pomoArc');
  if (arc) {
    arc.style.stroke = ph.c;
    arc.setAttribute('stroke-dashoffset', pomoRingOffset(pomoS.phase === 'idle' ? 1 : Math.max(0, pomoS.left), pomoS.total || 1, 88).toFixed(1));
  }
  var sub = document.getElementById('pomoSub');
  if (sub) sub.textContent = '今天 ' + today.count + ' 个 · ' + today.minutes + ' 分钟';

  var btn = document.getElementById('pomoMainBtn');
  if (btn) btn.textContent = pomoS.phase === 'idle' ? '开始专注' : (pomoS.paused ? '继续' : '暂停');

  var inline = document.getElementById('pomoInlineTime');
  if (inline) {
    inline.textContent = pomoS.phase === 'idle'
      ? (today.count ? '今天 ' + today.count + ' 个番茄 · ' + today.minutes + ' 分钟' : '还没开始今天的番茄')
      : (ph.t + ' ' + timeStr);
  }
  var inlineDot = document.getElementById('pomoInlineDot');
  if (inlineDot) inlineDot.style.background = pomoS.phase === 'idle' ? '#c9c2b3' : ph.c;
}

function pomoRenderPage() {
  var st = pomoSettings();
  var today = pomoToday(false);
  var all = pomoTotal();
  var ph = POMO_PHASE[pomoS.phase] || POMO_PHASE.idle;

  var html = '';

  html += '<div class="card pomo-card">' +
    '<div class="pomo-stage">' +
      '<svg class="pomo-ring" viewBox="0 0 200 200">' +
        '<circle class="ring-bg" cx="100" cy="100" r="88" stroke-width="8" fill="none"></circle>' +
        '<circle class="ring-fg" id="pomoArc" cx="100" cy="100" r="88" stroke-width="8" fill="none" ' +
          'stroke="' + ph.c + '" stroke-linecap="round" transform="rotate(-90 100 100)" ' +
          'stroke-dasharray="552.9" stroke-dashoffset="0"></circle>' +
      '</svg>' +
      '<div class="pomo-center">' +
        '<div class="pomo-phase" id="pomoPhase" style="color:' + ph.c + '">' + ph.t + '</div>' +
        '<div class="pomo-time" id="pomoTime">' + pomoMMSS(pomoMinutesOf(pomoS.phase === 'idle' ? 'work' : pomoS.phase) * 60000) + '</div>' +
        '<div class="pomo-sub" id="pomoSub">今天 ' + today.count + ' 个 · ' + today.minutes + ' 分钟</div>' +
      '</div>' +
    '</div>' +
    '<div class="pomo-btns">' +
      '<button class="btn primary" id="pomoMainBtn" onclick="pomoToggle()">开始专注</button>' +
      '<button class="btn" onclick="pomoSkip()">跳过</button>' +
      '<button class="btn" onclick="pomoStop()">结束</button>' +
      '<button class="btn" onclick="pomoOpenPip()">浮窗置顶</button>' +
    '</div>' +
    '<div class="pomo-tip" id="pomoTip">浮窗会一直压在所有窗口上面，切去看网课也不会消失。到点从机身喇叭响，屏幕会变色。</div>' +
  '</div>';

  /* 节奏 */
  html += '<div class="card card-pad" style="margin-top:14px">' +
    '<div class="sec-head" style="margin:0 0 12px"><h3>节奏</h3><span class="sub">改完立刻生效，下次开始按新时长算</span></div>' +
    '<div class="row2">' +
      '<div class="field"><label>专注（分钟）</label><input class="input" type="number" min="1" max="120" id="pmWork" value="' + st.work + '"></div>' +
      '<div class="field"><label>休息（分钟）</label><input class="input" type="number" min="1" max="60" id="pmRest" value="' + st.rest + '"></div>' +
    '</div>' +
    '<div class="field" style="margin-top:12px">' +
      '<label style="display:flex;align-items:center;gap:9px;cursor:pointer">' +
        '<input type="checkbox" id="pmLongOn" ' + (st.longOn ? 'checked' : '') + ' style="width:15px;height:15px;accent-color:#2b4a6b">' +
        '每 ' + st.longEvery + ' 个番茄来一次长休息</label>' +
      '<div class="row2" style="margin-top:10px">' +
        '<div class="field"><label>长休息（分钟）</label><input class="input" type="number" min="1" max="90" id="pmLong" value="' + st.long + '"></div>' +
        '<div class="field"><label>每隔几个番茄</label><input class="input" type="number" min="2" max="12" id="pmLongEvery" value="' + st.longEvery + '"></div>' +
      '</div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-top:4px"><button class="btn primary" onclick="pomoSaveSettings()">保存节奏</button></div>' +
  '</div>';

  /* 提醒 */
  html += '<div class="card card-pad" style="margin-top:14px">' +
    '<div class="sec-head" style="margin:0 0 12px"><h3>到点怎么喊你</h3><span class="sub">不用公众号、不花钱、不出网</span></div>' +

    '<div class="pomo-sink">' +
      '<div class="ps-lab">提示音从哪只喇叭出</div>' +
      '<div class="ps-val ' + (st.sinkLabel ? 'on' : '') + '">' +
        (st.sinkLabel ? esc(st.sinkLabel) : '跟系统走（也就是你现在戴的耳机）') +
      '</div>' +
      '<div class="ps-acts">' +
        '<button class="btn primary" onclick="pomoSelectSpeaker()">选喇叭</button>' +
        '<button class="btn" onclick="pomoTestSound()">试听</button>' +
        (st.sinkLabel ? '<button class="btn ghost" onclick="pomoClearSink()">改回默认</button>' : '') +
      '</div>' +
      '<div class="hint" id="pomoSinkHint" style="margin-top:10px;line-height:1.8">' +
        '选笔记本自带的那只（名字里带 Realtek 的那个）。选完声音从机身出去，不经过耳机线，戴着耳机也能听到。' +
      '</div>' +
    '</div>' +

    '<div class="field" style="margin-top:18px">' +
      '<label>音量 <b id="pmVolVal" style="color:var(--seal)">' + st.volume + '%</b></label>' +
      '<input type="range" min="10" max="100" step="5" value="' + st.volume + '" id="pmVolume" ' +
        'oninput="pomoVolPreview(this.value)" onchange="pomoVolCommit(this.value)" ' +
        'style="width:100%;accent-color:#b34a33">' +
    '</div>' +

    '<label class="pomo-chk"><input type="checkbox" id="pmSound" ' + (st.sound ? 'checked' : '') + '> 到点响铃</label>' +
    '<label class="pomo-chk"><input type="checkbox" id="pmFullscreen" ' + (st.fullscreen ? 'checked' : '') + '> 到点整块屏幕变色（红＝该休息，绿＝该学习）</label>' +
    '<label class="pomo-chk"><input type="checkbox" id="pmPushBrowser" ' + (st.pushBrowser ? 'checked' : '') + '> 顺便弹一个 Windows 系统通知</label>' +

    '<div style="margin-top:16px"><button class="btn primary" onclick="pomoSaveSettings()">保存设置</button></div>' +
  '</div>';

  /* 记录 */
  html += '<div class="stat-row" style="margin-top:14px">' +
    statCard('今天番茄', today.count, '个', today.minutes + ' 分钟') +
    statCard('累计番茄', all.count, '个', all.days + ' 天有记录') +
    statCard('累计专注', (all.minutes / 60).toFixed(1), 'h', '平均每个 ' + (all.count ? Math.round(all.minutes / all.count) : 0) + ' 分钟') +
  '</div>';

  html += '<div class="card card-pad" style="margin-top:14px">' +
    '<div class="sec-head" style="margin:0 0 10px"><h3>怎么算进打卡</h3></div>' +
    '<div class="hint" style="line-height:1.9">' +
      '每完成一个专注段，时长自动累加到今天。<br>' +
      '去「今日」点打卡时，时长已经填好了，你只选状态、写一句话。<br>' +
      '跳过或中途结束的那个番茄不算数。' +
    '</div>' +
  '</div>';

  document.getElementById('page-pomo').innerHTML = html;
  pomoRenderLight();
}

function pomoSaveSettings() {
  var st = pomoSettings();
  var w = parseInt(document.getElementById('pmWork').value, 10);
  var r = parseInt(document.getElementById('pmRest').value, 10);
  var l = parseInt(document.getElementById('pmLong').value, 10);
  var e = parseInt(document.getElementById('pmLongEvery').value, 10);
  st.work = Math.min(120, Math.max(1, w || 25));
  st.rest = Math.min(60, Math.max(1, r || 5));
  st.long = Math.min(90, Math.max(1, l || 15));
  st.longEvery = Math.min(12, Math.max(2, e || 4));
  st.longOn = document.getElementById('pmLongOn').checked;
  st.sound = document.getElementById('pmSound').checked;
  st.fullscreen = document.getElementById('pmFullscreen').checked;
  st.pushBrowser = document.getElementById('pmPushBrowser').checked;
  save();
  pomoRenderPage();
  toast('设置已保存');
}

function pomoVolPreview(v) {
  var el = document.getElementById('pmVolVal');
  if (el) el.textContent = v + '%';
  pomoSettings().volume = Number(v) || 90;
}

function pomoVolCommit(v) {
  var st = pomoSettings();
  st.volume = Number(v) || 90;
  save();
  pomoBeep(2);
}

/* 首页 / 统计页引用的紧凑行 */
function pomoInlineHtml() {
  var today = pomoToday(false);
  var ph = POMO_PHASE[pomoS.phase] || POMO_PHASE.idle;
  var text = pomoS.phase === 'idle'
    ? (today.count ? '今天 ' + today.count + ' 个番茄 · ' + today.minutes + ' 分钟' : '还没开始今天的番茄')
    : (ph.t + ' ' + pomoMMSS(Math.max(0, pomoS.left)));
  return '<div class="pomo-inline" onclick="go(\'pomo\')">' +
    '<i id="pomoInlineDot" style="background:' + (pomoS.phase === 'idle' ? '#c9c2b3' : ph.c) + '"></i>' +
    '<span id="pomoInlineTime">' + text + '</span>' +
    '<span class="grow"></span>' +
    '<b>' + (pomoS.phase === 'idle' ? '开始番茄' : '回到番茄') + ' ›</b>' +
  '</div>';
}

/* ---------- 浮窗 ---------- */

function pomoOpenPip() {
  if (!('documentPictureInPicture' in window)) {
    toast('这个浏览器不支持浮窗，换 Chrome 或 Edge 打开');
    return;
  }
  if (pipWin) { try { pipWin.close(); } catch (e) { } pipWin = null; }

  documentPictureInPicture.requestWindow({ width: 300, height: 330 }).then(function (win) {
    pipWin = win;

    /* 把主页面样式搬进浮窗 */
    var head = win.document.head;
    var meta = win.document.createElement('meta');
    meta.setAttribute('charset', 'utf-8');
    head.appendChild(meta);
    var titleEl = win.document.createElement('title');
    titleEl.textContent = '番茄钟';
    head.appendChild(titleEl);

    Array.prototype.forEach.call(document.styleSheets, function (sheet) {
      try {
        var css = Array.prototype.map.call(sheet.cssRules, function (rule) { return rule.cssText; }).join('\n');
        var tag = win.document.createElement('style');
        tag.textContent = css;
        head.appendChild(tag);
      } catch (e) {
        if (sheet.href) {
          var link = win.document.createElement('link');
          link.rel = 'stylesheet';
          link.href = sheet.href;
          head.appendChild(link);
        }
      }
    });

    win.document.body.className = 'pip-body';
    win.document.body.innerHTML =
      '<div class="pip-inner" id="pipInner">' +
        '<div class="pip-top">' +
          '<i class="pip-dot" id="pipDot"></i>' +
          '<span id="pipPhase">准备开始</span>' +
          '<span class="grow"></span>' +
          '<span class="pip-count" id="pipCount">0</span>' +
        '</div>' +
        '<div class="pip-ring-wrap">' +
          '<svg viewBox="0 0 120 120">' +
            '<circle cx="60" cy="60" r="52" stroke-width="7" fill="none" class="pip-ring-bg"></circle>' +
            '<circle cx="60" cy="60" r="52" stroke-width="7" fill="none" class="pip-ring-fg" id="pipArc" ' +
              'stroke-linecap="round" transform="rotate(-90 60 60)" stroke-dasharray="326.7" stroke-dashoffset="0"></circle>' +
          '</svg>' +
          '<div class="pip-time" id="pipTime">25:00</div>' +
        '</div>' +
        '<div class="pip-btns">' +
          '<button id="pipMain" class="pip-b-btn">开始</button>' +
          '<button id="pipSkip" class="pip-b-btn">跳过</button>' +
          '<button id="pipStop" class="pip-b-btn">结束</button>' +
        '</div>' +
      '</div>';

    win.document.getElementById('pipMain').onclick = pomoToggle;
    win.document.getElementById('pipSkip').onclick = pomoSkip;
    win.document.getElementById('pipStop').onclick = pomoStop;

    /* 主页面切到后台会被浏览器降频，浮窗可见所以不被降频，
       让浮窗自己驱动一次计时，保证倒计时不卡、到点不迟到 */
    if (pipTimer) { clearInterval(pipTimer); pipTimer = null; }
    pipTimer = win.setInterval(pomoTick, 250);

    win.addEventListener('pagehide', function () {
      if (pipTimer) { clearInterval(pipTimer); pipTimer = null; }
      pipWin = null;
      var tip = document.getElementById('pomoTip');
      if (tip) tip.textContent = '浮窗已关。计时还在跑，点「浮窗置顶」可以重新打开。';
    });

    pomoRenderPip();
    toast('浮窗已打开 · 拖到屏幕角落就行');
  }).catch(function (e) {
    console.warn(e);
    toast('浮窗打不开，可能被浏览器拦了');
  });
}

function pomoRenderPip() {
  if (!pipWin) return;
  var d = pipWin.document;
  var ph = POMO_PHASE[pomoS.phase] || POMO_PHASE.idle;
  var today = pomoToday(false);

  var timeEl = d.getElementById('pipTime');
  if (!timeEl) return;
  timeEl.textContent = pomoS.phase === 'idle'
    ? pomoMMSS(pomoMinutesOf('work') * 60000)
    : pomoMMSS(Math.max(0, pomoS.left));

  var phEl = d.getElementById('pipPhase');
  if (phEl) { phEl.textContent = ph.t; phEl.style.color = ph.c; }

  var dot = d.getElementById('pipDot');
  if (dot) dot.style.background = ph.c;

  var cnt = d.getElementById('pipCount');
  if (cnt) cnt.textContent = '🍅 ' + today.count;

  var arc = d.getElementById('pipArc');
  if (arc) {
    arc.style.stroke = ph.c;
    arc.setAttribute('stroke-dashoffset', pomoRingOffset(pomoS.phase === 'idle' ? 1 : Math.max(0, pomoS.left), pomoS.total || 1, 52).toFixed(1));
  }

  var mainBtn = d.getElementById('pipMain');
  if (mainBtn) mainBtn.textContent = pomoS.phase === 'idle' ? '开始' : (pomoS.paused ? '继续' : '暂停');

  d.title = (pomoS.phase === 'idle' ? '' : pomoMMSS(Math.max(0, pomoS.left)) + ' · ') + ph.t;
}

/* ---------- 挂载 ---------- */

(function pomoBoot() {
  pomoSettings();
  pomoRestore();
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) pomoTick();
  });
  window.addEventListener('beforeunload', function () {
    if (pomoS.phase !== 'idle') pomoSave();
  });
  if (pomoS.phase !== 'idle') {
    pomoStartTimer();
    setTimeout(function () {
      toast('番茄还在跑 · ' + POMO_PHASE[pomoS.phase].t + ' ' + pomoMMSS(Math.max(0, pomoS.left)));
    }, 600);
  }
})();
