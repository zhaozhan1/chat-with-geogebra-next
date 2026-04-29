"use client"

import type React from "react"
import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardFooter } from "@/client/components/ui/card"
import { Input } from "@/client/components/ui/input"
import { Button } from "@/client/components/ui/button"
import { Send, AlertCircle, StopCircleIcon, Terminal, Paperclip, X } from "lucide-react"
import { Alert, AlertDescription } from "@/client/components/ui/alert"
import { useGeoGebraCommands } from "@/client/hooks/use-geogebra-commands"
import { ChatMessageItem } from "@/client/components/chat-message-item"
import { CommandDialog } from "@/client/components/command-dialog"
import { validateFile, fileToDataUrl } from "@/client/lib/file-validation"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/client/components/ui/tooltip"

interface ChatInterfaceProps {
  messages: any
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  handleStop: () => void
  isThinking: boolean
  isLoading: boolean
  onOpenConfig?: () => void
  onExecuteCommands?: (commands: string[]) => Promise<void>
  attachment: { file: File; preview: string } | null;
  onAttachmentChange: (attachment: { file: File; preview: string } | null) => void;
  supportsImage: boolean;
  error?: string | null
}

export function ChatInterface({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  handleStop,
  isThinking,
  isLoading,
  onExecuteCommands,
  attachment,
  onAttachmentChange,
  supportsImage,
  error,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});
  const [commandDialogOpen, setCommandDialogOpen] = useState(false);
  const { extractAllMessagesCommands } = useGeoGebraCommands();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  // 当消息更新时滚动到底部
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // 为每个消息提取GeoGebra命令
  const messageCommandsMap = useMemo(() => {
    return extractAllMessagesCommands(messages)
  }, [messages, extractAllMessagesCommands])

  // 切换消息命令的展开/折叠状态
  const toggleMessageExpanded = useCallback((messageId: string) => {
    setExpandedMessages((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }))
  }, [])

  const handleFileSelect = useCallback(async (file: File) => {
    if (!supportsImage) {
      setToastMessage("当前模型不支持图片输入，请切换模型");
      return;
    }
    const error = validateFile(file);
    if (error) {
      setToastMessage(error.message);
      return;
    }
    try {
      const preview = await fileToDataUrl(file);
      onAttachmentChange({ file, preview });
    } catch {
      setToastMessage("文件读取失败");
    }
  }, [supportsImage, onAttachmentChange]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [handleFileSelect]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleFileSelect(file);
        return;
      }
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (supportsImage) setIsDragOver(true);
  }, [supportsImage]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX <= rect.left || e.clientX >= rect.right || e.clientY <= rect.top || e.clientY >= rect.bottom) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const removeAttachment = useCallback(() => {
    onAttachmentChange(null);
  }, [onAttachmentChange]);

  return (
    <TooltipProvider>
    <Card className="flex-1 flex flex-col h-full overflow-hidden border-0 rounded-none grow">
      <CardContent className="flex-1 p-0 relative overflow-hidden grow">
        <div className="chat-messages-container absolute top-0 left-0 right-0 bottom-16 p-4 overflow-y-auto h-full">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center p-8">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">开启一次对话</h3>
                <p className="text-muted-foreground">
                  提出问题或开始新话题以开始聊天。
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-2 pb-1">
              {messages.map((message: any) => {
              const messageId = message.id || `msg-${Math.random()}`;
              const commands = messageCommandsMap[messageId] || [];

              return (
                <ChatMessageItem
                key={messageId}
                message={message}
                commands={commands}
                isExpanded={expandedMessages[messageId] || false}
                onToggleExpand={toggleMessageExpanded}
                />
              );
              })}

              {/* 正在思考中的提示 */}
              {isThinking && (
              <div className="flex items-start gap-2 mb-2 shrink-0 w-fit">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm">🤖</span>
                </div>
                <div className="flex-1 bg-muted rounded-lg p-3 w-fit max-w-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="flex gap-1">
                  <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
                  <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
                  <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
                  </div>
                  <span className="text-sm">正在思考中...</span>
                </div>
                </div>
              </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="border-t p-4 shrink-0 sticky bottom-0 bg-background z-10">
        <div
          className={`flex w-full flex-col gap-2 rounded-lg border-2 transition-colors p-2 ${isDragOver ? "border-primary bg-primary/5" : "border-transparent"}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {toastMessage && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{toastMessage}</span>
              <button type="button" className="ml-auto shrink-0" onClick={() => setToastMessage(null)}>
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          {attachment && (
            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
              {attachment.file.type.startsWith("image/") ? (
                <img src={attachment.preview} alt="预览" className="h-10 w-10 rounded object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded bg-muted-foreground/10 text-xs text-muted-foreground">PDF</div>
              )}
              <span className="text-sm text-muted-foreground truncate max-w-[200px]">{attachment.file.name}</span>
              <button type="button" className="ml-auto shrink-0 text-muted-foreground hover:text-foreground" onClick={removeAttachment}>
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex w-full gap-2">
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileInputChange} />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="shrink-0" disabled={isLoading || !supportsImage} onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{supportsImage ? "上传图片或 PDF" : "当前模型不支持图片输入"}</TooltipContent>
            </Tooltip>
            <Input placeholder="输入您的消息..." value={input} onChange={handleInputChange} className="flex-1" disabled={isLoading} onPaste={handlePaste} />
            {isLoading ? (
              <Button onClick={handleStop}><StopCircleIcon className="h-4 w-4" /></Button>
            ) : (
              <>
                <Button type="submit" disabled={!input.trim() && !attachment}><Send className="h-4 w-4" /></Button>
                {onExecuteCommands && (
                  <Button type="button" variant="outline" size="icon" onClick={() => setCommandDialogOpen(true)} disabled={isLoading} title="批量命令">
                    <Terminal className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </form>
        </div>
        {onExecuteCommands && (
          <CommandDialog
            open={commandDialogOpen}
            onOpenChange={setCommandDialogOpen}
            onExecute={onExecuteCommands}
          />
        )}
      </CardFooter>
    </Card>
    </TooltipProvider>
  );
}

