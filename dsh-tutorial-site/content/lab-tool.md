# 实验二：写一个工具

<div class="chapter-meta">
<span class="badge lv2">动手</span>
<span class="badge time">30 分钟</span>
<span class="badge">前三步不需要密钥</span>
</div>

<div class="goal">
<div class="goal-title">这个实验干什么</div>
<ul>
<li>注册一个模型可调用的工具，让它走<strong>真实的</strong>执行流水线</li>
<li>再写一个<strong>完全不认识它</strong>的观察插件，靠事件连接两者</li>
<li>最后把工具装进真正的 Web UI，让模型来调它</li>
</ul>
</div>

<div class="callout tip">
<span class="callout-title">前三步不调用模型</span>
我们会自己「假装成模型」发起一次工具调用，所以<strong>不需要 API 密钥</strong>。只有最后一步（装进 Web UI）才需要。
</div>

## 第 1 步：工具插件

在 `tmp/cordis-tutorial` 里建 `greet-tool.ts`：

```ts
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { CallId } from '@deepseek-ai/dsh-llm'

export const name = 'greet-tool'
export const inject = ['tools']

export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    name: 'greet',
    description: 'Greet the named person.',
    parameters: {
      name: { type: 'string', required: true, description: 'Who to greet' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      return `Hello, ${args.name}!`
    },
  }))

  // 代替模型，驱动一次调用走完真实的执行流水线。
  // CallId 给相关联 id 打上 brand，正式场景由提供方签发。
  void (async () => {
    const result = await ctx.tools.execute({
      callId: CallId('demo-1'),
      name: 'greet',
      arguments: { name: 'Cordis' },
      signal: new AbortController().signal,
    })
    console.log('tool replied:', JSON.stringify(result.content))
  })()
}
```

这里的每个模式你都学过了：

