"use client"

import type React from "react"

import { useState, useEffect, useMemo, useCallback, useRef, use } from "react"
import { useChat } from "@ai-sdk/react"
import { useMediaQuery } from "@/client/hooks/use-media-query"
import { Toast } from "@/client/components/toast"
import { GeoGebraPanel } from "@/client/components/geogebra-panel"
import { useAppStore } from "@/client/lib/store"
import { useGeoGebra } from "@/client/hooks/use-geogebra"
import { useErrorHandler } from "@/client/hooks/use-error-handler"
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai"
import { FloatingChatPanel } from "@/client/components/floating-chat-panel"
import dynamic from "next/dynamic"
import { uploadOneMessageToCollection } from "@/client/lib/collection";
import { getRandomId } from "@/client/lib/utils"

const ConfigDialog = dynamic(() => import("@/client/components/config-dialog").then(mod => mod.ConfigDialog), {
  ssr: false
})

// 声明全局类型
declare global {
  interface Window {
    GGBApplet: any
    ggbApplet: any
    ggbAppletReady: boolean
  }
}

export default function ChatPage() {
  // Hooks
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const { error, clearError, setTemporaryError, handleError } = useErrorHandler()
  const { rebuild, getSelectedObjects, getPNGBase64, evalLaTeX, executeCommand, reset, getCanvasContext, setUndoPoint, undo, deleteGeoGebraObject, setPerspective } = useGeoGebra()

  // Store状态
  const config = useAppStore((state) => state.config)
  const conversations = useAppStore((state) => state.conversation.conversations)
  const activeConversationId = useAppStore((state) => state.conversation.currentConversationId)

  // Refs
  const initializedRef = useRef(false);
  const lastInput = useRef("");

  // UI状态
  const [input, setInput] = useState("");
  const [configOpen, setConfigOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  // 初始化store
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const state = useAppStore.getState()
    if (!state.conversation.conversationsOrder?.length) {
      state.createConversation()
    }
    const hasActive = state.conversation.conversationsOrder.some(id => id === state.conversation.currentConversationId)
    if (!hasActive && state.conversation.conversationsOrder.length > 0) {
      state.setCurrentConversation(state.conversation.conversationsOrder[0])
    }
  }, [])

  const chatConfig = useMemo(() => ({ configSettings: config }), [config])

  // 初始化聊天钩子
  const {
    messages,
    sendMessage,
    stop,
    status,
    error: chatError,
    setMessages: setChatMessages,
    addToolOutput,
  } = useChat({
    id: activeConversationId,
    experimental_throttle: 50,

    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,

    transport: new DefaultChatTransport({
      api: "/api/agent"
    }),
    async onToolCall({ toolCall }) {
      let result;
      try {
        const { toolName, input } = toolCall;
        switch (toolName) {
          case "getCanvasContext":
            result = {
              selectedObjects: getSelectedObjects(),
              ...getCanvasContext(),
            };
            break;
          case "executeGeoGebraCommand":
            result = await executeCommand((input as any).command);
            break;
          case "deleteGeoGebraObject":
            result = deleteGeoGebraObject((input as any).label);
            break;
          case "resetGeoGebra":
            reset();
            result = { success: true };
            break;
          case "setUndoPoint":
            setUndoPoint();
            result = { success: true };
            break;
          case "undo":
            undo();
            result = { success: true };
            break;
          case "setPerspective":
            result = { success: setPerspective((input as any).mode) };
            break;
          case "searchGeoGebraCommands":
            break;
          case "evalLaTeX":
            result = evalLaTeX((input as any).latex);
            break;
          case "getPNGBase64":
            let pngString = getPNGBase64(
              (input as any).exportScale,
              (input as any).transparent,
              (input as any).DPI
            );
            if (pngString === "") {
              throw new Error("无法获取PNG图片，可能GeoGebra未初始化完成");
            } else {
              result = pngString;
            }
            break;
          case "getSelectedObjects":
            result = {
              selectedObjects: getSelectedObjects(),
            };
            break;
          default:
            break;
        }
        addToolOutput({
          state: "output-available",
          toolCallId: toolCall.toolCallId,
          output: result,
          tool: toolName,
        });
      } catch (err) {
          ;
      }
    },
    onFinish: (message: any) => {
      setIsThinking(false);
      if (message.finishReason === "stop") {
        // 上传最后一条消息到集合
        uploadOneMessageToCollection(activeConversationId, message.message);
        useAppStore .getState() .addMessage(activeConversationId, message.message);
      }
    },
    onError: handleError,
  });

  useEffect(() => {
    setIsLoading(status === "submitted" || status === "streaming");
  }, [status]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }, [])

  // 同步消息到useChat
  useEffect(() => {
    const storeMessages = useAppStore.getState().conversation.conversations[activeConversationId]?.messages || [];
    setChatMessages(storeMessages);
    clearError()
  }, [activeConversationId, setChatMessages, clearError])

  const syncMessagesFromStore = useCallback(() => {
    const storeMessages = useAppStore.getState().conversation.conversations[activeConversationId]?.messages || [];
    setChatMessages(storeMessages);
  }, [activeConversationId, setChatMessages]);

  // 处理聊天错误
  useEffect(() => {
    if (chatError) handleError(chatError)
  }, [chatError, handleError])

  // 自动更新对话标题
  useEffect(() => {
    if (messages.length === 0 || messages[0].role !== "user") return
    
    const conversation = conversations[activeConversationId]
    if (!conversation || (!conversation.title.startsWith("新会话") && conversation.title !== "新对话")) return

    let content = ""
    if (messages[0].parts) {
      content = messages[0].parts.filter((p: any) => p.type === "text").map((p: any) => p.text).join("")
    } else if ((messages[0] as any).content) {
      content = (messages[0] as any).content
    }
    
    if (content) {
      const title = content.slice(0, 30) + (content.length > 30 ? "..." : "")
      useAppStore.getState().updateConversationTitle(activeConversationId, title)
    }
  }, [messages, activeConversationId, conversations])

  const handleChatStop = useCallback(async () => {
    setIsThinking(false);
    await stop();
    useAppStore.getState().deleteIfLastUserMessage(activeConversationId);
    syncMessagesFromStore();
    setInput(lastInput.current);
  }, [stop, syncMessagesFromStore])

  const handleChatSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const configSettings = chatConfig.configSettings

    clearError()

    // 保存用户消息到store
    const userMessage = {
      id: `${getRandomId()}`,  // 16位随机字母ID
      role: "user" as "user",
      parts: [{ type: "text" as const, text: input }],
    }
    useAppStore.getState().addMessage(activeConversationId, userMessage);

    const user = useAppStore.getState().user;

    setIsThinking(true);
    let requestOptions;
    if (user.username === "anonymous") {
      requestOptions = {
        body: {
          conversationId: activeConversationId,
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
        },
        headers: {
          authorization: `Bearer ${useAppStore.getState().user.token || ""}`,
        },
      };
    } else {
      requestOptions = {
        body: {
          conversationId: activeConversationId,
        },
        headers: {
          authorization: `Bearer ${useAppStore.getState().user.token || ""}`,
        }
      };
    }

    console.log("Sending message with options:", requestOptions);

    try {
      sendMessage(
        userMessage,
        requestOptions
      );
      lastInput.current = input
      setInput("")
    } catch (err) {
      handleError(err)
    }
  }, [input, isLoading, clearError, sendMessage, chatConfig, handleError])

  const handleCreateConversation = useCallback(() => {
    if (!isLoading) useAppStore.getState().createConversation()
  }, [isLoading])

  const handleSelectConversation = useCallback((conversationId: string) => {
    if (!isLoading) useAppStore.getState().setCurrentConversation(conversationId)
  }, [isLoading])

  const handleRefreshCanvas = useCallback(() => {
    rebuild();
  }, [rebuild]);

  const handleGoToHome = useCallback(() => {
    window.location.href = "/";
  }, []);

  return (
    <>
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Config Dialog */}
        <ConfigDialog
          open={configOpen}
          onOpenChange={setConfigOpen}
          onSave={() => setSaveSuccess(true)}
        />

        {/* 全屏 GeoGebra 面板 */}
        <div className="w-full h-full">
          <GeoGebraPanel />
        </div>

        {/* 悬浮的对话面板 */}
        <FloatingChatPanel
          messages={messages}
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleChatSubmit}
          handleStop={handleChatStop}
          isLoading={isLoading}
          isThinking={isThinking}
          onGotoHome={handleGoToHome}
          onOpenConfig={() => setConfigOpen(true)}
          onCreateConversation={handleCreateConversation}
          onSelectConversation={handleSelectConversation}
          onRefreshCanvas={handleRefreshCanvas}
          error={error}
        />

        {saveSuccess && (
          <Toast variant="success" position="top">
            设置已成功保存
          </Toast>
        )}
        {error && (
          <Toast
            variant="error"
            position="top"
            open={!!error}
            onClose={clearError}
          >
            {error}
          </Toast>
        )}
      </div>
    </>
  );
}
