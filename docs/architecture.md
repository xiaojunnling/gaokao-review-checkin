# 设计与数据说明

本文记录代码里不太直观的部分，供改动时查阅。项目本身零依赖、无构建步骤，`index.html` 直接引用根目录下的脚本与样式。

## 本地数据

所有数据存在浏览器本地存储，键名 `gk_review_v1`。结构示意（示例值均为占位符）：

```js
{
  version: 1,
  examDate: 'YYYY-MM-DD',          // 高考日期，用于首页倒计时；空字符串表示还没填
  checkins: {                      // 打卡记录，按日期
    'YYYY-MM-DD': { ts, minutes, mood, note }
  },
  progress: {                      // 小节进度，键为小节 id
    '2.1': { l, p, r, note, at }
  },
  plans: [                         // 阶段计划
    { id, title, start, end, chapters, created }
  ],
  timetable: [                     // 网课课表
    { id, day, start, end, subject, content, type, sections }
  ],
  todos: [ { id, date, text, done } ],
  log: [ { d, t, id, f, v } ],     // 操作流水，用于「最近 7 天」
  pomo: {                          // 番茄钟，见下节
    settings: { work, rest, longOn, long, longEvery, sound, volume, sinkId, sinkLabel, fullscreen, pushBrowser },
    days: { 'YYYY-MM-DD': { count, minutes, list: [ { at, min } ] } },
    run: { phase, endAt, paused, remain, total } | null   // 正在跑的那一段，刷新后靠它续上
  }
}
```

- `progress[id]` 的 `l / p / r` 分别是 听课 / 刷题 / 错题，取 0 或 1。
- 小节完成度 = `(l + p + r) / 3`；计划进度 = 其覆盖小节完成度的均值。
- `log` 只保留最近 3000 条，超出的丢弃最旧的。
- 导入 JSON 会整份覆盖当前状态，导入前建议先导出备份。

### 多窗口

同一个站点可能同时开着两个窗口（快捷方式点两次、线上页面再开一个标签页）。两边各自持有一份内存里的 `S`，谁后写盘谁生效，所以有两个约定：

- 普通改动走 `save()`，写完整份状态。
- 番茄钟的高频写入走 `savePomo()`：先读盘、只替换 `pomo` 这一段、再写回，其余字段以磁盘为准。这样番茄计时再频繁，也不会把另一个窗口刚记的打卡冲掉。
- 监听 `storage`，窗口重新可见、从 bfcache 回来、重新获得焦点时都会比对一次磁盘原文；发现是别的窗口写的就换成最新数据并重绘。正在跑的那一段以本窗口内存为准，不会被覆盖。

`file://`、`localhost`、线上域名是三份互不相通的 `localStorage`，它们之间没有同步。

## 番茄钟

`pomodoro.js` 独立于 `app.js`，只通过全局的 `S`、`savePomo()`、`todayStr()`、`toast()`、`esc()` 与主程序通信，因此加载顺序必须排在 `app.js` 之后。所有写盘都走 `savePomo()`，只改 `pomo` 这一段。

页面里的数字更新用 `pomoRenderLight()` 定点刷新；整块重绘 `pomoRenderPage()` 只在进页面、改设置、换提示音设备时调用。计时开始 / 暂停 / 跳过不重建 DOM，正在填的输入框不会被冲掉。

### 计时

- 不用「每秒减一」，而是记下这一段的结束时间戳 `endAt`，每次心跳用 `endAt - Date.now()` 反算剩余。浏览器把后台标签页的定时器降频时，显示会跳，但时间依然准确。
- 浮窗打开时，额外在浮窗自己的上下文里跑一份心跳。浮窗始终可见、不被降频，因此主页面切到后台后倒计时也不会卡住、到点也不会迟到。
- 心跳 250ms 一次。两处心跳不会重复结算：`pomoFinish` 先推进状态再发提醒，并用 `pomoFinishing` 防重入。

### 状态流转

- 一个专注段结束：`days[当天].count + 1`、`minutes += work`，然后自动进入休息段；休息结束自动进入下一个专注段，循环不停。
- 跳过专注段不记时长。
- `run` 在每次状态变化时写入本地存储。重开页面时如果 `endAt` 仍在未来就续上；已经过期的直接丢弃，不补记时长。

