# 参与改进

这是一个零依赖、无构建步骤的纯静态项目。改动前先看 README 的「设计约定」。

## 开始前

- 不需要安装任何依赖，也不需要 npm。
- 直接双击 `index.html` 就能跑；要试离线和安装到桌面，用 `python -m http.server 8000` 起一个本地服务。
- 代码是原生 JavaScript（ES5 风格），不引入框架、打包器或第三方库。

## 常见改动

- **加 / 改章节**：只改 `data.js` 里的 `BOOK` 数组，其余逻辑会自动适配。
- **改样式**：只改 `styles.css`，断点在 980px。
- **改离线缓存清单**：`sw.js` 的 `PRECACHE`；改了缓存内容记得同时把 `CACHE` 版本号加一。
- **改图标**：`icon.svg` 是源文件，导出 180 / 192 / 512 三种 PNG，注意 `manifest.json` 和 `index.html` 的引用保持一致。

## 提交前自查

1. `node --check app.js && node --check data.js && node --check sw.js` 全部通过。
2. `manifest.json` 能被 `JSON.parse` 正常解析。
3. 桌面宽度和手机宽度（<980px）下都点一遍五个页面。
4. 不提交任何个人数据：进度、计划、课表都存在浏览器 `localStorage` 里，不会进仓库；导入导出的 JSON 也不要贴进来。

## 提 issue / PR

- 报问题用「Bug report」模板，说清浏览器、复现步骤和控制台报错。
- 提功能用「Feature request」模板，先说清要解决的具体场景。
- PR 请一个改动一个提交，写清「改了什么、为什么、怎么验证」。

## 约定

- 2 空格缩进，UTF-8 编码，LF 换行（`.bat` 例外，用 CRLF）。
- 注释和文档用中文，代码标识符用英文。
- 不为了「技术上更漂亮」而大改能正常跑的部分；有疑问先开 issue 讨论。
