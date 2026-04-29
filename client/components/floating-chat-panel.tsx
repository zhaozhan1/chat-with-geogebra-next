"use client";

import type React from "react";
import { useState, useRef, useEffect, useCallback, use } from "react";
import { Button } from "@/client/components/ui/button";
import { Home, ChevronRight, Plus, Settings, RefreshCcw } from "lucide-react";
import { useAppStore } from "@/client/lib/store";
import { ChatInterface } from "@/client/components/chat-interface";
import { ChatHistoryDrawer } from "@/client/components/chat-history-drawer";
import { Rnd } from "react-rnd";


interface FloatingChatPanelProps {
  messages: any[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isThinking: boolean;
  isLoading: boolean;
  onGotoHome: () => void;
  onOpenConfig: () => void;
  onCreateConversation: () => void;
  onSelectConversation: (messageId: string) => void;
  onRefreshCanvas: () => void;
  onExecuteCommands?: (commands: string[]) => Promise<void>;
  handleStop: () => void;
  error: string | null;
}

export function FloatingChatPanel({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  isThinking,
  isLoading,
  onGotoHome,
  onOpenConfig,
  onRefreshCanvas,
  onExecuteCommands,
  onCreateConversation,
  onSelectConversation,
  handleStop,
  error,
}: FloatingChatPanelProps) {
  // Refs for resize only


  // 用 useRef 持久化变量，避免闭包问题
  const panelSizeRef = useRef<{ width: number; height: number }>({ width: 400, height: 600 });
  const minimizedSize = { width: 40, height: 40 };
  const oldPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  const [minimized, setMinimized] = useState(false);
  const [disableDragging, setDisableDragging] = useState<boolean>(true);
  const [size, setSize] = useState<{ width: number; height: number }>(panelSizeRef.current);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [panelVisible, setPanelVisible] = useState<boolean>(false);
  const [showDrawer, setShowDrawer] = useState(false);

  useEffect(() => {
    // 初始化位置和尺寸
    const savedPosition = useAppStore.getState().config.panel.position;
    const savedSize = useAppStore.getState().config.panel.size;
    if (savedPosition) {
      setPosition(savedPosition);
    }
    if (savedSize) {
      setSize(savedSize);
      panelSizeRef.current = savedSize;
    }
    setPanelVisible(true);
  }, []);

  const enableMinimize = useCallback(() => {
    setMinimized(true);
    // 保存当前尺寸
    panelSizeRef.current = size;
    setSize(minimizedSize);
  }, [size]);

  const disableMinimize = useCallback(() => {
    setMinimized(false);
    // 恢复之前尺寸
    setSize(panelSizeRef.current);
    // 计算位置，确保面板在屏幕内
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    let newX =
      position.x > screenWidth - panelSizeRef.current.width
        ? screenWidth - panelSizeRef.current.width - 10
        : position.x;
    let newY =
      position.y > screenHeight - panelSizeRef.current.height
        ? screenHeight - panelSizeRef.current.height - 10
        : position.y;
    setPosition({ x: newX, y: newY });
  }, [position]);

  // 拖拽和点击冲突修复：用 ref 追踪拖拽状态，onMouseUp 延迟判断
  const handleMouseUp = (action: () => void) => (e: React.MouseEvent) => {
    setTimeout(() => {
      if (isDraggingRef.current) {
        // 拖拽后不触发点击
        isDraggingRef.current = false;
      } else {
        action();
      }
    }, 0);
  };

  const handleSelectConversation = useCallback((messageId: string) => {
    // 处理历史消息选择逻辑
    onSelectConversation(messageId);
    setShowDrawer(false);
  }, [onSelectConversation]);

  // 动画样式
  const transitionStyle: React.CSSProperties = {
    transition: 'width 0.3s cubic-bezier(.4,2,.6,1), height 0.3s cubic-bezier(.4,2,.6,1)',
  };
  if (!panelVisible) {
    return null;
  }

  if (minimized) {
    return (
      <Rnd
        bounds={"window"}
        size={size}
        enableResizing={false}
        position={position}
        onDragStart={() => {
          oldPositionRef.current = position;
        }}
        onDragStop={(e, d) => {
          if (oldPositionRef.current.x === d.x && oldPositionRef.current.y === d.y) {
            isDraggingRef.current = false;
          } else {
            isDraggingRef.current = true;
            setPosition({ x: d.x, y: d.y });
          }
        }}
        style={transitionStyle}
      >
        <Button
          variant="default"
          size="icon"
          className="rounded-full h-10 w-10 m-2 shadow-lg bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-700 transition-colors"
          onMouseUp={handleMouseUp(disableMinimize)}
          title="点击展开"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </Button>
      </Rnd>
    );
  } else {
    return (
      <Rnd
        size={size}
        position={position}
        onResize={(e, direction, ref, delta, position) => {
          setSize({
            width: ref.offsetWidth,
            height: ref.offsetHeight,
            ...position,
          });
          useAppStore.getState().setPanelSize({
            width: ref.offsetWidth,
            height: ref.offsetHeight,
          });
        }}
        onDragStart={() => {
          oldPositionRef.current = position;
        }}
        onDragStop={(e, d) => {
          if (
            oldPositionRef.current.x === d.x &&
            oldPositionRef.current.y === d.y
          ) {
            isDraggingRef.current = false;
          } else {
            isDraggingRef.current = true;
            setPosition({ x: d.x, y: d.y });
            useAppStore.getState().setPanelPosition({ x: d.x, y: d.y });
          }
        }}
        minWidth={300}
        minHeight={500}
        disableDragging={disableDragging}
        bounds={"window"}
        style={transitionStyle}
      >
        <div className="flex flex-col h-full w-full border border-primary shadow-lg bg-background">
          <div
            className="flex items-center justify-between px-4 py-2 bg-muted border-b cursor-move select-none"
            onMouseEnter={() => setDisableDragging(false)}
            onMouseLeave={() => setDisableDragging(true)}
          >
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                title={showDrawer ? "关闭历史记录" : "打开历史记录"}
                onMouseUp={handleMouseUp(() => setShowDrawer(!showDrawer))}
              >
                {showDrawer ? (
                  <ChevronRight className="h-4 w-4 rotate-90" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              <h3 className="text-sm font-semibold">Hyperbola</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onMouseUp={handleMouseUp(onOpenConfig)}
                title="设置"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onMouseUp={handleMouseUp(onGotoHome)}
                title="回到首页"
              >
                <Home className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onMouseUp={handleMouseUp(onRefreshCanvas)}
                disabled={isLoading}
                title="刷新画版"
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onMouseUp={handleMouseUp(onCreateConversation)}
                disabled={isLoading}
                title="新建对话"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onMouseUp={handleMouseUp(enableMinimize)}
                title="最小化"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </Button>
            </div>
          </div>

          {/* Chat Content Area */}
          <div
            className={showDrawer ? "hidden" : "flex-1 overflow-hidden grow"}
          >
            <ChatInterface
              messages={messages}
              input={input}
              handleInputChange={handleInputChange}
              handleSubmit={handleSubmit}
              handleStop={handleStop}
              isLoading={isLoading}
              isThinking={isThinking}
              onOpenConfig={onOpenConfig}
              onExecuteCommands={onExecuteCommands}
              error={error}
            />
          </div>

          <div
            className={showDrawer ? "flex-1 overflow-hidden grow" : "hidden"}
          >
            <ChatHistoryDrawer onSelectConversation={handleSelectConversation} />
          </div>
        </div>
      </Rnd>
    );
  }
}
