import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getRandomId } from "@/client/lib/utils";
import { AppConfigSettings, AppConversation, AppState, AppUser, LogInResponseData } from "@/types";
import { CONST } from "./const";

const DEFAULT_USER: AppUser = {
  username: "anonymous",
  email: "anonymous@chat-with-geogebra.com",
  token: "anonymous",
  rememberMe: false,
  expiresAt: 0,
};

const DEFAULT_CONVERSATION: AppConversation = {
  conversations: {},
  conversationsOrder: [],
  currentConversationId: "",
};

const DEFAULT_CONFIG: AppConfigSettings = {
  panel: {
    size: {
      width: 300,
      height: 500,
    },
    position: {
      x: 50,
      y: 50,
    },
    minimized: false,
  },
  model: {
    provider: "deepseek",
    modelType: "deepseek-chat",
    customModelName: "",
    customBaseUrl: "",
  },
  apiKeys: {
    openai: "",
    deepseek: "",
    gemini: "",
    custom: "",
  },
  prompt: "",
  language: "zh-CN",
};

// 创建store - 使用普通方式而不是immer中间件
export const useAppStore = create<AppState>()(
  persist<AppState>(
    (set, get) => ({
      user: DEFAULT_USER,
      conversation: DEFAULT_CONVERSATION,
      config: DEFAULT_CONFIG,

      updateConfig(newConfig) {
        set({ config: newConfig });
      },

      updateApiKeys(provider: string, apiKey: string) {
        set((state) => ({
          config: {
            ...state.config,
            apiKeys: {
              ...state.config.apiKeys,
              [provider]: apiKey,
            },
          },
        }));
      },

      updateSystemPrompt(prompt: string) {
        set((state) => ({
          config: {
            ...state.config,
            prompt: prompt,
          },
        }));
      },

      setCurrentConversation(id) {
        set((state) => ({
          conversation: {
            ...state.conversation,
            currentConversationId: id,
          },
        }));
      },

      createConversation() {
        const newId = `conv-${Date.now()}-${getRandomId()}`;
        set((state: AppState) => {
          let user = state.user;

          const newConversation = {
            id: newId,
            title: "New Conversation",
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            user: {
              id: user.token ? user.username : "guest",
              username: user.username,
              email: user.email,
            }
          };
          const newConversationsOrder = [
            newId,
            ...state.conversation.conversationsOrder,
          ];
          const newConversations = {
            ...state.conversation.conversations,
            [newId]: newConversation,
          };
          return {
            conversation: {
              currentConversationId: newId,
              conversationsOrder: newConversationsOrder,
              conversations: newConversations,
            },
          };
        });
        return newId;
      },

      deleteConversation(id) {},

      updateConversationTitle(id, title) {
        const conversation = get().conversation.conversations[id];
        if (!conversation) return;
        set((state) => ({
          conversation: {
            ...state.conversation,
            conversations: {
              ...state.conversation.conversations,
              [id]: {
                ...conversation,
                title: title,
              },
            },
          },
        }));
      },

      addMessage(conversationId, message) {
        const conversation = get().conversation.conversations[conversationId];
        if (!conversation) return;
        const newMessages = [...conversation.messages, message];
        set((state) => ({
          conversation: {
            ...state.conversation,
            conversations: {
              ...state.conversation.conversations,
              [conversationId]: {
                ...conversation,
                messages: newMessages,
              },
            },
          },
        }));
      },

      setMessages(conversationId, messages) {
        const conversation = get().conversation.conversations[conversationId];
        if (!conversation) return;
        set((state) => ({
          conversation: {
            ...state.conversation,
            conversations: {
              ...state.conversation.conversations,
              [conversationId]: {
                ...conversation,
                messages: messages,
              },
            },
          },
        }));
      },

      clearMessages(conversationId) {
        const conversation = get().conversation.conversations[conversationId];
        if (!conversation) return;
        set((state) => ({
          conversation: {
            ...state.conversation,
            conversations: {
              ...state.conversation.conversations,
              [conversationId]: {
                ...conversation,
                messages: [],
              },
            },
          },
        }));
      },

      deleteLastMessage(conversationId) {
        const conversation = get().conversation.conversations[conversationId];
        if (!conversation) return;
        const newMessages = conversation.messages.slice(0, -1);
        set((state) => ({
          conversation: {
            ...state.conversation,
            conversations: {
              ...state.conversation.conversations,
              [conversationId]: {
                ...conversation,
                messages: newMessages,
              },
            },
          },
        }));
      },

      deleteIfLastUserMessage(conversationId) {
        const conversation = get().conversation.conversations[conversationId];
        if (!conversation) return;
        const messages = conversation.messages;
        if (messages.length === 0) return;
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role !== "user") return;
        const newMessages = messages.slice(0, -1);
        set((state) => ({
          conversation: {
            ...state.conversation,
            conversations: {
              ...state.conversation.conversations,
              [conversationId]: {
                ...conversation,
                messages: newMessages,
              },
            },
          },
        }));
      },

      setPanelPosition(pos) {
        set((state) => ({
          config: {
            ...state.config,
            panel: {
              ...state.config.panel,
              position: pos,
            },
          },
        }));
      },

      setPanelSize(size) {
        set((state) => ({
          config: {
            ...state.config,
            panel: {
              ...state.config.panel,
              size,
            },
          },
        }));
      },

      setLanguage(language: "zh-CN" | "en") {
        set((state) => ({
          config: {
            ...state.config,
            language,
          },
        }));
      },

      setPanelMinimized(minimized) {
        set((state) => ({
          config: {
            ...state.config,
            panel: {
              ...state.config.panel,
              minimized,
            },
          },
        }));
      },

      isLoggedIn() {
        const user = get().user;
        return !!user.token && user.expiresAt > Date.now();
      },


      setUser(user) {
        set({ user });
      },

      logout() {
        set({ user: DEFAULT_USER });
      },

      handleLogIn: async (email: string, password: string, rememberMe: boolean): Promise<void> => {
        const response = await fetch(CONST.API_LOGIN_ROUTE, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
        });
        const data: LogInResponseData = await response.json();
        if (data.success) {
            const userData = data.data;
            set({ user: userData });
        } else {
            throw new Error(data.error || "Login failed");
        }
      },
    }),
    {
      name: "chat-with-geogebra-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
