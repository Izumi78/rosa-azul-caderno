const MAX_IMAGE_INPUT = 15 * 1024 * 1024;
const TARGET_IMAGE_BYTES = 350 * 1024;
const DATABASE_NAME = "rosa-azul-media";
const STORE_NAME = "files";
const DATABASE_VERSION = 2;
const MAX_MEDIA_BYTES = 100 * 1024 * 1024;

export interface StoredMedia {
  id: string;
  blob: Blob;
  name: string;
  type: string;
  createdAt: number;
}

function openMediaDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("Este navegador não oferece armazenamento local de arquivos."));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Não foi possível abrir o espaço de arquivos do caderno."));
  });
}

export async function saveMediaFile(file: File): Promise<string> {
  if (file.size === 0) throw new Error("O arquivo está vazio.");
  if (file.size > MAX_MEDIA_BYTES) throw new Error("O arquivo ultrapassa 100 MB. Escolha um arquivo menor.");
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
  const database = await openMediaDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put({ id, blob: file, name: file.name, type: file.type || "application/octet-stream", createdAt: Date.now() } satisfies StoredMedia);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error("Não foi possível guardar o arquivo. Verifique o espaço disponível no navegador."));
      transaction.onabort = () => reject(new Error("O armazenamento do arquivo foi cancelado."));
    });
  } finally { database.close(); }
  return `rosa-media://${id}`;
}

export async function getMediaFile(id: string): Promise<StoredMedia | null> {
  const database = await openMediaDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id);
      request.onsuccess = () => resolve((request.result as StoredMedia | undefined) ?? null);
      request.onerror = () => reject(new Error("Não foi possível carregar este arquivo."));
    });
  } finally { database.close(); }
}

export function getMediaId(reference: string): string | null {
  try {
    const url = new URL(reference);
    return url.protocol === "rosa-media:" ? url.hostname : null;
  } catch { return null; }
}

/** Compresses an image to a compact blob, without converting it to a long Base64 string. */
export async function compressImageBlobForNotes(file: File): Promise<Blob> {
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
        if (blob && blob.size <= TARGET_IMAGE_BYTES) return blob;
      }
      width = Math.round(width * 0.82);
      height = Math.round(height * 0.82);
    }
    throw new Error("Não foi possível reduzir esta imagem o suficiente. Tente uma imagem diferente.");
  } finally { URL.revokeObjectURL(objectUrl); }
}

/** Legacy data-URL helper retained for note cover images and existing saved data. */
export async function compressImageForNotes(file: File): Promise<string> {
  const blob = await compressImageBlobForNotes(file);
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Não foi possível finalizar a imagem."));
    reader.readAsDataURL(blob);
  });
}


/** Uploads a locally stored attachment to the user's private Supabase folder. */
const SUPABASE_MEDIA_URL = "https://utmcnicgabcmkfmsxzop.supabase.co";
const SUPABASE_MEDIA_KEY = "sb_publishable_6jQ9EmAD4pJIyPhKsJIK2Q_O8kvnswF";
export async function uploadMediaToCloud(id: string): Promise<boolean> {
  const { currentSession } = await import("./supabase-cloud");
  const session = currentSession();
  if (!session) return false;
  const media = await getMediaFile(id);
  if (!media) return false;
  const path = `${session.user.id}/${id}`;
  const response = await fetch(`${SUPABASE_MEDIA_URL}/storage/v1/object/rosa-azul-media/${path}`, {
    method: "POST",
    headers: { apikey: SUPABASE_MEDIA_KEY, Authorization: `Bearer ${session.access_token}`, "Content-Type": media.type || "application/octet-stream", "x-upsert": "true" },
    body: media.blob,
  });
  if (!response.ok) throw new Error("Não foi possível enviar o anexo para a nuvem.");
  return true;
}
export async function downloadMediaFromCloud(id: string): Promise<StoredMedia | null> {
  const { currentSession } = await import("./supabase-cloud");
  const session = currentSession();
  if (!session) return null;
  const response = await fetch(`${SUPABASE_MEDIA_URL}/storage/v1/object/rosa-azul-media/${session.user.id}/${id}`, {
    headers: { apikey: SUPABASE_MEDIA_KEY, Authorization: `Bearer ${session.access_token}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Não foi possível baixar o anexo da nuvem.");
  const blob = await response.blob();
  return { id, blob, name: id, type: blob.type || "application/octet-stream", createdAt: Date.now() };
}
export async function syncNoteMediaToCloud(notes: Array<{content?: string; coverImage?: string}>) {
  const ids = new Set<string>();
  for (const note of notes) {
    for (const match of (note.content || "").matchAll(/rosa-media:\/\/([a-zA-Z0-9-]+)/g)) ids.add(match[1]);
    const coverId = note.coverImage ? getMediaId(note.coverImage) : null;
    if (coverId) ids.add(coverId);
  }
  for (const id of ids) { try { await uploadMediaToCloud(id); } catch { /* Retry on a later sync. */ } }
}
