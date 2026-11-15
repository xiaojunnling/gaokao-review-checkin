# 高考数学一轮复习打卡

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-%E5%8F%AF%E7%A6%BB%E7%BA%BF%E5%AE%89%E8%A3%85-4F7A5B.svg)](manifest.json)
![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)
[![Version](https://img.shields.io/badge/version-1.1.1-2B4A6B.svg)](CHANGELOG.md)
[![CI](https://github.com/xiaojunnling/gaokao-review-checkin/actions/workflows/ci.yml/badge.svg)](https://github.com/xiaojunnling/gaokao-review-checkin/actions/workflows/ci.yml)

把高考数学一轮复习拆成 89 个小节，每节只记三件事：听课、刷题、错题。配合阶段计划、网课课表和每日打卡，随时知道复习到哪、今天该做什么。

纯静态页面，零依赖、零构建，双击就能用，也可以装到手机主屏幕当 App。

**[在线体验 →](https://review-checkin-48218.app.workbuddy.host/?sharecode=U4FDU5CE4H)**　不用注册，数据存在你自己的浏览器里。

## 解决的问题

| 常见做法 | 这个工具 |
| --- | --- |
| Excel 一章记一行，说不清哪个小节漏了 | 89 个小节逐节三态勾选，漏掉的一眼可见 |
| 计划写在纸上，落不了地 | 绑定章节范围与截止日，自动算出今天该做几节 |
| 打卡只记「学了」，看不出进度 | 连续天数、热力图、各章完成度同屏 |

## 功能

- **章节进度**：10 章 + 4 个进阶篇共 89 个小节，每节「听课 / 刷题 / 错题」三态独立，三项全绿才算通关
- **阶段计划**：绑定章节范围与起止日期，按剩余天数均摊每日任务，逾期标红提醒
- **网课课表**：周视图排课，课程可关联到具体小节，上课当天首页提示
- **打卡统计**：学习时长、状态、备注、连续天数、热力图、最近 7 天、各章完成度
- **番茄钟**：25 分钟专注 / 5 分钟休息循环，桌面置顶浮窗，到点从指定喇叭响铃并整屏变色，时长自动并入当天打卡
- **数据管理**：整份 JSON 导出导入，换设备自己搬，不需要账号
- **离线可用**：Service Worker 缓存页面，断网可开，可添加到主屏幕

## 快速开始

直接双击 `index.html` 即可使用。`file://` 下离线缓存不生效，其余功能正常。

番茄钟的桌面浮窗依赖 Document Picture-in-Picture，需要 Chrome / Edge 116 及以上。换成别的浏览器时计时照常走，只是没有那个置顶小窗。

想体验离线与「安装到主屏幕」，起一个本地服务器：

```bash
python -m http.server 8000
# 或者：npx serve .
```

浏览器打开 `http://localhost:8000`，再从浏览器菜单选「安装应用 / 添加到主屏幕」。

## 数据与隐私

所有进度只存在你浏览器的 `localStorage`（键 `gk_review_v1`），不上传、不入库。仓库里没有任何用户数据，clone 下来是空白状态。

清除浏览器数据会一并清掉，重要进度请定期「导出 JSON」备份；换设备时「导入 JSON」恢复。`localhost`、`file://`、线上域名是三个互不相通的存储域，导入导出是唯一的跨域搬运方式。

## 项目结构

```
.
├── index.html              页面骨架，按 id 挂载五个页面
├── app.js                  交互、渲染与计算
├── pomodoro.js             番茄钟：计时、浮窗、响铃与整屏提醒
├── data.js                 const BOOK：14 个章节组、89 个小节
├── styles.css              样式与响应式布局
├── manifest.json           PWA 清单
├── sw.js                   离线缓存
├── assets/icons/           图标源文件 icon.svg 与各尺寸导出
├── docs/architecture.md    数据结构、完成度算法、视觉约定
├── scripts/check.js        自检脚本，CI 与本地共用
├── .github/                issue / PR 模板与 CI
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
├── LICENSE
└── README.md
```

根目录的四个前端文件保持平铺：`index.html` 直接引用它们，没有构建步骤，也不打算加。

## 自定义章节

改 `data.js` 里的 `BOOK` 数组，其余逻辑自动适配。字段含义与完成度算法见 [docs/architecture.md](docs/architecture.md)。

## 路线图

- [ ] 云端同步：电脑与手机数据互通
- [ ] 计划支持自选小节范围（目前只能整章选）
- [ ] 错题本：记录某节的错题原文并集中复习

## 参与改进

欢迎提 issue 报问题、提想法。改动前请读 [CONTRIBUTING.md](CONTRIBUTING.md)：项目不引入依赖与构建步骤，改动范围请保持在原生 JavaScript 内。安全问题请按 [SECURITY.md](SECURITY.md) 的方式反馈，不要直接开公开 issue。

## 许可

[MIT](LICENSE) © 2026 xiaojunnling
