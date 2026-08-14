# 实验一：第一个插件

<div class="chapter-meta">
<span class="badge lv1">动手</span>
<span class="badge time">30-40 分钟</span>
<span class="badge">不需要 API 密钥</span>
</div>

<div class="goal">
<div class="goal-title">这个实验干什么</div>
<ul>
<li>六个小步骤，把 Cordis 六章的每个概念<strong>亲手撞一遍</strong></li>
<li>包括两次<strong>故意制造失败</strong>——对比两种失败方式的不同表现</li>
<li>最后你会得到一段以后天天用得上的排查代码</li>
</ul>
</div>

<div class="callout tip">
<span class="callout-title">建议的做法</span>
不要只读。<strong>开个终端跟着敲</strong>，每一步都对一下输出。这个实验的价值全在「你亲眼看到它这样反应」——尤其是第 3 步那两个「什么都没发生」的场景。
</div>

## 准备

```sh
cd /home/pc/deepseek-harness-master
pnpm install
mkdir -p tmp/cordis-tutorial
cd tmp/cordis-tutorial
```

`tmp/` 已被 git 忽略，你在里面写什么都不会进版本控制。

每一步都从这个目录跑同一条命令：

```sh
node --import tsx ../../vendor/cordis/bin.js
```

这个单文件启动器（`vendor/cordis/bin.js`）做三件事：创建根 `Context`、挂载 Loader 插件、让它从当前目录加载 `./cordis.yml`。**其余一切都来自你写的 YAML。**

## 第 1 步：hello

`hello.ts`：

```ts
import type { Context } from '@deepseek-ai/cordis'

export const name = 'hello'

export function apply(ctx: Context) {
  console.log('hello from my first plugin')
}
```

`cordis.yml`：

```yaml
- name: './hello.ts'
```

跑：

```sh
node --import tsx ../../vendor/cordis/bin.js
```

期望输出：

```
hello from my first plugin
```

<div class="callout tip">
<span class="callout-title">没输出？先查拼写</span>
模块<strong>解析</strong>失败不会崩进程，而且启动早期的错误报告可能丢失（<a href="#/cordis-plugin">第 03 章</a>）。文件名和路径先核对一遍。
</div>

## 第 2 步：验证 effect 会被回卷

`lifecycle.ts`：

```ts
import type { Context } from '@deepseek-ai/cordis'

export const name = 'lifecycle-demo'

function heartbeat(ctx: Context) {
  console.log('heartbeat plugin loading')
  ctx.effect(() => {
    const timer = setInterval(() => console.log('tick'), 200)
    return () => {
      clearInterval(timer)
      console.log('heartbeat cleaned up')
    }
  })
}

export function apply(ctx: Context) {
  const fiber = ctx.plugin(heartbeat)
  ctx.effect(() => {
    const timer = setTimeout(async () => {
      await fiber.dispose()
      console.log('disposed')
      process.exit(0)
    }, 700)
    return () => clearTimeout(timer)
  })
}
```

```yaml
- name: './lifecycle.ts'
```

期望输出：

```
heartbeat plugin loading
tick
tick
tick
heartbeat cleaned up
disposed
```

**观察点**：`heartbeat cleaned up` 在 `disposed` **之前**打印——`fiber.dispose()` 等所有清理完成才返回。

## 第 3 步：服务 + inject，亲手验证顺序无关

`greeter.ts`：

```ts
import { Service, type Context } from '@deepseek-ai/cordis'

declare module '@deepseek-ai/cordis' {
  interface Context {
    greeter: GreeterService
  }
}

export class GreeterService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'greeter')
  }

  greet(who: string) {
    return `Hello, ${who}!`
  }
}

export const name = 'greeter'

export function apply(ctx: Context) {
  ctx.plugin(GreeterService)
}
```

`consumer.ts`：

```ts
import type { Context } from '@deepseek-ai/cordis'

export const name = 'consumer'
export const inject = ['greeter']

export function apply(ctx: Context) {
  console.log(ctx.greeter.greet('world'))
}
```

```yaml
- name: './greeter.ts'
- name: './consumer.ts'
```

输出 `Hello, world!`。

### 三个必做的实验

<div class="callout key">
<span class="callout-title">实验 A：交换两行顺序</span>
把 <code>consumer.ts</code> 挪到 <code>greeter.ts</code> 前面，重跑。<strong>输出完全相同</strong>——加载顺序由 <code>inject</code> 决定，不是文件顺序。
</div>

<div class="callout key">
<span class="callout-title">实验 B：删掉 greeter 那一行</span>
只留 <code>consumer.ts</code>。结果：<strong>没有任何输出，进程以状态码 0 静默退出</strong>。消费方停在 PENDING，既不崩溃也不报错。
</div>

