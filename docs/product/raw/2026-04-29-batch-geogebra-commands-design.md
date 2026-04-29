# 批量执行 GeoGebra 命令功能设计

**日期**：2026-04-29
**状态**：需求文档（待确认进入开发）

---

## 1. 功能概述

在聊天输入区域新增「命令」按钮，用户点击后弹出对话框，可粘贴/输入多条 GeoGebra 命令，跳过 LLM API 直接在画布上执行。

## 2. 用户交互流程

1. 用户点击发送按钮右侧的命令图标按钮（`Terminal` 图标）
2. 弹出 `CommandDialog` 对话框
3. 在多行文本区域粘贴/输入命令文本
4. 预览区域实时显示解析后的有效命令列表
5. 点击「执行」按钮
6. 逐条执行命令，结果追加到聊天记录中
7. 遇到失败立即停止，后续命令不再执行
8. 全部完成或失败后关闭对话框

## 3. 命令解析规则

### 输入格式

- 每行一条命令
- 空行跳过
- 支持多种注释格式：
  - 行注释：`//` 或 `#` 开头
  - 块注释：`/* ... */` 和 `''' ... '''`

### 处理顺序

1. 先移除块注释内容
2. 逐行判断：去除行首空白后，过滤行注释和空行
3. 其余每行 trim 后作为一条有效命令

### 输出

返回有效命令数组 `string[]`。

## 4. 架构设计

### 纯客户端实现，不经过服务端。

### 文件变更

| 文件 | 类型 | 职责 |
|------|------|------|
| `client/lib/parse-geogebra-commands.ts` | 新建 | 命令解析纯函数 |
| `client/components/command-dialog.tsx` | 新建 | 弹出对话框组件 |
| `client/components/chat-interface.tsx` | 修改 | 加命令按钮 + 执行逻辑 |

### 组件详细设计

#### 4.1 `parseGeoGebraCommands(text: string): string[]`

纯函数，输入原始文本，输出有效命令数组。

#### 4.2 `CommandDialog`

**Props**：
- `open: boolean` — 控制显隐
- `onOpenChange: (open: boolean) => void`
- `onExecute: (commands: string[]) => void` — 执行回调

**UI 结构**：
- 标题：直接命令输入
- 多行 `<Textarea>` 用于粘贴/输入命令文本
- 实时预览区域：显示解析后的有效命令列表（每条带序号）
- 底部按钮：取消 / 执行（显示有效命令数量）
- 执行期间禁用按钮，防止重复提交

#### 4.3 `ChatInterface` 改动

- 发送按钮右侧新增命令图标按钮（`Terminal` 图标，lucide-react）
- 点击后打开 `CommandDialog`
- 加载中时命令按钮也禁用

### 执行逻辑

1. 接收命令数组，构造用户消息追加到聊天记录
2. 逐条调用 `useGeoGebra` 的 `executeCommand(cmd)`
3. 每条命令结果通过 `addToolOutput` 添加到对话（复用 `tool-executeGeoGebraCommand` UI 渲染）
4. 遇到失败立即停止
5. 全部完成后关闭对话框

### 错误处理

- 某条命令执行失败 → 立即停止，画布保留已执行结果
- 聊天记录中展示失败命令及错误信息
