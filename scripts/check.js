#!/usr/bin/env node
/**
 * 提交前自检：node scripts/check.js
 *
 * 只读仓库内文件，不联网、不装依赖。CI 跑同一份检查，
 * 所以本地通过就等于线上通过。任何一项失败都会以非零码退出。
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
process.chdir(root);

const problems = [];
const notes = [];
const fail = (msg) => problems.push(msg);
const read = (p) => fs.readFileSync(p, 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const strip = (p) => p.replace(/^\.\//, '').split(/[?#]/)[0];

/* 1. 四个脚本的语法 */
for (const f of ['app.js', 'data.js', 'pomodoro.js', 'sw.js']) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
  } catch (e) {
    fail(`${f} 语法错误\n${(e.stderr || '').toString().trim()}`);
  }
}

/* 2. manifest 合法，且图标文件真实存在 */
let manifest = null;
try {
  manifest = JSON.parse(read('manifest.json'));
} catch (e) {
  fail(`manifest.json 不是合法 JSON：${e.message}`);
}
if (manifest) {
  for (const key of ['name', 'short_name', 'start_url', 'icons']) {
    if (!manifest[key]) fail(`manifest.json 缺少 ${key}`);
  }
  for (const icon of manifest.icons || []) {
    if (!exists(strip(icon.src))) fail(`manifest 引用的图标不存在：${icon.src}`);
  }
}

/* 3. index.html 里引用的本地文件都在 */
const refs = [...read('index.html').matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((u) => !/^(https?:|data:|mailto:|#)/.test(u));
for (const r of refs) {
  if (!exists(strip(r))) fail(`index.html 引用但文件不存在：${r}`);
}

/* 4. sw.js 的预缓存清单都在 */
const swBlock = read('sw.js').match(/const PRECACHE = \[([\s\S]*?)\]/);
if (!swBlock) {
  fail('sw.js 里找不到 PRECACHE 数组');
} else {
  const list = swBlock[1]
    .split(',')
    .map((s) => s.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
  for (const p of list) {
    if (p !== './' && !exists(strip(p))) fail(`sw.js 预缓存路径不存在：${p}`);
  }
}

/* 4.1 版本号一致：页面里的 ?v=、预缓存清单、缓存名必须是同一个数，
   否则会出现「新页面配旧脚本」或者离线时拿不到文件 */
const idxVers = [...read('index.html').matchAll(/\?v=(\d+)/g)].map((m) => m[1]);
const preVers = [...(swBlock ? swBlock[1] : '').matchAll(/\?v=(\d+)/g)].map((m) => m[1]);
const cacheVer = (read('sw.js').match(/const CACHE = 'gk-review-v(\d+)'/) || [])[1];
const verSet = new Set([...idxVers, ...preVers, cacheVer].filter(Boolean));
if (verSet.size !== 1) {
  fail(`版本号不一致：index.html 是 ${[...new Set(idxVers)].join('/') || '无'}，` +
    `sw.js 预缓存是 ${[...new Set(preVers)].join('/') || '无'}，缓存名是 ${cacheVer || '无'}`);
}
if (idxVers.length !== preVers.length) {
  fail(`带版本号的资源数量不一致：index.html ${idxVers.length} 个，sw.js 预缓存 ${preVers.length} 个`);
}

/* 5. 不能入库的文件与目录 */
let tracked = [];
try {
  tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
} catch (e) {
  notes.push('跳过 git 相关检查（当前不是 git 仓库）');
}
const forbidden = [
  [/^启动\.bat$/, '本机启动脚本，含本机路径'],
  [/\.genie$/, '发布工具生成的定位文件'],
  [/(^|\/)\.workbuddy\//, '工具工作目录'],
  [/(^|\/)node_modules\//, '依赖目录（本项目零依赖）'],
  [/(^|\/)\.DS_Store$/, '系统垃圾文件'],
  [/^icon-\d+\.png$/, '图标应放在 assets/icons/ 下'],
];
for (const f of tracked) {
  for (const [re, why] of forbidden) {
    if (re.test(f)) fail(`不该入库的文件：${f}（${why}）`);
  }
}

/* 6. 隐私扫描：本机绝对路径与密钥标记 */
const TEXT = /\.(js|css|html|json|md|yml|yaml|svg|txt|bat|editorconfig|gitattributes|gitignore)$/;
const SECRETS = [
  [/\b[A-Za-z]:\\[A-Za-z0-9_]/, '本机盘符路径'],
  [/\/home\/[A-Za-z][\w.-]*\//, 'Linux 用户目录绝对路径'],
  [/gh[pousr]_[A-Za-z0-9]{20,}/, 'GitHub 令牌'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, '私钥'],
  [/(?<!\d)1[3-9]\d{9}(?!\d)/, '疑似手机号'],
];
const EMAIL = /[\w.+-]+@[\w-]+\.[A-Za-z]{2,}/g;
for (const f of tracked) {
  if (!TEXT.test(f) && !/^\.(gitattributes|gitignore|editorconfig)$/.test(f)) continue;
  const text = read(f);
  for (const [re, what] of SECRETS) {
    const hit = text.match(re);
    if (hit) fail(`${f} 含${what}：${hit[0].slice(0, 40)}`);
  }
  for (const m of text.match(EMAIL) || []) {
    if (!/@users\.noreply\.github\.com$/i.test(m)) notes.push(`${f} 出现邮箱 ${m}，确认是否要公开`);
  }
}

/* 7. 必备文件 */
for (const f of [
  'index.html', 'app.js', 'data.js', 'styles.css', 'manifest.json', 'sw.js',
  'README.md', 'LICENSE', '.gitignore', 'docs/architecture.md',
]) {
  if (!exists(f)) fail(`缺少必备文件：${f}`);
}

/* 输出 */
const ok = (msg) => console.log(`  ✅ ${msg}`);
console.log(`检查仓库：${root}\n`);
if (problems.length === 0) {
  ok(`${tracked.length} 个受版本控制的文件，全部通过`);
  ok('脚本语法、manifest、页面引用、离线缓存清单一致');
  ok('无本机路径、无密钥、无垃圾文件');
} else {
  for (const p of problems) console.error(`  ❌ ${p}`);
}
if (notes.length) {
  console.log('');
  for (const n of notes) console.log(`  ⚠️  ${n}`);
}
console.log('');
if (problems.length) {
  console.error(`共 ${problems.length} 个问题，未通过。`);
  process.exit(1);
}
console.log('通过。');
