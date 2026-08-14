# 填错表当场退回

<div class="chapter-meta">
<span class="badge lv1">基础</span>
<span class="badge time">约 10 分钟</span>
<span class="badge">可跟着敲</span>
</div>

<div class="goal">
<div class="goal-title">读完这章你会</div>
<ul>
<li>让插件接受配置，并且填错时立刻报清楚哪里错了</li>
<li>知道 <code>!!js</code> 能用在哪、<strong>不能</strong>用在哪</li>
<li>理解一条会被 code review 拦住的规约：不许硬编码可调参数</li>
</ul>
</div>

## 一个常见的偷懒

<div class="story">
<div class="line me"><div class="who">你</div><div class="says">超时时间嘛，写个常量就行：<code>const TIMEOUT = 60000</code>。</div></div>
<div class="line sys"><div class="who">三周后</div><div class="says">测试环境嫌慢，要 5 秒。生产要 120 秒。某个客户要 300 秒。</div></div>
<div class="line me"><div class="who">你</div><div class="says">那我导出个 <code>DEFAULT_TIMEOUT_MS</code> 让人覆盖……</div></div>
<div class="line sys"><div class="who">仓库规约</div><div class="says">不行。<strong>「一个 <code>DEFAULT_*</code> 常量或测试钩子不算可配置性。」</strong> 会随部署变化的值，必须是经过校验的 <code>Config</code> 字段。</div></div>
</div>

这一章讲怎么把值做成真正的配置。

## 可配置插件

```ts
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'

export const name = 'config-demo'

export interface Config {                    // ← 给 TypeScript 看的类型
  greeting: string
  targets: string[]
}

export const Config: Schema<Config> = Schema.object({    // ← 给运行时看的校验器
  greeting: Schema.string().default('Hello'),
  targets: Schema.array(String).default(['world']),
})

export function apply(ctx: Context, config: Config) {
  for (const target of config.targets) {
    console.log(`${config.greeting}, ${target}!`)
  }
}
```

关键是那个**同名双导出**：`Config` 既是接口又是运行时 schema。消费方拿类型，Cordis 拿校验器。

<div class="callout warn">
<span class="callout-title">必须是真的校验器</span>
本仓库用 <a href="https://github.com/shigma/schemastery">Schemastery</a>。Cordis 本身接受任意 <a href="https://standardschema.dev/">Standard Schema</a> 校验器——但<strong>导出一个普通对象是不行的</strong>，那不是校验器，只是个对象。
</div>

<div class="try">
<div class="try-title">跑一下</div>

```yaml
- name: './config-demo.ts'
  config:
    targets: ['alpha', 'beta']
```

```
Hello, alpha!
Hello, beta!
```

注意：没提供 `greeting`，schema 的默认值补上了。**`apply` 永远收到完整且已校验的配置**——所以插件里不需要写 `config.greeting ?? 'Hello'`。
</div>

## 故意填错

```yaml
- name: './config-demo.ts'
  config:
    targets: 'not-an-array'
```

```
ValidationError: invalid config:
  - $.targets expected array but got not-an-array (at targets)
```

