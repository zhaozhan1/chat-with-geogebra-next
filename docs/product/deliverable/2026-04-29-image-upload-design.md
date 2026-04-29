# 图片上传功能设计文档

**日期**: 2026-04-29
**分支**: feature/image-upload
**状态**: 待审批

---

## 一、需求概述

在对话页面添加图片/PDF 上传功能，用户可将本地文件与文字一起发送给模型 API，AI 识别图片内容后在 GeoGebra 中绘图或辅助描述。

### 使用场景

1. **识别图中数学图形** — 用户拍照/截图数学题，AI 识别后在 GeoGebra 中重现
2. **参考图辅助绘图** — 用户提供参考图，AI 根据描述在 GeoGebra 中绘制类似图形

### 约束

- 每条消息仅支持 **单张** 图片或 PDF
- 文件大小上限 **5MB**
- 支持格式：**PNG、JPG/JPEG、GIF、WebP、PDF**
- 仅支持多模态模型时可用（OpenAI GPT-4o/4.1/5.x、Google Gemini 全系列）
- 不支持时：DeepSeek 全系列、GPT-3.5-turbo、o1/o3-mini

---

## 二、架构设计

### 数据流

```
用户选择/粘贴/拖拽图片
    ↓
前端：File → base64 Data URL → 组件 state
    ↓
构造 UIMessage.parts: [..., { type: 'file', mediaType, url: dataURL }]
    ↓
sendMessage() 发送到 /api/agent
    ↓
convertToModelMessages() 自动将 FileUIPart → ImagePart/FilePart
    ↓
streamText() 传给模型（无需改服务端代码）
```

### 改动范围

| 文件 | 改动 |
|------|------|
| `server/core/config/providers.ts` | 模型配置加 `supportsImage: boolean` |
| `client/components/chat-interface.tsx` | 上传按钮、图片预览、粘贴/拖拽逻辑、模型能力校验 |
| `app/chat/page.tsx` | 消息构造加入 FileUIPart，传递附件 state 和模型能力 |
| `client/components/chat-message-item.tsx` | 渲染 `type: 'file'` 的图片/PDF 消息 |

**无需改动的文件**：API 路由、模型调用、store、类型定义（SDK 已支持）。

---

## 三、组件设计

### 输入区域布局（方案 A）

```
┌─────────────────────────────────────┐
│  [📷 缩略图 + 文件名 + ✕]          │  ← 有附件时显示，可删除
├─────────────────────────────────────┤
│ 📎 │  输入您的消息...        │ ➤ │   │  ← 上传按钮 + 输入框 + 发送
└─────────────────────────────────────┘
```

- 有附件时：缩略图显示在输入行上方，输入框高度自适应增长
- 无附件时：仅显示输入行

### 交互方式

| 触发方式 | 行为 |
|----------|------|
| 点击 📎 按钮 | 打开文件选择器，accept=`image/*,application/pdf` |
| Ctrl+V 粘贴 | 从剪贴板读取图片，自动添加到预览 |
| 拖拽到输入区 | dragover 高亮边框，drop 后添加到预览 |
| 点击缩略图 ✕ | 清除已选附件 |
| 发送消息 | 图片随文字一起发送，发送成功后清除附件 state |

### 状态管理

组件内 `useState` 管理：

```ts
const [attachment, setAttachment] = useState<{
  file: File;
  preview: string; // base64 Data URL
} | null>(null);
```

单张限制：已有附件时再上传会替换旧附件。

---

## 四、模型能力校验

### 模型多模态支持映射

在 `providers.ts` 中为每个模型配置添加 `supportsImage` 字段：

- **支持**：OpenAI GPT-4o/4.1/5.x 系列、Google Gemini 全系列
- **不支持**：DeepSeek 全系列、GPT-3.5-turbo、o1/o3-mini

### UI 反馈

- 支持图片的模型 → 上传按钮正常可用
- 不支持图片的模型 → 上传按钮 disabled + tooltip 提示"当前模型不支持图片输入"

---

## 五、消息渲染

`chat-message-item.tsx` 新增 `file` 类型 part 的渲染：

| part.type | mediaType | 渲染方式 |
|-----------|-----------|----------|
| `file` | `image/*` | `<img>` 标签，max-width 280px，保持比例，圆角 |
| `file` | `application/pdf` | PDF 图标 + 文件名，不可预览 |

- 图片排在文字 part 之前显示
- 用户消息和助手消息均渲染图片
- 历史消息中的图片通过 store 持久化的 base64 dataURL 正常渲染

---

## 六、边界情况与错误处理

| 场景 | 处理方式 |
|------|----------|
| 模型不支持图片，用户粘贴了图片 | toast 提示"当前模型不支持图片输入，请切换模型" |
| 粘贴板内容不是图片 | 静默忽略，正常粘贴文字 |
| PDF + 不支持多模态的模型 | 同样拦截 |
| 消息发送失败 | 图片附件保留在输入区，不自动清除，用户可重试 |
| 页面重新加载后历史图片 | base64 dataURL 在 UIMessage.parts 中，store 持久化后可正常渲染 |

---

## 七、安全性要求

### 客户端校验

| 安全措施 | 说明 |
|----------|------|
| 文件类型白名单 | 仅接受 `image/png`、`image/jpeg`、`image/gif`、`image/webp`、`application/pdf`，基于 `file.type` 校验，拒绝未知 MIME 类型 |
| 文件大小限制 | 单文件 ≤ 5MB，超限直接拒绝 |
| 文件扩展名交叉验证 | 校验 `file.type` 与 `file.name` 扩展名一致，防止 MIME 类型伪造 |
| 文件选择器限制 | `<input accept="image/*,.pdf">` 从源头缩小可选范围 |

### 渲染安全

| 安全措施 | 说明 |
|----------|------|
| 图片通过 base64 dataURL 渲染至 `<img src>` 标签 | 不使用动态 HTML 注入，避免 XSS |
| 禁止 SVG | SVG 可内嵌脚本，从白名单中排除 `image/svg+xml` |
| PDF 仅显示文件名 | PDF 不在浏览器内直接渲染，仅展示图标 + 文件名，避免 PDF 内嵌脚本执行风险 |

### 数据传输

| 安全措施 | 说明 |
|----------|------|
| 无服务端文件存储 | 文件以 base64 编码随消息体传输，不在服务端落盘，无需清理 |
| 无公开 URL | base64 dataURL 不暴露任何外部可访问路径 |
| 传输加密 | 依赖现有 HTTPS 传输层加密 |

### 存储安全

| 安全措施 | 说明 |
|----------|------|
| localStorage 容量 | base64 图片会增大 store 体积，5MB 图片编码后约 6.7MB；通过单张限制 + 已有的 store 持久化机制控制 |

---

## 八、明确不做（YAGNI）

- 图片裁剪/编辑
- 图片压缩
- 多图上传
- 图片点击后的全屏查看器
