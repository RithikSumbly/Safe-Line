/** Read a File as a data URL, optionally downscale large screenshots. */
export async function fileToChatImage(
  file: File,
): Promise<{ dataUrl: string; base64: string; mimeType: string }> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image screenshots are supported.");
  }
  if (file.size > 8_000_000) {
    throw new Error("Screenshot is too large (max 8MB).");
  }

  const dataUrl = await resizeImageFile(file, 1600, 0.85);
  const comma = dataUrl.indexOf(",");
  const header = dataUrl.slice(0, comma);
  const base64 = dataUrl.slice(comma + 1);
  const mimeMatch = /data:([^;]+)/.exec(header);
  const mimeType = mimeMatch?.[1] ?? file.type ?? "image/jpeg";
  return { dataUrl, base64, mimeType };
}

function resizeImageFile(
  file: File,
  maxEdge: number,
  quality: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const scale = Math.min(1, maxEdge / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not process image."));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const outType =
        file.type === "image/png" || file.type === "image/webp"
          ? file.type
          : "image/jpeg";
      resolve(
        outType === "image/png"
          ? canvas.toDataURL("image/png")
          : canvas.toDataURL(outType, quality),
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image."));
    };
    img.src = url;
  });
}
