# 图片上传功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在对话页面添加图片/PDF 上传功能，支持点击、粘贴、拖拽三种方式，仅多模态模型可用。

**Architecture:** 文件在前端转换为 base64 Data URL，作为 `FileUIPart` 加入 `UIMessage.parts` 发送。Vercel AI SDK 自动处理后续转换，服务端无需改动。模型能力通过 `providers.ts` 配置的 `supportsImage` 字段判断。

**Tech Stack:** Next.js 16, Vercel AI SDK v5 (@ai-sdk/react), React hooks, shadcn/ui, lucide-react icons, Bun

**设计文档:** `docs/product/deliverable/2026-04-29-image-upload-design.md`

---

## File Structure

| 文件 | 操作 | 职责 |
|------|------|------|
| `server/core/config/providers.ts` | 修改 | 为模型配置添加 `supportsImage` 字段 |
| `client/lib/file-validation.ts` | 新建 | 文件类型、大小、扩展名校验工具 |
| `client/components/chat-interface.tsx` | 修改 | 上传按钮、预览、粘贴/拖拽、模型能力 UI |
| `client/components/chat-message-item.tsx` | 修改 | 渲染图片/PDF 类型的消息 |
| `app/chat/page.tsx` | 修改 | 附件 state、消息构造、传递 props |

---

### Task 1: 模型能力配置

**Files:**
- Modify: `server/core/config/providers.ts`

- [ ] **Step 1: 为每个模型添加 supportsImage 字段**

打开 `server/core/config/providers.ts`，将 `MODEL_OPTIONS` 中每项从 `{ value, label, provider }` 扩展为 `{ value, label, provider, supportsImage }`。

按以下规则设置 `supportsImage`：
- **`true`**: OpenAI 的 gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-4, gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, gpt-5.x 全系列, gpt-4.5-preview, chatgpt-4o-latest；Google Gemini 全系列
- **`false`**: OpenAI 的 o1, o3-mini, o3, gpt-3.5-turbo；DeepSeek 全系列

在文件末尾、`];` 之前，添加一个导出的辅助函数：

```ts
export function isModelSupportsImage(modelValue: string): boolean {
  const model = MODEL_OPTIONS.find((m) => m.value === modelValue);
  return model?.supportsImage ?? false;
}
```

- [ ] **Step 2: 更新类型导出**

确保 `MODEL_OPTIONS` 数组的类型能被 TypeScript 推断（当前无显式类型注解，添加字段后 TS 会自动推断联合类型）。如果已有显式类型接口，则在该接口中添加 `supportsImage: boolean`。

- [ ] **Step 3: 提交**

```bash
git add server/core/config/providers.ts
git commit -m "feat: 为模型配置添加 supportsImage 字段"
```

---

### Task 2: 文件校验工具

**Files:**
- Create: `client/lib/file-validation.ts`

- [ ] **Step 1: 创建文件校验模块**

创建 `client/lib/file-validation.ts`：

```ts
const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
] as const;

const MIME_TO_EXTENSIONS: Record<string, string[]> = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface FileValidationError {
  message: string;
}

export function validateFile(file: File): FileValidationError | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return { message: "不支持的文件格式，仅支持 PNG、JPG、GIF、WebP、PDF" };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { message: "文件大小不能超过 5MB" };
  }

  const fileName = file.name.toLowerCase();
  const allowedExtensions = MIME_TO_EXTENSIONS[file.type];
  if (allowedExtensions && !allowedExtensions.some((ext) => fileName.endsWith(ext))) {
    return { message: "文件扩展名与实际类型不匹配" };
  }

  return null;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}
```

- [ ] **Step 2: 提交**

```bash
git add client/lib/file-validation.ts
git commit -m "feat: 添加文件校验工具模块"
```

---

### Task 3: 消息图片渲染

**Files:**
- Modify: `client/components/chat-message-item.tsx`

- [ ] **Step 1: 在 parts 渲染中添加 file 类型处理**

打开 `client/components/chat-message-item.tsx`，找到 `message.parts.map` 的渲染逻辑（约第 96-124 行）。当前只处理 `"text"` 和 `"tool-"` 前缀。

