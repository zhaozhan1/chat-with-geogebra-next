# 自行部署模型 API 支持 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 LLM 配置弹窗中增加"自行部署"供应商选项，允许用户通过 OpenAI 兼容格式连接自部署模型 API。

**Architecture:** 复用 `@ai-sdk/openai` 的 `baseURL` 参数。客户端在 Zustand store 中存储 `customBaseUrl` 和 `customModelName`，请求时透传到服务端 `getModel()`，由 `createOpenAI({ apiKey, baseURL })` 创建客户端实例。后续 streamText + 工具调用链路完全不变。

**Tech Stack:** TypeScript, Vercel AI SDK (`@ai-sdk/openai`), Zustand, shadcn/ui (Select/Input)

---

## 文件结构

| 操作 | 文件 | 职责 |
|---|---|---|
| 修改 | `types/index.ts` | 类型定义：`ApiKeys` 加 `custom?`，`ModelSettings` 加 `customModelName?` + `customBaseUrl?` |
| 修改 | `server/core/agent/models.ts` | 模型工厂：`getModel()` 新增 `"custom"` 分支 + `customBaseUrl` 参数 |
| 修改 | `app/api/agent/route.ts` | API 路由：provider 校验加 `"custom"`，请求体增加 `modelCustomBaseUrl` |
| 修改 | `client/components/config-dialog.tsx` | 配置弹窗：供应商加"自行部署"，模型字段条件渲染，新增 URL 输入框 |
| 修改 | `app/chat/page.tsx` | 聊天页：`modelParams` 透传 `modelCustomBaseUrl` 和 `customModelName` |

---

### Task 1: 更新类型定义

**Files:**
- Modify: `types/index.ts:16-37`

- [ ] **Step 1: 编辑 `types/index.ts` — ApiKeys 新增 custom 字段**

将第 16-20 行的 `ApiKeys` 类型：

```typescript
export type ApiKeys = {
  deepseek?: string;
  openai?: string;
  gemini?: string;
};
```

改为：

```typescript
export type ApiKeys = {
  deepseek?: string;
  openai?: string;
  gemini?: string;
  custom?: string;
};
```

- [ ] **Step 2: 编辑 `types/index.ts` — ModelSettings 新增字段**

将第 34-37 行的 `ModelSettings` 类型：

```typescript
export type ModelSettings = {
    provider: string;
    modelType: string;
}
```

改为：

```typescript
export type ModelSettings = {
    provider: string;
    modelType: string;
    customModelName?: string;
    customBaseUrl?: string;
}
```

- [ ] **Step 3: 验证 TypeScript 编译通过**

Run: `cd /Users/zhaozhan1/projects/claude/chat-with-geogebra-next && bun run build 2>&1 | head -20`
Expected: 无类型错误（可能有其他无关警告，但不应有 `types/index.ts` 相关错误）

- [ ] **Step 4: 提交**

```bash
git add types/index.ts
git commit -m "feat: add custom provider types for self-deployed model API"
```

---

### Task 2: 服务端模型工厂适配

**Files:**
- Modify: `server/core/agent/models.ts`

- [ ] **Step 1: 编辑 `server/core/agent/models.ts` — 函数签名新增参数**

将第 8 行的函数签名：

```typescript
function getModel(modelProvider: string, modelType: string, apiKey: string) {
```

改为：

```typescript
function getModel(modelProvider: string, modelType: string, apiKey: string, customBaseUrl?: string) {
```

- [ ] **Step 2: 编辑 `server/core/agent/models.ts` — switch 新增 custom 分支**

将第 17-26 行的 switch 语句：

```typescript
  switch (provider.toLowerCase()) {
    case "openai":
      return createOpenAI({ apiKey });
    case "deepseek":
      return createDeepSeek({ apiKey });
    case "google":
      return createGoogleGenerativeAI({ apiKey });
    default:
      throw new Error("不支持的模型提供商: " + provider);
  }
```

改为：

