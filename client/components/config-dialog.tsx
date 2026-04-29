"use client";

import { useState, useEffect, useCallback, use } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import { AlertCircle, Info, Github, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/client/components/ui/tabs";
import { useAppStore } from "@/client/lib/store";
import { MODEL_OPTIONS } from "@/server/core/config/providers";
import { Checkbox } from "./ui/checkbox";
import Link from "next/link";
import { AppConfigSettings } from "@/types";
import { Textarea } from "./ui/textarea";

interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

export function ConfigDialog({
  open,
  onOpenChange,
  onSave,
}: ConfigDialogProps) {
  // 从store获取配置
  const config = useAppStore((state) => state.config);
  const updateConfig = useAppStore((state) => state.updateConfig);

  // 本地状态用于表单
  const [localConfig, setLocalConfig] = useState<AppConfigSettings>(config);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("self-model");
  // 新增：供应商选择状态
  const [selectedProvider, setSelectedProvider] = useState<string>(() => {
    // 优先 config.modelProvider，其次 modelType 推断
    if (config.model.provider) return config.model.provider;
    const selectedModel = MODEL_OPTIONS.find(
      (model) => model.value === config.model.modelType
    );
    return selectedModel?.provider || "openai";
  });

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        setIsLoading(true);
        await useAppStore.getState().handleLogIn(email, password, rememberMe);
        setIsLoggedIn(true);

        // 2秒后关闭对话框
        setTimeout(() => {
          setSaveSuccess(false);
          onOpenChange(false);
        }, 2000);

        setError(null);
      } catch (err: any) {
        setError(err.message || "登录失败");
      } finally {
        setIsLoading(false);
      }
    },
    [email, password, rememberMe, isLoading, onOpenChange, setIsLoading]
  );

  // 当对话框打开或配置更改时，更新本地状态
  useEffect(() => {
    setLocalConfig(config);
    // 打开时同步供应商选择
    if (config.model.provider) {
      setSelectedProvider(config.model.provider);
    } else {
      const selectedModel = MODEL_OPTIONS.find(
        (model) => model.value === config.model.modelType
      );
      setSelectedProvider(selectedModel?.provider || "openai");
    }

    const loggedIn = useAppStore.getState().isLoggedIn();
    setIsLoggedIn(loggedIn);
  }, [config, open]);

  const handleSave = () => {
    const provider = selectedProvider === "custom"
      ? "custom"
      : (() => {
          const selectedModel = MODEL_OPTIONS.find(
            (model) => model.value === localConfig.model.modelType
          );
          return selectedModel?.provider || selectedProvider || "openai";
        })();

    // 验证自定义 URL 格式
    if (selectedProvider === "custom" && localConfig.model.customBaseUrl) {
      try {
        new URL(localConfig.model.customBaseUrl);
      } catch {
        setError("模型 URL 格式无效，请输入有效的 HTTP(S) 地址");
        return;
      }
    }

    updateConfig({
      ...localConfig,
      model: {
        ...localConfig.model,
        provider: provider,
      },
    });

    // 显示保存成功提示
    setSaveSuccess(true);

    // 调用可选的onSave回调
    if (onSave) onSave();

    // 2秒后关闭对话框
    setTimeout(() => {
      setSaveSuccess(false);
      onOpenChange(false);
    }, 2000);

    setError(null);
  };

  const getCurrentProviderKey = (): string => {
    if (selectedProvider === "custom") return "custom";
    const selectedModel = MODEL_OPTIONS.find(
      (model) => model.value === localConfig.model.modelType
    );
    return selectedModel?.provider || selectedProvider || "openai";
  };

  // 获取当前供应商下的模型列表
  const filteredModels = MODEL_OPTIONS.filter(
    (model) => model.provider === selectedProvider
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>LLM 配置</DialogTitle>
          <DialogDescription>
            配置聊天应用的语言模型、API密钥和系统提示词。
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="self-model">使用自己的模型</TabsTrigger>
            <TabsTrigger value="official-model">使用我们的模型</TabsTrigger>
            <TabsTrigger value="about">关于</TabsTrigger>
          </TabsList>

          <TabsContent value="self-model" className="space-y-4 py-4">
            {isLoggedIn ? (
                <div className="grow col-span-1 space-y-2 pl-6 ml-4 text-sm text-muted-foreground">
                  <div className="items-center justify-center flex-col space-y-2">
                    <h3 className="text-lg font-medium">已登录</h3>
                    <p>您已登录，将优先使用我们的优化模型。</p>
                  </div>
                </div>
            ) : (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="provider" className="text-right">
                    供应商
                  </Label>
                  <div className="col-span-3">
                    <Select
                      value={selectedProvider}
                      onValueChange={(value) => {
                        setSelectedProvider(value);
                        if (value === "custom") {
                          setLocalConfig({
                            ...localConfig,
                            model: { ...localConfig.model, provider: "custom" },
                          });
                        } else {
                          const firstModel = MODEL_OPTIONS.find(
                            (model) => model.provider === value
                          );
                          if (firstModel) {
                            setLocalConfig({
                              ...localConfig,
                              model: {
                                ...localConfig.model,
                                modelType: firstModel.value,
                                provider: value,
                              },
                            });
                          } else {
                            setLocalConfig({
                              ...localConfig,
                              model: { ...localConfig.model, provider: value },
                            });
                          }
                        }
                      }}
                    >
                      <SelectTrigger id="provider">
                        <SelectValue placeholder="选择供应商" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* 供应商去重 + 自行部署 */}
                        {[...new Set(MODEL_OPTIONS.map((m) => m.provider)), "custom"].map(
                          (provider) => (
                            <SelectItem key={provider} value={provider}>
                              {provider === "custom"
                                ? "自行部署"
                                : provider.charAt(0).toUpperCase() +
                                  provider.slice(1)}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* 新增：模型选择（受供应商过滤） */}
                <div className="grid grid-cols-4 items-center gap-4 mt-4">
                  <Label htmlFor="model" className="text-right">
                    模型
                  </Label>
                  <div className="col-span-3">
                    {selectedProvider === "custom" ? (
                      <Input
                        id="model"
                        value={localConfig.model.customModelName || ""}
                        onChange={(e) =>
                          setLocalConfig({
                            ...localConfig,
                            model: {
                              ...localConfig.model,
                              customModelName: e.target.value,
                              modelType: e.target.value,
                              provider: "custom",
                            },
                          })
                        }
                        placeholder="输入模型名称，如 qwen2.5、llama3"
                      />
                    ) : (
                      <Select
                        value={localConfig.model.modelType}
                        onValueChange={(value) =>
                          setLocalConfig({
                            ...localConfig,
                            model: { ...localConfig.model, modelType: value },
                          })
                        }
                      >
                        <SelectTrigger id="model">
                          <SelectValue placeholder="选择模型" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredModels.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                {selectedProvider === "custom" && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="customUrl" className="text-right">
                      模型 URL
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="customUrl"
                        value={localConfig.model.customBaseUrl || ""}
                        onChange={(e) =>
                          setLocalConfig({
                            ...localConfig,
                            model: {
                              ...localConfig.model,
                              customBaseUrl: e.target.value,
                            },
                          })
                        }
                        placeholder="http://127.0.0.1:11434/v1"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="apiKey" className="text-right">
                    API 密钥
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="apiKey"
                      type="password"
                      value={localConfig.apiKeys[getCurrentProviderKey() as keyof typeof localConfig.apiKeys] || ""}
                      onChange={(e) =>
                        setLocalConfig({
                          ...localConfig,
                          apiKeys: {
                            ...localConfig.apiKeys,
                            [getCurrentProviderKey()]: e.target.value,
                          },
                        })
                      }
                      placeholder={`输入 ${getCurrentProviderKey()}  API 密钥`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="systemPrompt" className="text-right">
                    系统提示词
                  </Label>
                  <div className="col-span-3">
                    <Textarea
                      id="systemPrompt"
                      value={localConfig.prompt || ""}
                      onChange={(e) =>
                        setLocalConfig({
                          ...localConfig,
                          prompt: e.target.value,
                        })
                      }
                      placeholder={`输入系统提示词，留空则使用默认提示词`}
                    />
                  </div>
                </div>
              </>
            )}
            {/* 新增：供应商选择 */}
          </TabsContent>

          <TabsContent value="official-model" className="space-y-4 py-4">
            <div className="flex">
              {isLoggedIn ? (
                <div className="grow col-span-1 space-y-2 pl-6 ml-4 text-sm text-muted-foreground">
                  <div className="items-center justify-center flex-col space-y-2">
                    <h3 className="text-lg font-medium">已登录</h3>
                    <p>您已登录，将优先使用我们的优化模型。</p>
                  </div>
                </div>
              ) : (
                <div className="grow col-span-1 space-y-2 pl-6 ml-4 text-sm text-muted-foreground">
                  <div className="items-center justify-center flex-col">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">邮箱</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="请输入邮箱"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password">密码</Label>
                          <Link
                            href="/forgot-password"
                            className="text-sm text-primary hover:underline"
                          >
                            忘记密码？
                          </Link>
                        </div>
                        <Input
                          id="password"
                          type="password"
                          placeholder="请输入密码"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={isLoading}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="remember"
                          checked={rememberMe}
                          onCheckedChange={(checked) =>
                            setRememberMe(checked as boolean)
                          }
                          disabled={isLoading}
                        />
                        <label
                          htmlFor="remember"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          记住我
                        </label>
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                      >
                        {isLoading ? "登录中..." : "登录"}
                      </Button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="about" className="space-y-4 py-4">
            <div className="space-y-4 max-h-[350px] overflow-auto pr-2">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Info className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">版本信息</h3>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <span className="text-muted-foreground">名称:</span>
                  <span className="col-span-2 font-medium">
                    Chat with GeoGebra
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm">
                  <span className="text-muted-foreground">版本:</span>
                  <span className="col-span-2 font-medium">v0.4.0</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm">
                  <span className="text-muted-foreground">AI SDK:</span>
                  <span className="col-span-2 font-medium">
                    Vercel AI SDK 5.0
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm">
                  <span className="text-muted-foreground">描述:</span>
                  <span className="col-span-2">
                    结合 AI 和 GeoGebra 的数学可视化助手
                  </span>
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <h4 className="font-medium text-sm mb-2">功能特点</h4>
                <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                  <li>基础功能完全免费 </li>
                  <li>支持多种 LLM 模型（DeepSeek、OpenAI、Gemini）</li>
                  <li>支持functioncall，自动绘图</li>
                  <li>智能提取并执行 GeoGebra 命令</li>
                  <li>社区支持（WORKING）</li>
                </ul>
              </div>

              <div className="pt-4 border-t space-y-3">
                <h4 className="font-medium text-sm mb-2">
                  ☕ 请开发者喝杯咖啡
                </h4>
                <p className="text-xs text-muted-foreground">
                  如果这个项目对你有帮助，可以请开发者喝杯咖啡 ❤️
                </p>
                <div className="space-y-2">
                  <div className="text-xs">
                    <span className="font-medium">微信支付：</span>
                    <span className="text-muted-foreground ml-1">
                      扫描二维码支持
                    </span>
                    <img
                      src="/images/thanks/wechat.png"
                      alt="WeChat Pay QR Code"
                      className="mt-2 w-48 h-48"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground italic pt-2">
                  💡 你的支持是项目持续更新的动力！
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {saveSuccess && (
          <div className="p-2 bg-green-100 text-green-800 rounded-md text-center">
            设置已成功保存
          </div>
        )}

        {activeTab === "self-model" ? (
          isLoggedIn ? (
            <DialogFooter>
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  useAppStore.getState().logout();
                  setIsLoggedIn(false);
                }}
              >
                登出
              </Button>
            </DialogFooter>
          ) : (
            <DialogFooter>
              <Button type="submit" onClick={handleSave}>
                保存
              </Button>
            </DialogFooter>
          )
        ) : activeTab === "official-model" ? (
          isLoggedIn && (
            <DialogFooter>
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  useAppStore.getState().logout();
                  setIsLoggedIn(false);
                }}
              >
                登出
              </Button>
            </DialogFooter>
          )
        ) : (
          <DialogFooter>
              <div className="text-xs text-muted-foreground pt-2">
                © 2025 Chat with GeoGebra.
              </div>
              <div className="border-l"></div>
              <div className="text-xs text-muted-foreground pt-2">
                MADE WITH ❤️ BY <span className="font-bold">Ivory (full-stack-development)</span> & <span className="font-bold">Neal (algorithm)</span>.
              </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