### 浮窗

用 `documentPictureInPicture`（Chrome / Edge 116+）。样式是从主文档的 `styleSheets` 里逐条搬过去的，所以新增样式时不需要另外维护一份浮窗 CSS。浮窗关闭后计时继续，只是没了那个置顶小窗。

### 提醒

- 声音由网页自己合成（`AudioContext` + 三角波），再用 `setSinkId` 把输出指向用户选定的设备。这样即使系统默认输出是耳机，提示音也能从笔记本自带喇叭出来。
- `selectAudioOutput()` 在部分 Chrome 版本上不可用，因此回落到「申请麦克风权限 → `enumerateDevices()` → 列出 audiooutput 让用户挑」。麦克风只用于读出设备名，不录制、不上传。
- 整屏变色用 `position: fixed` 的红色 / 绿色遮罩，25 秒后自动收起，点一下也可以关掉。
- 所有提醒动作都包在 `try/catch` 里：提醒失败绝不影响计时和记录。
- 不依赖任何第三方服务、不联网、不花钱。

### 打卡联动

打卡弹窗的默认时长取 `days[今天].minutes`，没有番茄记录时才回落到 60。

## 章节数据

`data.js` 里的 `BOOK` 数组结构：

```js
{ id: 'ch2', no: '第二章', title: '函数', page: 19, sections: [
  { id: '2.1', title: '函数的概念及其表示', page: 19 },
  { id: '2.8', title: '指、对、幂的大小比较', page: 40, tag: '微重点' },
  { id: '1.5', title: '基本不等式的综合应用', page: 12, tips: [{ t: '柯西不等式', p: 13 }] }
]}
```

- `tag: '微重点'` 显示金色标签。
- `tips` 是微点延伸，显示为小字。
- 页面加载时把 `BOOK` 扁平化成 `SECTIONS` 与 `SECTION_MAP` 两个索引，改章节数据后无需改其他逻辑。

## 离线与安装

- `manifest.json` 声明应用名、图标与启动方式；图标统一放在 `assets/icons/`。
- `sw.js` 分两种策略：页面骨架（导航请求）先取网络，2.8 秒超时或断网回落 `index.html`；脚本、样式、图标直接取缓存，没有缓存才走网络并写入。
- 之所以对脚本样式用缓存优先：它们都带 `?v=` 版本号，改了内容就换新地址，缓存不会把旧文件喂给新页面；反过来，如果脚本也走「超时回落缓存」，慢网时会出现「新页面 + 旧脚本」，按钮失灵、番茄页空白这类怪现象。
- 版本号要三处一致：`index.html` 的 `?v=`、`sw.js` 的 `PRECACHE`、`sw.js` 顶部的 `CACHE` 名。改资源后一起递增，`scripts/check.js` 会校验。
- 缓存读写失败（隐私模式、配额满）时直接放行网络请求，不会因为存储问题导致整页打不开。
- `file://` 直接打开时浏览器不注册离线缓存，其余功能正常。

## 改动后的自检

`scripts/check.js` 是仓库唯一的自动化检查，本地和 CI 跑同一份：

```bash
node scripts/check.js
```

它做七件事：`node --check` 四个脚本的语法；校验 `manifest.json` 结构并确认每个图标文件存在；确认 `index.html` 里 `src` / `href` 指向的本地文件都在；确认 `sw.js` 的 `PRECACHE` 列表都能落到真实文件；校验页面、预缓存与缓存名的版本号是同一个数；拦住不该入库的文件（`启动.bat`、`*.genie`、`.workbuddy/`、根目录重复图标）；扫描本机盘符路径、令牌、私钥与手机号。

新增页面或图标后忘了改引用，这项检查会直接报出缺哪个文件，不用等浏览器里白屏才发现。

## 视觉约定

- 配色：纸底 `#F4F1E9`、墨蓝 `#2B4A6B`、朱红 `#B34A33`、完成绿 `#4F7A5B`、错题金 `#B8862E`。
- 字体使用系统中文字体栈，不加载网络字体。
- 视口宽度低于 `980px` 时切换为底部标签栏与单列布局。
