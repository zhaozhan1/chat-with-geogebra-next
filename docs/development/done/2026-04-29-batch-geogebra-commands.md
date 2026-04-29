# 批量执行 GeoGebra 命令 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在聊天输入区域新增命令按钮，用户可通过对话框批量输入 GeoGebra 命令，跳过 LLM 直接执行。

**Architecture:** 纯客户端实现。新增命令解析纯函数、弹出对话框组件，修改 ChatInterface 集成命令按钮和执行逻辑。复用现有 `useGeoGebra` 的 `executeCommand` 和 `ToolUIExecuteGeoGebraCommand` 渲染。

**Tech Stack:** React, shadcn/ui (Dialog, Textarea, Button), lucide-react, Zustand

---

### Task 1: 命令解析函数

**Files:**
- Create: `client/lib/parse-geogebra-commands.ts`

- [ ] **Step 1: 创建解析函数文件**

```typescript
// client/lib/parse-geogebra-commands.ts

/**
 * 解析 GeoGebra 批量命令文本，返回有效命令数组。
 * 支持的注释格式：// 行注释、# 行注释、/* ... *\/ 块注释、''' ... ''' 块注释
 */
export function parseGeoGebraCommands(text: string): string[] {
  // 1. 移除块注释 /* ... */
  let result = text.replace(/\/\*[\s\S]*?\*\//g, "");

  // 2. 移除块注释 ''' ... '''
  result = result.replace(/'''[\s\S]*?'''/g, "");

  // 3. 按行处理，过滤行注释和空行
  return result
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("//") && !line.startsWith("#"));
}
```

- [ ] **Step 2: 手动验证解析函数**

使用 `bun run --bun` 执行以下测试脚本验证：

```bash
bun run --bun -e '
const { parseGeoGebraCommands } = require("./client/lib/parse-geogebra-commands");

// 测试：行注释和空行
const result1 = parseGeoGebraCommands("// 注释\nk = Slider(-10, 10, 0.1)\n\nSetValue(k, 2)");
console.assert(result1.length === 2, "应返回2条命令");
console.assert(result1[0] === "k = Slider(-10, 10, 0.1)", "第一条命令");
console.assert(result1[1] === "SetValue(k, 2)", "第二条命令");

// 测试：# 注释
const result2 = parseGeoGebraCommands("# comment\ncmd");
console.assert(result2.length === 1, "#注释应过滤");

// 测试：块注释 /* */
const result3 = parseGeoGebraCommands("/* block\ncomment */\ncmd");
console.assert(result3.length === 1, "块注释应过滤");

// 测试：三引号块注释
const result4 = parseGeoGebraCommands(""""block\ncomment"""\ncmd");
console.assert(result4.length === 1, "三引号块注释应过滤");

// 测试：混合
const result5 = parseGeoGebraCommands("// line1\ncmd1\n# line2\ncmd2\n  \ncmd3");
console.assert(result5.length === 3, "混合应返回3条");

console.log("All tests passed");
'
```

Expected: `All tests passed`

- [ ] **Step 3: 提交**

```bash
git add client/lib/parse-geogebra-commands.ts
git commit -m "feat: 添加 GeoGebra 批量命令解析函数"
```

---

### Task 2: CommandDialog 组件

**Files:**
- Create: `client/components/command-dialog.tsx`

- [ ] **Step 1: 创建 CommandDialog 组件**

```typescript
"use client"

import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/client/components/ui/dialog"
import { Textarea } from "@/client/components/ui/textarea"
import { Button } from "@/client/components/ui/button"
import { parseGeoGebraCommands } from "@/client/lib/parse-geogebra-commands"

interface CommandDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExecute: (commands: string[]) => Promise<void>
}

export function CommandDialog({
  open,
  onOpenChange,
  onExecute,
}: CommandDialogProps) {
  const [text, setText] = useState("")
  const [isExecuting, setIsExecuting] = useState(false)

  const commands = useMemo(() => parseGeoGebraCommands(text), [text])

  const handleExecute = async () => {
    if (commands.length === 0 || isExecuting) return
    setIsExecuting(true)
    try {
      await onExecute(commands)
      setText("")
      onOpenChange(false)
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>直接命令输入</DialogTitle>
        </DialogHeader>

        <Textarea
          placeholder={"粘贴或输入 GeoGebra 命令...\n支持 // 和 # 行注释，/* */ 和 ''' 块注释"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 min-h-[200px] font-mono text-sm"
          disabled={isExecuting}
        />

        {commands.length > 0 && (
          <div className="border rounded-md p-3 max-h-[200px] overflow-y-auto">
            <p className="text-xs text-muted-foreground mb-2">
              解析结果：{commands.length} 条有效命令
            </p>
            <ol className="space-y-1">
              {commands.map((cmd, i) => (
                <li key={i} className="text-sm font-mono">
                  <span className="text-muted-foreground mr-2">{i + 1}.</span>
                  {cmd}
                </li>
              ))}
            </ol>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExecuting}
          >
            取消
          </Button>
          <Button
            onClick={handleExecute}
            disabled={commands.length === 0 || isExecuting}
          >
            {isExecuting
              ? "执行中..."
              : `执行 (${commands.length} 条)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: 验证构建**

```bash
bun run build 2>&1 | head -20
```

Expected: 构建通过，无类型错误

- [ ] **Step 3: 提交**

```bash
git add client/components/command-dialog.tsx
git commit -m "feat: 添加 CommandDialog 批量命令输入对话框组件"
```

---

### Task 3: 集成到 ChatInterface