```typescript
  switch (provider.toLowerCase()) {
    case "openai":
      return createOpenAI({ apiKey });
    case "deepseek":
      return createDeepSeek({ apiKey });
    case "google":
      return createGoogleGenerativeAI({ apiKey });
    case "custom":
      return createOpenAI({
        apiKey: apiKey || "",
        baseURL: customBaseUrl,
      });
    default:
      throw new Error("不支持的模型提供商: " + provider);
  }
```

- [ ] **Step 3: 验证编译**

Run: `cd /Users/zhaozhan1/projects/claude/chat-with-geogebra-next && bun run build 2>&1 | head -20`
Expected: 编译通过

- [ ] **Step 4: 提交**

```bash
git add server/core/agent/models.ts
git commit -m "feat: add custom provider branch in getModel factory"
```

---

### Task 3: API 路由适配

**Files:**
- Modify: `app/api/agent/route.ts`

- [ ] **Step 1: 编辑 `app/api/agent/route.ts` — provider 校验列表加 "custom"**

将第 25 行：

```typescript
const avaliableModelProviders = ["deepseek", "openai", "gemini"];
```

改为：

```typescript
const avaliableModelProviders = ["deepseek", "openai", "gemini", "custom"];
```

- [ ] **Step 2: 编辑 `app/api/agent/route.ts` — 请求体类型扩展**

将第 9-18 行的 `AnonymousChatRequestData` 接口：

```typescript
interface AnonymousChatRequestData {
    conversationId: string;
    messages: UIMessage[];
    modelParams: {
        modelProvider: string;
        modelType: string;
        modelApiKey: string;
        modelPrompt: string;
    };
}
```

改为：

```typescript
interface AnonymousChatRequestData {
    conversationId: string;
    messages: UIMessage[];
    modelParams: {
        modelProvider: string;
        modelType: string;
        modelApiKey: string;
        modelPrompt: string;
        modelCustomBaseUrl?: string;
    };
}
```

- [ ] **Step 3: 编辑 `app/api/agent/route.ts` — 解构新字段并传递**

将第 31-32 行：

```typescript
    const { conversationId, messages, modelParams }: AnonymousChatRequestData = await req.json();
    const { modelProvider, modelType, modelApiKey, modelPrompt } = modelParams;
```

改为：

```typescript
    const { conversationId, messages, modelParams }: AnonymousChatRequestData = await req.json();
    const { modelProvider, modelType, modelApiKey, modelPrompt, modelCustomBaseUrl } = modelParams;
```

将第 67 行：

```typescript
    const the_model = getModel(modelProvider, modelType, modelApiKey.trim());
```

改为：

```typescript
    const the_model = getModel(modelProvider, modelType, modelApiKey.trim(), modelCustomBaseUrl);
```

- [ ] **Step 4: 验证编译**

Run: `cd /Users/zhaozhan1/projects/claude/chat-with-geogebra-next && bun run build 2>&1 | head -20`
Expected: 编译通过

- [ ] **Step 5: 提交**

```bash
git add app/api/agent/route.ts
git commit -m "feat: pass custom base URL through API route"
```

---

### Task 4: 配置弹窗 UI 改造

**Files:**
- Modify: `client/components/config-dialog.tsx`

- [ ] **Step 1: 编辑供应商下拉 — 追加 "自行部署" 选项**

将第 224-234 行的 `<SelectContent>` 内部：

```tsx
                      <SelectContent>
                        {/* 供应商去重 */}
                        {[...new Set(MODEL_OPTIONS.map((m) => m.provider))].map(
                          (provider) => (
                            <SelectItem key={provider} value={provider}>
                              {provider.charAt(0).toUpperCase() +
                                provider.slice(1)}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
```

改为：

```tsx
                      <SelectContent>
                        {/* 供应商去重 + 自行部署 */}
                        {[...new Set(MODEL_OPTIONS.map((m) => m.provider)), "custom"].map(
                          (provider) => (
                            <SelectItem key={provider} value={provider}>
                              {provider === "custom"
                                ? "自行部署"
                                : provider.charAt(0).toUpperCase() +
                                  provider.slice(1)}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
```

