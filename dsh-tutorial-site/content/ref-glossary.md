# 术语表

<div class="chapter-meta">
<span class="badge">速查</span>
<span class="badge time">按需查阅</span>
</div>

<div class="callout tip">
<span class="callout-title">先看这个：全站类比对照</span>
如果某个术语想不起来，先在这张表里找它的「公司版」——那是前面各章用的类比。

| 术语 | 类比 | 在哪讲的 |
|---|---|---|
| 插件 | 一名员工 | [03](#/cordis-plugin) |
| `ctx.<key>` / 服务 | 岗位 / 坐在岗位上的人 | [05](#/cordis-service) |
| `inject` | 入职前置条件 | [05](#/cordis-service) |
| PENDING | 在门口等还没入职的同事 | [04](#/cordis-lifecycle) |
| effect | 入职领的工牌，离职要交还 | [04](#/cordis-lifecycle) |
| waterfall | 逐级审批 / 俄罗斯套娃 | [06](#/cordis-events) |
| `isolate` | 事业部各配自己的运维 | [08](#/cordis-hmr) |
| 组合包 / profile | 部门套装 / 开店方案 | [09](#/arch-overview) |
| turn / step | 一次会议 / 一次发言 | [10](#/arch-turn) |
| 会话日志 | 只能追加、不能涂改的账本 | [11](#/arch-session) |
| 工具流水线 | 机场安检通道 | [12](#/arch-tools) |
| seam 三角色 | 灯座标准 / 灯泡 / 房间 | [13](#/arch-seams) |

</div>

下面是规范术语的正式定义。这个项目的术语纪律很严：**每个概念规定一个规范术语**，用错词 review 时会被指出来。

## 能力 seam

**seam** — 一种包含三种角色的**可替换能力**：

- **Service Definition**：拥有自身 `ctx.<key>` 和词汇类型的 Cordis `Service`。可以是 `ShellExecutor` 这样的**抽象类**，也可以是 `WebRuntime` 这样的**具体注册表**，**绝不是 TypeScript `interface`**。
- **Service Provider**：一个或多个实现。
- **Consumer**：一个或多个注入该服务的包。

`packages/shell` 是规范范例：`dsh-shell`（Definition）、`dsh-bash-local` / `dsh-bash-sandbox`（Provider）、`dsh-tool-bash`（Consumer）。

<div class="callout warn">
<span class="callout-title">术语纪律</span>
「seam 是<strong>完整能力</strong>，绝不是其中一个角色；该术语<strong>仅保留此义</strong>，能力成员应按其<strong>角色、类、服务、约定或扩展点</strong>命名。」<br><br>
角色需要独立演进时通常位于不同包，但属于同一关注点时一个包也可以承担多个角色（<code>dsh-llm</code> 同时是 Definition 和 Consumer）。
</div>

## Agent scope

**scope** — 按 agent 划分的注册单位。一项贡献（工具、提示词段、变量、限制、监听器）要么是**全局的**（对所有 agent 可见），要么是**带作用域的**（归属于恰好一个 scope key）。

<div class="callout key">
<span class="callout-title">只有两层，扁平结构</span>
「带作用域的注册<strong>不会向下继承给 subagent</strong>；子树行为通过 <strong>lineage</strong> 数据表达，<strong>从不</strong>通过 scope 结构。」
</div>

| 术语 | 含义 |
|---|---|
| **scope key** | scope 的不透明标识，**按对象同一性比较**。harness 约定：一个活跃的 agent 就是其自身 scope 的 key |
| **agent 上下文（`agent.ctx`）** | agent 的带作用域上下文。通过它注册既有 scope 可见性，生命周期也绑定到该 scope（**同一事实决定两者**） |
| **scope carrier** | scope 过滤分发所携带的 `thisArg`（由 `scopeTarget` 构建）。过滤器放行无标签监听器加上主体自身的监听器。**无主体**的 carrier（没有 key）只放行无标签监听器 |
| **scoped dispatch** | 规则：关于某个 agent 的活动的事件以该 agent 的 carrier 分发。关于**注册表本身**的事件（如「一个工具被添加了」）属于**注册表主体**事件，**保持不过滤** |
| **shadowing** | 最具体者胜出的名称解析：带作用域的工具／片段／变量**仅在该 scope 内**替换同名的全局对应项。这是 per-agent persona 和 per-agent 工具变体的机制 |
| **restriction / scope-local 注册** | restriction（`tools.restrict`）为单个 scope **过滤**全局工具集合（多个 restriction 取**交集**）；scope-local 注册在过滤**之后**合并 |
| **setup window** | 创建者组装 agent 作用域环境的创建时隙（`CreateAgentOptions.setup`）：scope 和 agent 对象已存在，但 agent 或会话**尚未发布**，`agent/session-start` 尚未触发，首次提示词尚未组装。**setup 只做注册，从不驱动 agent** |
| **lineage** | 以**数据**形式携带的父子关系事实（`parentSession`、持久的 `delegationDepth`、运行时 `subagentDepth`）；**从不影响可见性** |

<div class="callout tip">
<span class="callout-title">被过滤掉的工具「不可区分于不存在」</span>
「被过滤掉的全局工具既<strong>不出现在提示词中</strong>，也<strong>拒绝执行</strong>，与不存在的工具无法区分。」——这是一条安全性质的设计，避免模型看到自己调不动的工具。
</div>

## 循环层级

三个层级，别混：

| 术语 | 定义 |
|---|---|
| **轮次（turn）** | 会话中一次对已接纳输入的**排空过程**，在模型及其工具停止工作或终止策略介入后结束 |
| **步骤（step）** | **一次模型请求**，以及由模型响应引发的工具执行；一个轮次包含**零个或多个**步骤 |
| **Round** | 承载一个轮次的**外层策略迭代**，例如一个 Goal Round 或一次使用全新 agent 的 Ralph 尝试。**Round 计数器归该策略所有**，并不统计会话中的每个轮次 |

## 目标（Goal）

**目标** — 附着在**现有会话**上的**单个**持久完成目标，带有按修订号演进的 `active` / `paused` / `blocked` / `complete` 阶段和 Goal Round 上限。`blocked` 保留策略代码与说明。

<div class="callout key">
<span class="callout-title">目标是一种状态，不是调度器</span>
「目标是一种<strong>状态</strong>，不是调度器，也不是一段独立对话；<strong>会话日志仍是其真源</strong>。」
</div>

| 术语 | 含义 |
|---|---|
| **Goal Round** | 为当前目标接纳的一次**续行周期**。同会话驱动器将其具体化为一个由目标触发的轮次（可含零个或多个步骤）。**同一会话中无关的人类轮次不消耗 Goal Round 上限** |
| **目标激活** | 续行消费方接纳下一个 Goal Round 的**进程本地**权限。状态为 `armed` 或 `disarmed`；**有意不参与持久回放**——所以恢复或 fork 后，必须有一次经人类授权的恢复变更（通过 `/goal` 或模型工具），自动工作才能开始 |

## Ralph

| 术语 | 含义 |
|---|---|
| **Ralph 循环** | 一次面向**不可变目标**的前台**全新 agent** 工作流运行。它是由工作流和 subagent 原语组合而成的**面向模型的工具策略**——不是同会话目标、不是 agent loop 模式、不是调度器、不是通用工作流脚本功能 |
| **Ralph Round** | Ralph 循环中的一个**全新子会话**。子会话**不接收**父会话或此前子会话的对话种子；共享工作区和一份有界的 Ralph 交接承载跨 Round 状态 |
| **Ralph 交接** | 从一个仍需继续的 Ralph Round 传给下一个的**规范化、有界结构化报告**：状态、摘要、证据、后续步骤、阻塞说明。它**补充**共享工作区，**不取代**工作区的权威地位 |

## 人类命令

| 术语 | 含义 |
|---|---|
| **人类命令** | 以斜杠开头的指令，由面向人类的适配器通过 `ctx.commands` 解释并执行，**不会成为模型消息**。既不同于面向模型的工具，也不同于通过 `ctx.shell` 执行 shell 命令 |
| **命令平面** | 由 UI 适配器和命令插件负责的发现、解析、分发、取消与结果渲染机制。除非处理器另行改变持久领域，**命令输出属于 UI 状态** |
| **目标命令** | `/goal`，由 `dsh-command-goal` 提供；直接观察或更改当前目标 |

## 其它高频词

这些不在 glossary 里，但读代码时到处出现：

| 词 | 含义 |
|---|---|
| **profile** | Harness home 里的具名组装：列出组合包、存放树外插件、保存 `cordis.patch.yml`。`web` / `headless` 随发行版交付 |
| **组合包（bundle）** | 「Cordis 配置项 + 挂载代码」的分发格式，插入的内容始终可被上层 patch |
| **fiber** | 一个已加载插件实例的运行时句柄。状态：PENDING / LOADING / ACTIVE / FAILED / UNLOADING / DISPOSED |
| **effect** | 通过 `ctx.effect()` 安装的可撤销副作用；返回 disposer |
| **waterfall** | 环绕中间件式事件分发；监听器收 `(...args, next)` |
| **surface / surfaceOp** | 会话日志中参与模型历史投影的事件标记（`SurfaceEventType`）。`compaction/*`、`hook/*` 这类**不是** surface 事件 |
| **spill** | 工具结果过大时的溢出存储策略（`ctx.spillStore`） |
| **steering** | 中途引导：轮次进行中插入的引导消息，经同一个 `agent/pre-step` waterfall |
| **Native renderer** | `output.render`，把规范值转成模型可见内容 |
| **规范值（canonical value）** | 工具 `execute` 返回的、由 `output.schema` 声明的 JSON 值。Code Mode 拿到的是这个，不是渲染后的内容 |

## 写文档时的用词纪律

仓库对**你写的注释和文档**也有要求，值得知道：

<div class="callout warn">
<span class="callout-title">别乱用「contract」「boundary」「shape」</span>
规约原话：写 <code>contract</code>、<code>boundary</code> 或 <code>shape</code> 之前，先问有没有更精确的词——<strong>写 <code>response fields</code>、<code>JSON validation</code>、<code>ESM exports</code>，而不是 <code>response shape</code>、<code>validation boundary</code>、<code>module shape</code>。</strong><br><br>
<code>contract</code> 留给<strong>前置条件、后置条件、不变量、兼容性承诺</strong>这类调用方/实现方真正依赖的义务。<code>boundary</code> 留给<strong>字面意义</strong>的进程、wire、安全、事务、生命周期边界。<br><br>
还有：<strong>不要用比喻。</strong>「Do not use metaphors.」
</div>

其它几条：

- 注释和文档陈述**完整的约定和上下文**，不是**推理过程记录**。
- **不要注释代码里已经显而易见的事实。**
- 不要叙述控制流或测试、不要保留 review 历史、不要复述代码。
- 保留**行为、失败、时序、所有权、安全使用**这些事实；理由用链接。
- 空 `catch` 必须**说明它吞掉了什么**以及为什么别的到不了这里；`try` 保持单条语句。

<div class="srcref">来源：docs/glossary.zh.md · AGENTS.md</div>

下一章：[仓库导航与规约](#/ref-repo)。
