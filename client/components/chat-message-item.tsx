"use client";

import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import { memo, useState } from "react";
import { getToolUIComponent } from "./tools-ui";
import {
  ChevronRight,
  ChevronDown,
  ClipboardCopy,
  Play,
  User,
  Superscript,
} from "lucide-react";
import { Streamdown } from "streamdown";

interface ChatMessageItemProps {
  message: any;
  commands: string[];
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
}

export const ChatMessageItem = memo(function ChatMessageItem({
  message,
  commands,
  isExpanded,
  onToggleExpand,
}: ChatMessageItemProps) {
  const messageId = message.id;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(commands.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("复制命令失败", e);
    }
  };

  const handleRun = async () => {
    try {
      const ggbApplet = (window as any).ggbApplet;
      if (!ggbApplet) {
        console.error("GeoGebra Applet 未找到");
        return;
      }
      for (let command of commands) {
        ggbApplet.evalCommand(command);
        // 短暂延迟
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="mb-3">
      <div
        className={`flex ${
          message.role === "user" ? "justify-end" : "justify-start"
        }`}
      >
        <div
          className={`flex items-start gap-3 max-w-[90%] ${
            message.role === "user"
              ? "flex-row-reverse justify-end"
              : "flex-row justify-start"
          }`}
        >
          <div className="shrink-0 mt-1">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-white ${
                message.role === "user" ? "bg-primary" : "bg-gray-400"
              }`}
            >
              {message.role === "user" ? (
                <User className="h-4 w-4" />
              ) : (
                <Superscript className="h-4 w-4" />
              )}
            </div>
          </div>

          <div
            className={`rounded-lg px-3 py-1.5 w-full ${
              message.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            <div className="prose prose-sm max-w-none wrap-break-word">
              {message.parts.map((part: any, index: number) => {
                if (part.type === "file" && part.mediaType?.startsWith("image/")) {
                  return (
                    <div key={index} className="my-2">
                      <img
                        src={part.url}
                        alt="用户上传的图片"
                        className="max-w-[280px] rounded-lg border border-border"
                      />
                    </div>
                  );
                }
                if (part.type === "file" && part.mediaType === "application/pdf") {
                  return (
                    <div key={index} className="my-2 flex items-center gap-2 rounded-lg border border-border p-3 max-w-[280px]">
                      <svg className="h-6 w-6 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className="text-sm text-muted-foreground truncate">{part.filename || "PDF 文件"}</span>
                    </div>
                  );
                }
                if (part.type === "text") {
                  return (
                    <Streamdown
                      key={index}
                      remarkPlugins={[
                        [remarkGfm, {}],
                        [remarkMath, {}],
                      ]}
                      rehypePlugins={[[rehypeKatex, {}]]}
                    >
                      {part.text}
                    </Streamdown>
                  );
                }
                if (part.type.startsWith("tool-")) {
                  return (
                    <span
                      key={index}
                      className="inline-block align-middle text-xs border border-gray-300 rounded px-2 py-1 my-1"
                    >
                      {getToolUIComponent(part.type, part)}
                    </span>
                  );
                }
                return null;
              })}
            </div>

            <div className="rounded">
              {commands.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <button
                    className="mt-1 p-1 rounded"
                    onClick={() => onToggleExpand(messageId)}
                    title={
                      isExpanded ? "收起命令" : `查看命令 (${commands.length})`
                    }
                    aria-label={
                      isExpanded ? "收起命令" : `查看命令 (${commands.length})`
                    }
                    type="button"
                  >
                    <div className="inline-flex items-center gap-2 px-2 py-1 rounded bg-gray-100 text-sm">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="text-sm font-bold">
                        {isExpanded
                          ? `收起命令 (${commands.length})`
                          : `查看命令 (${commands.length})`}
                      </span>
                    </div>
                  </button>

                  <div className="ml-auto flex items-center gap-2">
                    {isExpanded && (
                      <button
                        type="button"
                        onClick={handleCopy}
                        title={copied ? "已复制" : "复制命令"}
                        className="inline-flex items-center gap-2 px-2 py-1 rounded bg-gray-100 text-sm font-bold"
                      >
                        <ClipboardCopy className="h-4 w-4" />
                        <span>{copied ? "已复制" : "复制"}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              {isExpanded && (
                <div>
                  <div
                    className="mt-2 p-2 rounded"
                    style={{ background: "#1e1e2f", color: "#d4d4d4" }}
                  >
                    <ul className="space-y-1">
                      {commands.map((command, idx) => (
                        <li key={idx}>
                          <code className="px-2 py-1 rounded text-sm font-mono font-semibold text-[#d4d4d4]">
                            {command}
                          </code>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-2 flex">
                    <button
                      type="button"
                      onClick={handleRun}
                      title="运行命令"
                      className="inline-flex items-center gap-2 px-2 py-1 rounded bg-gray-100 text-sm font-bold"
                    >
                      <Play className="h-4 w-4" />
                      <span>运行</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