- [ ] **Step 2: 编辑供应商切换 onValueChange — 适配 custom 分支**

将第 198-219 行的 `onValueChange` 回调：

```tsx
                      onValueChange={(value) => {
                        setSelectedProvider(value);
                        // 切换供应商时，自动选择第一个模型，并同步modelProvider字段
                        const firstModel = MODEL_OPTIONS.find(
                          (model) => model.provider === value
                        );
                        if (firstModel) {
                          setLocalConfig({
                            ...localConfig,
                            model: {
                              ...localConfig.model,
                              modelType: firstModel.value,
                              provider: value,
                            },
                          });
                        } else {
                          setLocalConfig({
                            ...localConfig,
                            model: { ...localConfig.model, provider: value },
                          });
                        }
                      }}
```

改为：

```tsx
                      onValueChange={(value) => {
                        setSelectedProvider(value);
                        if (value === "custom") {
                          setLocalConfig({
                            ...localConfig,
                            model: { ...localConfig.model, provider: "custom" },
                          });
                        } else {
                          const firstModel = MODEL_OPTIONS.find(
                            (model) => model.provider === value
                          );
                          if (firstModel) {
                            setLocalConfig({
                              ...localConfig,
                              model: {
                                ...localConfig.model,
                                modelType: firstModel.value,
                                provider: value,
                              },
                            });
                          } else {
                            setLocalConfig({
                              ...localConfig,
                              model: { ...localConfig.model, provider: value },
                            });
                          }
                        }
                      }}
```

- [ ] **Step 3: 编辑模型字段 — 条件渲染为文本输入**

将第 239-265 行的模型选择区域：

```tsx
                <div className="grid grid-cols-4 items-center gap-4 mt-4">
                  <Label htmlFor="model" className="text-right">
                    模型
                  </Label>
                  <div className="col-span-3">
                    <Select
                      value={localConfig.model.modelType}
                      onValueChange={(value) =>
                        setLocalConfig({
                          ...localConfig,
                          model: { ...localConfig.model, modelType: value },
                        })
                      }
                    >
                      <SelectTrigger id="model">
                        <SelectValue placeholder="选择模型" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredModels.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
```

改为：

```tsx
                <div className="grid grid-cols-4 items-center gap-4 mt-4">
                  <Label htmlFor="model" className="text-right">
                    模型
                  </Label>
                  <div className="col-span-3">
                    {selectedProvider === "custom" ? (
                      <Input
                        id="model"
                        value={localConfig.model.customModelName || ""}
                        onChange={(e) =>
                          setLocalConfig({
                            ...localConfig,
                            model: {
                              ...localConfig.model,
                              customModelName: e.target.value,
                              modelType: e.target.value,
                              provider: "custom",
                            },
                          })
                        }
                        placeholder="输入模型名称，如 qwen2.5、llama3"
                      />
                    ) : (
                      <Select
                        value={localConfig.model.modelType}
                        onValueChange={(value) =>
                          setLocalConfig({
                            ...localConfig,
                            model: { ...localConfig.model, modelType: value },
                          })
                        }
                      >
                        <SelectTrigger id="model">
                          <SelectValue placeholder="选择模型" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredModels.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
```

- [ ] **Step 4: 在模型字段后方新增"模型 URL"字段**

在第 265 行（模型 `</div>` 结束标签之后）、API 密钥区域之前，插入：

```tsx
                {selectedProvider === "custom" && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="customUrl" className="text-right">
                      模型 URL
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="customUrl"
                        value={localConfig.model.customBaseUrl || ""}
                        onChange={(e) =>
                          setLocalConfig({
                            ...localConfig,
                            model: {
                              ...localConfig.model,
                              customBaseUrl: e.target.value,
                            },
                          })
                        }
                        placeholder="http://127.0.0.1:11434/v1"
                      />
                    </div>
                  </div>
                )}
```

