# 仓库导航与规约

<div class="chapter-meta">
<span class="badge">速查</span>
<span class="badge time">提代码前翻一遍</span>
<span class="badge">最后一章</span>
</div>

<div class="callout tip">
<span class="callout-title">这页解决什么问题</span>
你已经懂架构了，现在要真的往仓库里提东西。这页列出<strong>目录去哪找、命令怎么跑</strong>，以及那些<strong>不知道就会被 CI 拦下来</strong>的硬规则。
</div>

## 目录布局

```
vendor/      vendored Cordis 源码 —— 清单 + 同步流程在 vendor/README.md
packages/    @deepseek-ai/dsh-<pkg> 工作区，位于 packages/<group>/<pkg>/
python/      Python SDK 和打包运行时
native/      @deepseek-ai/node-addon-landlock-run 源码
examples/    可运行的 cordis.yml 叶子（基于 packages/examples 组合包）
.agents/     Agent 工作流和 Agent Notes（notes/）
docs/        架构、生成的目录、postmortem、cookbook
scripts/     仓库门禁和生成器
website/     选定双语文档的 VitePress 投影
apps/        CLI / web 等应用
```

<div class="callout key">
<span class="callout-title">读代码的入口顺序</span>
1. <code>docs/architecture.md</code>（改 <code>packages/</code> 前必读）<br>
2. <code>packages/README.md</code>（组 → 职责 → ctx 键映射）<br>
3. <code>docs/capability-seams.md</code>（服务 → 声明包 → 实现包 → 消费包的完整图）<br>
4. <code>examples/headless-agent/cordis.yml</code>（一个真实组合的全貌）<br>
5. 具体的 <code>docs/subsystems/<name>.md</code>
</div>

## 命令清单

```sh
pnpm install            # pnpm workspaces, node ^22.19 || >=24
pnpm run clean          # 清理构建产物和已删包的残留
pnpm run test           # vitest 单元测试
pnpm run test:coverage  # CI 覆盖率门禁：packages/*/*/src 逐文件 100%
pnpm run test:e2e       # 真实 API 测试；没有 DEEPSEEK_API_KEY 时自行跳过
pnpm run test:snapshot  # 无密钥的 ACP/headless 回放 vs 期望输出；-t <name> 过滤
pnpm run test:snapshot:record  # 重新录制期望输出（需要密钥）
pnpm run typecheck
pnpm run lint
pnpm run duplication    # 跨文件 TypeScript 克隆检测
pnpm run build          # tsc 出 lib/types，tsdown 打运行时 bundle
pnpm run hygiene        # knip + publint + workspace constraints + NodeNext 消费方检查
pnpm run doc-sync       # 全部文档门禁；叶子清单在 scripts/run-gates.ts
pnpm run website:build  # VitePress 构建（兼作死链检查）

pnpm dsh --profile headless "task"   # 从源码跑一个任务（需要密钥）
pnpm run demo:cordis    # agent 修改自己的运行时（需要密钥）
pnpm run demo:acp       # ACP 自动化服务器（需要密钥）
```

## 测试纪律：不要默认跑全套

<div class="callout warn">
<span class="callout-title">按改动的面选证据</span>
规约原话：「<strong>Never default to the full suite</strong> or repeat a passing check for commit or push. CI owns exhaustive coverage and the platform matrix.」
</div>

| 改了什么 | 跑什么 |
|---|---|
| 行为 | 聚焦测试（focused tests） |
| 模型或用户可见输出 | snapshot |
| 文档 | `doc-sync` |
| 已发布路径 | build / hygiene + 构建产物 smoke |
| 提供方行为 | 真实 API e2e |

只在三种情况下本地演练全套：**显式要求**、**诊断 CI**、或者**确实是仓库级的不可拆改动**。

另外记住：**CI 的覆盖率门禁是 `test:coverage`，不是 `test`**。

## 沙箱失败的处理方式

