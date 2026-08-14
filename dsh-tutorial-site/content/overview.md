# 「一切皆插件」到底有多夸张

<div class="chapter-meta">
<span class="badge lv1">入门</span>
<span class="badge time">约 8 分钟</span>
<span class="badge">无需环境</span>
</div>

<div class="goal">
<div class="goal-title">读完这章你会知道</div>
<ul>
<li>这个项目在解决什么问题，值不值得你花时间</li>
<li>为什么找不到「主程序入口」——而这是<strong>故意的</strong></li>
<li>接下来该按什么顺序学</li>
</ul>
</div>

## 先做一个思想实验

假设你在维护一个 AI 编码助手。产品经理提了三个需求：

<div class="story">
<div class="story-scene">周一上午，需求评审会</div>
<div class="line"><div class="who">产品</div><div class="says">我们要支持在<strong>远程沙箱</strong>里跑代码，不能再用本地机器了。</div></div>
<div class="line"><div class="who">你</div><div class="says">好，那我得改 Bash 执行、改文件读写、改终端、改语言服务器……这四块都得加一套远程分支。</div></div>
<div class="line"><div class="who">产品</div><div class="says">还有，某些企业客户要换成<strong>他们自己的模型</strong>。</div></div>
<div class="line"><div class="who">你</div><div class="says">那得在模型调用层加抽象……</div></div>
<div class="line"><div class="who">产品</div><div class="says">对了，能不能让 agent <strong>自己给自己装新功能</strong>？</div></div>
<div class="line me"><div class="who">你</div><div class="says">……这个得重写。</div></div>
</div>

第三个需求是压垮骆驼的那根稻草。因为前两个还能靠「加抽象层」硬扛，第三个要求**运行时动态加载和卸载功能**——而绝大多数程序的架构里，功能是编译期焊死的。

DeepSeek Harness（命令行叫 `dsh`）的答案是：**那就让所有东西都可以随时装卸。**

## 这句话有多字面

大多数框架说自己「支持插件」，意思是：有个内核，内核之外留了几个钩子。

dsh 不是这个意思。下面这些，**全部**是插件：

| 你以为是内核的 | 实际身份 |
|---|---|
| 调 DeepSeek API 的那段代码 | 插件 `dsh-llm-deepseek` |
| 工具注册表 | 插件 `dsh-tools` |
| 会话记录与持久化 | 插件（JSONL / SQLite 两种后端可选） |
| Bash 执行 | 插件 `dsh-bash-local` |
| Web 界面 | 插件（`dsh-web-app` 组合包） |
| **那个「请求模型 → 执行工具 → 再请求」的主循环** | **插件 `dsh-agent-loop`** |

最后一行才是重点。**连主循环都是插件**，能从配置文件里换掉。

<div class="callout key">
<span class="callout-title">架构文档的原话</span>
「不存在需要打补丁的特权内核：扩展 dsh 的方式是把插件挂载到其他插件旁边，而各项注册都是副作用，会在其插件卸载时撤销。」
</div>

所以——**别去找 `main()`**。你找不到一个「程序主体」，只能找到一份**清单**，上面写着这次要装哪些零件。

## 回到那三个需求

现在看这套架构怎么回答刚才的评审会：

<div class="analogy">
<div class="analogy-title">类比：USB 接口</div>
USB 定义了<strong>插口标准</strong>。鼠标、U 盘、网卡都能插同一个口，电脑不需要为每种设备改主板。<br><br>
dsh 里每项能力都有这样一个「插口」：<code>ctx.shell</code>（执行命令）、<code>ctx.fs</code>（读写文件）、<code>ctx.llm</code>（调模型）。上层代码只认插口，不认背后插的是谁。
</div>

于是：

- **远程沙箱**：文件系统和进程这两个「插口」背后换成远程实现。因为 Bash、终端、语言服务器**都是通过这两个插口干活的**，它们自动跟着搬过去了——不用为每个功能写一份远程分支。
- **换模型**：换 `ctx.llm` 背后的插件，一行 YAML。
- **agent 自己装功能**：仓库里真有这个包（`packages/extensions/`），因为「装卸插件」本来就是运行时随时能做的事。

<div class="callout tip">
<span class="callout-title">这不是画饼</span>
仓库里有个 demo 命令 <code>pnpm run demo:cordis</code>，跑起来就是 <strong>agent 修改自己的运行时</strong>。你学到最后可以自己跑一次。
</div>

## 代价是什么

任何架构都有代价，说清楚才公平：

