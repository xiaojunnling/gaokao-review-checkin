# 高考数学一轮复习打卡

一个记录高考数学一轮复习进度的小工具。纯静态、零依赖、可离线、能装到手机主屏幕。

在线地址：https://review-checkin-48218.app.workbuddy.host/?sharecode=U4FDU5CE4H

## 它解决什么问题

课本共 10 章 + 4 个进阶篇、89 个小节。靠脑子记"哪节听完课了、哪节题没刷、计划落后多少"不现实。这个工具把三件事串起来：

1. **章节进度** —— 每小节三个独立状态：听课、刷题、错题。三项全绿才算这一节通关。
2. **阶段计划** —— 绑定章节范围 + 截止日期，按剩余天数自动均摊出"今天该做几节"，逾期会催。
3. **网课课表** —— 周视图，可把课挂到具体小节，上课当天首页提示。

进度、计划、课表三者联动：勾一格，计划百分比、今日任务、统计图同时变。

## 技术栈

原生 JavaScript（ES5 风格，无构建步骤），无任何依赖，无框架，无 npm。

| 文件 | 作用 | 行数 |
|---|---|---|
| `index.html` | 页面骨架、导航、PWA meta | ~80 |
| `styles.css` | 全部样式，含响应式与印刷感配色 | ~600 |
| `app.js` | 全部逻辑：渲染、计算、事件、存储 | ~1170 |
| `data.js` | 章节数据（89 节），静态常量 | ~185 |
| `sw.js` | Service Worker，离线缓存 | ~76 |
| `manifest.json` | PWA 清单，主屏幕安装 | ~35 |
| `icon.svg` | 图标源文件 | — |

## 目录与数据

**数据不进代码库**，全部存在浏览器 `localStorage`，key 为 `gk_review_v1`：

```js
{
  version: 1,
  examDate: '2027-06-07',        // 高考日期，用于倒计时
  checkins: {                    // 打卡记录，按日期
    '2026-11-12': { ts, minutes: 95, mood: 'good', note: '' }
  },
  progress: {                    // 小节进度，key 为小节 id
    '2.1': { l: 1, p: 1, r: 0, note: '卡在周期性', at: '2026-11-12' }
  },
  plans: [                       // 阶段计划
    { id, title, start, end, chapters: ['ch2','ch3'], created }
  ],
  timetable: [                   // 周课表
    { id, day: 1, start: '19:00', end: '20:30', subject, content, type: 'online', sections: ['3.5'] }
  ],
  todos: [ { id, date, text, done } ],
  log: [ { d: '2026-11-12', t: 1699..., id: '2.1', f: 'p', v: 1 } ]   // 操作流水，用于"最近 7 天"
}
```

- `progress[id]` 的 `l / p / r` 分别代表 听课 / 刷题 / 错题，值 0 或 1。
- 小节完成度 = `(l + p + r) / 3`；计划进度 = 其覆盖小节的完成度均值。
- `log` 保留最近 3000 条，超出丢弃最旧的。

## 章节数据

`data.js` 里的 `BOOK` 数组，结构：

```js
{ id: 'ch2', no: '第二章', title: '函数', page: 19, sections: [
  { id: '2.1', title: '函数的概念及其表示', page: 19 },
  { id: '2.8', title: '指、对、幂的大小比较', page: 40, tag: '微重点' },
  { id: '1.5', title: '基本不等式的综合应用', page: 12, tips: [{ t: '柯西不等式', p: 13 }] }
]}
```

`tag: '微重点'` 会显示金色标签，`tips` 是微点延伸（显示为小字）。页面加载时扁平化成 `SECTIONS` 与 `SECTION_MAP` 两个索引。

改章节只需改这个文件，其余逻辑自动适配。

## 本地运行

直接双击 `index.html` 就能用（`file://` 下 Service Worker 不注册，其他功能正常）。

要完整体验 PWA（离线、安装），需要 http：

```bash
npx serve .
# 或
python -m http.server 8000
```

## 图标

`icon.svg` 是源文件，导出三种 PNG（512 / 192 / 180）和一个 `icon.ico`（Windows 快捷方式用）。

macOS / Linux 用 rsvg-convert 或 Inkscape；Windows 可用 Chrome 无头截图：

```bash
chrome --headless --screenshot=icon-512.png --window-size=512,512 --default-background-color=00000000 icon.svg
```

## 已知待办

- [ ] **云端同步**：目前电脑与手机各存各的 `localStorage`，尚未互通。计划方案是用一个同步码作为数据分区 key，整份快照存云端，本地优先、联网补推。
- [ ] 计划支持自定义小节范围（现在只能整章选）。
- [ ] 错题本：能把某节的错题文字记下来并集中复习。

## 设计约定

- 配色：纸底 `#F4F1E9`、墨蓝 `#2B4A6B`、朱红 `#B34A33`、完成绿 `#4F7A5B`、错题金 `#B8862E`。
- 字体：系统中文字体栈，不引入 web font。
- 断点：`980px` 以下切换为底部标签栏 + 单列布局。
- 桌面端用 Chrome `--app` 模式打开时无地址栏，等同独立应用。
