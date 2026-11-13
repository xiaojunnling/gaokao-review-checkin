# 设计与数据说明

本文记录代码里不太直观的部分，供改动时查阅。项目本身零依赖、无构建步骤，`index.html` 直接引用根目录下的脚本与样式。

## 本地数据

所有数据存在浏览器本地存储，键名 `gk_review_v1`。结构示意（示例值均为占位符）：

```js
{
  version: 1,
  examDate: 'YYYY-MM-DD',          // 高考日期，用于首页倒计时
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
  log: [ { d, t, id, f, v } ]       // 操作流水，用于「最近 7 天」
}
```

- `progress[id]` 的 `l / p / r` 分别是 听课 / 刷题 / 错题，取 0 或 1。
- 小节完成度 = `(l + p + r) / 3`；计划进度 = 其覆盖小节完成度的均值。
- `log` 只保留最近 3000 条，超出的丢弃最旧的。
- 导入 JSON 会整份覆盖当前状态，导入前建议先导出备份。

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
- `sw.js` 预缓存页面主体，采用「优先取网络、断网回落缓存」策略；导航请求在断网时回落到 `index.html`。
- 缓存版本号写在 `sw.js` 顶部。改动资源路径或内容后需要递增版本号，否则老设备会一直用旧缓存。
- `file://` 直接打开时浏览器不注册离线缓存，其余功能正常。

## 视觉约定

- 配色：纸底 `#F4F1E9`、墨蓝 `#2B4A6B`、朱红 `#B34A33`、完成绿 `#4F7A5B`、错题金 `#B8862E`。
- 字体使用系统中文字体栈，不加载网络字体。
- 视口宽度低于 `980px` 时切换为底部标签栏与单列布局。
