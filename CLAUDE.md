# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## 项目概述

Chat with GeoGebra —— 基于 Next.js 16 的 Web 应用，用户用自然语言（以中文为主）描述数学图形，AI 代理自动生成 GeoGebra 命令进行交互式绘图。GeoGebra 小程序在客户端运行；LLM 返回工具调用意图，由客户端通过 `window.ggbApplet` 在浏览器内执行。

## 常用命令

```bash
bun run dev            # 启动开发服务器（使用 Turbopack）
bun run build          # 生产构建（next build）
bun run lint           # ESLint 检查（next lint）
bun run search:test    # 测试 GeoGebra 命令搜索（tsx scripts/test-search-commands.ts）
```

项目没有正式的测试框架（无 Jest/Vitest），测试为独立脚本，使用 console.log 断言。

## 架构

### 目录结构
- `app/` — Next.js App Router：页面和 API 路由
- `client/` — 所有 `"use client"` 代码：组件、hooks、工具库、i18n
- `server/` — 仅服务端代码：代理模型、提示词、工具定义、GeoGebra 命令搜索
- `core/` — 共享/备选提示词
- `types/` — TypeScript 类型定义
- `public/GeoGebra/` — GeoGebra HTML5 小程序静态文件

### 核心流程（对话 → 绘图）
1. `app/chat/page.tsx` 使用 Vercel AI SDK 的 `useChat()`，配合 `onToolCall` 回调
2. 用户消息 → POST 至 `/api/agent` → 服务端调用 `streamText()` 并附带工具定义
3. 服务端以流式返回工具调用（不在服务端执行）
4. 客户端 `onToolCall` 分发至 `useGeoGebra` hook，调用 `window.ggbApplet` 方法
5. GeoGebra 小程序在浏览器中渲染结果

### 代理工具（服务端定义，客户端执行）
定义于 `server/core/agent/tools.ts`：`searchGeoGebraCommands`、`executeGeoGebraCommand`、`deleteGeoGebraObject`、`resetGeoGebra`、`setUndoPoint`、`undo`、`setPerspective`、`getSelectedObjects`、`getCanvasContext`

### LLM 提供商
`server/core/agent/models.ts` 工厂函数支持 OpenAI、DeepSeek、Google（通过 `@ai-sdk/*` 包）。模型列表在 `server/core/config/providers.ts`。API 密钥存储在客户端（通过 Zustand 持久化至 localStorage），每次请求时发送。

### 状态管理
Zustand store 位于 `client/lib/store.ts`，使用 `persist` 中间件（localStorage）。管理对话、用户配置、API 密钥。

### GeoGebra 命令搜索
`server/core/geogebra/searchGeoGebraCommands.ts` 基于预构建索引（`commandsIndexTree.json`）进行模糊匹配。索引由 `scripts/build-index-tree.ts` 生成。

### UI 组件
shadcn/ui 位于 `client/components/ui/`。工具调用 UI 渲染器位于 `client/components/tools-ui/` —— 每个工具有独立组件，由 `client/components/tools-ui/index.ts` 统一分发。

## 关键约定

- **运行时**：Bun（所有脚本使用 `bun run --bun`）
- **语言**：UI 文本和提示词为中文（zh-CN）。国际化通过 `client/lib/i18n/` 及语言环境 JSON 文件实现。
- **路径别名**：`@/*` 映射至项目根目录
- **两个提示词文件**：`server/core/agent/prompts.ts` 为当前使用的系统提示词；`core/agent/prompts.ts` 为旧版备选
- **Tailwind CSS v4** 通过 `@tailwindcss/postcss` 插件使用
- **部署**：Vercel + Bun 运行时（`output: 'standalone'`）
- **URL 重写**：`/chat/GeoGebra/*` 和 `/agent/GeoGebra/*` 代理至 `/GeoGebra/*`，用于静态小程序文件

## 文档规范

本项目使用标准文档目录结构（`docs/`），遵循全局工作流规范（见 `~/.claude/CLAUDE.md`）。

- 产品文档：`docs/product/`（context/deliverable/raw/tools）
- 开发文档：`docs/development/`（todo/doing/done）
- Debug 文档：`docs/debug/`（todo/doing/done）
- 命名规则：`YYYY-MM-DD-<topic>.md`
