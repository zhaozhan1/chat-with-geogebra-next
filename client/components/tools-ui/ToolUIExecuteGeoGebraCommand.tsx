
export const ToolUIExecuteGeoGebraCommand = (part: any) => {
  switch (part.state) {
    case "input-streaming":
      return "思考中...";
    case "input-available":
      return `执行命令: ${part.input.command}...`;
    case "output-available":
      if (part.output.success === false) {
        return `执行命令: ${part.input.command} 时出错: ${part.output.error}`;
      }
      const label = part.output.label;
      if (label === "" || label === null || label === undefined) {
        return `执行命令: ${part.input.command}(成功)`;
      } else {
        return `执行命令: ${part.input.command}(成功), 结果: ${label}`;
      }
    case "output-error":
      return `执行命令: ${part.input.command} 时出错: ${part.output.error}`;
  }
};
