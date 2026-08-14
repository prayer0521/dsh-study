# 五分钟跑起来

<div class="chapter-meta">
<span class="badge lv1">入门</span>
<span class="badge time">动手 10 分钟</span>
<span class="badge">需要 Node.js</span>
</div>

<div class="goal">
<div class="goal-title">读完这章你会</div>
<ul>
<li>有一个能对话的 agent 跑在本机</li>
<li>见到那份「组装清单」的真身——本章最重要的一条命令</li>
<li>知道以后该跑哪些检查，以及<strong>不该</strong>跑哪些</li>
</ul>
</div>

## 两条路，先选一条

<div class="versus">
<div class="good">
<div class="vs-head">路线 A：只想看看</div>
<div class="vs-body">
<p>装个 Node.js，一条命令。</p>
<p>适合：先感受产品长什么样。</p>
</div>
<div class="vs-note">3 分钟</div>
</div>
<div class="good">
<div class="vs-head">路线 B：要读代码</div>
<div class="vs-body">
<p>克隆仓库、装依赖、从源码跑。</p>
<p>适合：<strong>你现在的目标</strong>——学架构、写插件。</p>
</div>
<div class="vs-note">10 分钟，本教程后面都基于它</div>
</div>
</div>

## 路线 A：一条命令

```sh
npx @deepseek-ai/dsh web
```

Web UI 起在 `http://127.0.0.1:3080`。进去之后三步：

1. **设置 → 模型**，填 DeepSeek API 密钥，保存。
2. 点**选择工作区**，把项目目录加进来并选中。
3. 发一条任务，比如 `Summarize this repository and identify its main packages.`

<div class="callout tip">
<span class="callout-title">两个容易卡住的点</span>
<strong>输入框是灰的？</strong> 没选工作区。选中工作区之前，会话输入框不可用。<br>
<strong>改了密钥要重启吗？</strong> 不用。模型路由立即生效——因为设置和凭据都由「热重载的提供方」管着，这是后面会讲的架构收益之一。
</div>

agent 能读写文件、跑命令、委派子任务。某个操作在当前权限策略下需要审批时，界面会先问你——那是 `ctx.approval` 在工作，[第 12 章](#/arch-tools)会讲它挂在流水线哪一环。

## 路线 B：从源码跑

### 先对一下环境

| 项 | 要求 |
|---|---|
| Node.js | 22.19+ 或 24+（CI 跑 22.19 / 24 / 26） |
| pnpm | 仓库钉死 `pnpm@11.7.0`，走 Corepack。`pnpm --version` 失败就先 `corepack enable` |
| Git | 2.26+ |
| API 密钥 | **可选**。本教程前两个实验完全不需要 |

### 四条命令

```sh
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
```

`pnpm install` 会顺带装 Git 钩子（Lefthook）和一个翻译配对的合并驱动。如果依赖是从缓存恢复的、`postinstall` 被跳过了，手动补：

```sh
node scripts/install-lefthook.mjs
```

<div class="callout warn">
<span class="callout-title">脚本报错时别动手改</span>
如果这个包装脚本拒绝现有 Git 配置、或者报「陈旧锁」，<strong>按它的诊断信息处理，不要凭猜测编辑 worktree 元数据</strong>。另外，如果你移动过检出目录，要重新跑一次它来重新生成路径。
</div>

### 确认搭建完成

```sh
pnpm run typecheck
```

这条命令成功退出，就算装好了。

## 本章最重要的一条命令

跑起来只是热身。真正对学习有价值的是这条：

<div class="try">
<div class="try-title">现在就跑一次，输出留着</div>

```sh
dsh --profile web --dump-config
```

它打印出**你这台机器实际启动的那棵配置树**。
</div>

你现在多半看不懂输出——满屏的 `id`、`name`、`config`。**没关系，这是故意安排的。**

<div class="story">
<div class="line sys"><div class="who">你现在</div><div class="says">这一大坨是什么？</div></div>
<div class="line sys"><div class="who">学完 09 章</div><div class="says">哦，这是 <code>dsh-base</code> 组合包铺的底，上面叠了 <code>dsh-web-app</code>，最后是我自己的 patch。</div></div>
</div>

架构文档对这份输出有一句评价，值得先记住：

> 它打印出的任何条目，都可以由你自己的 patch 替换。

**任何**条目。包括主循环。等你到了[第 09 章](#/arch-overview)再回头看这份输出，会突然全部对上号。

## 其它跑法

```sh
# 跑单个任务，一次性 headless 模式（需要密钥）
pnpm dsh --profile headless "task"

# agent 修改自己的运行时（需要密钥）—— 学完再来看这个
pnpm run demo:cordis
```

密钥从环境变量或仓库根的 `.env` 读，可选 `DEEPSEEK_BASE_URL`。**别提交凭据。** CI 上没密钥时 e2e 测试自行跳过。

## 常用命令，以及一条反直觉的纪律

| 命令 | 干什么 |
|---|---|
| `pnpm run test` | 单元测试（vitest） |
| `pnpm run typecheck` | 类型检查 |
| `pnpm run build` | tsc 出类型，tsdown 打包运行时 |
| `pnpm run test:snapshot` | **无需密钥**的回放测试，`-t <name>` 过滤 |
| `pnpm run doc-sync` | 全部文档门禁 |

<div class="callout warn">
<span class="callout-title">别默认跑全套</span>
仓库规约里有一条明确的反直觉纪律：<strong>「Never default to the full suite.」</strong><br><br>
按你改动的<strong>面</strong>选证据——改行为跑聚焦测试，改模型/用户可见输出跑 snapshot，改文档跑 <code>doc-sync</code>。穷尽覆盖和平台矩阵是 <strong>CI 的职责</strong>，不是你本地的。<br><br>
还有个坑：CI 的覆盖率门禁是 <code>test:coverage</code>（对 <code>packages/*/*/src</code> 要求逐文件 100%），<strong>不是</strong> <code>test</code>。
</div>

<div class="quiz">
<div class="quiz-q">在 Web UI 里改了 API 密钥，需要重启服务器吗？</div>
<button class="quiz-opt" data-answer="yes">不用，模型路由立即可用</button>
<button class="quiz-opt">要，重启才能加载新配置</button>
<div class="quiz-why">设置来自「用户设置」提供方（<code>settings.yaml</code>）和凭据提供方，两者都热重载。这是「配置层和代码层分开」的直接好处——第 09 章讲 profile 分层时你会看到它的完整形态。</div>
</div>

<div class="recap">
<div class="recap-title">一句话记住</div>
<code>dsh --profile web --dump-config</code> 打印的那棵树，就是这个产品的<strong>全部真相</strong>。后面所有架构章节，都是在教你读懂它。
</div>

<div class="pathline">
<a href="#/overview">00 一切皆插件</a>
<span class="sep">→</span>
<span class="now">01 跑起来</span>
<span class="sep">→</span>
<a href="#/mental-model">02 心智模型</a>
<span class="sep">→</span>
<span>Cordis 六章</span>
</div>