- [ ] **Step 5: 编辑 handleSave — 适配 custom provider**

将第 115-119 行的 `handleSave` 中 provider 获取逻辑：

```typescript
    const selectedModel = MODEL_OPTIONS.find(
      (model) => model.value === localConfig.model.modelType
    );
    const provider = selectedModel?.provider || selectedProvider || "openai";
```

改为：

```typescript
    const provider = selectedProvider === "custom"
      ? "custom"
      : (() => {
          const selectedModel = MODEL_OPTIONS.find(
            (model) => model.value === localConfig.model.modelType
          );
          return selectedModel?.provider || selectedProvider || "openai";
        })();
```

- [ ] **Step 6: 验证编译 + UI 渲染**

Run: `cd /Users/zhaozhan1/projects/claude/chat-with-geogebra-next && bun run build 2>&1 | head -20`
Expected: 编译通过

- [ ] **Step 7: 提交**

```bash
git add client/components/config-dialog.tsx
git commit -m "feat: add custom provider UI in config dialog"
```

---

### Task 5: 客户端请求构建适配

**Files:**
- Modify: `app/chat/page.tsx`

- [ ] **Step 1: 编辑 `app/chat/page.tsx` — modelParams 构建**

将第 244-252 行的 `modelParams` 对象：

```typescript
          modelParams: {
            modelApiKey:
              configSettings.apiKeys[
                configSettings.model
                  .provider as keyof typeof configSettings.apiKeys
              ] || "",
            modelProvider: configSettings.model.provider,
            modelType: configSettings.model.modelType,
            modelPrompt: configSettings.prompt,
          },
```

改为：

```typescript
          modelParams: {
            modelApiKey:
              configSettings.apiKeys[
                configSettings.model
                  .provider as keyof typeof configSettings.apiKeys
              ] || "",
            modelProvider: configSettings.model.provider,
            modelType: configSettings.model.provider === "custom"
              ? configSettings.model.customModelName || ""
              : configSettings.model.modelType,
            modelPrompt: configSettings.prompt,
            modelCustomBaseUrl: configSettings.model.provider === "custom"
              ? configSettings.model.customBaseUrl || ""
              : undefined,
          },
```

- [ ] **Step 2: 验证编译**

Run: `cd /Users/zhaozhan1/projects/claude/chat-with-geogebra-next && bun run build 2>&1 | head -20`
Expected: 编译通过

- [ ] **Step 3: 提交**

```bash
git add app/chat/page.tsx
git commit -m "feat: pass custom model params in chat request"
```

---

### Task 6: 端到端验证

- [ ] **Step 1: 启动开发服务器**

Run: `cd /Users/zhaozhan1/projects/claude/chat-with-geogebra-next && bun run dev`
Expected: `Ready in XXXms`

- [ ] **Step 2: 浏览器验证配置弹窗**

打开 http://localhost:3000/chat，点击配置按钮，检查：

1. 供应商下拉包含"自行部署"选项
2. 选择"自行部署"后：模型下拉变为文本输入框，下方出现"模型 URL"输入框
3. API 密钥框仍然显示，placeholder 变为 "输入 custom API 密钥"
4. 系统提示词框不受影响
5. 输入模型名和 URL 后点击保存，刷新页面后配置仍然保留（localStorage 持久化）
6. 切换回其他供应商（如 OpenAI），模型下拉恢复正常

- [ ] **Step 3: 测试自部署模型请求（如有可用的自部署服务）**

在配置中填入可用的自部署 API 地址，发送绘图请求，验证：
- 请求成功发送到自定义 URL
- 工具调用链路正常（getCanvasContext → executeGeoGebraCommand 等）
- 图形正常绘制

- [ ] **Step 4: 最终提交（如有修复）**

```bash
git add -A
git commit -m "feat: complete self-deployed model API support"
```
