# 实验三：造一个能力

<div class="chapter-meta">
<span class="badge lv3">动手</span>
<span class="badge time">40 分钟</span>
<span class="badge">harness 大功能的标准形状</span>
</div>

<div class="goal">
<div class="goal-title">这个实验干什么</div>
<ul>
<li>把<a href="#/arch-seams">第 13 章</a>的三个角色真的拆成三个包</li>
<li>然后<strong>换掉其中的 Provider</strong>，验证另外两个包一个字都不用改</li>
<li>顺带认识那些真往仓库提代码时会被 CI 拦住的规约</li>
</ul>
</div>

## 目标

做一个 `myCap` 能力，跑完之后你会得到：

- 一个抽象服务（Definition）
- 一个本地实现（Provider）
- 一个模型可调用的工具（Consumer）
- **换掉 Provider 只需改一行 YAML**

## 第 1 步：Service Definition

```ts
// packages/my-cap/my-cap/src/index.ts
import { Service, type Context } from '@deepseek-ai/cordis'

declare module '@deepseek-ai/cordis' {
  interface Context {
    myCap: MyCapService
  }
}

export abstract class MyCapService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'myCap')
  }

  /** Execute the capability. */
  abstract execute(request: MyCapRequest): Promise<MyCapResult>
}

export interface MyCapRequest {
  input: string
}

export interface MyCapResult {
  output: string
}
```

三个要点：

- **`abstract class`，不是 `interface`。** 术语纪律那条：Service Definition 是 Cordis `Service`（抽象类或具体注册表），**绝不是 TypeScript `interface`**——它需要一个运行时实体占据 `ctx.myCap`。
- **Definition 拥有 Request/Result 类型。** Provider 和 Consumer 都只依赖这个包。
- **抽象方法要写 JSDoc。** 仓库规约：公共服务方法要记录参数和非 void 返回值，而且**继承声明的成员把文档留在声明处的 Service Definition**。

## 第 2 步：Service Provider

```ts
// packages/my-cap/my-cap-local/src/index.ts
import type { Context } from '@deepseek-ai/cordis'
import { MyCapService, type MyCapRequest, type MyCapResult } from '@deepseek-ai/dsh-my-cap'

class MyCapLocal extends MyCapService {
  async execute(request: MyCapRequest): Promise<MyCapResult> {
    return { output: request.input.toUpperCase() }
  }
}

export const name = 'my-cap-local'

export function apply(ctx: Context) {
  ctx.plugin(MyCapLocal)
}
```

注意 Provider **只 import Definition 包**。它不知道有哪些 Consumer。

## 第 3 步：Consumer

```ts
// packages/my-cap/tool-my-cap/src/index.ts
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'tool-my-cap'
export const inject = ['tools', 'myCap']

export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    name: 'my_cap',
    description: 'Execute my capability.',
    parameters: {
      input: { type: 'string', required: true },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      const result = await ctx.myCap.execute({ input: args.input })
      return result.output
    },
  }))
}
```

Consumer `inject` 了**两个**服务：`tools`（注册工具）和 `myCap`（调用能力）。它也**只 import Definition 包**——不知道 provider 是本地还是远程。

## 第 4 步：组合

```yaml
- name: '@deepseek-ai/dsh-my-cap-local'
- name: '@deepseek-ai/dsh-tool-my-cap'
```

<div class="callout key">
<span class="callout-title">这里没有 Definition 那一行</span>
Definition 包通常由 Provider 自己带进来（Provider <code>ctx.plugin(MyCapLocal)</code>，而 <code>MyCapLocal extends MyCapService</code>）。配置里选的是<strong>实现</strong>。
</div>

## 第 5 步：验证可替换性

再写一个 provider，比如 `my-cap-reverse`：

```ts
class MyCapReverse extends MyCapService {
  async execute(request: MyCapRequest): Promise<MyCapResult> {
    return { output: [...request.input].reverse().join('') }
  }
}
```

换配置：

```yaml
# - name: '@deepseek-ai/dsh-my-cap-local'
- name: '@deepseek-ai/dsh-my-cap-reverse'
- name: '@deepseek-ai/dsh-tool-my-cap'
```