在 `if (part.type === "text")` 分支之前，添加图片/PDF 渲染：

```tsx
if (part.type === "file" && part.mediaType?.startsWith("image/")) {
  return (
    <div key={index} className="my-2">
      <img
        src={part.url}
        alt="用户上传的图片"
        className="max-w-[280px] rounded-lg border border-border"
        style={{ aspectRatio: "auto" }}
      />
    </div>
  );
}

if (part.type === "file" && part.mediaType === "application/pdf") {
  return (
    <div key={index} className="my-2 flex items-center gap-2 rounded-lg border border-border p-3 max-w-[280px]">
      <svg className="h-6 w-6 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <span className="text-sm text-muted-foreground truncate">{part.filename || "PDF 文件"}</span>
    </div>
  );
}
```

注意：图片 part 必须在文字 part 之前渲染（代码中放在 `text` 判断之前即可，因为 `map` 按顺序处理）。

- [ ] **Step 2: 验证渲染效果**

启动 dev server (`bun run dev`)，在浏览器中手动构造一条包含图片 part 的消息来验证渲染。可通过浏览器 DevTools 在 console 中执行以下代码模拟：

```js
// 此步骤仅用于手动验证，不需要持久化代码
```

或者跳过此步，等 Task 5 完成后一起验证。

- [ ] **Step 3: 提交**

```bash
git add client/components/chat-message-item.tsx
git commit -m "feat: 消息渲染支持图片和 PDF 文件"
```

---

### Task 4: 聊天输入区上传 UI

**Files:**
- Modify: `client/components/chat-interface.tsx`

这是改动最大的任务。将分步完成。

- [ ] **Step 1: 扩展 Props 接口**

在 `chat-interface.tsx` 的 `ChatInterfaceProps` 接口中添加新 props：

```ts
interface ChatInterfaceProps {
  messages: any;
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  handleStop: () => void;
  isThinking: boolean;
  isLoading: boolean;
  onOpenConfig?: () => void;
  onExecuteCommands?: (commands: string[]) => Promise<void>;
  error?: string | null;
  // 新增
  attachment: { file: File; preview: string } | null;
  onAttachmentChange: (attachment: { file: File; preview: string } | null) => void;
  supportsImage: boolean;
}
```

在组件解构参数中接收这些新 props：

```ts
export function ChatInterface({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  handleStop,
  isThinking,
  isLoading,
  onExecuteCommands,
  error,
  attachment,
  onAttachmentChange,
  supportsImage,
}: ChatInterfaceProps) {
```

- [ ] **Step 2: 添加 import 和本地状态**

在文件顶部 import 区域添加：

```ts
import { Send, AlertCircle, StopCircleIcon, Terminal, Paperclip, X } from "lucide-react"
import { validateFile, fileToDataUrl } from "@/client/lib/file-validation"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/client/components/ui/tooltip"
```

在组件内添加 ref 和 state：

```ts
const fileInputRef = useRef<HTMLInputElement>(null);
const [isDragOver, setIsDragOver] = useState(false);
const [toastMessage, setToastMessage] = useState<string | null>(null);
```

- [ ] **Step 3: 添加文件处理函数**

在组件内（`toggleMessageExpanded` 之后）添加：

```ts
const handleFileSelect = useCallback(async (file: File) => {
  if (!supportsImage) {
    setToastMessage("当前模型不支持图片输入，请切换模型");
    return;
  }

  const error = validateFile(file);
  if (error) {
    setToastMessage(error.message);
    return;
  }

  const preview = await fileToDataUrl(file);
  onAttachmentChange({ file, preview });
}, [supportsImage, onAttachmentChange]);

const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    handleFileSelect(file);
  }
  if (fileInputRef.current) {
    fileInputRef.current.value = "";
  }
}, [handleFileSelect]);

const handlePaste = useCallback((e: React.ClipboardEvent) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith("image/")) {
      e.preventDefault();
      const file = item.getAsFile();
      if (file) {
        handleFileSelect(file);
      }
      return;
    }
  }
}, [handleFileSelect]);

const handleDragOver = useCallback((e: React.DragEvent) => {
  e.preventDefault();
  if (supportsImage) {
    setIsDragOver(true);
  }
}, [supportsImage]);

const handleDragLeave = useCallback((e: React.DragEvent) => {
  e.preventDefault();
  setIsDragOver(false);
}, []);

const handleDrop = useCallback((e: React.DragEvent) => {
  e.preventDefault();
  setIsDragOver(false);

  const file = e.dataTransfer?.files?.[0];
  if (file) {
    handleFileSelect(file);
  }
}, [handleFileSelect]);

const removeAttachment = useCallback(() => {
  onAttachmentChange(null);
}, [onAttachmentChange]);
```

