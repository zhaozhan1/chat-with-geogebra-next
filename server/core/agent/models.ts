import { logger } from "@/server/lib/logger";

import { createOpenAI } from "@ai-sdk/openai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { MODEL_OPTIONS } from "@/server/core/config/providers";

function getModel(modelProvider: string, modelType: string, apiKey: string, customBaseUrl?: string) {
  const provider = modelProvider;

  // 自部署提供商：跳过 MODEL_OPTIONS 查找，直接创建实例
  if (provider.toLowerCase() === "custom") {
    logger.api("初始化模型", { provider, model: modelType });
    return createOpenAI({
      apiKey: apiKey || "",
      baseURL: customBaseUrl,
    });
  }

  // 根据 modelType 查找模型配置
  const modelOption = MODEL_OPTIONS.find((m) => m.value === modelType);
  if (!modelOption) {
    throw new Error("不支持的模型: " + modelType);
  }
  logger.api("初始化模型", { provider, model: modelType });

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
}

export { getModel };