插件的 fiber 进入 **FAILED**（[第 04 章](#/cordis-lifecycle)那张状态图），启动器打印错误并以状态码 1 退出。

<div class="analogy">
<div class="analogy-title">入职表填错</div>
不是「先让你上岗，出问题再说」，而是<strong>当场退回，指出第几行填错了</strong>。<br><br>
这是仓库的一条硬纪律，叫 <strong>Misconfiguration fails loud</strong>——配置错了要响亮地失败。
</div>

这条纪律还有个延伸，比 schema 更进一步：

> 如果某个插件的配置通过了 schema 校验，但其中指定的**资源或提供方**不可用，该插件也应当在**能解析该引用时立即拒绝**。

翻译：不光要检查「格式对不对」，还要检查「指向的东西存不存在」。**永远不要静默跳过一个缺失的引用。**

## 需要在加载时算出来的值

有些配置得动态算：

```yaml
- name: './config-demo.ts'
  config:
    greeting: !!js process.env.DEMO_GREETING ?? 'Hello'
```

规则很严，记住这张表：

| 位置 | 能用 `!!js` 吗 | 什么时候求值 |
|---|---|---|
| 插件的 `config` 里 | 能 | 声明的注入激活后，基于该插件上下文 |
| 条目的 `disabled` 字段 | 能 | **每次挂载决策时**，基于 loader 上下文 |
| `name`、`id`、`inject` 等 | **不能** | 保持字面值 |

<div class="callout warn">
<span class="callout-title">是两个感叹号</span>
仓库规约写得很死：cordis.yml 允许 <code>!!js</code>，<strong>never <code>!js</code></strong>。写错一个感叹号不会得到你想要的东西。
</div>

`disabled: !!js ...` 可以按平台或环境把某一行关掉——这是本仓库对 Cordis 的扩展。

## 一个重要的限制

<div class="callout key">
<span class="callout-title">不能用 !!js 决定「装哪个插件」</span>
因为只有 <code>config</code> 和 <code>disabled</code> 支持表达式，<code>name</code> <strong>保持字面值</strong>。<br><br>
所以「根据环境选择不同的实现包」<strong>不能</strong>写成 <code>name: !!js ...</code>。这种条件化组合要用 <strong>overlay</strong>（补丁层）——<a href="#/arch-overview">第 09 章</a>会讲。
</div>

## 两条会被 review 拦住的规约

学到这里，正好能理解仓库对「配置」的两条硬要求：

<div class="versus">
<div class="bad">
<div class="vs-head">不许这样</div>
<div class="vs-body">

```ts
// 硬编码的可调参数
const TIMEOUT = 60000

// 或者藏在执行路径里的默认值
async function run(req) {
  const t = req.timeout ?? 60000
}
```

</div>
<div class="vs-note">部署会变的值不能焊死；<code>?? default</code> 不能藏在 run() 里</div>
</div>
<div class="good">
<div class="vs-head">应该这样</div>
<div class="vs-body">

```ts
// 1. 做成经校验的 Config 字段
export const Config = Schema.object({
  timeoutMs: Schema.number().default(60000),
})

// 2. 默认值走显式的 resolve 步骤
function resolve(req): Spec {
  return { timeout: req.timeout ?? cfg.timeoutMs }
}
```

</div>
<div class="vs-note"><code>dsh-shell</code> 的 request/spec 拆分是模板</div>
</div>
</div>

原文分别是：

- **No hardcoded tunables in plugins** —— 会随部署变化的选择必须是可从 cordis.yml 改的、经校验的 `Config` 字段。协议常量、外部规范、安全不变量则**保持固定**。
- **Explicit > implicit at package boundaries** —— defaulting 是所属实现里一个**显式的 `resolve(request): Spec` 步骤**，绝不是 `run()` 里藏一个 `?? default`。

<div class="quiz">
<div class="quiz-q">超时时间要在生产是 60 秒、开发是 5 秒。哪种做法符合规约？</div>
<button class="quiz-opt">代码里判断 <code>NODE_ENV</code> 取不同值</button>
<button class="quiz-opt">导出 <code>DEFAULT_TIMEOUT_MS</code> 常量供测试覆盖</button>
<button class="quiz-opt" data-answer="yes">做成 Config 字段，不同环境用不同的 cordis.yml / overlay</button>
<div class="quiz-why">规约明说「<code>DEFAULT_*</code> 常量或测试钩子<strong>不算</strong>可配置性」。会随部署变的值必须是<strong>经校验的 Config 字段</strong>，由配置层决定——这就是 <code>dsh-bash-local</code> 有个 <code>timeoutMs</code> 字段的原因。</div>
</div>

<div class="recap">
<div class="recap-title">带走这三句</div>
<ul>
<li><strong>同名双导出</strong>：<code>Config</code> 既是接口又是 schema，于是 <code>apply</code> 永远拿到完整已校验的配置。</li>
<li><strong>填错当场退回</strong>，连「引用的东西不存在」也要在能判定时立刻拒绝。</li>
<li><strong><code>!!js</code> 只在 <code>config</code> 和 <code>disabled</code> 里有效</strong>——选插件要靠 overlay，不是表达式。</li>
</ul>
</div>

<div class="pathline">
<a href="#/cordis-events">06 广播与套娃</a>
<span class="sep">→</span>
<span class="now">07 填错表退回</span>
<span class="sep">→</span>
<a href="#/cordis-hmr">08 改组织不用重启</a>
<span class="sep">→</span>
<span>Harness 架构</span>
</div>
