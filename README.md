# 高考数学一轮复习打卡

一个纯静态、零依赖、可离线的高考数学一轮复习进度工具。把课本 89 个小节拆成「听课 / 刷题 / 错题」三件事，配合阶段计划、网课课表和每日打卡，随时知道复习到哪、今天该做什么。

可添加到手机主屏幕，像普通 App 一样打开。

在线体验：https://review-checkin-48218.app.workbuddy.host/

## 功能

- **章节进度**：10 章 + 4 个进阶篇、89 个小节，每节三个独立状态，三项完成才算通关
- **阶段计划**：绑定章节范围与截止日期，按剩余天数均摊每日任务，逾期提醒
- **网课课表**：周视图排课，可关联到具体小节，上课当天首页提示
- **打卡统计**：学习时长、状态、备注、连续天数、热力图、最近 7 天、各章完成度
- **数据管理**：JSON 导入导出，换设备自己搬，不需要账号
- **离线使用**：断网可开、可安装到主屏幕

## 快速开始

直接双击 `index.html` 就能用。`file://` 下离线缓存不生效，其余功能正常。

想体验完整的离线与安装能力，起一个本地服务器：

```bash
npx serve .
# 或者
python -m http.server 8000
```

浏览器打开 `http://localhost:8000`，再从菜单选「安装应用 / 添加到主屏幕」。

## 数据存在哪

所有记录只存在你自己浏览器的本地存储里，不上传、也不进代码库。清除浏览器数据会一并清掉，重要进度请定期用「导出 JSON」备份；换设备时用「导入 JSON」恢复。

数据结构与字段说明见 [docs/architecture.md](docs/architecture.md)。

## 项目结构

```
.
├── index.html            页面骨架
├── app.js                交互与计算
├── data.js               章节数据（89 小节）
├── styles.css            样式
├── manifest.json         PWA 清单
├── sw.js                 离线缓存
├── assets/icons/         图标源文件与各尺寸
├── docs/                 设计与数据说明
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

没有构建步骤，根目录的脚本和样式由 `index.html` 直接引用，所以保持平铺。

## 自定义章节

改 `data.js` 里的 `BOOK` 数组即可，其余逻辑自动适配。字段格式见 [docs/architecture.md](docs/architecture.md)。

## 路线图

- [ ] 云端同步：电脑与手机数据互通
- [ ] 计划支持自选小节范围（目前只能整章）
- [ ] 错题本：记录错题原文并集中复习

## 开发说明

原生 JavaScript（ES5 风格），无框架、无依赖、无构建。改完刷新页面即可生效。图标源文件是 `assets/icons/icon.svg`；重新导出后记得同步 `manifest.json` 与 `sw.js` 里的路径。

欢迎提 issue 或建议，见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可

[MIT](LICENSE) © 2026 xiaojunnling
