# 运行与迁移

## 现有工程

- TypeScript、React 19.2.6、Next 16.3.4、Vinext 1.0.0-beta.5、Vite 8.0.13、Cloudflare Workers。
- Node要求`>=22.13.0`；包管理器固定`pnpm@11.25.0`。版本以`prototype/package.json`与锁文件为准，不是升级建议。
- `vite.config.ts`保留本地Cloudflare和Sites插件；相关插件源码及已有许可文件随原型一起保存。
- 原工程使用pnpm锁文件；先复现，再决定是否更换框架或包管理器。

## Claude外部环境的启动路径

确认Node和指定pnpm版本可用后，在`prototype/`目录执行：

```sh
pnpm install --frozen-lockfile
node node_modules/typescript/bin/tsc --noEmit
pnpm build
pnpm dev
```

便携模式的开发脚本指定端口5173。清洁副本缺少本机执行配置时，`scripts/execution-profile.mjs`默认`portable`。以终端实际输出为准，先验证无密钥的演示路径。

这组外部环境命令尚未在用户的Mac/Claude环境中验证。本次实际安装与构建发生在ChatGPT Work的Linux环境，使用其受支持的构建工具。原README中的Sites监督器/发布流程仅适用于原环境。

`install:ci`的旧Linux脚本依赖`flock`、GNU `timeout`等，不应直接作为macOS通用安装说明；常规pnpm安装优先。如果配置引用了本机共享缓存，将缓存配置调整为当前机器的私有可写位置，保留依赖和锁文件的安全策略。

## 凭证

`configuration/env.example`仅列环境变量名，没有可用密钥。演示无需真实AI凭证。真实调用时应由用户在安全本地配置或部署平台的秘密变量中提供凭证，不发到聊天。

原代码从Workers `env.OPENAI_API_KEY`或服务端`process.env.OPENAI_API_KEY`读取。原会话确认过的本地目标为`.env.local`；外部环境还需验证框架和Wrangler是否实际注入该值，必要时按其官方说明配置本地Workers变量。不要把密钥放到浏览器可见的`NEXT_PUBLIC_`或`VITE_`变量。

原私有站点的运行时密钥、平台登录、源仓库临时授权和API余额不能由ZIP转移。这里没有授权创建新密钥、充值或进行无人值守付费负载实验。

## 原平台与新开发环境

源码来源提交与原Site标识见`verification/provenance.json`。原Git服务依赖平台授权，不是一个已授予Claude访问权的GitHub仓库。

建议将完整目录放在用户控制的私有仓库，建立未改动基线，再建开发分支。保留`prototype/.openai/hosting.json`作为原始快照；新部署应独立配置目标，不把旧站点ID自动复用于新平台。

新手机客户端可以复用内容、类型、规则与部分服务端逻辑；React网页UI不能直接当作原生App界面。客户端选型应先验证录音、打断、后台切换、耳机、弱网及内购，再确定迁移范围。
