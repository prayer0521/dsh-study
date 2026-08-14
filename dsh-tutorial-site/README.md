# DeepSeek Harness 教程站

为学习 `/home/pc/deepseek-harness-master` 这个项目而做的本地教程网站。内容从该仓库的中文文档（`docs/`、`AGENTS.md`、`packages/README.zh.md`）提炼整理，重新编排成一条有顺序的学习路径。

## 启动

```sh
cd /home/pc/dsh-tutorial-site
./serve.sh
```

然后打开 http://127.0.0.1:8899

换端口：`./serve.sh 9000`

或者直接用 Python：

```sh
python3 -m http.server 8899 --bind 127.0.0.1
```

## 教学方式

内容按「**先体验、后命名**」组织，而不是先抛定义：

- **场景开场** —— 每章从一个具体问题或踩坑现场切入，术语最后才登场
- **一套贯穿的类比** —— 整个框架当成「一家公司」：`ctx.key` 是岗位、`inject` 是入职前置、effect 是离职交还工牌、seam 是灯座标准/灯泡/房间
- **错误示范先行** —— 左右对照「这样写会怎样 / 应该怎样」
- **分层信息** —— 主线保持轻快，硬核细节收进可折叠块（标着「可跳过」的第一遍别看）
- **小剧场对白** —— 用对话呈现常见误解
- **术语悬浮解释** —— 带虚线下划线的词，鼠标悬停看解释
- **难度与时长标记** —— 每章开头标注难度、预计时间、前置条件、读完能做什么
- **章末一句话回顾 + 小测验** —— 答错会给解释

## 特性

- **20 章**，分五段：先跑起来 → Cordis 框架 → Harness 架构 → 动手实践 → 随时来查
- **全文搜索**：按 `/` 或 `Ctrl+K`，按标题分块索引，可直接跳到小节
- **进度跟踪**：右侧「标记本章已读」，左上角显示进度（存在 localStorage）
- **Mermaid 图**：轮次时序图、工具流水线、决策树等，跟随主题明暗
- **代码高亮 + 一键复制**
- **明暗主题**：跟随系统，可手动切换
- **完全离线**：所有依赖已下载到 `vendor/`，不访问网络

## 目录结构

```
index.html          页面骨架
assets/style.css    样式（含明暗主题 token）
assets/app.js       路由、渲染、搜索、进度
content/*.md        20 章正文（Markdown）
vendor/             marked / highlight.js / mermaid（离线副本）
serve.sh            启动脚本
```

## 改内容

直接编辑 `content/*.md`，刷新浏览器即可——没有构建步骤。

支持在 Markdown 里混用 HTML：

- `<p class="lead">…</p>` — 章首导语
- `<div class="callout key|tip|warn"><span class="callout-title">标题</span>正文</div>` — 提示框
- `<div class="srcref">来源：docs/xxx.zh.md</div>` — 来源标注
- ` ```mermaid ` 代码块 — 图表
- `<div class="quiz">` + `<button class="quiz-opt" data-answer="yes">` + `<div class="quiz-why">` — 测验

加新章节：在 `content/` 放 `<id>.md`，然后在 `assets/app.js` 顶部的 `NAV` 数组里加一条 `{ id, num, title, desc }`。

## 内容对应关系

| 本站章节 | 主要来源 |
|---|---|
| 00–02 | `README.zh.md`、`docs/cordis-primer.zh.md`、`docs/user/guide/index.zh.md`、`docs/development.zh.md` |
| 03–08 | `docs/cordis-tutorial/01`–`06`、`docs/user/develop/basic/`、`docs/user/develop/framework/` |
| 09–13 | `docs/architecture.zh.md`、`docs/agent-lifecycle.zh.md`、`docs/subsystems/session.zh.md`、`docs/subsystems/persistence.zh.md`、`docs/tool-execution-pipeline.zh.md`、`docs/cookbook/adding-a-tool.zh.md`、`docs/capability-seams.zh.md` |
| 14–16 | `docs/cordis-tutorial/07`、`docs/user/develop/practice/index.zh.md` |
| 17–19 | `docs/architecture.zh.md`、`docs/glossary.zh.md`、`AGENTS.md` |

原始文档比本站更全面。本站的价值在于**取舍和顺序**——遇到需要精确签名或完整清单的场景，回去读源文档。
