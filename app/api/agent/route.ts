import { streamText, convertToModelMessages, type UIMessage, stepCountIs } from "ai"
import { logger } from "@/server/lib/logger"
import { agent_system_prompt as AGENT_SYSTEM_PROMPT } from "@/server/core/agent/prompts"
import { tools } from "@/server/core/agent/tools"
import { getModel } from "@/server/core/agent/models";

import { NextRequest, NextResponse } from "next/server";

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

interface AuthorizedChatRequestData {
    conversationId: string;
    messages: UIMessage[];
}

const avaliableModelProviders = ["deepseek", "openai", "gemini", "custom"];

const ALLOWED_FILE_MEDIA_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "application/pdf",
]);
const MAX_BASE64_SIZE = 7 * 1024 * 1024; // 5MB 文件 → ~6.7MB base64，留余量

// 处理匿名用户的对话
async function anonymousChat(req: NextRequest) {
    logger.api("匿名用户请求agent对话");
    // 先提取参数
    const { conversationId, messages, modelParams }: AnonymousChatRequestData = await req.json();
    const { modelProvider, modelType, modelApiKey, modelPrompt, modelCustomBaseUrl } = modelParams;

    // 参数校验
    if (!conversationId || conversationId.trim() === "") {
        return NextResponse.json(
            { success: false, error: "Missing conversation ID" },
            { status: 400 }
        );
    }

    if (!modelProvider || !avaliableModelProviders.includes(modelProvider)) {
        return NextResponse.json(
            { success: false, error: "Invalid model provider" },
            { status: 400 }
        );
    }

    if (!modelType) {
        return NextResponse.json(
            { success: false, error: "Invalid model type" },
            { status: 400 }
        );
    }

    if (modelProvider !== "custom" && (!modelApiKey || modelApiKey.trim() === "")) {
        return NextResponse.json(
            { success: false, error: "Missing model API key" },
            { status: 400 }
        );
    }

    if (modelProvider === "custom" && (!modelCustomBaseUrl || modelCustomBaseUrl.trim() === "")) {
        return NextResponse.json(
            { success: false, error: "缺少自定义模型 URL" },
            { status: 400 }
        );
    }

    if (!modelPrompt || modelPrompt.trim() === "") {
        modelParams.modelPrompt = AGENT_SYSTEM_PROMPT;
    }

    const the_model = getModel(modelProvider, modelType, modelApiKey.trim(), modelCustomBaseUrl);
    const model = modelProvider === "custom"
        ? the_model.chat(modelType)
        : the_model(modelType);

    // 自部署提供商不支持 developer 角色，将 system prompt 作为 user 消息插入
    const isCustomProvider = modelProvider === "custom";
    const convertedMessages = convertToModelMessages(messages).map((m: any) => {
        if (m.role === "developer") return { ...m, role: "user" };
        if (m.role === "user" && Array.isArray(m.content)) {
            return {
                ...m,
                content: m.content.map((part: any) => {
                    if (part.type === "file") {
                        // 校验 mediaType
                        if (!ALLOWED_FILE_MEDIA_TYPES.has(part.mediaType)) {
                            throw new Error("不支持的文件类型");
                        }
                        // 剥离 data URL 前缀并校验大小
                        if (typeof part.data === "string" && part.data.startsWith("data:")) {
                            const commaIndex = part.data.indexOf(",");
                            if (commaIndex !== -1) {
                                const rawBase64 = part.data.substring(commaIndex + 1);
                                if (rawBase64.length > MAX_BASE64_SIZE) {
                                    throw new Error("文件大小超出限制");
                                }
                                return { ...part, data: rawBase64 };
                            }
                        }
                    }
                    return part;
                }),
            };
        }
        return m;
    });

    try {
        const result = streamText({
            model,
            ...(isCustomProvider
                ? {
                    messages: [
                        { role: "user" as const, content: modelParams.modelPrompt },
                        ...convertedMessages,
                    ],
                }
                : {
                    system: modelParams.modelPrompt,
                    messages: convertedMessages,
                }
            ),
            temperature: 0.6,
            stopWhen: stepCountIs(20),
            toolChoice: "auto",
            tools: tools
        });
        return result.toUIMessageStreamResponse();
    } catch (error) {
        logger.error("创建匿名用户流式响应错误:", error)
        return NextResponse.json(
            { success: false, error: "Failed to create response stream" },
            { status: 500 }
        );
    }

}

// Agent 系统提示词
export async function POST(req: NextRequest) {
    const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
    if (contentLength > 10 * 1024 * 1024) {
        return NextResponse.json(
            { success: false, error: "请求体过大" },
            { status: 413 }
        );
    }
    return await anonymousChat(req);
}