| 代码 | 对应章节 |
|---|---|
| `inject: ['tools']` | [第 05 章](#/cordis-service)——等工具注册表就绪 |
| `ctx.tools.register(...)` | [第 04 章](#/cordis-lifecycle)——注册 disposer 附着到插件，卸载时注销工具 |
| `defineTool` | [第 12 章](#/arch-tools)——把 `parameters` 转成模型可见的 JSON Schema，推导 `args` 类型，执行前校验 |
| `CallId('demo-1')` | 仓库规约：**不透明的跨边界 id 必须 branded**（`Branded<B>`），不能是裸 `string` |

工具返回 `output.schema` 声明的**规范值**；`output.render` 作为 **Native renderer** 另行生成可持久化的结果内容。

## 第 2 步：观察插件

`tool-logger.ts`——一个**完全独立**的插件，通过 `tools/result` 观察应用中的每次工具调用：

```ts
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-tools'

export const name = 'tool-logger'
export const inject = ['tools']

export function apply(ctx: Context) {
  ctx.on('tools/result', (exec, result) => {
    const text = result.content
      .map(block => (block.type === 'text' ? block.text : ''))
      .join('')
    console.log(`[tool-logger] ${exec.name} -> ${text}`)
  })
}
```

<div class="callout key">
<span class="callout-title">那行 <code>import type {}</code> 又出现了</span>
<code>import type {} from '@deepseek-ai/dsh-tools'</code> 引入该包的<strong>声明合并</strong>，使 <code>'tools/result'</code> 及其 payload 具有类型。这和<a href="#/cordis-events">第 06 章</a>导入 <code>stats.ts</code> 是同一手法，只是扩展到了包级别。
</div>

## 第 3 步：组合并运行

```yaml
- name: '@deepseek-ai/dsh-system-prompt'
- name: '@deepseek-ai/dsh-tools'
- name: './tool-logger.ts'
- name: './greet-tool.ts'
```

<div class="callout warn">
<span class="callout-title">为什么要有 system-prompt 那一行</span>
<code>@deepseek-ai/dsh-tools</code> 自己 <code>inject</code> 了 <code>systemPrompt</code> 服务——因为<strong>工具需要向系统提示词贡献 schema</strong>。所以组合里也必须列出该服务的提供方。<br><br>
缺了它，工具插件会一直停在 PENDING（<a href="#/lab-plugin">实验一第 4 步</a>那个诊断工具能立刻告诉你）。
</div>

```sh
node --import tsx ../../vendor/cordis/bin.js
```

```
[tool-logger] greet -> Hello, Cordis!
tool replied: [{"type":"text","text":"Hello, Cordis!"}]
```

<div class="callout tip">
<span class="callout-title">注意输出顺序</span>
logger <strong>先</strong>触发。因为 <code>tools/result</code> 在结果<strong>物化过程中</strong>发出，发生在 <code>execute</code> 向调用方返回的 promise 兑现<strong>之前</strong>。<br><br>
而且——<strong>两个插件都不知道另一个存在</strong>。它们由注册表服务和事件连接起来。这就是整个架构的工作方式。
</div>

## 第 4 步：在真实 Web UI 里跑

上面是在教程启动器里跑。要在真正的 harness 里，做法不一样——用 **patch overlay**。

在仓库根目录：

```sh
mkdir -p scratch-plugin/src
pwd   # 记下这个绝对路径
```

把工具代码放到 `scratch-plugin/src/my-plugin.ts`（去掉那段自己驱动执行的 `void (async () => ...)`，让模型来调用它）：

```ts
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'greet-tool'
export const inject = ['tools']

export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    name: 'greet',
    description: 'Greet someone by name.',
    parameters: {
      name: { type: 'string', required: true, description: 'The name to greet' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      return `Hello, ${args.name}!`
    },
  }))
}
```

`scratch-plugin/cordis.yml`——这是一个 **web overlay**：

```yaml
- insert:
    - id: hello
      name: '/absolute/path/to/deepseek-harness/scratch-plugin/src/my-plugin.ts'
```

<div class="callout warn">
<span class="callout-title">必须是绝对路径</span>
「插件路径必须是绝对路径。<strong>patch 文件只贡献配置，不会改变 loader 解析模块路径时使用的 profile 目录。</strong>」<br><br>
把 <code>/absolute/path/to/deepseek-harness</code> 换成你 <code>pwd</code> 打出来的路径。
</div>

启动：

```sh
pnpm dsh web --patch ./scratch-plugin/cordis.yml
```

打开 `http://127.0.0.1:3080`，输入：

> Use the greet tool to greet Ada.

模型会调用 `greet`，收到 `Hello, Ada!`。

<div class="callout key">
<span class="callout-title">这里发生了什么</span>
你刚刚用了<a href="#/arch-overview">架构总览</a>讲的<strong>分层机制的最后一层</strong>：<code>--patch</code> overlay。<code>insert</code> 往条目列表里插了一个新条目，而下面所有组合包一行都没改。
</div>

## 进阶要点

写真正的工具时，回头查[第 12 章](#/arch-tools)的这几条：

- **UI 渲染意图要提前决定**：`generic` / `terminal` / `diff`，加上 `locations`。展示方法必须是 `args` 的**纯函数**（回放时也会跑）。
- **别把部署策略写进工具**：权限用 `tools/pre-execute`，最终否决用 `ctx.tools.guard()`，超时用 `tools/execute`。
- **`output.schema` 是程序化 API**：Code Mode 让模型能 `await tools.greet({ name: 'Ada' })`，所以直接返回句柄和字段，别让调用方解析自然语言。
- **长任务用 `ctx.jobs.start()`**，并且发布 id 后要用**任务自有的取消信号**，不是 `exec.signal`。

## 从这里到完整 agent

真实 agent 就是这套组合再加更多插件：LLM 适配器、agent loop、持久化、运行入口。

<div class="callout tip">
<span class="callout-title">现在去读这个文件</span>
<code>examples/headless-agent/cordis.yml</code>——你现在<strong>应该能读懂其中每一个配置项</strong>了。<br><br>
里面有 <code>settings</code>、<code>credentials</code>、<code>llm-deepseek</code>（含 <code>models</code> 和 <code>thinking</code> 配置）、<code>subprocess</code>、<code>bash</code>（含 <code>timeoutMs</code>）、<code>agent-spine</code>（含 agents 列表、<code>cwd: !!js process.cwd()</code>、persona 模板）。每一个字段都对应你学过的概念。<br><br>
把 <code>greet-tool.ts</code> 加进该文件的副本试试。
</div>

<div class="srcref">来源：docs/cordis-tutorial/07-into-the-harness.zh.md · docs/user/develop/basic/tool.zh.md · docs/user/develop/basic/index.zh.md</div>

下一个实验：[造一个能力](#/lab-capability)。
