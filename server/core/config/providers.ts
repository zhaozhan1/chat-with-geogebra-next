export const MODEL_OPTIONS = [
  // OpenAI
  // OpenAIChatModelId = 'o1' | 'o1-2024-12-17' | 'o3-mini' | 'o3-mini-2025-01-31' | 'o3' | 'o3-2025-04-16' | 'gpt-4.1' | 'gpt-4.1-2025-04-14' | 'gpt-4.1-mini' | 'gpt-4.1-mini-2025-04-14' | 'gpt-4.1-nano' | 'gpt-4.1-nano-2025-04-14' | 'gpt-4o' | 'gpt-4o-2024-05-13' | 'gpt-4o-2024-08-06' | 'gpt-4o-2024-11-20' | 'gpt-4o-mini' | 'gpt-4o-mini-2024-07-18' | 'gpt-4-turbo' | 'gpt-4-turbo-2024-04-09' | 'gpt-4' | 'gpt-4-0613' | 'gpt-4.5-preview' | 'gpt-4.5-preview-2025-02-27' | 'gpt-3.5-turbo-0125' | 'gpt-3.5-turbo' | 'gpt-3.5-turbo-1106' | 'chatgpt-4o-latest' | 'gpt-5' | 'gpt-5-2025-08-07' | 'gpt-5-mini' | 'gpt-5-mini-2025-08-07' | 'gpt-5-nano' | 'gpt-5-nano-2025-08-07' | 'gpt-5-chat-latest' | 'gpt-5.1' | 'gpt-5.1-chat-latest' | 'gpt-5.2' | 'gpt-5.2-chat-latest' | 'gpt-5.2-pro' | (string & {});
  {value: "o1", label: "O1", provider: "openai", supportsImage: false },
  {value: "o3-mini", label: "O3 Mini", provider: "openai", supportsImage: false },
  { value: "o3", label: "O3", provider: "openai", supportsImage: true },
  { value: "gpt-5.2-pro", label: "GPT-5.2 Pro", provider: "openai", supportsImage: true },
  { value: "gpt-5.2", label: "GPT-5.2", provider: "openai", supportsImage: true },
  { value: "gpt-5.1", label: "GPT-5.1", provider: "openai", supportsImage: true },
  { value: "gpt-5", label: "GPT-5", provider: "openai", supportsImage: true },
  { value: "gpt-5-mini", label: "GPT-5 Mini", provider: "openai", supportsImage: true },
  { value: "gpt-5-nano", label: "GPT-5 Nano", provider: "openai", supportsImage: true },
  { value: "gpt-5-chat-latest", label: "GPT-5 Chat Latest", provider: "openai", supportsImage: true },
  { value: "gpt-4.1", label: "GPT-4.1", provider: "openai", supportsImage: true },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini", provider: "openai", supportsImage: true },
  { value: "gpt-4.1-nano", label: "GPT-4.1 Nano", provider: "openai", supportsImage: true },
  { value: "gpt-4o", label: "GPT-4o", provider: "openai", supportsImage: true },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", provider: "openai", supportsImage: true },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo", provider: "openai", supportsImage: true },
  { value: "gpt-4", label: "GPT-4", provider: "openai", supportsImage: true },
  { value: "gpt-4.5-preview", label: "GPT-4.5 Preview", provider: "openai", supportsImage: true },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", provider: "openai", supportsImage: false },
  { value: "chatgpt-4o-latest", label: "ChatGPT-4o Latest", provider: "openai", supportsImage: true },

  // Anthropic
  // type AnthropicMessagesModelId = 'claude-3-5-haiku-20241022' | 'claude-3-5-haiku-latest' | 'claude-3-7-sonnet-20250219' | 'claude-3-7-sonnet-latest' | 'claude-3-haiku-20240307' | 'claude-haiku-4-5-20251001' | 'claude-haiku-4-5' | 'claude-opus-4-0' | 'claude-opus-4-1-20250805' | 'claude-opus-4-1' | 'claude-opus-4-20250514' | 'claude-opus-4-5' | 'claude-opus-4-5-20251101' | 'claude-sonnet-4-0' | 'claude-sonnet-4-20250514' | 'claude-sonnet-4-5-20250929' | 'claude-sonnet-4-5' | (string & {});
  // { value: "claude-haiku-4-5", label: "Claude Haiku 4.5", provider: "anthropic" },
  // { value: "claude-opus-4-5", label: "Claude Opus 4.5", provider: "anthropic" },
  // { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", provider: "anthropic" },
  // { value: "claude-opus-4-1", label: "Claude Opus 4.1", provider: "anthropic" },
  // { value: "claude-3-7-sonnet-latest", label: "Claude 3.7 Sonnet Latest", provider: "anthropic" },
  // { value: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku Latest", provider: "anthropic" },

  // DeepSeek
  // type DeepSeekChatModelId = 'deepseek-chat' | 'deepseek-reasoner' | (string & {});
  { value: "deepseek-chat", label: "DeepSeek Chat", provider: "deepseek", supportsImage: false },
  { value: "deepseek-reasoner", label: "DeepSeek Reasoner", provider: "deepseek", supportsImage: false },

  // Google
  // type GoogleGenerativeAIModelId = 'gemini-1.5-flash' | 'gemini-1.5-flash-latest' | 'gemini-1.5-flash-001' | 'gemini-1.5-flash-002' | 'gemini-1.5-flash-8b' | 'gemini-1.5-flash-8b-latest' | 'gemini-1.5-flash-8b-001' | 'gemini-1.5-pro' | 'gemini-1.5-pro-latest' | 'gemini-1.5-pro-001' | 'gemini-1.5-pro-002' | 'gemini-2.0-flash' | 'gemini-2.0-flash-001' | 'gemini-2.0-flash-live-001' | 'gemini-2.0-flash-lite' | 'gemini-2.0-pro-exp-02-05' | 'gemini-2.0-flash-thinking-exp-01-21' | 'gemini-2.0-flash-exp' | 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'gemini-2.5-flash-image-preview' | 'gemini-2.5-flash-lite' | 'gemini-2.5-flash-lite-preview-09-2025' | 'gemini-2.5-flash-preview-04-17' | 'gemini-2.5-flash-preview-09-2025' | 'gemini-3-pro-preview' | 'gemini-3-pro-image-preview' | 'gemini-3-flash-preview' | 'gemini-pro-latest' | 'gemini-flash-latest' | 'gemini-flash-lite-latest' | 'gemini-2.5-pro-exp-03-25' | 'gemini-exp-1206' | 'gemma-3-12b-it' | 'gemma-3-27b-it' | (string & {});
  { value: "gemini-3-pro-preview", label: "Gemini 3 Pro Preview", provider: "google", supportsImage: true },
  { value: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview", provider: "google", supportsImage: true },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "google", supportsImage: true },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "google", supportsImage: true },
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", provider: "google", supportsImage: true },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "google", supportsImage: true },
  { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite", provider: "google", supportsImage: true },
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash", provider: "google", supportsImage: true },
  { value: "gemini-1.5-flash-8b", label: "Gemini 1.5 Flash 8B", provider: "google", supportsImage: true },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro", provider: "google", supportsImage: true },
];

export function isModelSupportsImage(modelValue: string): boolean {
  const model = MODEL_OPTIONS.find((m) => m.value === modelValue);
  return model?.supportsImage ?? false;
}