<div class="versus">
<div class="bad">
<div class="vs-head">你会不适应的地方</div>
<div class="vs-body">
<p>读代码时<strong>没有一条主线</strong>可以从头跟到尾。要理解运行时行为，得先知道装了哪些插件。</p>
<p>「这个功能在哪实现的」不能靠搜函数调用链——调用方和实现方<strong>互相不认识</strong>，中间隔着一个插口名。</p>
</div>
<div class="vs-note">这也是本教程存在的原因。</div>
</div>
<div class="good">
<div class="vs-head">你换来的东西</div>
<div class="vs-body">
<p>改配置就能改产品形态，不用碰代码。</p>
<p>加功能 = 加一个插件，<strong>不用改任何现有文件</strong>。</p>
<p>热重载是真的能用，不是玩具。</p>
</div>
<div class="vs-note">规模越大，这笔账越划算。</div>
</div>
</div>

## 项目现状

DeepSeek AI 开源，底层是 [Cordis](https://github.com/cordiverse/cordis) 插件框架（源码以 vendored 形式钉在 `vendor/` 里）。

目前是**开发者预览**阶段，官方明说会有破坏性变更。仓库根目录的 `AGENTS.md` 里有一节标题叫「Pre-release stance: foundation over blast radius」——大意是：既然还没有外部使用者，那就宁可改对，也不要为了兼容留下包袱。

<details class="deep">
<summary>顺便看一眼仓库长什么样<span class="deep-tag">可跳过</span></summary>
<div class="deep-body">

```
vendor/      vendored 的 Cordis 源码（钉死版本的源码副本）
packages/    50 来个包，全都叫 @deepseek-ai/dsh-<名字>
  core/        主干：session、system-prompt、tools、agent、agent-loop
  llm/         模型能力：抽象服务 + DeepSeek 适配器
  shell/       Bash 能力：插口 + 本地实现 + 给模型用的工具
  fs/          文件系统能力
  bundle/      可安装的 profile 补丁层
  ...
examples/    可以直接跑的 cordis.yml
docs/        架构、教程、子系统文档（中英双语）
.agents/     给 AI agent 看的工作流和设计决策记录
```

`packages/` 是**按组分层**的：`packages/<组>/<包>/`，但包名里**不带组名**——组只是目录组织方式。

</div>
</details>

## 接下来怎么学

我把路径拆成四段。顺序是按**依赖关系**排的，不建议跳：

<div class="card-grid">
<a class="card" href="#/quickstart">
<div class="card-num">第一段 · 2 章</div>
<div class="card-title">先跑起来</div>
<div class="card-desc">看到东西动，然后用一个类比把整个框架装进脑子</div>
</a>
<a class="card" href="#/cordis-plugin">
<div class="card-num">第二段 · 6 章</div>
<div class="card-title">Cordis 框架</div>
<div class="card-desc">插件怎么写、怎么找到彼此、怎么通信。这是地基，绕不过去</div>
</a>
<a class="card" href="#/arch-overview">
<div class="card-num">第三段 · 5 章</div>
<div class="card-title">Harness 架构</div>
<div class="card-desc">在地基上盖的楼：agent 循环、会话记录、工具流水线</div>
</a>
<a class="card" href="#/lab-plugin">
<div class="card-num">第四段 · 3 个实验</div>
<div class="card-title">动手做</div>
<div class="card-desc">写插件、写工具、造能力。前两个连 API 密钥都不需要</div>
</a>
</div>

<div class="callout tip">
<span class="callout-title">这个站怎么用</span>
右侧可以勾「本章已读」，左上角看进度。按 <code>/</code> 或 <code>Ctrl+K</code> 搜索。<br>
文中<span class="term" data-def="像这样带虚线下划线的词，鼠标悬停就能看到解释。第一次见到的术语我都会这样标注。">带虚线下划线的术语</span>可以悬停查看解释。<br>
标着「可跳过」的折叠块是硬核细节，第一遍读<strong>建议直接跳过</strong>，回头需要时再展开。
</div>

<div class="recap">
<div class="recap-title">一句话记住</div>
dsh 没有内核，只有一棵<strong>插件树</strong>和一份组装清单。学它 = 学「零件怎么写」+「清单怎么写」。
</div>

<div class="pathline">
<span class="now">00 一切皆插件</span>
<span class="sep">→</span>
<a href="#/quickstart">01 跑起来</a>
<span class="sep">→</span>
<span>02 心智模型</span>
<span class="sep">→</span>
<span>Cordis 六章</span>
</div>