<div class="callout tip">
<span class="callout-title">这条是给 agent 写的，但对人也有用</span>
当必需的 <code>gh</code>、<code>pnpm</code>、build、test 或生成器命令因为 <strong>agent 沙箱</strong>阻断了凭据、网络、IPC、文件监听或嵌套 <code>sandbox-exec</code> 而失败时：<strong>用最窄的宿主提权原样重试</strong>，再去诊断认证或项目失败。<br><br>
但要<strong>有沙箱证据</strong>；<strong>绝不</strong>绕过真正的测试失败或被测的产品沙箱。
</div>

## 核心约定速查

### 命名与打包

- 每个 npm 包是 `@deepseek-ai/dsh-<name>`；vendored 包被 rescope 且 `private: true`。
- `@deepseek-ai/cordis` 是**每个** harness 包的 peerDependency（+ dev）。
- **ESM everywhere**（`"type": "module"`）。跨包用包名，本地相对 import 用 `.ts`。
- `dsh` CLI 源码启动走 tsx 的 **ESM-only** hook（`node --import tsx/esm`）——它触达的模块必须保持 ESM，**不能有 CJS-only 导出**。

### 注册与不变量

- **Registrations are effects**：每一项贡献都走 `ctx.effect()` / `ctx.on()`；注册表的 `register()` 返回 disposer。
- **运行时不变量断言「拥有的关系」**：检查权威事件流或可变数据，**不检查**服务/方法是否存在、插件元数据/effect、或固定的纯示例。

### 类型化事件

- **用声明合并**和可合并扩展的 map。
- 事件 JSDoc 需要 `@mode` 和 payload 的 `@param`；payload 里没有的 scoped key 需要 `@dshScopeScan unsupported`。
- 公共服务方法要记录参数和非 void 返回值。
- `SessionEventMap` 成员默认 **required-on-read**——不知道其类型的构建会拒绝该日志，除非事件携带 `ignorable: true`。

### 控制流

- **Switch on discriminant tags.** 闭合联合以 `assertNever` 结尾；可合并扩展的联合走一个**有文档记录的 default**。
- **Waterfall 监听器必须调 `next()`** 才能委托；不调就短路。

### 设计原则

| 原则 | 内容 |
|---|---|
| **Model-visible ⟺ logged** | 抵达模型请求的一切都必须能从日志重建 |
| **Plugins, not loop changes** | 新行为走文档记录的扩展点；改 `agent-loop` 要同时更新 `docs/architecture.md` |
| **能力 seam 是完整的** | Definition / Provider / Consumer 三角色，绝不是单一角色 |
| **优先用维护良好的依赖** | 前提是它**真的能删掉自有代码和测试** |
| **Explicit > implicit at package boundaries** | defaulting 是显式的 `resolve(request): Spec` 步骤 |
| **No hardcoded tunables in plugins** | deployment 会变的值必须是经校验的 `Config` 字段 |
| **Misconfiguration fails loud** | 自包含则加载时失败，否则最早可判定处失败；永不静默跳过缺失引用 |
| **不透明跨边界 id 要 branded** | `Branded<B>` from `dsh-brand`，不是裸 `string` |
| **在类型化同进程边界信任 TypeScript** | 不为静态接口已保证的值加运行时校验 |
| **源码平面 vs 产物平面，永不混用** | 静态门禁和测试通过 tsconfig `paths` 解析到 `src`；消费 `lib/` 的门禁要声明该依赖 |

<div class="callout key">
<span class="callout-title">要校验的边界清单</span>
「Trust TypeScript at typed same-process boundaries」不是「不做校验」。<strong>要</strong>校验的边界是：parser/config、queued、model/tool JSON、durable/file、worker、process、wire。
</div>

### 代码风格