**工具代码一行没改，行为变了。** 而且因为[第 05 章](#/cordis-service)那条「加载后仍会跟踪依赖」，如果你在运行中热替换 provider，Consumer 会自动卸载再重新加载。

## 落地时要遵守的仓库规约

如果你真的要往 `packages/` 里加这个能力，这些规约会被 CI 检查：

### 包命名与结构

| 规则 | 内容 |
|---|---|
| 包名 | `@deepseek-ai/dsh-<name>`，放在 `packages/<group>/<pkg>/` |
| peerDependency | `@deepseek-ai/cordis` 是**每个** harness 包的 peerDependency（+ dev） |
| ESM | `"type": "module"`，跨包用包名 import，本地相对 import 用 `.ts` 后缀 |
| 新包归组 | 新包加入现有组；新组要更新其 README 和 `packages/README.md` 的表格 |

### 必须写的文档

<div class="callout warn">
<span class="callout-title">README 有强制内容</span>
包 README 要覆盖<strong>用途、API、扩展点和「模型体验」</strong>（除非列入模型无关的省略允许清单）。还必须包含 <code>## Known Limitations and Deferred Work</code> 一节，或列入其允许清单。<br><br>
另外：<strong>非平凡改动必须在同一个 PR 里带一份 Agent Note</strong>，只有机械性/局部编辑豁免。
</div>

### 配置纪律

- **不许硬编码可调参数**：deployment 会变的值必须是经校验的 `Config` 字段。
- **显式默认值**：defaulting 走显式的 `resolve(request): Spec` 步骤，不是 `run()` 里的 `?? default`。`dsh-shell` 的 request/spec 拆分是模板。
- **misconfiguration 要响亮失败**：自包含的问题在加载时失败，否则在最早能判定处失败，**永不静默跳过缺失的引用**。

### 测试要求

<div class="callout warn">
<span class="callout-title">seam 的测试是三层的</span>
规约原文：「<strong>Plan unit, e2e, and snapshot coverage</strong> for capability seams, lifecycle paths, and transcript output；缺少的 snapshot harness 支持要在同一个改动里补上。」<br><br>
而且：每个非平凡的「模型可见或产品用户可见」的行为变化，都要在同一 PR 里<strong>通过一个真实可运行的示例</strong>加/更新一个无密钥 snapshot。包测试、e2e-only 断言、mock-only fixture <strong>都不能替代</strong>组装后的应用 transcript。
</div>

### 类型安全

- 一切在 `strict: true` + `noImplicitAny` 下编译；每个残留的 `any` 都要解释为什么无法收窄。
- **在类型化的同进程边界信任 TypeScript**：不要为静态接口已经保证的值加运行时校验或敌意输入测试。要校验的边界是：parser/config、队列、模型/工具 JSON、持久/文件、worker、进程、wire。
- **不透明的跨边界 id 要 branded**（`Branded<B>` from `dsh-brand`），不能是裸 `string`。

## 什么时候**不该**这么拆

<div class="callout key">
<span class="callout-title">再强调一次</span>
「<strong>不要预防性拆分</strong>：只有角色需要独立演进时，才使用不同包。简单的工具插件无需拆分。」<br><br>
一个包可以承担多个角色。<code>dsh-llm</code> 同时是 Definition 和 Consumer。判断依据是「这两个角色会不会各自独立地变化」，不是「看起来更整齐」。
</div>

## 检查清单

- [x] Definition 是 `abstract class extends Service`，拥有 Request/Result 类型
- [x] Provider 继承 Definition，`ctx.plugin(...)` 挂载自己
- [x] Consumer `inject` Definition 的服务名，不 import Provider
- [x] Provider 和 Consumer 之间零依赖
- [x] 换 provider = 改一行 YAML
- [x] 知道 README / Agent Note / 三层测试的硬要求

<div class="srcref">来源：docs/user/develop/practice/index.zh.md · AGENTS.md · packages/README.zh.md</div>

实践部分结束。参考章节：[需求 → 扩展点](#/ref-map)。