**Files:**
- Modify: `client/components/chat-interface.tsx` (发送按钮区域，第 124-143 行)
- Modify: `app/chat/page.tsx` (添加执行回调，传递给 ChatInterface)

- [ ] **Step 1: 修改 ChatInterface 添加命令按钮和对话框**

在 `client/components/chat-interface.tsx` 中：

1. 添加导入：

```typescript
import { Send, AlertCircle, StopCircleIcon, Terminal } from "lucide-react"
import { CommandDialog } from "@/client/components/command-dialog"
```

2. 扩展 `ChatInterfaceProps` 接口：

```typescript
interface ChatInterfaceProps {
  messages: any
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  handleStop: () => void
  isThinking: boolean
  isLoading: boolean
  onOpenConfig?: () => void
  error?: string | null
  onExecuteCommands?: (commands: string[]) => Promise<void>  // 新增
}
```

3. 解构新增 prop：

```typescript
export function ChatInterface({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  handleStop,
  isThinking,
  isLoading,
  error,
  onExecuteCommands,  // 新增
}: ChatInterfaceProps) {
```

4. 添加对话框状态（在 `expandedMessages` 后）：

```typescript
const [commandDialogOpen, setCommandDialogOpen] = useState(false);
```

5. 替换 `CardFooter` 区域（第 124-143 行），在发送按钮右侧加命令按钮：

```tsx
<CardFooter className="border-t p-4 shrink-0 sticky bottom-0 bg-background z-10">
  <form onSubmit={handleSubmit} className="flex w-full gap-2">
    <Input
      placeholder="输入您的消息..."
      value={input}
      onChange={handleInputChange}
      className="flex-1"
      disabled={isLoading}
    />
    {isLoading ? (
      <Button onClick={handleStop}>
        <StopCircleIcon className="h-4 w-4" />
      </Button>
    ) : (
      <>
        <Button type="submit" disabled={!input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setCommandDialogOpen(true)}
          disabled={isLoading}
          title="批量命令"
        >
          <Terminal className="h-4 w-4" />
        </Button>
      </>
    )}
  </form>

  {onExecuteCommands && (
    <CommandDialog
      open={commandDialogOpen}
      onOpenChange={setCommandDialogOpen}
      onExecute={onExecuteCommands}
    />
  )}
</CardFooter>
```

- [ ] **Step 2: 修改 page.tsx 添加执行回调并传递给 FloatingChatPanel → ChatInterface**

在 `app/chat/page.tsx` 中：

1. 在 `handleRefreshCanvas` 后添加 `handleExecuteCommands` 回调：

```typescript
const handleExecuteCommands = useCallback(
  async (commands: string[]) => {
    // 构造用户消息显示原始输入
    const userMessage = {
      id: `${getRandomId()}`,
      role: "user" as "user",
      parts: [{ type: "text" as const, text: `[批量命令] ${commands.length} 条命令` }],
    }
    useAppStore.getState().addMessage(activeConversationId, userMessage);
    setChatMessages(useAppStore.getState().conversation.conversations[activeConversationId]?.messages || []);

    // 逐条执行，失败即停止
    for (const cmd of commands) {
      const result = await executeCommand(cmd);
      // 将结果作为工具调用追加到消息
      const toolMessage = {
        id: `${getRandomId()}`,
        role: "assistant" as "assistant",
        parts: [
          {
            type: "tool-executeGeoGebraCommand" as const,
            state: result.success ? "output-available" : "output-error",
            input: { command: cmd },
            output: result.success
              ? { success: true, label: result.label, error: null }
              : { success: false, label: result.label, error: result.error },
            toolCallId: `${getRandomId()}`,
          },
        ],
      }
      useAppStore.getState().addMessage(activeConversationId, toolMessage);
      setChatMessages(useAppStore.getState().conversation.conversations[activeConversationId]?.messages || []);

      if (!result.success) break
    }
  },
  [activeConversationId, executeCommand, setChatMessages]
)
```

2. 传递给 `FloatingChatPanel`：

在 `<FloatingChatPanel>` 调用处添加 prop `onExecuteCommands={handleExecuteCommands}`。

- [ ] **Step 3: 修改 FloatingChatPanel 透传 prop**

在 `client/components/floating-chat-panel.tsx` 中：

1. 在 props 接口中添加 `onExecuteCommands`
2. 传递给内部 `ChatInterface` 组件

- [ ] **Step 4: 验证构建**

```bash
bun run build 2>&1 | head -20
```

Expected: 构建通过

- [ ] **Step 5: 提交**

```bash
git add client/components/chat-interface.tsx app/chat/page.tsx client/components/floating-chat-panel.tsx
git commit -m "feat: 集成批量命令按钮到聊天界面"
```

---

### Task 4: 端到端验证

- [ ] **Step 1: 启动开发服务器**

```bash
bun run dev
```

- [ ] **Step 2: 手动测试以下场景**

1. 点击命令按钮（Terminal 图标），对话框应弹出
2. 粘贴 `docs/product/context/example-command-input.txt` 的内容
3. 确认预览区正确过滤注释和空行，仅显示有效命令
4. 点击「执行」，确认：
   - 对话框关闭
   - 聊天记录中出现用户消息「[批量命令] N 条命令」
   - 每条命令的执行结果（成功/失败）依次显示
   - GeoGebra 画布上正确渲染图形
5. 测试错误场景：输入一条无效命令（如 `InvalidCommand123`），确认执行停止并显示错误
6. 测试发送按钮仍正常工作
