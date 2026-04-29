// client/lib/parse-geogebra-commands.ts

/**
 * 解析 GeoGebra 批量命令文本，返回有效命令数组。
 * 支持的注释格式：// 行注释、# 行注释、块注释 (slash-star)、三引号块注释
 */
export function parseGeoGebraCommands(text: string): string[] {
  // 1. 移除块注释 /* ... */
  let result = text.replace(/\/\*[\s\S]*?\*\//g, "");

  // 2. 移除块注释 ''' ... '''
  result = result.replace(/'''[\s\S]*?'''/g, "");

  // 3. 按行处理，过滤行注释和空行
  return result
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("//") && !line.startsWith("#"));
}
