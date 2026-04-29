// client/lib/parse-geogebra-commands.ts

/**
 * 解析 GeoGebra 批量命令文本，返回有效命令数组。
 * 支持的注释格式：// 行注释、# 行注释、块注释 (slash-star)、三引号块注释
 * 自动将全角符号转换为半角符号
 */

/** 将全角字符转换为半角字符 */
function toHalfWidth(text: string): string {
  return text.replace(/[\uFF01-\uFF5E\u3000]/g, (ch) => {
    if (ch === "\u3000") return " ";
    return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
  });
}

export function parseGeoGebraCommands(text: string): string[] {
  // 1. 全角转半角
  let result = toHalfWidth(text);

  // 2. 移除块注释 /* ... */
  result = result.replace(/\/\*[\s\S]*?\*\//g, "");

  // 3. 移除块注释 ''' ... '''
  result = result.replace(/'''[\s\S]*?'''/g, "");

  // 4. 按行处理，过滤行注释和空行
  return result
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("//") && !line.startsWith("#"));
}
