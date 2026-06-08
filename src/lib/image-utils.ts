export async function convertToWebP(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("Failed to convert to WebP"));
      }, "image/webp", 0.8);
    };
    img.onerror = () => reject(new Error("Failed to load image for conversion"));
    img.src = URL.createObjectURL(blob);
  });
}