- [ ] **Step 4: 替换底部输入区域 JSX**

将 `<CardFooter>` 部分替换为以下内容（保留 `CommandDialog` 不变）：

```tsx
<CardFooter className="border-t p-4 shrink-0 sticky bottom-0 bg-background z-10">
  <div
    className={`flex w-full flex-col gap-2 rounded-lg border-2 transition-colors p-2 ${isDragOver ? "border-primary bg-primary/5" : "border-transparent"}`}
    onDragOver={handleDragOver}
    onDragLeave={handleDragLeave}
    onDrop={handleDrop}
  >
    {toastMessage && (
      <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{toastMessage}</span>
        <button
          type="button"
          className="ml-auto shrink-0"
          onClick={() => setToastMessage(null)}
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    )}

    {attachment && (
      <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
        {attachment.file.type.startsWith("image/") ? (
          <img
            src={attachment.preview}
            alt="预览"
            className="h-10 w-10 rounded object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded bg-muted-foreground/10 text-xs text-muted-foreground">
            PDF
          </div>
        )}
        <span className="text-sm text-muted-foreground truncate max-w-[200px]">
          {attachment.file.name}
        </span>
        <button
          type="button"
          className="ml-auto shrink-0 text-muted-foreground hover:text-foreground"
          onClick={removeAttachment}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )}

    <form onSubmit={handleSubmit} className="flex w-full gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileInputChange}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            disabled={isLoading || !supportsImage}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {supportsImage ? "上传图片或 PDF" : "当前模型不支持图片输入"}
        </TooltipContent>
      </Tooltip>
      <Input
        placeholder="输入您的消息..."
        value={input}
        onChange={handleInputChange}
        className="flex-1"
        disabled={isLoading}
        onPaste={handlePaste}
      />
      {isLoading ? (
        <Button onClick={handleStop}>
          <StopCircleIcon className="h-4 w-4" />
        </Button>
      ) : (
        <>
          <Button type="submit" disabled={!input.trim() && !attachment}>
            <Send className="h-4 w-4" />
          </Button>
          {onExecuteCommands && (
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
          )}
        </>
      )}
    </form>
  </div>

  {onExecuteCommands && (
    <CommandDialog
      open={commandDialogOpen}
      onOpenChange={setCommandDialogOpen}
      onExecute={onExecuteCommands}
    />
  )}
</CardFooter>
```

注意发送按钮的 disabled 条件从 `!input.trim()` 改为 `!input.trim() && !attachment`，允许仅发图片不发文字。

- [ ] **Step 5: 添加 TooltipProvider 包裹**

在组件的 return 语句中，用 `<TooltipProvider>` 包裹整个 `<Card>`：

在文件顶部添加 import：

```ts
import { TooltipProvider } from "@/client/components/ui/tooltip"
```

将 return 中的 `<Card>` 包裹：

```tsx
return (
  <TooltipProvider>
    <Card className="flex-1 flex flex-col h-full overflow-hidden border-0 rounded-none grow">
      {/* ... 原有内容 ... */}
    </Card>
  </TooltipProvider>
);
```

- [ ] **Step 6: 验证 UI**

启动 dev server (`bun run dev`)。此时 page.tsx 还未传入新 props，会有 TypeScript 报错。暂时先用以下默认值在 page.tsx 中传入（下个 Task 会正式处理）：

```tsx
<ChatInterface
  // ... existing props
  attachment={null}
  onAttachmentChange={() => {}}
  supportsImage={true}
/>
```