- **默认不写注释。** 只在 WHY 不显然时写：隐藏约束、微妙不变量、针对特定 bug 的 workaround、会让读者意外的行为。
- **不要解释代码做了什么**——好的标识符已经做到了。不要引用当前任务/修复/调用方（「used by X」「added for the Y flow」「handles the case from issue #123」）——那属于 PR 描述，而且会随代码演化而腐烂。
- **空 `catch` 要说明它吞掉了什么**，以及为什么别的到不了这里；`try` 保持单条语句。
- **平行的值优先保持对称**；无解释的不对称通常意味着漏了一次抽取。
- 文件以**恰好一个**换行结尾（`git diff --cached --check` 在 pre-commit 里把关）。
- TODO 标记按紧急度：`FIXME` / `TODO` / `XXX`。

### 测试哲学

<div class="callout warn">
<span class="callout-title">Tests describe behavior, not correctness</span>
「过时的行为要<strong>连同它的测试一起改</strong>；在 PR 里解释为什么。」<br><br>
不要因为「测试挂了」就去迁就旧行为——如果行为该变，测试就该跟着变，但必须说明理由。
</div>

### PR 与 Agent Note

- **非平凡改动必须在同一 PR 里带 Agent Note**；只有机械性/局部编辑豁免。
- **归档的 note 是冻结的**：绝不编辑，也不当作当前权威。
- 标签：一个 PR 一个 `kind/*`，所有相关的 `area/*`，加原生 Issue Type。
- 重写用 `--force-with-lease`，远程有移动就 abort，**绝不用裸 `--force`**。

## 双语文档

`docs/` 是中英双语配对维护的（`.md` / `.zh.md` / `.i18n.yaml`）。

<div class="callout warn">
<span class="callout-title">别自己跑翻译</span>
「只有<strong>显式的用户调用</strong>才能运行 <code>dsh-translate-docs</code>。」<br><br>
另外有些英文文件是<strong>生成</strong>的（比如 <code>docs/agent-lifecycle.md</code>、<code>docs/tool-execution-pipeline.md</code> 由 <code>scripts/gen-doc-graphs.ts</code> 写出）。改这类文档要先 <code>pnpm run gen-doc-graphs</code>，再改中文侧，再跑 <code>verify-translation-pairing --write</code> 重新记录配对。
</div>

其它文档纪律：**current-state prose**（写当前状态，不写历史）、**一段一物理行**、**一个事实一个归属地**。

## 编辑 AGENTS.md 本身

`CLAUDE.md` 在 root、`packages/`、`examples/` 都是 `AGENTS.md` 的符号链接——**编辑真实文件**。

规则要保持**自包含**，同时链接高层文档。能保持清晰就精简；确实需要更多空间时，抬高 `verify-doc-budgets` 的上限。

## Vendoring 政策

`vendor/` 里的包是**钉死的源码副本**（清单含上游 SHA，在 `vendor/README.md`）。更新流程：

1. 按 `vendor/README.md` 的同步流程操作
2. 重新应用或废弃已记录的本地修改
3. 重跑 `pnpm run test && pnpm run build`

## 学完了，然后呢

<div class="card-grid">
<a class="card" href="#/lab-tool">
<div class="card-num">动手</div>
<div class="card-title">改一个真实的工具</div>
<div class="card-desc">在 packages/fs 或 packages/shell 里找一个工具，读懂它的 render intent 和 output.schema</div>
</a>
<a class="card" href="#/ref-map">
<div class="card-num">查表</div>
<div class="card-title">需求 → 扩展点</div>
<div class="card-desc">有想法的时候先来这张表，找现成的扩展点</div>
</a>
</div>

还可以：

- 读 `.agents/notes/implemented/` 下的 Agent Notes——那里有**每个设计决策的理由**，是这个仓库最有价值的部分之一。
- 跑 `dsh --profile web --dump-config`，对着[架构总览](#/arch-overview)逐条认。
- 跑 `pnpm run demo:cordis`——agent 修改自己的运行时（需要密钥）。这是「一切皆插件」最戏剧化的演示。

<div class="srcref">来源：AGENTS.md · docs/development.zh.md · vendor/README.md</div>