<div class="callout key">
<span class="callout-title">实验 C：把 <code>apply</code> 改成抛异常</span>
<code>throw new Error('apply exploded')</code>。进程<strong>因该错误终止</strong>。对比实验 B——这是两种完全不同的失败路径。
</div>

## 第 4 步：把 PENDING 挖出来

实验 B 那种「静默什么都没发生」是最难查的。装上诊断工具。

`diagnose.ts`：

```ts
import { FiberState, type Context } from '@deepseek-ai/cordis'

export const name = 'diagnose'

export function apply(ctx: Context) {
  setTimeout(() => {
    for (const runtime of ctx.registry.values()) {
      for (const fiber of runtime.fibers) {
        if (fiber.state === FiberState.PENDING) {
          console.log(`${fiber.name} is PENDING — a required service is missing`)
        }
      }
    }
  }, 500)
}
```

`needs-timer.ts`：

```ts
import type { Context } from '@deepseek-ai/cordis'

export const name = 'needs-timer'
export const inject = ['timer']

export function apply(ctx: Context) {
  console.log('needs-timer loaded')
}
```

```yaml
- name: './needs-timer.ts'
- name: './diagnose.ts'
```

跑（Ctrl-C 停止）：

```
needs-timer is PENDING — a required service is missing
```

然后加上 `- name: '@deepseek-ai/cordis-plugin-timer'`，`needs-timer loaded` 就出现了。

<div class="callout tip">
<span class="callout-title">把 diagnose.ts 留着</span>
以后任何「插件不干活也不报错」的情况，第一件事就是把这个文件加进 cordis.yml。<br><br>
去掉 PENDING 过滤条件再跑一次，你会看到 loader 自身的插件（Loader、Include）处于 ACTIVE——<strong>配置文件本身也是通过插件挂载的</strong>。
</div>

## 第 5 步：配置校验

`config-demo.ts`：

```ts
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'

export const name = 'config-demo'

export interface Config {
  greeting: string
  targets: string[]
}

export const Config: Schema<Config> = Schema.object({
  greeting: Schema.string().default('Hello'),
  targets: Schema.array(String).default(['world']),
})

export function apply(ctx: Context, config: Config) {
  for (const target of config.targets) {
    console.log(`${config.greeting}, ${target}!`)
  }
}
```

```yaml
- name: './config-demo.ts'
  config:
    targets: ['alpha', 'beta']
```

```
Hello, alpha!
Hello, beta!
```

**然后故意写错**：

```yaml
- name: './config-demo.ts'
  config:
    targets: 'not-an-array'
```

```
ValidationError: invalid config:
  - $.targets expected array but got not-an-array (at targets)
```

fiber 进入 FAILED，启动器打印错误并以状态码 1 退出。**这就是「misconfiguration fails loud」。**

## 第 6 步：HMR

```yaml
- id: logger
  name: '@deepseek-ai/cordis-plugin-logger-console'
- id: timer
  name: '@deepseek-ai/cordis-plugin-timer'
- id: hmr
  name: '@deepseek-ai/cordis-plugin-hmr'
  config:
    root: ['.']
- id: hello
  name: './hello.ts'
```

跑起来后编辑 `hello.ts` 的消息并保存：

```
hello from my first plugin
2026-07-22 15:44:36 [I] hmr watching [ '.' ]
2026-07-22 15:44:39 [I] hmr reload plugin at hello.ts
hello from my EDITED plugin
```

<div class="callout warn">
<span class="callout-title">别漏掉 logger 和 timer</span>
少了 <code>logger-console</code> 你看不到 HMR 的任何日志；少了 <code>timer</code>，HMR <strong>永远停在 PENDING</strong>。这正是第 4 步那个诊断工具的用武之地。
</div>

## 检查清单

做完这个实验，你应该已经亲眼见过：

- [x] 插件是导出 `apply(ctx)` 的模块
- [x] `cordis.yml` 组合应用，列表顺序不影响加载顺序
- [x] `ctx.effect()` 的 disposer 在卸载时运行，`fiber.dispose()` 等它完成
- [x] `inject` 缺失 → PENDING → 静默退出（状态码 0）
- [x] `apply` 抛异常 → 进程终止（不同的失败路径）
- [x] Config schema 校验失败 → FAILED + 明确错误
- [x] 怎么枚举 fiber 状态找 PENDING
- [x] HMR 卸载再加载，effect 全部回卷

<div class="srcref">来源：docs/cordis-tutorial/ 全部章节</div>

下一个实验：[写一个工具](#/lab-tool)——接入真实的 harness 服务。
