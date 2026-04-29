const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
] as const;

const MIME_TO_EXTENSIONS: Record<string, string[]> = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface FileValidationError {
  message: string;
}

export function validateFile(file: File): FileValidationError | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return { message: "不支持的文件格式，仅支持 PNG、JPG、GIF、WebP、PDF" };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { message: "文件大小不能超过 5MB" };
  }

  const fileName = file.name.toLowerCase();
  const allowedExtensions = MIME_TO_EXTENSIONS[file.type];
  if (allowedExtensions && !allowedExtensions.some((ext) => fileName.endsWith(ext))) {
    return { message: "文件扩展名与实际类型不匹配" };
  }

  return null;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}