验证：
- 上传按钮可见，hover 显示 tooltip
- 点击按钮弹出文件选择器
- 选择图片后显示缩略图预览
- 点击 X 可删除预览
- 在输入框中 Ctrl+V 粘贴图片可触发上传
- 拖拽文件到输入区高亮边框

- [ ] **Step 7: 提交**

```bash
git add client/components/chat-interface.tsx
git commit -m "feat: 聊天输入区添加图片上传按钮和预览"
```

---

### Task 5: 页面层集成

**Files:**
- Modify: `app/chat/page.tsx`

- [ ] **Step 1: 添加 attachment state 和 import**

在 `app/chat/page.tsx` 中添加 import：

```ts
import { isModelSupportsImage } from "@/server/core/config/providers";
```

在组件内（useChat 之后）添加 attachment state：

```ts
const [attachment, setAttachment] = useState<{
  file: File;
  preview: string;
} | null>(null);
```

添加模型能力判断（从 configSettings 中获取当前 modelType）：

```ts
const currentModelType = configSettings.model.modelType;
const supportsImage = isModelSupportsImage(currentModelType);
```

- [ ] **Step 2: 修改 handleChatSubmit**

找到 `handleChatSubmit` 函数（约第 220 行）。

将空输入检查从：
```ts
if (!input.trim() || isLoading) return
```
改为：
```ts
if ((!input.trim() && !attachment) || isLoading) return
```

将 userMessage 的 parts 构造从：
```ts
parts: [{ type: "text" as const, text: input }],
```
改为：
```ts
parts: [
  ...(input.trim() ? [{ type: "text" as const, text: input }] : []),
  ...(attachment
    ? [{ type: "file" as const, mediaType: attachment.file.type, url: attachment.preview, filename: attachment.file.name }]
    : []),
],
```

- [ ] **Step 3: 发送成功后清除附件**

在 `sendMessage` 调用之后添加：

```ts
setAttachment(null);
```

注意：仅在 `sendMessage` 成功调用后清除。如果 `sendMessage` 本身抛错则不清除（当前代码没有 try/catch 包裹 sendMessage，但 sendMessage 是异步的，消息发送失败的回调在 `onError` 中处理）。将清除逻辑放在 `sendMessage` 调用语句之后即可。

- [ ] **Step 4: 传递新 props 给 ChatInterface**

找到 `<ChatInterface>` 组件的渲染位置，添加新 props：

```tsx
<ChatInterface
  // ... existing props
  attachment={attachment}
  onAttachmentChange={setAttachment}
  supportsImage={supportsImage}
/>
```

移除 Task 4 Step 6 中添加的临时默认值。

- [ ] **Step 5: 端到端验证**

启动 dev server (`bun run dev`)，在浏览器中进行完整验证：

1. 选择一个支持图片的模型（如 GPT-4o）
2. 点击上传按钮，选择一张图片 → 预览显示正常
3. 输入文字 + 图片 → 发送 → 消息中图片和文字均正确渲染
4. 仅发送图片（无文字）→ 正常发送
5. Ctrl+V 粘贴截图 → 预览显示正常
6. 拖拽图片到输入区 → 高亮 + 预览显示正常
7. 选择不支持图片的模型（如 DeepSeek）→ 上传按钮 disabled + tooltip 显示提示
8. 在不支持图片的模型下粘贴图片 → 显示错误提示
9. 上传超过 5MB 的文件 → 显示错误提示
10. 上传不支持的文件格式 → 显示错误提示

- [ ] **Step 6: 提交**

```bash
git add app/chat/page.tsx
git commit -m "feat: 页面层集成图片上传功能"
```

---

### Task 6: 构建验证与清理

- [ ] **Step 1: 运行 lint 检查**

```bash
bun run lint
```

Expected: 无错误

- [ ] **Step 2: 运行生产构建**

```bash
bun run build
```

Expected: 构建成功，无 TypeScript 错误

- [ ] **Step 3: 修复构建中发现的问题**

如果 lint 或 build 报错，逐一修复后重新验证。

- [ ] **Step 4: 最终提交**

```bash
git add -A
git commit -m "chore: 图片上传功能构建验证通过"
```
