# 自行部署模型 API 支持 — 设计文档

> 日期: 2026-04-28

## 目标

在 LLM 配置弹窗中增加"自行部署"供应商选项，允许用户连接自部署的 OpenAI 兼容 API（如 Ollama、vLLM、LocalAI 等）。使用 OpenAI SDK 格式发送请求，后续工具调用和绘图流程不变。

## 设计方案

复用 `@ai-sdk/openai` 的 `baseURL` 参数，在 `getModel()` 中新增 `"custom"` 分支。最小改动，不引入新依赖。

## 改动范围

| 文件 | 改动内容 |
|---|---|
| `types/index.ts` | `ApiKeys` 加 `custom?`，`ModelSettings` 加 `customModelName?` + `customBaseUrl?` |
| `client/components/config-dialog.tsx` | 供应商加"自行部署"，模型字段条件渲染为文本输入，新增 URL 输入框 |
| `server/core/agent/models.ts` | `getModel` 新增 `"custom"` 分支 + `customBaseUrl` 参数 |
| `app/api/agent/route.ts` | provider 校验加 `"custom"`，请求体增加 `modelCustomBaseUrl` 字段 |
| `app/chat/page.tsx` | `modelParams` 透传 `modelCustomBaseUrl`，`modelType` 取 `customModelName` |

不涉及：工具定义、提示词、GeoGebra 集成、搜索算法。

## 详细设计

### 1. 数据层

**`types/index.ts`**

```typescript
export type ApiKeys = {
  deepseek?: string;
  openai?: string;
  gemini?: string;
  custom?: string;              // 新增
};

export type ModelSettings = {
  provider: string;
  modelType: string;
  customModelName?: string;     // 新增：自部署时的模型名
  customBaseUrl?: string;       // 新增：自部署时的 base URL
};
```

Store 无需额外改动，`updateConfig` 已支持任意 `AppConfigSettings` 字段更新。Zustand persist 会自动持久化新增字段。

### 2. 配置弹窗 UI

**`client/components/config-dialog.tsx`**

#### 供应商下拉追加 "自行部署"

在现有 provider 去重列表后追加 `"custom"`：

```tsx
<SelectContent>
  {[...new Set(MODEL_OPTIONS.map((m) => m.provider)), "custom"].map(
    (provider) => (
      <SelectItem key={provider} value={provider}>
        {provider === "custom"
          ? "自行部署"
          : provider.charAt(0).toUpperCase() + provider.slice(1)}
      </SelectItem>
    )
  )}
</SelectContent>
```

#### 模型字段条件渲染

当 `selectedProvider === "custom"` 时，显示文本输入框替代下拉选择：

```tsx
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
  /* 现有 Select 下拉逻辑不变 */
)}
```

#### 新增"模型 URL"字段

仅 `"custom"` 时显示，位于模型字段下方：

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

#### handleSave 适配

```typescript
const handleSave = () => {
  const provider = selectedProvider === "custom"
    ? "custom"
    : selectedModel?.provider || selectedProvider || "openai";

  updateConfig({
    ...localConfig,
    model: { ...localConfig.model, provider },
  });
  // 其余逻辑不变
};
```

#### 切换供应商 onValueChange 适配

选择 `"custom"` 时无预置模型列表，不清空已有模型名：

```typescript
onValueChange={(value) => {
  setSelectedProvider(value);
  if (value === "custom") {
    setLocalConfig({
      ...localConfig,
      model: { ...localConfig.model, provider: "custom" },
    });
  } else {
    const firstModel = MODEL_OPTIONS.find((m) => m.provider === value);
    if (firstModel) {
      setLocalConfig({
        ...localConfig,
        model: {
          ...localConfig.model,
          modelType: firstModel.value,
          provider: value,
        },
      });
    }
  }
}}
```

#### API 密钥适配

`getCurrentProviderKey()` 在 `selectedProvider === "custom"` 时返回 `"custom"`，密钥输入框自动绑定到 `apiKeys.custom`。用户未输入时值为空字符串。

### 3. 服务端模型创建

**`server/core/agent/models.ts`**

函数签名新增 `customBaseUrl` 可选参数：

```typescript
function getModel(
  modelProvider: string,
  modelType: string,
  apiKey: string,
  customBaseUrl?: string
) {
  // ... 现有 modelOption 查找逻辑
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
}
```

关键点：
- 复用 `@ai-sdk/openai`，不引入新依赖
- `apiKey` 为空字符串时 SDK 不会添加 `Authorization` 头（适用于无需认证的自部署服务）
- `baseURL` 直接传给 OpenAI SDK，兼容所有 OpenAI 兼容 API

### 4. API 路由

**`app/api/agent/route.ts`**

#### 请求体类型扩展

```typescript
interface AnonymousChatRequestData {
  conversationId: string;
  messages: UIMessage[];
  modelParams: {
    modelProvider: string;
    modelType: string;
    modelApiKey: string;
    modelPrompt: string;
    modelCustomBaseUrl?: string;   // 新增
  };
}
```

#### Provider 校验放行

```typescript
const avaliableModelProviders = ["deepseek", "openai", "gemini", "custom"];
```

#### 透传 customBaseUrl

```typescript
const { modelProvider, modelType, modelApiKey, modelPrompt, modelCustomBaseUrl } = modelParams;
// ...
const the_model = getModel(modelProvider, modelType, modelApiKey.trim(), modelCustomBaseUrl);
```

### 5. 客户端请求构建

**`app/chat/page.tsx`**

`handleChatSubmit` 中构建 `modelParams` 时：

```typescript
modelParams: {
  modelApiKey: configSettings.apiKeys[
    configSettings.model.provider as keyof typeof configSettings.apiKeys
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

## 典型使用场景

用户配置：
1. 供应商选择"自行部署"
2. 模型名输入 `qwen2.5`
3. 模型 URL 输入 `http://127.0.0.1:11434/v1`（Ollama）
4. API 密钥留空（Ollama 无需认证）
5. 系统提示词留空（使用默认）

请求流：
```
用户输入 → POST /api/agent
  modelParams: {
    modelProvider: "custom",
    modelType: "qwen2.5",
    modelApiKey: "",
    modelCustomBaseUrl: "http://127.0.0.1:11434/v1"
  }
→ getModel("custom", "qwen2.5", "", "http://127.0.0.1:11434/v1")
→ createOpenAI({ apiKey: "", baseURL: "http://127.0.0.1:11434/v1" })
→ streamText({ model, tools, ... })
→ 后续流程与现有完全一致
```
