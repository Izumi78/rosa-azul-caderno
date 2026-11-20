const MAX_IMAGE_INPUT = 15 * 1024 * 1024;
const TARGET_IMAGE_BYTES = 350 * 1024;

/** Converts large uploads to a compact WebP/JPEG data URL before saving in the browser notebook. */
export async function compressImageForNotes(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
  if (file.size > MAX_IMAGE_INPUT) throw new Error("A imagem original ultrapassa 15 MB. Escolha uma imagem menor.");
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Não foi possível abrir esta imagem. Tente JPG, PNG ou WebP."));
    });

    let width = image.naturalWidth;
    let height = image.naturalHeight;
    const initialScale = Math.min(1, 1600 / Math.max(width, height));
    width = Math.max(1, Math.round(width * initialScale));
    height = Math.max(1, Math.round(height * initialScale));

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Seu navegador não conseguiu preparar a imagem.");
    const supportsWebP = canvas.toDataURL("image/webp").startsWith("data:image/webp");
    const mime = supportsWebP ? "image/webp" : "image/jpeg";

    for (let dimensionPass = 0; dimensionPass < 4; dimensionPass++) {
      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      for (const quality of [0.84, 0.76, 0.68, 0.6, 0.52]) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, quality));
        if (blob && blob.size <= TARGET_IMAGE_BYTES) {
          return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(new Error("Não foi possível finalizar a imagem."));
            reader.readAsDataURL(blob);
          });
        }
      }
      width = Math.round(width * 0.82);
      height = Math.round(height * 0.82);
    }
    throw new Error("Não foi possível reduzir esta imagem o suficiente. Tente uma imagem diferente.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
