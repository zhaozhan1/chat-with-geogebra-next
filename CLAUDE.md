# CLAUDE.md

Chat with GeoGebra —— Next.js 16 + Vercel AI SDK v5 Web 应用。用户用中文描述数学图形，AI 生成 GeoGebra 命令在浏览器端执行。支持图片上传、批量命令、Windows 桌面打包（Electron）。

## 常用命令

```bash
bun run dev            # 开发服务器（Turbopack）
bun run build          # 生产构建
bun run lint           # ESLint
bun run electron:dev   # Electron 桌面开发
bun run electron:build # Windows 便携版打包 → release/
bun run search:test    # GeoGebra 命令搜索测试
```

无正式测试框架，测试为独立脚本（console.log 断言）。

## 目录结构

- `app/` — Next.js App Router：页面和 API 路由
- `client/` — `"use client"` 代码：组件、hooks、工具库、i18n
- `server/` — 服务端代码：代理模型、提示词、工具定义、命令搜索
- `core/` — 共享/备选提示词
- `types/` — TypeScript 类型
- `electron/` — Electron 主进程（CJS）和打包配置
- `evaluation/` — 评测数据集
- `scripts/` — 索引构建、测试脚本
- `public/GeoGebra/` — GeoGebra HTML5 小程序

## 核心流程

用户消息 → POST `/api/agent` → `streamText()` 流式返回工具调用 → 客户端 `onToolCall` → `window.ggbApplet` 执行

## 关键约定

- **运行时**: Bun（`bun run --bun`）
- **语言**: UI 和提示词为 zh-CN
- **路径别名**: `@/*` → 项目根
- **Tailwind CSS v4** via `@tailwindcss/postcss`
- **部署**: Vercel standalone / Electron 桌面

## 项目特定注意事项

### AI SDK v5 兼容性（高优先级）
- 默认走 Responses API，第三方服务需 `.chat()` 强制 Chat Completions
- `streamText({ system })` 生成 `developer` 角色，第三方服务不支持

### 代理工具（9 个）
`server/core/agent/tools.ts` 定义，`client/hooks/use-geogebra.ts` 执行。`parseGeoGebraCommands` 支持全角转半角。

### 状态管理
Zustand `client/lib/store.ts`，persist 至 localStorage。

### 图片上传
`client/lib/file-validation.ts` 校验（MIME 白名单、5MB 限制）。已知：localStorage 存 base64 可能超限。

### GeoGebra 命令搜索
`server/core/geogebra/searchGeoGebraCommands.ts` 基于预构建索引，`scripts/build-index-tree.ts` 生成。

## 参考文档

修改核心模块前先查阅 `docs/technical-report.md`。

## 流程检查点

1. **分支检查** — 编码前确认分支名和 master 状态
2. **文档路径** — 放置在 `docs/` 目录规范内
3. **文档流转** — 严格执行 `todo/ → doing/ → done/` 移动
