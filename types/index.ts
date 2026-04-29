import { UIMessage } from "ai";

export interface LogInRequestData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface LogInResponseData {
  success: boolean;
  message?: string;
  error?: string;
  data: AppUser;
}

export type ApiKeys = {
  deepseek?: string;
  openai?: string;
  gemini?: string;
  custom?: string;
};

export type PanelConfig = {
  size: {
    width: number;
    height: number;
  };
  position: {
    x: number;
    y: number;
  };
  minimized: boolean;
};

export type ModelSettings = {
    provider: string;
    modelType: string;
    customModelName?: string;
    customBaseUrl?: string;
}

export type AppConfigSettings = {
    panel: PanelConfig;
    model: ModelSettings;
    apiKeys: ApiKeys;
    prompt: string;
    language: "zh-CN" | "en";
};

export type Conversation = {
    id: string;
    title: string;
    messages: UIMessage[];
    createdAt: number;
    updatedAt: number;
    user?: {
        id?: string;
        username?: string;
        email?: string;
    }
}

export type AppConversation = {
    conversations: Record<string, Conversation>;
    conversationsOrder: string[];
    currentConversationId: string;
};

export type AppUser = {
    username: string;
    email: string;
    token: string;
    rememberMe: boolean;
    expiresAt: number;
};

export interface AppState {
  user: AppUser;
  conversation: AppConversation;
  config: AppConfigSettings;

  updateConfig: (config: AppConfigSettings) => void;

  updateApiKeys: (provider: string, apiKey: string) => void;
  updateSystemPrompt: (prompt: string) => void;

  // 对话操作
  setCurrentConversation: (id: string) => void
  createConversation: () => string
  deleteConversation: (id: string) => void
  updateConversationTitle: (id: string, title: string) => void

  // 消息操作
  addMessage: (conversationId: string, message: UIMessage) => void
  setMessages: (conversationId: string, messages: UIMessage[]) => void
  clearMessages: (conversationId: string) => void
  deleteLastMessage: (conversationId: string) => void
  deleteIfLastUserMessage: (conversationId: string) => void

  // Floating panel state (size & position)
  setPanelPosition: (pos: { x: number; y: number }) => void
  setPanelSize: (size: { width: number; height: number }) => void
  setPanelMinimized: (minimized: boolean) => void

  // 登录状态
  isLoggedIn: () => boolean;
  setUser: (user: AppUser) => void;
  logout: () => void;
  handleLogIn: (email: string, password: string, rememberMe: boolean) => Promise<void>;
};
