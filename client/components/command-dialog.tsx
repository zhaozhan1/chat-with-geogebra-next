"use client"

import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/client/components/ui/dialog"
import { Textarea } from "@/client/components/ui/textarea"
import { Button } from "@/client/components/ui/button"
import { parseGeoGebraCommands } from "@/client/lib/parse-geogebra-commands"

interface CommandDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExecute: (commands: string[]) => Promise<void>
}

export function CommandDialog({
  open,
  onOpenChange,
  onExecute,
}: CommandDialogProps) {
  const [text, setText] = useState("")
  const [isExecuting, setIsExecuting] = useState(false)

  const commands = useMemo(() => parseGeoGebraCommands(text), [text])

  const handleExecute = async () => {
    if (commands.length === 0 || isExecuting) return
    setIsExecuting(true)
    try {
      await onExecute(commands)
      setText("")
      onOpenChange(false)
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>直接命令输入</DialogTitle>
        </DialogHeader>

        <Textarea
          placeholder={"粘贴或输入 GeoGebra 命令...\n支持 // 和 # 行注释，/* */ 和 ''' 块注释"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 min-h-[200px] font-mono text-sm"
          disabled={isExecuting}
        />

        {commands.length > 0 && (
          <div className="border rounded-md p-3 max-h-[200px] overflow-y-auto">
            <p className="text-xs text-muted-foreground mb-2">
              解析结果：{commands.length} 条有效命令
            </p>
            <ol className="space-y-1">
              {commands.map((cmd, i) => (
                <li key={i} className="text-sm font-mono">
                  <span className="text-muted-foreground mr-2">{i + 1}.</span>
                  {cmd}
                </li>
              ))}
            </ol>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExecuting}
          >
            取消
          </Button>
          <Button
            onClick={handleExecute}
            disabled={commands.length === 0 || isExecuting}
          >
            {isExecuting
              ? "执行中..."
              : `执行 (${commands.length} 条)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
