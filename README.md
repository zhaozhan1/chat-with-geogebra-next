# 🎨 Chat with GeoGebra

> **Fork 自**: [tiwe0/chat-with-geogebra-next](https://github.com/tiwe0/chat-with-geogebra-next)

使用自然语言交流，辅助绘制 GeoGebra 图像的轻量工具。

## 🛠️ 项目简介

**Chat with GeoGebra** 是一个基于 **Next.js** 构建的项目，  
通过与大语言模型（LLM）交流，让用户用自然语言描述需求，自动生成 GeoGebra 命令并实时绘图。

## 🧙‍♂️ 背景故事（中二版）

在那个充满阳光与幻梦的青春时代，作者暗恋着一位温柔而又神秘的女教师。  
她手执粉笔，绘制着世界的边界，却苦于无法驯服名为 GeoGebra 的神之工具。

面对女神的无助眼神，作者点燃了心中的烈火：  
> “即使踏碎万难，我也要为她创造一把能用语言驾驭图形的魔杖！”

数月闭关修炼，挑战 LLM，驾驭 API，召唤 Claude、ChatGPT 与 DeepSeek，  
终于，**Chat with GeoGebra** 横空出世！

然而，当迷雾散尽，少年终于明白：女神不过是凡人，她的光芒只存在于幻想之中。  
带着微笑与遗憾，作者收剑入鞘，将这份力量留给了所有需要它的人。🌌

(省流版：被拒绝了)

## TODO List

- [ ] 基于 geogebra command lint 的语法检测
- [ ] 自我修正的 mcp
- [x] ~~上传应用题照片自动绘图~~（已实现图片/PDF 上传）
- [x] ~~客户端~~（已实现 Windows Electron 桌面版）

## ✨ 功能特色

- 🧠 自然语言生成 GeoGebra 命令，实时绘图反馈
- 🖼️ 支持图片/PDF 上传（拖拽、粘贴、点击上传）
- 📋 批量执行 GeoGebra 命令（支持全角自动转换）
- 🖥️ Windows 桌面客户端（Electron 便携版）
- 🔗 支持多个大模型（Claude、ChatGPT、DeepSeek、Gemini、自行部署）
- 🌐 在线访问，无需安装
- 🏠 支持本地部署
- 🔑 支持自定义 API Key

## 🌍 在线体验

稳定访问：[👉 点击这里访问网站](https://chat-with-geogebra.com)

## 🖼️ 预览截图

![预览图](./public/preview.png)  

## 🚀 快速开始

### 前置要求

- [Bun](https://bun.sh/)

### 安装与运行

```bash
# 安装依赖
bun install

# 运行开发环境
bun run dev
```

访问 `http://localhost:3000/chat` 开始使用。

⚡ **注意**：
- 基本聊天功能需要自行准备 Claude、OpenAI、DeepSeek 或 Gemini 等服务的 API Key

### Windows 桌面版

```bash
bun run electron:build
```

产物位于 `release/` 目录。

## 🧩 技术栈

- **框架**: Next.js 16 (App Router + Turbopack)
- **AI**: Vercel AI SDK v5（支持 OpenAI / Anthropic / DeepSeek / Google）
- **绘图**: GeoGebra HTML5 小程序
- **UI**: shadcn/ui + Tailwind CSS v4
- **状态管理**: Zustand
- **桌面**: Electron
- **运行时**: Bun

## 📜 开源协议

本项目基于 MIT License 开源，允许自由商用。
代码版权归作者 Ivory (也就是本仓库的拥有者，虽然他的 github 账号名为 tiwe0) 所有。

## 📬 联系方式

作者：Ivory
邮箱：contact@ivory.cafe
请注明来意，因为作者的邮箱里垃圾订阅邮件很多，虽然这些邮件也不能让作者感到被关心，也不能给作者带来心灵上的温暖。
